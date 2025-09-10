import { useMemo, useState, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import LeadModal from "./LeadModal";

function SellerBadge({ sellerUid }) {
  if (!sellerUid)
    return (
      <span className="text-[10px] px-2 py-0.5 rounded bg-black/5 ml-2">
        não atribuído
      </span>
    );
  const short = sellerUid.slice(0, 4).toUpperCase();
  return (
    <span className="text-[10px] px-2 py-0.5 rounded bg-black/5 ml-2">
      {short}
    </span>
  );
}

export default function LeadCard({ lead, stage, sortableId }) {
  const [modalOpen, setModalOpen] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: sortableId });

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.6 : 1,
    }),
    [transform, transition, isDragging]
  );

  const openModal = useCallback((e) => {
    e.stopPropagation();
    setModalOpen(true);
  }, []);

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        className="border rounded-lg p-3 bg-white shadow-sm hover:bg-black/5 transition cursor-pointer"
        onClick={openModal}
      >
        <div className="flex justify-between items-start">
          <div>
            <div className="font-medium">
              {lead?.nome || "Sem nome"} <SellerBadge sellerUid={lead?.sellerUid} />
            </div>
            <div className="text-sm text-neutral-600">
              {lead?.cidade || "Cidade não informada"}
            </div>
          </div>

          {/* handle de drag */}
          <div
            {...listeners}
            className="cursor-grab px-2 text-neutral-400 hover:text-neutral-600"
            title="Arrastar para mudar etapa"
            onClick={(e) => e.stopPropagation()} // impede de abrir modal ao clicar no handle
          >
            ☰
          </div>
        </div>
      </div>

      <LeadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        lead={lead}
        stage={stage}
      />
    </>
  );
}
