// src/components/lead/LeadCard.jsx
import { useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Phone } from "lucide-react";
import { buildWaLinkForStage } from "../../lib/whatsapp";
import { useRole } from "../../contexts/RoleContext";
import { useTemplates } from "../../hooks/useTemplates";

function SellerBadge({ sellerUid }) {
  if (!sellerUid) return <span className="text-[10px] px-2 py-0.5 rounded bg-black/5 ml-2">não atribuído</span>;
  const short = sellerUid.slice(0, 4).toUpperCase();
  return <span className="text-[10px] px-2 py-0.5 rounded bg-black/5 ml-2">{short}</span>;
}

export default function LeadCard({ lead, stage, sortableId }) {
  const { shopId } = useRole();
  const { templates } = useTemplates();

  const tplText = templates?.[stage]?.text || "";
  const leadWithTpl = { ...lead, templateTextForStage: tplText };

  // useSortable: id deve ser único — usamos "stage|leadId"
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
  });

  const style = useMemo(() => {
    const s = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.6 : 1,
    };
    return s;
  }, [transform, transition, isDragging]);

  const wa = buildWaLinkForStage({
    shopId,
    stage,
    lead: leadWithTpl,
    fallback: `Olá ${lead?.nome?.split(" ")[0] || ""}! Podemos falar rapidinho?`,
  });

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className="border rounded-lg p-3 bg-white shadow-sm">
      <div className="font-medium">
        {lead?.nome || "Sem nome"} <SellerBadge sellerUid={lead?.sellerUid} />
      </div>
      <div className="text-sm text-neutral-600">
        {lead?.cidade || "Cidade não informada"}
      </div>
      <div className="mt-2">
        <a href={wa} target="_blank" rel="noreferrer"
           className="inline-flex items-center gap-2 text-sm border px-3 py-1.5 rounded-lg hover:bg-black/5 transition">
          <Phone size={16} /> WhatsApp
        </a>
      </div>
    </div>
  );
}
