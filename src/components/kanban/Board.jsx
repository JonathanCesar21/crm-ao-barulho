// src/components/kanban/Board.jsx
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import Column from "./Column";

/**
 * Board: cada coluna tem SortableContext com itens = ["stage|leadId"]
 * onDragEnd: detecta coluna destino por over.id (col:Stage) ou pelo id do card sobre o qual soltou.
 */
export default function Board({ stages = [], itemsByStage = {}, onMove, counts = {}, toolbarRight }) {
  function onDragEnd(e) {
    const { active, over } = e;
    if (!active || !over) return;

    const activeId = String(active.id);                // "FromStage|leadId"
    const [fromStage, leadId] = activeId.split("|");

    let toStage = fromStage;
    const overId = String(over.id);

    if (overId.startsWith("col:")) {
      toStage = overId.slice(4);                       // "col:Stage" -> "Stage"
    } else if (overId.includes("|")) {
      toStage = overId.split("|")[0];                  // "Stage|otherLeadId" -> "Stage"
    }

    if (toStage && toStage !== fromStage && leadId) {
      onMove(leadId, toStage);
    }
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium">Quadro</h4>
        {toolbarRight}
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(260px, 1fr))` }}>
        {stages.map((stage) => {
          const items = itemsByStage[stage] || [];
          const total = counts?.[stage] ?? items.length;

          return (
            <div key={stage} className="card">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{stage}</h4>
                <span className="text-xs px-2 py-1 rounded bg-black/5">{total}</span>
              </div>

              {/* Contexto de ordenação por coluna; ids = ["Stage|leadId"] */}
              <SortableContext
                id={`col:${stage}`}
                items={items.map((i) => `${stage}|${i.id}`)}
                strategy={verticalListSortingStrategy}
              >
                <Column stage={stage} items={items} />
              </SortableContext>
            </div>
          );
        })}
      </div>
    </DndContext>
  );
}
