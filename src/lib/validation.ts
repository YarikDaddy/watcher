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

// Свободный тариф: минимальный интервал проверки — 60 минут
export const MIN_INTERVAL_MINUTES = 60;
export const FREE_TIER_TRACKER_LIMIT = 3;

export const TrackerSchema = z
  .object({
    // Название необязательное: если пусто — подставим домен в экшене.
    name: z.string().trim().max(100).optional(),
    url: z.url({ error: "Введите корректный URL (с http/https)." }).trim(),
    mode: z.enum(["PRICE", "SELECTOR"]).default("PRICE"),
    selector: z.string().trim().max(200).optional(),
    type: z.enum(["TEXT_CHANGE", "PRESENCE"]).default("TEXT_CHANGE"),
    intervalMinutes: z.coerce
      .number({ error: "Интервал должен быть числом." })
      .int()
      .min(MIN_INTERVAL_MINUTES, {
        error: `Минимальный интервал — ${MIN_INTERVAL_MINUTES} минут.`,
      })
      .max(1440),
  })
  .superRefine((data, ctx) => {
    // CSS-селектор обязателен только в продвинутом режиме.
    if (data.mode === "SELECTOR" && !data.selector) {
      ctx.addIssue({
        code: "custom",
        path: ["selector"],
        message: "Введите CSS-селектор.",
      });
    }
  });

export type TrackerFormState =
  | {
      errors?: {
        name?: string[];
        url?: string[];
        selector?: string[];
        type?: string[];
        intervalMinutes?: string[];
      };
      message?: string;
      success?: boolean;
    }
  | undefined;
