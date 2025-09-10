// src/pages/manager/Vendedores.jsx
import { useEffect, useState } from "react";
import { useRole } from "../../contexts/RoleContext";
import {
  listSellersOfShop,
  toggleSellerActive,
  deleteSeller,
} from "../../services/usersService";
import { registerSellerByManager } from "../../services/authService";
import toast from "react-hot-toast";
import { Mail, UserPlus, Trash2, ToggleRight } from "lucide-react";

export default function Vendedores() {
  const { shopId } = useRole();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [displayName, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPass] = useState("");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    if (!shopId) return;
    setLoading(true);
    try {
      const list = await listSellersOfShop(shopId);
      setRows(list);
    } catch (e) {
      console.error(e);
      toast.error("Falha ao carregar vendedores.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, [shopId]);

  async function onCreate(e) {
    e.preventDefault();
    if (!displayName || !email || !password) {
      toast.error("Informe nome, e-mail e senha.");
      return;
    }
    setSaving(true);
    try {
      await registerSellerByManager({
        shopId,
        displayName: displayName.trim(),
        email: email.trim(),
        password,
      });
      toast.success("Vendedor criado!");
      setName(""); setEmail(""); setPass("");
      await refresh();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao criar vendedor.");
    } finally {
      setSaving(false);
    }
  }

  async function onToggle(item) {
    try {
      await toggleSellerActive(shopId, item.id, !item.active);
      toast.success(`Vendedor ${!item.active ? "ativado" : "desativado"}.`);
      await refresh();
    } catch {
      toast.error("Falha ao atualizar status.");
    }
  }

  async function onDelete(item) {
    if (!confirm("Remover este vendedor da loja?")) return;
    try {
      await deleteSeller(shopId, item.id);
      toast.success("Removido.");
      await refresh();
    } catch {
      toast.error("Falha ao remover.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h3 className="font-medium mb-2">Vendedores</h3>
        <p className="text-sm text-neutral-600">
          Crie contas de vendedores vinculadas a esta loja. O vendedor poderá fazer login com e-mail e senha.
        </p>
      </div>

      <form onSubmit={onCreate} className="card grid md:grid-cols-3 gap-3 md:items-end">
        <div>
          <label className="text-sm text-neutral-700">Nome</label>
          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Ex.: Maria Souza"
            value={displayName}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm text-neutral-700">E-mail</label>
          <div className="border rounded-lg px-3 py-2 flex items-center gap-2">
            <Mail size={16} className="text-neutral-600" />
            <input
              className="w-full"
              placeholder="maria@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
            />
          </div>
        </div>
        <div>
          <label className="text-sm text-neutral-700">Senha</label>
          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="mín. 6 caracteres"
            value={password}
            onChange={(e) => setPass(e.target.value)}
            type="password"
          />
        </div>
        <div className="md:col-span-3">
          <button
            className="px-4 py-2 rounded-lg bg-black text-white hover:opacity-90 transition inline-flex items-center gap-2"
            disabled={saving}
          >
            <UserPlus size={16} /> {saving ? "Criando..." : "Criar vendedor"}
          </button>
        </div>
      </form>

      <div className="border rounded-lg overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-black/5">
              <th className="text-left p-2">Nome</th>
              <th className="text-left p-2">E-mail</th>
              <th className="text-left p-2">Ativo</th>
              <th className="text-left p-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-3 text-neutral-600" colSpan={4}>Carregando…</td></tr>
            ) : rows.length ? (
              rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.displayName || "—"}</td>
                  <td className="p-2">{r.email || "—"}</td>
                  <td className="p-2">{r.active ? "Sim" : "Não"}</td>
                  <td className="p-2 space-x-2">
                    <button onClick={() => onToggle(r)} className="px-3 py-1.5 rounded-lg border hover:bg-black/5 transition inline-flex items-center gap-1">
                      <ToggleRight size={16} /> {r.active ? "Desativar" : "Ativar"}
                    </button>
                    <button onClick={() => onDelete(r)} className="px-3 py-1.5 rounded-lg border hover:bg-black/5 transition inline-flex items-center gap-1">
                      <Trash2 size={16} /> Remover
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td className="p-3 text-neutral-600" colSpan={4}>Nenhum vendedor.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
