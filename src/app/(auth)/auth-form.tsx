"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthFormState } from "@/lib/validation";
import type { Dict } from "@/lib/i18n";

type AuthAction = (
  state: AuthFormState,
  formData: FormData
) => Promise<AuthFormState>;

type Props = {
  action: AuthAction;
  mode: "login" | "signup";
  dict: Dict["auth"];
};

export default function AuthForm({ action, mode, dict }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);

  const isLogin = mode === "login";
  const title = isLogin ? dict.loginTitle : dict.signupTitle;
  const submitLabel = isLogin ? dict.loginSubmit : dict.signupSubmit;
  const altText = isLogin ? dict.noAccount : dict.haveAccount;
  const altHref = isLogin ? "/signup" : "/login";
  const altLabel = isLogin ? dict.signupLink : dict.loginLink;

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 text-2xl font-semibold">{title}</h1>

      <form action={formAction} className="flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            {dict.email}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-lg border border-line bg-sunken px-3 py-2 outline-none focus:border-accent"
          />
          {state?.errors?.email?.map((e) => (
            <p key={e} className="mt-1 text-sm text-down">
              {e}
            </p>
          ))}
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            {dict.password}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            required
            className="w-full rounded-lg border border-line bg-sunken px-3 py-2 outline-none focus:border-accent"
          />
          {state?.errors?.password?.map((e) => (
            <p key={e} className="mt-1 text-sm text-down">
              {e}
            </p>
          ))}
        </div>

        {state?.message && (
          <p className="text-sm text-down">{state.message}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-4 py-2 font-medium text-white hover:brightness-110 disabled:opacity-50"
        >
          {pending ? "..." : submitLabel}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-mute">
        {altText}{" "}
        <Link href={altHref} className="text-accent hover:underline">
          {altLabel}
        </Link>
      </p>
    </div>
  );
}
