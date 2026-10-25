"use client";

import { useEffect, useState } from "react";
import type { Dict } from "@/lib/i18n";

type D = Dict["landing"]["demo"];

// Сценарий по кругу (мс от начала цикла): всё работает → сайт клиента падает
// и прилетает алерт → сайт поднялся, алерт с простоем → тишина.
const TIMELINE = [
  { at: 0, phase: "ok" },
  { at: 2600, phase: "down" },
  { at: 7600, phase: "up" },
  { at: 12400, phase: "calm" },
] as const;
const LOOP_MS = 14500;

type Phase = (typeof TIMELINE)[number]["phase"];

// Детерминированные «истории» за 30 дней для трёх сайтов.
const HISTORY = [
  Array.from({ length: 30 }, (_, i) => (i === 9 ? "bg-warn" : "bg-up")),
  Array.from({ length: 30 }, () => "bg-up"),
  Array.from({ length: 30 }, (_, i) => (i === 21 ? "bg-down" : "bg-up")),
];

export default function LiveDemo({ d }: { d: D }) {
  const [phase, setPhase] = useState<Phase>("ok");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      timers = TIMELINE.map((s) => setTimeout(() => setPhase(s.phase), s.at));
      timers.push(setTimeout(run, LOOP_MS));
    };
    run();
    const pulse = setInterval(() => setTick((t) => t + 1), 1400);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(pulse);
    };
  }, []);

  const down = phase === "down";
  const showUpToast = phase === "up";
  // «Живое» время ответа: слегка гуляет, как у настоящего сайта.
  const ms = (base: number, k: number) => base + ((tick * 37 + k * 53) % 41) - 20;

  const sites = [
    { host: d.sites[0], ms: down ? null : ms(142, 1), down, pct: down ? "99.91%" : "99.98%" },
    { host: d.sites[1], ms: ms(388, 2), down: false, pct: "100%" },
    { host: d.sites[2], ms: ms(211, 3), down: false, pct: "99.95%" },
  ];

  return (
    <div className="relative mx-auto w-full max-w-4xl">
      {/* Пульт */}
      <div className="overflow-hidden rounded-[2rem] border border-line bg-canvas shadow-[0_40px_120px_-20px_rgba(0,0,0,0.25)]">
        <div className="flex items-center gap-1.5 border-b border-line bg-card px-5 py-3">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <span className="ml-4 flex items-center gap-2 text-xs text-mute">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-down" />
            {d.live}
          </span>
        </div>
        <div className="p-5 sm:p-8">
          <div className="flex items-center gap-3">
            <span
              className={`pulse-dot h-3.5 w-3.5 rounded-full transition-colors duration-500 ${down ? "bg-down" : "bg-up"}`}
            />
            <p className="text-xl font-semibold tracking-tight transition-all duration-500 sm:text-3xl">
              {down ? d.headlineDown : d.headlineOk}
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {[
              [d.tiles[0], "12", ""],
              [d.tiles[1], down ? "11/12" : "12/12", down ? "text-down" : "text-up"],
              [d.tiles[2], phase === "ok" ? "0" : "1", ""],
              [d.tiles[3], "99.98%", ""],
            ].map(([label, value, tone]) => (
              <div key={label} className="rounded-2xl border border-line bg-card px-4 py-3">
                <p className="truncate text-[11px] text-mute sm:text-xs">{label}</p>
                <p className={`mt-1 text-xl font-semibold tabular-nums tracking-tight transition-colors duration-500 sm:text-2xl ${tone}`}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-6 text-sm font-semibold">{d.client}</p>
          <ul className="mt-2 flex flex-col gap-2">
            {sites.map((s, i) => (
              <li
                key={s.host}
                className={`rounded-2xl border bg-card p-4 transition-all duration-500 ${
                  s.down ? "border-down/40 shadow-[0_0_0_4px_var(--down-soft)]" : "border-line"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2.5 font-semibold tracking-tight">
                    <span className={`pulse-dot h-2.5 w-2.5 rounded-full ${s.down ? "bg-down" : "bg-up"}`} />
                    {s.host}
                    <span className={`text-xs font-normal ${s.down ? "text-down" : "text-up"}`}>
                      {s.down ? d.down : d.up}
                    </span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums">{s.pct}</span>
                </div>
                <div className="mt-3 flex h-6 gap-[2px]">
                  {HISTORY[i].map((c, j) => (
                    <span
                      key={j}
                      className={`flex-1 rounded-[2px] transition-colors duration-500 ${
                        j === 29 && s.down ? "bg-down" : c
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-2 text-xs tabular-nums text-mute">
                  {s.ms == null ? d.noResponse : `${d.response} ${s.ms} ms`} · SSL 54 {d.days} · {d.domain} 301 {d.days}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Уведомления Telegram поверх пульта */}
      <div className="pointer-events-none absolute -right-2 top-16 w-[min(92%,22rem)] sm:-right-10 sm:top-20">
        <Toast show={down} title={d.toastDownTitle} text={d.toastDownText} time="03:12" icon="🔴" />
        <Toast show={showUpToast} title={d.toastUpTitle} text={d.toastUpText} time="03:16" icon="🟢" />
      </div>
    </div>
  );
}

function Toast({ show, title, text, time, icon }: { show: boolean; title: string; text: string; time: string; icon: string }) {
  return (
    <div
      className={`absolute inset-x-0 top-0 rounded-2xl border border-white/10 bg-[#1c1c1e]/95 p-3.5 text-white shadow-2xl backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.2,0.9,0.2,1.1)] ${
        show ? "translate-y-0 scale-100 opacity-100" : "-translate-y-4 scale-95 opacity-0"
      }`}
    >
      <div className="flex items-center gap-2 text-[11px] text-white/60">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#2aabee] text-[10px] font-bold text-white">
          ✈
        </span>
        <span className="font-medium uppercase tracking-wide">Telegram · Watcher</span>
        <span className="ml-auto">{time}</span>
      </div>
      <p className="mt-2 text-sm font-semibold">
        {icon} {title}
      </p>
      <p className="text-sm text-white/80">{text}</p>
    </div>
  );
}
