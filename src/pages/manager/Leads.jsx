import { useEffect, useMemo, useState } from "react";
import { useRole } from "../../contexts/RoleContext";
import { listSellersOfShop } from "../../services/usersService";
import {
  subscribeLeadsByShop,
  assignLeadToSeller,
  deleteLeadById,
} from "../../services/leadsService";
import toast from "react-hot-toast";

function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function LeadsLoja() {
  const { shopId } = useRole();
  const [rows, setRows] = useState([]);
  const [sellers, setSellers] = useState([]);

  // filtros
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(""); // "" = todos

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
      await assignLeadToSeller(shopId, leadId, sellerUid || null);
      toast.success("Lead atribuído.");
    } catch {
      toast.error("Falha ao atribuir lead.");
    }
  }

  async function onDelete(leadId) {
    const ok = window.confirm("Tem certeza que deseja excluir este lead?");
    if (!ok) return;
    try {
      await deleteLeadById(shopId, leadId);
      toast.success("Lead excluído.");
    } catch (e) {
      console.error(e);
      toast.error("Falha ao excluir lead.");
    }
  }

  // opções de etapas (deriva do que existe + padrão)
  const defaultStages = ["Novo", "Contato", "Qualificado", "Fechamento", "Ganho", "Perdido"];
  const stageSet = new Set([
    ...defaultStages,
    ...rows.map((r) => r.stage).filter(Boolean),
  ]);
  const stageOptions = Array.from(stageSet);

  // aplica filtros
  const filtered = useMemo(() => {
    const nq = normalize(q);
    return rows.filter((r) => {
      const matchName = nq ? normalize(r.nome).includes(nq) : true;
      const matchStatus = status ? (r.stage || "Novo") === status : true;
      return matchName && matchStatus;
    });
  }, [rows, q, status]);

  return (
    <div className="space-y-4">
      {/* header / filtros */}
      <div className="card p-3 rounded-lg border">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-medium">Leads da Loja</h3>
            <p className="text-sm text-neutral-600">
              Pesquise, filtre por etapa e atribua vendedores aos leads.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Pesquisar por nome…"
              className="border rounded-lg px-3 py-1.5 text-sm w-56"
            />
            <select
              className="border rounded-lg px-3 py-1.5 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              title="Filtrar por status"
            >
              <option value="">Todas as etapas</option>
              {stageOptions.map((stg) => (
                <option key={stg} value={stg}>
                  {stg}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* tabela */}
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
            {filtered.map((r) => (
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
                <td className="p-2 flex items-center gap-2">
                  <button className="px-3 py-1.5 rounded-lg border hover:bg-black/5 transition">
                    Detalhes
                  </button>
                  <button
                    onClick={() => onDelete(r.id)}
                    className="px-3 py-1.5 rounded-lg border hover:bg-red-50 text-red-700 border-red-300 transition"
                    title="Excluir lead"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={6} className="p-3 text-neutral-600">
                  Nenhum lead encontrado com os filtros atuais.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
