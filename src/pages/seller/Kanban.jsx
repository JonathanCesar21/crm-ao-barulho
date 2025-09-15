// src/pages/seller/Kanban.jsx
import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { KANBAN_STAGES } from "../../constants/kanbanStages";
import { useKanban } from "../../hooks/useKanban";
import { useTemplates } from "../../hooks/useTemplates";
import "../../styles/kanban.css";

/* ===== DND-KIT ===== */
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ============================= */
/* Helpers de exibição           */

function normStage(s = "") {
  return String(s)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim();
}
function getCampaignLabel(c) {
  if (typeof c === "string") return c;
  if (c && typeof c === "object") return c.name ?? "";
  return "";
}
function getLeadDisplayName(lead) {
  return (
    lead?.nome ||
    lead?.name ||
    lead?.title ||
    lead?.cliente?.nome ||
    lead?.contact?.name ||
    lead?.whatsappName ||
    "(Sem nome)"
  );
}
function getLeadCity(lead) {
  return lead?.cidade || lead?.city || lead?.endereco?.cidade || "Cidade não informada";
}
function getLeadPhone(lead) {
  return lead?.telefone || lead?.phone || lead?.contact?.phone || "";
}
function getInitials(name) {
  const s = (name || "").toString().trim();
  if (!s) return "LD";
  const parts = s.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]).join("").toUpperCase();
}
function onlyDigits(s) {
  return (s || "").toString().replace(/\D/g, "");
}

/* ============================= */
/* CANON: estágios e mapeamentos */
/* ============================= */
function useStageCanon() {
  return useMemo(() => {
    const normToLabel = {};
    KANBAN_STAGES.forEach((label) => {
      normToLabel[normStage(label)] = label;
    });
    const labelToNorm = {};
    Object.entries(normToLabel).forEach(([n, label]) => (labelToNorm[label] = n));

    const canonLabel = (s) => normToLabel[normStage(s)] ?? s;
    const canonNorm = (s) => labelToNorm[canonLabel(s)] ?? normStage(s);

    return { normToLabel, labelToNorm, canonLabel, canonNorm };
  }, []);
}

/* ============================= */
/* Badge do vendedor             */
function SellerBadge({ sellerUid }) {
  if (!sellerUid) {
    return <span className="kbA-chip ml-2 text-[10px]">não atribuído</span>;
  }
  const short = String(sellerUid).slice(0, 4).toUpperCase();
  return <span className="kbA-chip ml-2 text-[10px]">{short}</span>;
}

/* ============================= */
/* TemplatePicker (WhatsApp)     */
function TemplatePicker({ items, lead, onPick }) {
  // items: array [{ id, text, scope, campaign }]
  const preview = useCallback(
    (t) => {
      const nome = getLeadDisplayName(lead);
      const telefone = getLeadPhone(lead);
      const cidade = getLeadCity(lead);
      const primeiroNome = (nome || "").split(/\s+/)[0] || "";
      return String(t || "")
        .replace(/\{\{nome\}\}/gi, nome)
        .replace(/\{\{primeironome\}\}/gi, primeiroNome)
        .replace(/\{\{telefone\}\}/gi, telefone)
        .replace(/\{\{cidade\}\}/gi, cidade);
    },
    [lead]
  );

  if (!items || items.length === 0) {
    return <div className="text-[12px] text-neutral-500">Sem templates para esta etapa/campanha.</div>;
  }

  const label = (it) =>
    it.scope === "campaign" ? `Campanha: ${it.campaign || "—"}`
      : it.scope === "store" ? "Loja"
        : "Global";

  return (
    <div className="flex flex-col gap-2">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          className="kbA-card"
          style={{ textAlign: "left" }}
          onClick={() => onPick(preview(it.text))}
          title={`Inserir template (${label(it)})`}
        >
          <div className="text-[12px] text-neutral-500 mb-1">• {label(it)}</div>
          <div className="text-[13px]" style={{ whiteSpace: "pre-wrap" }}>
            {preview(it.text)}
          </div>
        </button>
      ))}
    </div>
  );
}


