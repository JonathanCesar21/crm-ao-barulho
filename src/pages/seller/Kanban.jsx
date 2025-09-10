// src/pages/seller/Kanban.jsx
import Board from "../../components/kanban/Board";
import { KANBAN_STAGES } from "../../constants/kanbanStages";
import { useKanban } from "../../hooks/useKanban";

export default function Kanban() {
  const {
    loading,
    itemsByStage,
    onMove,
    q, setQ,
    counts,
    campaigns, campaign, setCampaign,
  } = useKanban();

  if (loading) {
    return <div className="text-neutral-600">Carregando Kanban…</div>;
  }

  const toolbarRight = (
    <div className="flex items-center gap-2">
      <select
        className="border rounded-lg px-2 py-1.5 text-sm"
        value={campaign || ""}
        onChange={(e) => setCampaign(e.target.value)}
        title="Campanha"
      >
        {campaigns.length === 0 ? (
          <option value="">(sem campanha)</option>
        ) : (
          campaigns.map((c) => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))
        )}
      </select>

      <input
        className="border rounded-lg px-3 py-1.5 text-sm"
        placeholder="Buscar por nome/telefone/cidade"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">Kanban</h3>
      <Board
        stages={KANBAN_STAGES}
        itemsByStage={itemsByStage}
        onMove={onMove}
        counts={counts}
        toolbarRight={toolbarRight}
      />
    </div>
  );
}
