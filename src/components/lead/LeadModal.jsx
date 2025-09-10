import TemplatePicker from "../TemplatePicker";
import { useState, useCallback } from "react";
import { injectLeadVars } from "../../lib/whatsapp";
import { useTemplates } from "../../hooks/useTemplates";

export default function LeadModal({ open, onClose, lead, stage }) {
  const { templates } = useTemplates();
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleChooseTemplate = useCallback(
    (templateId, text) => {
      const phone = String(lead?.telefone || "").replace(/\D/g, "");
      if (!phone) {
        alert("Este lead não possui telefone válido.");
        return;
      }
      const firstName = (lead?.nome || "").split(" ")[0] || "";
      const msg = text
        ? injectLeadVars(text, { lead, firstName })
        : `Olá ${firstName}! Podemos falar rapidinho?`;

      const link = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
      window.open(link, "_blank", "noopener,noreferrer");
      setPickerOpen(false);
    },
    [lead]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg w-full max-w-lg p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Detalhes do Lead</h2>
          <button
            onClick={onClose}
            className="px-2 py-1 rounded border hover:bg-black/5"
          >
            ✕
          </button>
        </div>

        <div className="space-y-2 text-sm">
          <div><b>Nome:</b> {lead?.nome}</div>
          <div><b>Telefone:</b> {lead?.telefone || "—"}</div>
          <div><b>Cidade:</b> {lead?.cidade || "—"}</div>
          <div><b>Origem:</b> {lead?.origem || "—"}</div>
          <div><b>Observação:</b> {lead?.observacao || "—"}</div>
          <div><b>Etapa:</b> {stage}</div>
        </div>

        <div className="mt-4">
          <button
            className="px-3 py-1.5 rounded border hover:bg-black/5"
            onClick={() => setPickerOpen(true)}
          >
            Enviar WhatsApp
          </button>
        </div>

        <TemplatePicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          stage={stage}
          lead={lead}
          templatesById={templates}
          onChooseTemplate={handleChooseTemplate}
        />
      </div>
    </div>
  );
}
