// src/pages/auth/Login.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Mail, Lock, LogIn } from "lucide-react";
import clsx from "clsx";
import { loginWithEmail } from "../../services/authService";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPass] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha e-mail e senha.");
      return;
    }
    setLoading(true);
    try {
      const { profile } = await loginWithEmail(email.trim(), password);
      if (!profile) {
        toast.error("Perfil não encontrado. Contate o administrador.");
        return;
      }
      toast.success("Bem-vindo!");
      // Redireciona por papel
      if (profile.role === "admin") nav("/admin/dashboard", { replace: true });
      else if (profile.role === "manager") nav("/manager/dashboard", { replace: true });
      else nav("/seller/kanban", { replace: true });
    } catch (err) {
      console.error(err);
      const code = err?.code || "";
      if (code.includes("auth/invalid-credential")) {
        toast.error("Credenciais inválidas.");
      } else {
        toast.error("Falha no login.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid-center px-4">
      <div className="w-full max-w-md border rounded-lg p-6 shadow-sm bg-white">
        <div className="mb-4 text-center">
          <img src="/src/assets/logo.svg" alt="CRM Ao Barulho" height={40} />
          <h1 className="text-2xl font-semibold mt-2">Entrar</h1>
          <p className="text-sm text-neutral-600">
            Acesse com sua conta de administrador, gerente ou vendedor.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="border rounded-lg px-3 py-2 flex items-center gap-2">
            <Mail size={18} className="text-neutral-600" />
            <input
              className="w-full"
              type="email"
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="border rounded-lg px-3 py-2 flex items-center gap-2">
            <Lock size={18} className="text-neutral-600" />
            <input
              className="w-full"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPass(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className={clsx(
              "w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg",
              "bg-black text-white hover:opacity-90 transition"
            )}
            disabled={loading}
          >
            <LogIn size={18} />
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="flex items-center justify-between mt-3 text-sm">
          <Link to="/forgot-password" className="text-neutral-700 hover:underline">
            Esqueci minha senha
          </Link>
          <Link to="/" className="text-neutral-700 hover:underline">Voltar</Link>
        </div>
      </div>
    </div>
  );
}
