// src/components/kanban/Column.jsx
import { useDroppable } from "@dnd-kit/core";
import LeadCard from "../lead/LeadCard";

export default function Column({ stage, items = [] }) {
  // Área droppable da coluna (para soltar cards)
  const { setNodeRef, isOver } = useDroppable({ id: `col:${stage}` });

  return (
    <div ref={setNodeRef} className={isOver ? "bg-black/5 -m-2 p-2 rounded-lg" : ""}>
      {items.length === 0 ? (
        <div className="text-sm text-neutral-600">Sem leads nesta etapa.</div>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <LeadCard key={it.id} stage={stage} lead={it} sortableId={`${stage}|${it.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
