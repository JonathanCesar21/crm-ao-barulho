import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import clsx from "clsx";
import { getAdminCreatedFlag, setAdminCreatedFlag } from "../../services/configService";
import { registerFirstAdmin } from "../../services/authService";
import { Shield, LogIn } from "lucide-react";

export default function Setup() {
  const nav = useNavigate();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const [displayName, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPass] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const adminExists = await getAdminCreatedFlag();
        if (adminExists) {
          nav("/login", { replace: true });
          return;
        }
        setAllowed(true);
      } catch (e) {
        console.error(e);
        toast.error("Falha ao verificar configuração.");
      } finally {
        setChecking(false);
      }
    })();
  }, [nav]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!displayName || !email || !password) {
      toast.error("Preencha nome, e-mail e senha.");
      return;
    }
    setLoading(true);
    try {
      await registerFirstAdmin({ email: email.trim(), password, displayName: displayName.trim() });
      await setAdminCreatedFlag(); // marca que já foi criado
      toast.success("Administrador criado!");
      nav("/admin/dashboard", { replace: true });
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível criar o admin.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen grid-center">
        <span className="text-neutral-600">Verificando…</span>
      </div>
    );
  }

  if (!allowed) return null;

  return (
    <div className="min-h-screen grid-center px-4">
      <div className="w-full max-w-md border rounded-lg p-6 shadow-sm bg-white">
        <div className="mb-4 text-center">
          <Shield size={28} />
          <h1 className="text-2xl font-semibold mt-2">Configurar administrador</h1>
          <p className="text-sm text-neutral-600">
            Crie o <b>primeiro</b> administrador do sistema.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="text-sm text-neutral-700">Nome</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Seu nome"
              value={displayName}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-neutral-700">E-mail</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              type="email"
              placeholder="voce@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div>
            <label className="text-sm text-neutral-700">Senha</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              type="password"
              placeholder="mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPass(e.target.value)}
              autoComplete="new-password"
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
            <Shield size={18} />
            {loading ? "Criando..." : "Criar administrador"}
          </button>
        </form>

        <div className="flex items-center justify-between mt-3 text-sm">
          <Link to="/login" className="text-neutral-700 hover:underline inline-flex items-center gap-1">
            <LogIn size={14} /> Ir para login
          </Link>
          <Link to="/" className="text-neutral-700 hover:underline">Home</Link>
        </div>

        <p className="text-[11px] text-neutral-500 mt-3">
          Após criar, acesse o painel do administrador e finalize as configurações.
        </p>
      </div>
    </div>
  );
}
