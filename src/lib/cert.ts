import tls from "node:tls";
import type { Dict } from "./i18n";

const MS_PER_DAY = 86_400_000;

// Код ошибки как стабильная строка — перевод на краю через checkErrorMessage,
// как в check.ts. "cert" — проблема с самим сертификатом; остальное — соединение.
export type CertResult =
  | { ok: true; daysLeft: number; validTo: Date }
  | { ok: false; error: string };

/** Хост из URL для подключения по TLS; null если URL битый/без хоста. */
export function hostnameFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname || null;
  } catch {
    return null;
  }
}

/**
 * Подключается к host:443, читает сертификат и считает дни до истечения.
 * rejectUnauthorized:false — чтобы прочитать даже просроченный серт (daysLeft
 * станет отрицательным = «истёк»), а не падать на хендшейке. Ошибки уровня
 * соединения отдаём кодами (timeout/dns/openFailed), как в check.ts.
 */
export function fetchCertInfo(host: string, timeoutMs = 15000): Promise<CertResult> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (r: CertResult) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(r);
    };

    const socket = tls.connect(
      { host, port: 443, servername: host, rejectUnauthorized: false, timeout: timeoutMs },
      () => {
        const cert = socket.getPeerCertificate();
        if (!cert || !cert.valid_to) return finish({ ok: false, error: "cert" });
        const validTo = new Date(cert.valid_to);
        if (Number.isNaN(validTo.getTime())) return finish({ ok: false, error: "cert" });
        const daysLeft = Math.floor((validTo.getTime() - Date.now()) / MS_PER_DAY);
        finish({ ok: true, daysLeft, validTo });
      }
    );

    socket.on("timeout", () => finish({ ok: false, error: "timeout" }));
    socket.on("error", (err: NodeJS.ErrnoException) => {
      const code = err.code ?? "";
      if (code === "ENOTFOUND" || code === "EAI_AGAIN") return finish({ ok: false, error: "dns" });
      finish({ ok: false, error: "openFailed" });
    });
  });
}

export type CertEval = { alert: boolean; daysLeft: number; expired: boolean };

// Стандартные стадии предупреждения (дни). Порог пользователя добавляется сверху.
const STAGES = [0, 1, 3, 7] as const;

/**
 * Решает, слать ли алерт. Анти-спам: алертим только в момент ПЕРЕСЕЧЕНИЯ рубежа
 * сверху вниз (cur ≤ m, а раньше было > m), а не каждый проход ниже порога.
 * Рубежи = порог пользователя + стадии 7/3/1/0, не превышающие порог.
 * Первый замер (prev = null), уже попавший в зону, тоже считается пересечением.
 */
export function evalCertAlert(
  threshold: number,
  prevDaysLeft: number | null,
  daysLeft: number
): CertEval {
  const milestones = Array.from(
    new Set([threshold, ...STAGES.filter((s) => s <= threshold)])
  ).sort((a, b) => b - a);
  const alert = milestones.some(
    (m) => daysLeft <= m && (prevDaysLeft == null || prevDaysLeft > m)
  );
  return { alert, daysLeft, expired: daysLeft <= 0 };
}

/** Текст алерта по результату evalCertAlert и словарю алертов (на краю). */
export function certAlertMessage(ev: CertEval, a: Dict["alerts"]): string {
  return ev.expired ? a.certExpired(-ev.daysLeft) : a.certExpiring(ev.daysLeft);
}
