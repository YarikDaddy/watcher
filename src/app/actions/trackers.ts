"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import {
  makeTrackerSchema,
  FREE_TIER_TRACKER_LIMIT,
  type TrackerFormState,
} from "@/lib/validation";
import { isKnownAsset, assetLabel } from "@/lib/assets";
import { getLocale, getDict } from "@/lib/i18n";

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
  const dict = getDict(await getLocale());

  const parsed = makeTrackerSchema(dict.val).safeParse({
    name: formData.get("name") ?? undefined,
    url: formData.get("url") ?? undefined,
    mode: formData.get("mode") ?? undefined,
    selector: formData.get("selector") ?? undefined,
    type: formData.get("type") ?? undefined,
    asset: formData.get("asset") ?? undefined,
    assetCondition: formData.get("assetCondition") ?? undefined,
    threshold: formData.get("threshold") ?? undefined,
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
    return { message: dict.errors.limitReached(FREE_TIER_TRACKER_LIMIT) };
  }

  const { name, url, mode, selector, type, asset, assetCondition, threshold, intervalMinutes } =
    parsed.data;

  let data;
  if (mode === "ASSET") {
    if (!asset || !isKnownAsset(asset)) {
      return { errors: { asset: [dict.errors.pickAssetFromList] } };
    }
    data = {
      userId,
      name: name || assetLabel(asset),
      mode,
      asset,
      assetCondition,
      threshold,
      type: "TEXT_CHANGE" as const,
      intervalMinutes,
    };
  } else if (mode === "PRICE") {
    // Цену определяем автоматически, сравнение всегда по тексту цены.
    data = {
      userId,
      name: name || hostnameOf(url!),
      url,
      mode,
      selector: null,
      type: "TEXT_CHANGE" as const,
      intervalMinutes,
    };
  } else {
    data = { userId, name: name || hostnameOf(url!), url, mode, selector: selector!, type, intervalMinutes };
  }

  try {
    await prisma.tracker.create({ data });
  } catch (err) {
    console.error("[createTracker]", err);
    return { message: dict.errors.createFailed };
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
