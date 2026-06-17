"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import {
  TrackerSchema,
  FREE_TIER_TRACKER_LIMIT,
  type TrackerFormState,
} from "@/lib/validation";

/** Домен из URL для автоназвания трекера, когда название не задано. */
function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export async function createTracker(
  _state: TrackerFormState,
  formData: FormData
): Promise<TrackerFormState> {
  const { userId } = await verifySession();

  const parsed = TrackerSchema.safeParse({
    name: formData.get("name") ?? undefined,
    url: formData.get("url"),
    mode: formData.get("mode") ?? undefined,
    selector: formData.get("selector") ?? undefined,
    type: formData.get("type") ?? undefined,
    intervalMinutes: formData.get("intervalMinutes"),
  });

  if (!parsed.success) {
    const fieldErrors: NonNullable<TrackerFormState>["errors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof typeof fieldErrors;
      if (key) (fieldErrors[key] ??= []).push(issue.message);
    }
    return { errors: fieldErrors };
  }

  // Лимит свободного тарифа
  const count = await prisma.tracker.count({ where: { userId } });
  if (count >= FREE_TIER_TRACKER_LIMIT) {
    return {
      message: `На свободном тарифе доступно до ${FREE_TIER_TRACKER_LIMIT} трекеров.`,
    };
  }

  const { name, url, mode, selector, type, intervalMinutes } = parsed.data;
  const finalName = name || hostnameOf(url);

  // В режиме PRICE селектор не нужен, а сравнение всегда по тексту цены.
  const data =
    mode === "PRICE"
      ? { userId, name: finalName, url, mode, selector: null, type: "TEXT_CHANGE" as const, intervalMinutes }
      : { userId, name: finalName, url, mode, selector: selector!, type, intervalMinutes };

  try {
    await prisma.tracker.create({ data });
  } catch (err) {
    console.error("[createTracker]", err);
    return { message: "Не удалось создать трекер. Попробуйте позже." };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteTracker(formData: FormData): Promise<void> {
  const { userId } = await verifySession();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;

  // Удаляем только если трекер принадлежит текущему пользователю
  await prisma.tracker.deleteMany({ where: { id, userId } });
  revalidatePath("/dashboard");
}
