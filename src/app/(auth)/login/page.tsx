import AuthForm from "../auth-form";
import { login } from "@/app/actions/auth";

export default function LoginPage() {
  return (
    <AuthForm
      action={login}
      title="Вход в Watcher"
      submitLabel="Войти"
      altText="Нет аккаунта?"
      altHref="/signup"
      altLabel="Зарегистрироваться"
    />
  );
}
