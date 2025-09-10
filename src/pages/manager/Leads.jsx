import { useEffect, useState } from "react";
import { useRole } from "../../contexts/RoleContext";
import { listSellersOfShop } from "../../services/usersService";
import { subscribeLeadsByShop, assignLeadToSeller } from "../../services/leadsService";
import toast from "react-hot-toast";

export default function LeadsLoja() {
  const { shopId } = useRole();
  const [rows, setRows] = useState([]);
  const [sellers, setSellers] = useState([]);

  useEffect(() => {
    if (!shopId) return;
    const unsub = subscribeLeadsByShop(shopId, (list) => setRows(list));
    return () => unsub && unsub();
  }, [shopId]);

  useEffect(() => {
    (async () => {
      if (!shopId) return;
      setSellers(await listSellersOfShop(shopId));
    })();
  }, [shopId]);

  async function onAssign(leadId, sellerUid) {
    try {
      await assignLeadToSeller(shopId, leadId, sellerUid);
      toast.success("Lead atribuído.");
    } catch {
      toast.error("Falha ao atribuir lead.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h3 className="font-medium mb-2">Leads da Loja</h3>
        <p className="text-sm text-neutral-600">Atribua vendedores aos leads.</p>
      </div>

      <div className="border rounded-lg overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-black/5">
              <th className="text-left p-2">Nome</th>
              <th className="text-left p-2">Telefone</th>
              <th className="text-left p-2">Cidade</th>
              <th className="text-left p-2">Etapa</th>
              <th className="text-left p-2">Vendedor</th>
              <th className="text-left p-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.nome || "—"}</td>
                <td className="p-2">{r.telefone || "—"}</td>
                <td className="p-2">{r.cidade || "—"}</td>
                <td className="p-2">{r.stage || "Novo"}</td>
                <td className="p-2">
                  <select
                    className="border rounded px-2 py-1"
                    value={r.sellerUid || ""}
                    onChange={(e) => onAssign(r.id, e.target.value || null)}
                  >
                    <option value="">— Sem vendedor —</option>
                    {sellers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.displayName || s.email || s.id}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <button className="px-3 py-1.5 rounded-lg border hover:bg-black/5 transition">
                    Detalhes
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="p-3 text-neutral-600">
                  Nenhum lead encontrado. Faça upload do CSV em “Leads (Upload CSV)”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
