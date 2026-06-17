import * as z from "zod";
import type { Dict } from "./i18n";

type Val = Dict["val"];

export function makeSignupSchema(v: Val) {
  return z.object({
    email: z.email({ error: v.emailInvalid }).trim().toLowerCase(),
    password: z
      .string()
      .min(8, { error: v.passwordMin })
      .regex(/[a-zA-Z]/, { error: v.passwordLetter })
      .regex(/[0-9]/, { error: v.passwordDigit }),
  });
}

export function makeLoginSchema(v: Val) {
  return z.object({
    email: z.email({ error: v.emailInvalid }).trim().toLowerCase(),
    password: z.string().min(1, { error: v.passwordRequired }),
  });
}

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

export function makeClientSchema(v: Val) {
  return z.object({
    name: z.string({ error: v.clientNameRequired }).trim().min(1, { error: v.clientNameRequired }).max(100),
  });
}

export type ClientFormState =
  | { error?: string; success?: boolean }
  | undefined;

export function makeTrackerSchema(v: Val) {
  return z
    .object({
      // Название необязательное: если пусто — подставим домен/актив в экшене.
      name: z.string().trim().max(100).optional(),
      // Привязка к клиенту (опционально). "" в форме трактуем как «без клиента».
      clientId: z.string().trim().optional(),
      // URL не нужен в режиме ASSET — проверяем его в superRefine.
      url: z.string().trim().optional(),
      mode: z.enum(["PRICE", "SELECTOR", "ASSET"]).default("PRICE"),
      selector: z.string().trim().max(200).optional(),
      type: z.enum(["TEXT_CHANGE", "PRESENCE"]).default("TEXT_CHANGE"),
      asset: z.string().trim().max(50).optional(),
      assetCondition: z.enum(["ABOVE", "BELOW", "PERCENT"]).optional(),
      threshold: z.coerce.number().optional(),
      intervalMinutes: z.coerce
        .number({ error: v.intervalNumber })
        .int()
        .min(MIN_INTERVAL_MINUTES, { error: v.intervalMin(MIN_INTERVAL_MINUTES) })
        .max(1440),
    })
    .superRefine((data, ctx) => {
      if (data.mode === "ASSET") {
        if (!data.asset) {
          ctx.addIssue({ code: "custom", path: ["asset"], message: v.assetRequired });
        }
        if (!data.assetCondition) {
          ctx.addIssue({ code: "custom", path: ["assetCondition"], message: v.conditionRequired });
        }
        if (data.threshold == null || Number.isNaN(data.threshold) || data.threshold <= 0) {
          ctx.addIssue({ code: "custom", path: ["threshold"], message: v.thresholdInvalid });
        }
        return;
      }
      // Для PRICE/SELECTOR обязателен корректный URL.
      if (!data.url || !z.url().safeParse(data.url).success) {
        ctx.addIssue({ code: "custom", path: ["url"], message: v.urlInvalid });
      }
      // CSS-селектор обязателен только в продвинутом режиме.
      if (data.mode === "SELECTOR" && !data.selector) {
        ctx.addIssue({ code: "custom", path: ["selector"], message: v.selectorRequired });
      }
    });
}

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
