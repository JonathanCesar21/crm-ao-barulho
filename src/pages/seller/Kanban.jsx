// src/pages/seller/Kanban.jsx
import Board from "../../components/kanban/Board";
import { KANBAN_STAGES } from "../../constants/kanbanStages";
import { useKanban } from "../../hooks/useKanban";
import { useTemplates } from "../../hooks/useTemplates";
import { injectLeadVars } from "../../lib/whatsapp";
import TemplatePicker from "../../components/TemplatePicker";
import { useState, useMemo, useCallback } from "react";
import "./kanban.css"; // <<<<<< IMPORTANTE

export default function Kanban() {
  const {
    loading,
    itemsByStage,
    onMove,
    q, setQ,
    counts,
    campaigns, campaign, setCampaign,
  } = useKanban();

  // Templates globais (admin cria; vendedor apenas lê)
  const { loading: loadingTpls, templates } = useTemplates();

  // Controle do modal TemplatePicker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerStage, setPickerStage] = useState(null);
  const [pickerLead, setPickerLead] = useState(null);

  const openPicker = useCallback((lead, stage) => {
    setPickerLead(lead || null);
    setPickerStage(stage || null);
    setPickerOpen(true);
  }, []);
  const closePicker = useCallback(() => setPickerOpen(false), []);

  const toolbarRight = (
    <div className="flex items-center gap-2 kb-toolbar">
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

  // Handler de clique no WhatsApp vindo do Card (veja patch no item 3)
  const handleWhatsAppClick = useCallback((lead, stage) => {
    // Abre modal de seleção de template para esta etapa
    openPicker(lead, stage);
  }, [openPicker]);

  // Monta e abre link do WhatsApp
  const sendWhatsApp = useCallback((tplText) => {
    const phone = String(pickerLead?.telefone || "").replace(/\D/g, "");
    const firstName = (pickerLead?.nome || "").split(" ")[0] || "";
    const message = tplText
      ? injectLeadVars(tplText, { lead: pickerLead, firstName })
      : `Olá ${firstName}! Podemos falar rapidinho?`;

    const link = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(link, "_blank", "noopener,noreferrer");
  }, [pickerLead]);

  // Escolha no TemplatePicker
  const onChooseTemplate = useCallback((templateId, text) => {
    // Se null => saudação padrão
    sendWhatsApp(text || null);
    closePicker();
  }, [sendWhatsApp, closePicker]);

  if (loading) {
    return <div className="text-neutral-600">Carregando Kanban…</div>;
  }

  return (
    <div className="seller-kanban space-y-4">
      <h3 className="text-xl font-semibold">Kanban</h3>

      <Board
        stages={KANBAN_STAGES}
        itemsByStage={itemsByStage}
        onMove={onMove}
        counts={counts}
        toolbarRight={toolbarRight}
        // >>>>> NOVO: callback para botão WhatsApp do card
        onWhatsApp={handleWhatsAppClick}
      />

      {/* Modal de escolha de template */}
      <TemplatePicker
        open={pickerOpen}
        onClose={closePicker}
        stage={pickerStage}
        lead={pickerLead}
        templatesById={templates}
        onChooseTemplate={onChooseTemplate}
      />
    </div>
  );
}
