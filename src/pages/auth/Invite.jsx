// src/pages/auth/Invite.jsx
import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import clsx from "clsx";
import { getSellerInviteByCode } from "../../services/usersService";
import { registerSellerWithInvite } from "../../services/authService";
import { UserPlus } from "lucide-react";

export default function Invite() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const shopId = params.get("shopId") || "";
  const code = params.get("code") || "";

  const [checking, setChecking] = useState(true);
  const [invite, setInvite] = useState(null);
  const [displayName, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPass] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (!shopId || !code) {
          toast.error("Convite inválido.");
          nav("/login", { replace: true });
          return;
        }
        const inv = await getSellerInviteByCode(shopId, code);
        if (!inv || inv.uid) {
          toast.error("Convite não encontrado ou já utilizado.");
          nav("/login", { replace: true });
          return;
        }
        setInvite(inv);
        setEmail(inv.email || "");
        setName(inv.displayName || "");
      } catch (e) {
        console.error(e);
        toast.error("Falha ao validar convite.");
        nav("/login", { replace: true });
      } finally {
        setChecking(false);
      }
    })();
  }, [shopId, code, nav]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!displayName || !email || !password) {
      toast.error("Preencha nome, e-mail e senha.");
      return;
    }
    setLoading(true);
    try {
      await registerSellerWithInvite({
        shopId,
        sellerId: invite.id,
        email: email.trim(),
        password,
        displayName: displayName.trim(),
      });
      toast.success("Cadastro concluído! Bem-vindo 👋");
      nav("/seller/kanban", { replace: true });
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível concluir o cadastro.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen grid-center">
        <span className="text-neutral-600">Verificando convite…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid-center px-4">
      <div className="w-full max-w-md border rounded-lg p-6 shadow-sm bg-white">
        <div className="mb-4 text-center">
          <UserPlus size={28} />
          <h1 className="text-2xl font-semibold mt-2">Convite de vendedor</h1>
          <p className="text-sm text-neutral-600">
            Loja: <b>{shopId}</b>
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
            <UserPlus size={18} />
            {loading ? "Criando..." : "Criir conta"}
          </button>
        </form>

        <div className="flex items-center justify-between mt-3 text-sm">
          <Link to="/login" className="text-neutral-700 hover:underline">Já tenho conta</Link>
          <Link to="/" className="text-neutral-700 hover:underline">Home</Link>
        </div>
      </div>
    </div>
  );
}
