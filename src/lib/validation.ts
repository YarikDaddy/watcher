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
