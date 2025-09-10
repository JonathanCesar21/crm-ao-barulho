// src/pages/seller/Kanban.jsx
import React, { useMemo, useState, useCallback } from "react";
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
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

/* ============================= */
/* Helpers de exibição           */
/* ============================= */
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
/* Badge do vendedor             */
/* ============================= */
function SellerBadge({ sellerUid }) {
  if (!sellerUid) {
    return <span className="kbA-chip ml-2 text-[10px]">não atribuído</span>;
  }
  const short = String(sellerUid).slice(0, 4).toUpperCase();
  return <span className="kbA-chip ml-2 text-[10px]">{short}</span>;
}

/* ============================= */
/* TemplatePicker (WhatsApp)     */
/* ============================= */
function TemplatePicker({ stage, templates, lead, onPick }) {
  const items = useMemo(() => {
    const list = [];
    const push = (label, text) => text && list.push({ label, text });

    push(stage, templates?.[stage]?.text);
    push("todas as etapas", templates?.todas?.text || templates?.all?.text);

    Object.keys(templates || {}).forEach((k) => {
      if (k === stage || k === "todas" || k === "all") return;
      push(k, templates[k]?.text);
    });

    return list;
  }, [templates, stage]);

  const preview = useCallback(
    (t) => {
      const nome = getLeadDisplayName(lead);
      const telefone = getLeadPhone(lead);
      const cidade = getLeadCity(lead);
      return t
        .replace(/\{\{nome\}\}/gi, nome)
        .replace(/\{\{telefone\}\}/gi, telefone)
        .replace(/\{\{cidade\}\}/gi, cidade);
    },
    [lead]
  );

  if (items.length === 0) {
    return <div className="text-[12px] text-neutral-500">Sem templates para esta etapa.</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((it, idx) => (
        <button
          key={idx}
          type="button"
          className="kbA-card"
          style={{ textAlign: "left" }}
          onClick={() => onPick(preview(it.text))}
          title={`Inserir template: ${it.label}`}
        >
          <div className="text-[12px] text-neutral-500 mb-1">• {it.label}</div>
          <div className="text-[13px]" style={{ whiteSpace: "pre-wrap" }}>
            {preview(it.text)}
          </div>
        </button>
      ))}
    </div>
  );
}

/* ============================= */
/* Modal simples                 */
/* ============================= */
function LeadModal({ open, onClose, lead, stage, templates }) {
  const [tab, setTab] = useState("dados"); // "dados" | "whats"
  const [msg, setMsg] = useState("");

  if (!open) return null;

  const phoneDigits = onlyDigits(getLeadPhone(lead));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
      style={{ background: "rgba(15,23,42,0.35)" }}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-xl border"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-4 py-3 border-b flex items-center justify-between"
          style={{ background: "#f8fafc" }}
        >
          <div className="font-semibold">
            {getLeadDisplayName(lead)} <span className="text-neutral-500">• {stage}</span>
          </div>
          <button className="kbA-chip" onClick={onClose}>
            Fechar
          </button>
        </div>

        <div className="px-4 pt-3">
          <div className="flex gap-2 mb-3">
            <button
              className={`kbA-chip ${tab === "dados" ? "bg-[var(--primary-weak)] text-[var(--primary)]" : ""}`}
              onClick={() => setTab("dados")}
            >
              Dados
            </button>
            <button
              className={`kbA-chip ${tab === "whats" ? "bg-[var(--primary-weak)] text-[var(--primary)]" : ""}`}
              onClick={() => setTab("whats")}
            >
              WhatsApp
            </button>
          </div>

          {tab === "dados" && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <div className="text-[12px] text-neutral-500">Nome</div>
                <div className="font-medium">{getLeadDisplayName(lead)}</div>
              </div>
              <div>
                <div className="text-[12px] text-neutral-500">Telefone</div>
                <div className="font-medium">{getLeadPhone(lead) || "—"}</div>
              </div>
              <div>
                <div className="text-[12px] text-neutral-500">Cidade</div>
                <div className="font-medium">{getLeadCity(lead)}</div>
              </div>
              <div>
                <div className="text-[12px] text-neutral-500">Campanha</div>
                <div className="font-medium">{lead?.campanha || lead?.campaign || "—"}</div>
              </div>
            </div>
          )}

          {tab === "whats" && (
            <div className="grid grid-cols-5 gap-4">
              <div className="col-span-2">
                <div className="text-[12px] text-neutral-500 mb-2">Templates disponíveis</div>
                <TemplatePicker
                  stage={stage}
                  templates={templates}
                  lead={lead}
                  onPick={(texto) => setMsg(texto)}
                />
              </div>
              <div className="col-span-3">
                <div className="text-[12px] text-neutral-500 mb-2">
                  Mensagem (pré-visualização / editar)
                </div>
                <textarea
                  className="w-full border rounded-lg p-2"
                  rows={10}
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  placeholder="Selecione um template à esquerda ou escreva sua mensagem…"
                />
                <div className="mt-2 flex gap-2 flex-wrap">
                  <a
                    className="kbA-chip"
                    href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(msg)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir no WhatsApp
                  </a>
                  <button className="kbA-chip" onClick={() => navigator.clipboard.writeText(msg)}>
                    Copiar mensagem
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t bg-white rounded-b-xl"></div>
      </div>
    </div>
  );
}

