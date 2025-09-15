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
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acentos
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
    // Ex.: { "novo": "Novo", "contatado": "Contatado", ... }
    const normToLabel = {};
    KANBAN_STAGES.forEach((label) => {
      normToLabel[normStage(label)] = label;
    });
    const labelToNorm = {};
    Object.entries(normToLabel).forEach(([n, label]) => (labelToNorm[label] = n));

    const canonLabel = (s) => normToLabel[normStage(s)] ?? s; // volta para o Label oficial se existir
    const canonNorm  = (s) => labelToNorm[canonLabel(s)] ?? normStage(s);

    return { normToLabel, labelToNorm, canonLabel, canonNorm };
  }, []);
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
/* Portal simples                 */
/* ============================= */
function ModalPortal({ children }) {
  const elRef = useRef(null);
  if (!elRef.current) elRef.current = document.createElement("div");

  useEffect(() => {
    const el = elRef.current;
    document.body.appendChild(el);
    return () => {
      document.body.removeChild(el);
    };
  }, []);

  return ReactDOM.createPortal(children, elRef.current);
}

/* ============================= */
/* Modal com seletor de estágio  */
/* ============================= */
function LeadModal({ open, onClose, lead, stage, templates, onChangeStage }) {
  const [tab, setTab] = useState("dados"); // "dados" | "whats"
  const [msg, setMsg] = useState("");
  const selectRef = useRef(null);

  // ESC para fechar e travar scroll do body enquanto o modal está aberto
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
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ background: "#f8fafc" }}>
            <div className="font-semibold">
              {getLeadDisplayName(lead)} <span className="text-neutral-500">• {stage}</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                ref={selectRef}
                className="kbA-select"
                value={stage} // controlado pelo pai
                onChange={(e) => {
                  const toStage = String(e.target.value || "").trim();
                  if (toStage && toStage !== stage) {
                    onChangeStage?.(toStage);  // ⚡ troca imediata
                  }
                }}
                title="Alterar estágio"
              >
                {KANBAN_STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button
                className="kbA-chip"
                disabled={!proximo}
                onClick={() => proximo && onChangeStage?.(proximo)}
                title="Avançar para a próxima etapa"
              >
                {proximo ? `Avançar → ${proximo}` : "Última etapa"}
              </button>
              <button className="kbA-chip" onClick={onClose}>Fechar</button>
            </div>
          </div>

          {/* Body */}
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
    </ModalPortal>
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
/* Sortable: drag só no handle   */
/* ============================= */
function SortableLeadCard({ lead, stage, onOpen }) {
  const id = lead.id || lead.uid;
  const { attributes, listeners, setNodeRef } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(undefined),
    transition: undefined,
    cursor: "pointer",
  };

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

/* ============================= */
/* Kanban Column  (DROPPABLE)    */
/* ============================= */
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

/* ============================= */
/* Board completo (com DnD)      */
/* ============================= */
function Board({ itemsByStage, onMove, onOpenLead }) {
  const { canonLabel, canonNorm } = useStageCanon();

  // Garanta que só renderizamos colunas canônicas na mesma ordem do KANBAN_STAGES
  const stages = KANBAN_STAGES;

  // Remapeia qualquer chave "estranha" para o rótulo canônico
  const itemsCanon = useMemo(() => {
    const acc = {};
    stages.forEach((label) => (acc[label] = []));

    Object.entries(itemsByStage || {}).forEach(([stageKey, arr]) => {
      const label = canonLabel(stageKey); // volta para o label oficial
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
    let toLabel = findStageOfId(over.id) || over.id; // pode ser droppable da coluna

    if (!fromLabel || !toLabel) return;
    if (fromLabel === toLabel) return;

    // Chama o onMove com rótulo e com normalizado (compatibilidade)
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
/* PÁGINA KANBAN (único arquivo) */
/* ============================= */
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
  const { templates } = useTemplates();

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
        // formato (from, to, id)
        onMove?.(fromLabel, toLabel, id);
        onMove?.(fromNorm, toNorm, id);

        // formato objeto
        onMove?.({ from: fromLabel, to: toLabel, id, lead: modal.lead });
        onMove?.({ from: fromNorm, to: toNorm, id, lead: modal.lead });
      } catch (err) {
        console.error("[KANBAN] onMove throw:", err);
      }

      // atualização otimista do título do modal
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
        templates={templates}
        onChangeStage={changeStageFromModal}
      />
    </div>
  );
}
