"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import {
  TrackerSchema,
  FREE_TIER_TRACKER_LIMIT,
  type TrackerFormState,
} from "@/lib/validation";

export async function createTracker(
  _state: TrackerFormState,
  formData: FormData
): Promise<TrackerFormState> {
  const { userId } = await verifySession();

  const parsed = TrackerSchema.safeParse({
    name: formData.get("name"),
    url: formData.get("url"),
    selector: formData.get("selector"),
    type: formData.get("type"),
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

  try {
    await prisma.tracker.create({
      data: { userId, ...parsed.data },
    });
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