/* ============================= */
/* Portal simples                 */
function ModalPortal({ children }) {
  const elRef = useRef(null);
  if (!elRef.current) elRef.current = document.createElement("div");

  useEffect(() => {
    const el = elRef.current;
    // 🔑 tenta achar o escopo da página para herdar as CSS vars
    const host =
      document.querySelector(".kbA-page") // herda --primary, --success, etc.
      || document.body;                    // fallback

    host.appendChild(el);
    return () => {
      host.removeChild(el);
    };
  }, []);

  return ReactDOM.createPortal(children, elRef.current);
}

/* ============================= */
/* Modal com seletor de estágio  */
function LeadModal({ open, onClose, lead, stage, getTemplatesFor, onChangeStage }) {
  const [tab, setTab] = useState("dados"); // "dados" | "whats"
  const [msg, setMsg] = useState("");
  const selectRef = useRef(null);
  const campaignName =
    lead?.campanha || lead?.campaign || ""; // pegue do lead (ou do filtro ativo, se preferir)

  const filteredTemplates = useMemo(() => {
    return getTemplatesFor
      ? getTemplatesFor({ stage, campaign: campaignName, storeId: lead?.storeId || lead?.lojaId })
      : [];
  }, [getTemplatesFor, stage, campaignName, lead?.storeId, lead?.lojaId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !lead) return null;

  const phoneDigits = onlyDigits(getLeadPhone(lead));
  const stages = KANBAN_STAGES;
  const idx = stages.indexOf(stage);
  const proximo = idx >= 0 && idx < stages.length - 1 ? stages[idx + 1] : null;

  return (
    <ModalPortal>
      <div
        className="kbA-modalOverlay"
        onClick={onClose}
        aria-modal="true"
        role="dialog"
        aria-label="Detalhes do lead"
      >
        <div
          className="kbA-modalPanel"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="kbA-modalHeader">
            <div className="kbA-modalTitle">
              <div className="kbA-modalAvatar">{getInitials(getLeadDisplayName(lead))}</div>
              <div className="kbA-modalTitleText">
                <div className="kbA-modalName">{getLeadDisplayName(lead)}</div>
                <div className="kbA-modalStage">
                  Etapa atual: <b>{stage}</b>
                </div>
              </div>
            </div>

            <div className="kbA-modalActions">
              <select
                ref={selectRef}
                className="kbA-select kbA-select--tight"
                value={stage}
                onChange={(e) => {
                  const toStage = String(e.target.value || "").trim();
                  if (toStage && toStage !== stage) onChangeStage?.(toStage);
                }}
                title="Alterar estágio"
              >
                {KANBAN_STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <button
                className="kbA-btn kbA-btn--success"
                disabled={!proximo}
                onClick={() => proximo && onChangeStage?.(proximo)}
                title="Avançar para a próxima etapa"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M13 5l7 7-7 7M5 19V5" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
                {proximo ? `Avançar` : "Última etapa"}
              </button>

              <button className="kbA-btn kbA-btn--neutral" onClick={onClose}>
                Fechar
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="kbA-tabs">
            <button
              className={`kbA-tab ${tab === "dados" ? "is-active" : ""}`}
              onClick={() => setTab("dados")}
            >
              Dados
            </button>
            <button
              className={`kbA-tab ${tab === "whats" ? "is-active" : ""}`}
              onClick={() => setTab("whats")}
            >
              WhatsApp
            </button>
          </div>

          {/* Body */}
          <div className="kbA-modalBody">
            {tab === "dados" && (
              <div className="kbA-detailsGrid">
                <div>
                  <div className="kbA-fieldLabel">Nome</div>
                  <div className="kbA-fieldValue">{getLeadDisplayName(lead)}</div>
                </div>
                <div>
                  <div className="kbA-fieldLabel">Telefone</div>
                  <div className="kbA-fieldValue">{getLeadPhone(lead) || "—"}</div>
                </div>
                <div>
                  <div className="kbA-fieldLabel">Cidade</div>
                  <div className="kbA-fieldValue">{getLeadCity(lead)}</div>
                </div>
                <div>
                  <div className="kbA-fieldLabel">Campanha</div>
                  <div className="kbA-fieldValue">{lead?.campanha || lead?.campaign || "—"}</div>
                </div>
              </div>
            )}

            {tab === "whats" && (
              <div className="kbA-whatsGrid">
                <div className="kbA-whatsTemplates">
                  <div className="kbA-sectionTitle">Templates disponíveis</div>
                  <TemplatePicker
                    items={filteredTemplates}
                    lead={lead}
                    onPick={(texto) => setMsg(texto)}
                  />
                </div>
                <div className="kbA-whatsComposer">
                  <div className="kbA-sectionTitle">Mensagem</div>
                  <textarea
                    className="kbA-textarea"
                    rows={10}
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                    placeholder="Selecione um template à esquerda ou escreva sua mensagem…"
                  />
                  <div className="kbA-actionsRow">
                    <a
                      className="kbA-btn kbA-btn--whatsapp"
                      href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(msg)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M20.52 3.48A11.93 11.93 0 0012.06 0 11.94 11.94 0 000 11.94a11.8 11.8 0 001.64 6.03L0 24l6.21-1.63a11.94 11.94 0 005.85 1.54h.01c6.59 0 11.94-5.35 11.94-11.93a11.9 11.9 0 00-3.49-8.5zM12.07 21.2h-.01a9.29 9.29 0 01-4.74-1.29l-.34-.2-3.69.97.99-3.6-.22-.37a9.33 9.33 0 01-1.43-4.97 9.37 9.37 0 019.39-9.38 9.37 9.37 0 019.38 9.38c0 5.18-4.22 9.36-9.33 9.36zm5.34-6.98c-.29-.15-1.7-.84-1.96-.93-.26-.1-.45-.15-.64.15-.19.29-.74.92-.91 1.11-.17.19-.34.22-.63.07-.29-.15-1.23-.45-2.34-1.44-.86-.76-1.44-1.7-1.61-1.99-.17-.29-.02-.45.13-.6.13-.13.29-.34.43-.52.15-.19.19-.33.29-.55.1-.22.05-.41-.02-.56-.07-.15-.64-1.54-.88-2.11-.23-.56-.47-.49-.64-.5h-.55c-.19 0-.56.08-.85.41-.29.34-1.12 1.1-1.12 2.7 0 1.6 1.15 3.14 1.31 3.35.15.19 2.26 3.45 5.48 4.83.76.33 1.35.52 1.81.67.76.24 1.45.21 2 .13.61-.09 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.11-.26-.18-.55-.33z" fill="currentColor" />
                      </svg>
                      Abrir no WhatsApp
                    </a>

                    <button
                      className="kbA-btn kbA-btn--primary"
                      onClick={() => navigator.clipboard.writeText(msg)}
                    >
                      Copiar mensagem
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer (espaço opcional para futuras ações) */}
          <div className="kbA-modalFooter" />
        </div>
      </div>
    </ModalPortal>
  );
}

/* ============================= */
/* LeadCard, Sortable, Column, Board — permanecem iguais */
function LeadCard({ lead }) {
  const name = getLeadDisplayName(lead);
  const city = getLeadCity(lead);
  const phone = getLeadPhone(lead);
  const initials = getInitials(name);

  return (
    <>
      <div className="kbA-card__row">
        <div className="kbA-avatar">{initials}</div>

        <div className="kbA-card__main">
          <div className="flex items-center gap-2 min-w-0">
            <div className="kbA-card__title">{name}</div>
            <SellerBadge sellerUid={lead?.sellerUid} />
          </div>
          <div className="kbA-card__subtitle">{city}</div>
        </div>
      </div>

      <div className="kbA-card__meta">
        {phone ? (
          <span className="kbA-chip">📞 {phone}</span>
        ) : (
          <span className="kbA-chip opacity-70">📞 sem telefone</span>
        )}
        {lead?.campanha || lead?.campaign ? (
          <span className="kbA-chip">🎯 {lead.campanha || lead.campaign}</span>
        ) : null}
        {lead?.valor || lead?.value ? (
          <span className="kbA-chip">💰 {lead.valor || lead.value}</span>
        ) : null}
      </div>
    </>
  );
}

function SortableLeadCard({ lead, stage, onOpen }) {
  const id = lead.id || lead.uid;
  const { attributes, listeners, setNodeRef } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(undefined), transition: undefined, cursor: "pointer" };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="kbA-card"
      onClick={onOpen}
      onKeyDown={(e) => (e.key === "Enter" ? onOpen() : null)}
      tabIndex={0}
      role="button"
      aria-label="Abrir detalhes do lead"
    >
      <button
        className="kbA-dragHandle"
        {...listeners}
        {...attributes}
        onClick={(e) => e.stopPropagation()}
        title="Arrastar para mover"
        aria-label="Arrastar cartão"
      >
        ⋮⋮
      </button>

      <LeadCard lead={lead} stage={stage} />
    </div>
  );
}

function Column({ stage, leads, onOpenLead }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <section className="kbA-column">
      <div className="kbA-columnHeader">
        <span className="kbA-colDot" />
        <span className="kbA-colTitle">{stage}</span>
        <span className="kbA-colCount">{leads.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className={`kbA-columnContent ${isOver ? "kbA-dropHover" : ""}`}
      >
        <SortableContext
          items={leads.map((l) => l.id || l.uid)}
          strategy={rectSortingStrategy}
        >
          {leads.map((lead) => (
            <SortableLeadCard
              key={lead.id || lead.uid}
              lead={lead}
              stage={stage}
              onOpen={() => onOpenLead(lead, stage)}
            />
          ))}
        </SortableContext>
      </div>
    </section>
  );
}

function Board({ itemsByStage, onMove, onOpenLead }) {
  const { canonLabel, canonNorm } = useStageCanon();
  const stages = KANBAN_STAGES;

  const itemsCanon = useMemo(() => {
    const acc = {};
    stages.forEach((label) => (acc[label] = []));
    Object.entries(itemsByStage || {}).forEach(([stageKey, arr]) => {
      const label = canonLabel(stageKey);
      if (!acc[label]) acc[label] = [];
      acc[label].push(...(arr || []));
    });
    return acc;
  }, [itemsByStage, stages, canonLabel]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const [activeLead, setActiveLead] = useState(null);

  const findStageOfId = useCallback(
    (id) => {
      for (const st of stages) {
        const arr = itemsCanon[st] || [];
        if (arr.some((x) => (x.id || x.uid) === id)) return st;
      }
      return null;
    },
    [itemsCanon, stages]
  );

  function handleDragStart(event) {
    const id = event.active.id;
    const fromStage = findStageOfId(id);
    const item =
      (itemsCanon[fromStage] || []).find((x) => (x.id || x.uid) === id) ||
      null;
    setActiveLead(item);
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    setActiveLead(null);
    if (!over) return;

    const activeId = active.id;
    const fromLabel = findStageOfId(activeId);
    let toLabel = findStageOfId(over.id) || over.id;

    if (!fromLabel || !toLabel) return;
    if (fromLabel === toLabel) return;

    const fromNorm = canonNorm(fromLabel);
    const toNorm = canonNorm(toLabel);

    onMove?.(fromLabel, toLabel, activeId);
    onMove?.(fromNorm, toNorm, activeId);
    onMove?.({ from: fromLabel, to: toLabel, id: activeId });
    onMove?.({ from: fromNorm, to: toNorm, id: activeId });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="kbA-board">
        {stages.map((stage) => (
          <Column
            key={stage}
            stage={stage}
            leads={itemsCanon[stage] || []}
            onOpenLead={onOpenLead}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeLead ? (
          <div className="kbA-card kbA-dragOverlay">
            <div className="flex items-start gap-3">
              <div className="kbA-avatar">
                {getInitials(getLeadDisplayName(activeLead))}
              </div>
              <div className="min-w-0">
                <div className="font-medium truncate">
                  {getLeadDisplayName(activeLead)}
                </div>
                <div className="text-[12px] text-neutral-500 truncate">
                  {getLeadCity(activeLead)}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/* ============================= */
/* Página */
export default function Kanban() {
  const {
    loading,
    itemsByStage,
    onMove,
    q,
    setQ,
    campaigns,
    campaign,
    setCampaign,
  } = useKanban();

  const { canonLabel, canonNorm } = useStageCanon();
  const { getTemplatesFor } = useTemplates();

  const [modal, setModal] = useState({ open: false, lead: null, stage: "" });

  const openLead = (lead, stage) =>
    setModal({ open: true, lead, stage: canonLabel(stage) });

  const closeLead = () => setModal({ open: false, lead: null, stage: "" });

  const changeStageFromModal = useCallback(
    (toStageRaw) => {
      if (!modal.lead) return;

      const fromLabel = canonLabel(modal.stage);
      const toLabel = canonLabel(toStageRaw);
      if (!toLabel || toLabel === fromLabel) return;

      const id = modal.lead.id || modal.lead.uid;

      const fromNorm = canonNorm(fromLabel);
      const toNorm = canonNorm(toLabel);

      console.log("[KANBAN] changeStageFromModal:", {
        fromStage: fromLabel,
        toStage: toLabel,
        fromNorm,
        toNorm,
        id,
      });

      try {
        onMove?.(fromLabel, toLabel, id);
        onMove?.(fromNorm, toNorm, id);
        onMove?.({ from: fromLabel, to: toLabel, id, lead: modal.lead });
        onMove?.({ from: fromNorm, to: toNorm, id, lead: modal.lead });
      } catch (err) {
        console.error("[KANBAN] onMove throw:", err);
      }

      setModal((m) => ({ ...m, stage: toLabel }));
    },
    [modal.lead, modal.stage, onMove, canonLabel, canonNorm]
  );

  if (loading) {
    return (
      <div className="kbA-page">
        <div className="kbA-loading">Carregando Kanban…</div>
      </div>
    );
  }

  return (
    <div className="kbA-page">
      <header className="kbA-topbar">
        <div>
          <h1 className="kbA-title">Kanban de Vendas</h1>
        </div>

        <div className="kbA-topbar-right">
          <input
            className="kbA-input"
            value={q || ""}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, telefone…"
            title="Buscar"
          />
          <select
            className="kbA-select"
            value={campaign || ""}
            onChange={(e) => setCampaign(e.target.value)}
            title="Campanha"
          >
            {(campaigns?.length ?? 0) === 0 ? (
              <option value="">(sem campanha)</option>
            ) : (
              <>
                <option value="">Todas as campanhas</option>
                {campaigns.map((c) => {
                  const label = getCampaignLabel(c);
                  return (
                    <option key={label || "sem-nome"} value={label}>
                      {label || "(sem nome)"}
                    </option>
                  );
                })}
              </>
            )}
          </select>
        </div>
      </header>

      <main className="kbA-boardWrap">
        <Board itemsByStage={itemsByStage} onMove={onMove} onOpenLead={openLead} />
      </main>

      <LeadModal
        open={modal.open}
        onClose={closeLead}
        lead={modal.lead}
        stage={canonLabel(modal.stage)}
        getTemplatesFor={getTemplatesFor}
        onChangeStage={changeStageFromModal}
      />
    </div>
  );
}
