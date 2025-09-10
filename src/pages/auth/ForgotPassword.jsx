// src/pages/auth/ForgotPassword.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Mail, SendHorizonal } from "lucide-react";
import clsx from "clsx";
import { sendReset } from "../../services/authService";

export default function ForgotPassword() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (!email) {
      toast.error("Informe o e-mail.");
      return;
    }
    setLoading(true);
    try {
      await sendReset(email.trim());
      toast.success("Enviamos um link de redefinição para seu e-mail.");
      nav("/login", { replace: true });
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível enviar o e-mail.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid-center px-4">
      <div className="w-full max-w-md border rounded-lg p-6 shadow-sm bg-white">
        <h1 className="text-2xl font-semibold mb-2">Redefinir senha</h1>
        <p className="text-sm text-neutral-600 mb-4">
          Informe o e-mail da sua conta para receber um link de redefinição.
        </p>

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

          <button
            type="submit"
            className={clsx(
              "w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg",
              "bg-black text-white hover:opacity-90 transition"
            )}
            disabled={loading}
          >
            <SendHorizonal size={18} />
            {loading ? "Enviando..." : "Enviar link"}
          </button>
        </form>

        <div className="flex items-center justify-between mt-3 text-sm">
          <Link to="/login" className="text-neutral-700 hover:underline">
            Voltar ao login
          </Link>
          <Link to="/" className="text-neutral-700 hover:underline">Home</Link>
        </div>
      </div>
    </div>
  );
}
