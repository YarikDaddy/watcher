import * as z from "zod";

export const SignupSchema = z.object({
  email: z.email({ error: "Введите корректный email." }).trim().toLowerCase(),
  password: z
    .string()
    .min(8, { error: "Минимум 8 символов." })
    .regex(/[a-zA-Z]/, { error: "Должна быть хотя бы одна буква." })
    .regex(/[0-9]/, { error: "Должна быть хотя бы одна цифра." }),
});

export const LoginSchema = z.object({
  email: z.email({ error: "Введите корректный email." }).trim().toLowerCase(),
  password: z.string().min(1, { error: "Введите пароль." }),
});

export type AuthFormState =
  | {
      errors?: { email?: string[]; password?: string[] };
      message?: string;
    }
  | undefined;

// Минимальный интервал проверки. 1 минута — для демо/наблюдения «вживую»;
// на проде под нагрузкой имеет смысл вернуть к 60 для свободного тарифа.
export const MIN_INTERVAL_MINUTES = 1;
export const FREE_TIER_TRACKER_LIMIT = 3;

export const TrackerSchema = z
  .object({
    // Название необязательное: если пусто — подставим домен/актив в экшене.
    name: z.string().trim().max(100).optional(),
    // URL не нужен в режиме ASSET — проверяем его в superRefine.
    url: z.string().trim().optional(),
    mode: z.enum(["PRICE", "SELECTOR", "ASSET"]).default("PRICE"),
    selector: z.string().trim().max(200).optional(),
    type: z.enum(["TEXT_CHANGE", "PRESENCE"]).default("TEXT_CHANGE"),
    asset: z.string().trim().max(50).optional(),
    assetCondition: z.enum(["ABOVE", "BELOW", "PERCENT"]).optional(),
    threshold: z.coerce.number().optional(),
    intervalMinutes: z.coerce
      .number({ error: "Интервал должен быть числом." })
      .int()
      .min(MIN_INTERVAL_MINUTES, {
        error: `Минимальный интервал — ${MIN_INTERVAL_MINUTES} минут.`,
      })
      .max(1440),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "ASSET") {
      if (!data.asset) {
        ctx.addIssue({ code: "custom", path: ["asset"], message: "Выберите актив." });
      }
      if (!data.assetCondition) {
        ctx.addIssue({ code: "custom", path: ["assetCondition"], message: "Выберите условие." });
      }
      if (data.threshold == null || Number.isNaN(data.threshold) || data.threshold <= 0) {
        ctx.addIssue({ code: "custom", path: ["threshold"], message: "Введите число больше нуля." });
      }
      return;
    }
    // Для PRICE/SELECTOR обязателен корректный URL.
    if (!data.url || !z.url().safeParse(data.url).success) {
      ctx.addIssue({ code: "custom", path: ["url"], message: "Введите корректный URL (с http/https)." });
    }
    // CSS-селектор обязателен только в продвинутом режиме.
    if (data.mode === "SELECTOR" && !data.selector) {
      ctx.addIssue({ code: "custom", path: ["selector"], message: "Введите CSS-селектор." });
    }
  });

export type TrackerFormState =
  | {
      errors?: {
        name?: string[];
        url?: string[];
        selector?: string[];
        type?: string[];
        asset?: string[];
        assetCondition?: string[];
        threshold?: string[];
        intervalMinutes?: string[];
      };
      message?: string;
      success?: boolean;
    }
  | undefined;
