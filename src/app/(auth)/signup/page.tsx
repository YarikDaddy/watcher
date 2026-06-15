import AuthForm from "../auth-form";
import { signup } from "@/app/actions/auth";

export default function SignupPage() {
  return (
    <AuthForm
      action={signup}
      title="Регистрация в Watcher"
      submitLabel="Создать аккаунт"
      altText="Уже есть аккаунт?"
      altHref="/login"
      altLabel="Войти"
    />
  );
}
