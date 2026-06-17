import AuthForm from "../auth-form";
import { signup } from "@/app/actions/auth";
import { getLocale, getDict } from "@/lib/i18n";

export default async function SignupPage() {
  const dict = getDict(await getLocale());
  return <AuthForm action={signup} mode="signup" dict={dict.auth} />;
}
