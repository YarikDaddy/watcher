"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { makeClientSchema, type ClientFormState } from "@/lib/validation";
import { getLocale, getDict } from "@/lib/i18n";

/** Создаёт клиента (группу трекеров) текущего пользователя. */
export async function createClient(
  _state: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const { userId } = await verifySession();
  const dict = getDict(await getLocale());

  const parsed = makeClientSchema(dict.val).safeParse({ name: formData.get("name") ?? undefined });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? dict.errors.invalidData };
  }

  try {
    await prisma.client.create({ data: { userId, name: parsed.data.name } });
  } catch (err) {
    console.error("[createClient]", err);
    return { error: dict.errors.createFailed };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

/** Удаляет клиента. Трекеры не удаляются — отвязываются (clientId → null через SetNull). */
export async function deleteClient(formData: FormData): Promise<void> {
  const { userId } = await verifySession();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) return;

  // deleteMany со scope по userId — удаляем только своего клиента.
  await prisma.client.deleteMany({ where: { id, userId } });
  revalidatePath("/dashboard");
}
