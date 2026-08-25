import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "@/components/admin/login-form";

export const metadata = { title: "Entrar no painel" };

export default async function LoginPage() {
  if (await getSession()) redirect("/admin");
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <LoginForm />
    </div>
  );
}
