import AuthForm from "../auth-form";
import { login } from "@/app/actions/auth";
import { getLocale, getDict } from "@/lib/i18n";

export default async function LoginPage() {
  const dict = getDict(await getLocale());
  return <AuthForm action={login} mode="login" dict={dict.auth} />;
}
