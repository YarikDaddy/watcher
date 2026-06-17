"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession, deleteSession } from "@/lib/session";
import {
  makeSignupSchema,
  makeLoginSchema,
  type AuthFormState,
} from "@/lib/validation";
import { getLocale, getDict } from "@/lib/i18n";

export async function signup(
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const locale = await getLocale();
  const dict = getDict(locale);
  const parsed = makeSignupSchema(dict.val).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: z_flatten(parsed.error) };
  }

  const { email, password } = parsed.data;

  try {
    const passwordHash = await hashPassword(password);
    // Запоминаем язык пользователя — чтобы алерты в Telegram приходили на нём.
    const user = await prisma.user.create({ data: { email, passwordHash, locale } });
    await createSession(user.id);
  } catch (err) {
    // Уникальный индекс по email — пользователь уже есть
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { errors: { email: [dict.errors.emailExists] } };
    }
    console.error("[signup]", err);
    return { message: dict.errors.signupFailed };
  }

  redirect("/dashboard");
}

export async function login(
  _state: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const dict = getDict(await getLocale());
  const parsed = makeLoginSchema(dict.val).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: z_flatten(parsed.error) };
  }

  const { email, password } = parsed.data;
  const genericError: AuthFormState = { message: dict.errors.invalidCredentials };

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return genericError;

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return genericError;

    await createSession(user.id);
  } catch (err) {
    console.error("[login]", err);
    return { message: dict.errors.loginFailed };
  }

  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}

// Приводим ZodError к форме { email?: string[]; password?: string[] }
function z_flatten(error: import("zod").ZodError) {
  const fieldErrors: { email?: string[]; password?: string[] } = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (key === "email" || key === "password") {
      (fieldErrors[key] ??= []).push(issue.message);
    }
  }
  return fieldErrors;
}
