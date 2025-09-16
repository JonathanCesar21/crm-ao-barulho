// src/components/Leads.jsx
import { useMemo, useState } from "react";

function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function LeadsTable({
  rows = [],
  sellers = [],
  onAssign,
  onDelete,
  showCampaignColumn = false,
}) {
  // filtros locais
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const defaultStages = ["Novo", "Contato", "Qualificado", "Fechamento", "Ganho", "Perdido"];
  const stageSet = new Set([
    ...defaultStages,
    ...rows.map((r) => r.stage).filter(Boolean),
  ]);
  const stageOptions = Array.from(stageSet);

  const filtered = useMemo(() => {
    const nq = normalize(q);
    return rows.filter((r) => {
      const matchName = nq
        ? normalize(r.nome || r.name || "").includes(nq) ||
          normalize(r.telefone || r.phone || "").includes(nq)
        : true;
      const matchStatus = status ? (r.stage || "Novo") === status : true;
      return matchName && matchStatus;
    });
  }, [rows, q, status]);

  return (
    <div className="ml-leads">
      {/* filtros */}
      <div className="ml-toolbar">
        <input
          className="ml-input"
          placeholder="Pesquisar por nome/telefone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="ml-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          title="Filtrar por etapa"
        >
          <option value="">Todas as etapas</option>
          {stageOptions.map((stg) => (
            <option key={stg} value={stg}>{stg}</option>
          ))}
        </select>
      </div>

      {/* tabela */}
      <div className="ml-tableWrap">
        <table className="ml-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telefone</th>
              <th>Cidade</th>
              <th>Etapa</th>
              {showCampaignColumn && <th>Campanha</th>}
              <th>Vendedor</th>
              <th style={{width: 160}}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.nome || r.name || "—"}</td>
                <td>{r.telefone || r.phone || "—"}</td>
                <td>{r.cidade || r.city || "—"}</td>
                <td>{r.stage || "Novo"}</td>
                {showCampaignColumn && <td>{r.campanha || r.campaign || "—"}</td>}
                <td>
                  <select
                    className="ml-select"
                    value={r.sellerUid || ""}
                    onChange={(e) => onAssign?.(r.id, e.target.value || null)}
                  >
                    <option value="">— Sem vendedor —</option>
                    {sellers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.displayName || s.email || s.id}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="ml-actions">
                  <button className="ml-btn">Detalhes</button>
                  <button
                    className="ml-btn ml-btn-danger"
                    onClick={() => onDelete?.(r.id)}
                    title="Excluir lead"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={showCampaignColumn ? 7 : 6} className="ml-empty">
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