/* ============================= */
/* LeadCard (conteúdo do card)   */
/* ============================= */
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

/* ============================= */
/* Sortable wrapper — drag no card inteiro */
/* ============================= */
function SortableLeadCard({ lead, stage, onOpen }) {
  const id = lead.id || lead.uid;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="kbA-card"
      {...attributes}
      {...listeners}       // drag no card inteiro
      onClick={onOpen}     // clique abre modal
    >
      <LeadCard lead={lead} stage={stage} />
    </div>
  );
}

/* ============================= */
/* Kanban Column  (agora DROPPABLE) */
/* ============================= */
function Column({ stage, leads, onOpenLead }) {
  // Torna a coluna uma área "dropável"
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

/* ============================= */
/* Board completo (com DnD)      */
/* ============================= */
function Board({ itemsByStage, onMove, onOpenLead }) {
  const stages = KANBAN_STAGES.filter((s) => s in (itemsByStage || {}));

  // Sensores: sem activationConstraint para garantir disparo
  const sensors = useSensors(useSensor(PointerSensor));

  const [activeLead, setActiveLead] = useState(null);

  const findStageOfId = useCallback(
    (id) => {
      for (const st of stages) {
        const arr = itemsByStage[st] || [];
        if (arr.some((x) => (x.id || x.uid) === id)) return st;
      }
      return null;
    },
    [itemsByStage, stages]
  );

  function handleDragStart(event) {
    const id = event.active.id;
    const fromStage = findStageOfId(id);
    const item =
      (itemsByStage[fromStage] || []).find((x) => (x.id || x.uid) === id) ||
      null;
    setActiveLead(item);
    console.debug("[DND] start", { id, fromStage });
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    console.debug("[DND] end", { active: active?.id, over: over?.id });

    setActiveLead(null);
    if (!over) return;

    const activeId = active.id;
    const fromStage = findStageOfId(activeId);

    // over.id pode ser o id de um CARD (lead) ou o id da COLUNA (stage)
    let toStage = findStageOfId(over.id);
    if (!toStage) {
      // se não achou pelo card, assume que é uma coluna droppable
      toStage = over.id;
    }

    if (!fromStage || !toStage) return;
    if (fromStage === toStage) return; // ignorar reordenar (sem persistir ordem)

    // chama o hook para persistir no Firestore
    onMove?.(fromStage, toStage, activeId);
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
            leads={itemsByStage[stage] || []}
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
/* PÁGINA KANBAN (único arquivo) */
/* ============================= */
export default function Kanban() {
  const {
    loading,
    itemsByStage,
    onMove,
    q,
    setQ,
    counts,
    campaigns,
    campaign,
    setCampaign,
  } = useKanban();

  const { templates } = useTemplates(); // { [stage]: {text}, todas?: {text} }
  const [modal, setModal] = useState({ open: false, lead: null, stage: "" });

  const openLead = (lead, stage) => setModal({ open: true, lead, stage });
  const closeLead = () => setModal({ open: false, lead: null, stage: "" });

  if (loading) {
    return (
      <div className="kbA-page">
        <div className="kbA-loading">Carregando Kanban…</div>
      </div>
    );
  }

  return (
    <div className="kbA-page">
      {/* Topbar */}
      <header className="kbA-topbar">
        <div>
          <h1 className="kbA-title">Kanban de Vendas</h1>
          <p className="kbA-subtitle">
            Acompanhe seus leads por etapa e avance oportunidades com eficiência.
          </p>
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

      {/* Legend */}
      <section className="kbA-legend" aria-label="Etapas do funil">
        {KANBAN_STAGES.map((stage, idx) => (
          <div key={stage} className={`kbA-pill kbA-pill--${idx % 6}`}>
            <span className="kbA-pill-dot" />
            <span className="kbA-pill-label">{stage}</span>
            <span className="kbA-pill-count">{counts?.[stage] ?? 0}</span>
          </div>
        ))}
      </section>

      {/* Board */}
      <main className="kbA-boardWrap">
        <Board itemsByStage={itemsByStage} onMove={onMove} onOpenLead={openLead} />
      </main>

      {/* Modal único (dados + WhatsApp com templates) */}
      <LeadModal
        open={modal.open}
        onClose={closeLead}
        lead={modal.lead}
        stage={modal.stage}
        templates={templates}
      />
    </div>
  );
}
