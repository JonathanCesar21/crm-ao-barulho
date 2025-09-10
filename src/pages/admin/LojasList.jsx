import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { listShops, upsertShop } from "../../services/shopsService";

export default function LojasList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shopId, setShopId] = useState("");
  const [name, setName] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      setRows(await listShops());
    } catch (e) {
      console.error(e);
      toast.error("Falha ao carregar lojas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function onCreate(e) {
    e.preventDefault();
    if (!shopId) return toast.error("Informe um ID de loja (ex.: loja-1).");
    try {
      await upsertShop(shopId.trim(), { name: name.trim() });
      toast.success("Loja criada/atualizada.");
      setShopId(""); setName("");
      await refresh();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar loja.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h3 className="font-medium mb-2">Lojas</h3>
        <form onSubmit={onCreate} className="flex flex-col md:flex-row gap-3">
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="ID da loja (ex.: loja-1)"
            value={shopId}
            onChange={(e) => setShopId(e.target.value)}
          />
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Nome da loja (opcional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="px-4 py-2 rounded-lg bg-black text-white hover:opacity-90 transition">
            Salvar
          </button>
        </form>
      </div>

      <div className="border rounded-lg overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-black/5">
              <th className="text-left p-2">ID</th>
              <th className="text-left p-2">Nome</th>
              <th className="text-left p-2">Ativa</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="p-3 text-neutral-600">Carregando…</td></tr>
            ) : rows.length ? (
              rows.map(r => (
                <tr key={r.id} className="border-t">
                  <td className="p-2 font-mono">{r.id}</td>
                  <td className="p-2">{r.name || "—"}</td>
                  <td className="p-2">{r.active ? "Sim" : "Não"}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={3} className="p-3 text-neutral-600">Nenhuma loja.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
