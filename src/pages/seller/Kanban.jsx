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
/* Helpers                       */
function normStage(s = "") {
  return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
function getCampaignLabel(c) {
  if (typeof c === "string") return c;
  if (c && typeof c === "object") return c.name ?? "";
  return "";
}
function leadId(lead) {
  return lead?.id || lead?.uid || null;
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
function getLeadFirstName(lead) {
  const full = getLeadDisplayName(lead);
  return (full || "").split(/\s+/)[0] || "";
}
function getLeadCity(lead) {
  return lead?.cidade || lead?.city || lead?.endereco?.cidade || "Cidade não informada";
}
function getLeadPhone(lead) {
  return lead?.celular || lead?.telefone || lead?.phone || lead?.contact?.phone || "";
}
function getLeadCode(lead) {
  return lead?.codigo || lead?.code || "";
}
function getLeadGender(lead) {
  return lead?.genero || lead?.gender || "";
}
function getLeadAge(lead) {
  const v = lead?.idade ?? lead?.age ?? "";
  if (v === "" || v === null || typeof v === "undefined") return "";
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? "" : n;
}
function getLeadLastPurchase(lead) {
  return lead?.ultimaCompra || lead?.ultimaDataCompra || "";
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

/* ===== isMobile hook (sem libs) ===== */
function useIsMobile(bp = 768) {
  const [is, setIs] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(`(max-width:${bp}px)`).matches
      : false
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(`(max-width:${bp}px)`);
    const onChange = (e) => setIs(e.matches);
    try { mql.addEventListener("change", onChange); } catch { mql.onchange = onChange; }
    return () => {
      try { mql.removeEventListener("change", onChange); } catch { mql.onchange = null; }
    };
  }, [bp]);
  return is;
}

/* ============================= */
/* CANON: estágios               */
function useStageCanon() {
  return useMemo(() => {
    const normToLabel = {};
    KANBAN_STAGES.forEach((label) => { normToLabel[normStage(label)] = label; });
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
  if (!sellerUid) return <span className="kbA-chip ml-2 text-[10px]">não atribuído</span>;
  const short = String(sellerUid).slice(0, 4).toUpperCase();
  return <span className="kbA-chip ml-2 text-[10px]">{short}</span>;
}

/* ============================= */
/* TemplatePicker (WhatsApp)     */
function TemplatePicker({ items, lead, onPick }) {
  const preview = useCallback(
    (t) => {
      const nome = getLeadDisplayName(lead);
      const primeiroNome = getLeadFirstName(lead);
      const telefone = getLeadPhone(lead);
      const cidade = getLeadCity(lead);
      const codigo = getLeadCode(lead);
      const genero = getLeadGender(lead);
      const idade = getLeadAge(lead);
      const ultima = getLeadLastPurchase(lead);
      const campanha = lead?.campanha || lead?.campaign || "";
      return String(t || "")
        .replace(/\{\{nome\}\}/gi, nome)
        .replace(/\{\{primeironome\}\}/gi, primeiroNome)
        .replace(/\{\{telefone\}\}/gi, telefone)
        .replace(/\{\{cidade\}\}/gi, cidade)
        .replace(/\{\{codigo\}\}/gi, codigo)
        .replace(/\{\{genero\}\}/gi, genero)
        .replace(/\{\{idade\}\}/gi, (idade ?? "").toString())
        .replace(/\{\{ultimacompra\}\}/gi, ultima)
        .replace(/\{\{ultimadatacompra\}\}/gi, ultima)
        .replace(/\{\{campanha\}\}/gi, campanha);
    },
    [lead]
  );
  if (!items || items.length === 0) {
    return <div className="text-[12px] text-neutral-500">Sem templates para esta etapa/campanha.</div>;
  }
  const label = (it) =>
    it.scope === "campaign" ? `Campanha: ${it.campaign || "—"}`
      : it.scope === "store" ? "Loja" : "Global";
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
/* DESKTOP: Modal (permanece)    */
function ModalPortal({ children }) {
  const elRef = useRef(null);
  if (!elRef.current) elRef.current = document.createElement("div");
  useEffect(() => {
    const el = elRef.current;
    // joga no body (vamos usar z-index alto no CSS)
    document.body.appendChild(el);
    return () => { document.body.removeChild(el); };
  }, []);
  return ReactDOM.createPortal(children, elRef.current);
}
function LeadModal({ open, onClose, lead, stage, getTemplatesFor, onChangeStage }) {
  const [tab, setTab] = useState("dados");
  const [msg, setMsg] = useState("");
  const campaignName = lead?.campanha || lead?.campaign || "";
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

  const stages = KANBAN_STAGES;
  const idx = stages.indexOf(stage);
  const proximo = idx >= 0 && idx < stages.length - 1 ? stages[idx + 1] : null;

  return (
    <ModalPortal>
      <div className="kbA-modalOverlay" onClick={onClose} aria-modal="true" role="dialog" aria-label="Detalhes do lead">
        <div className="kbA-modalPanel" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="kbA-modalHeader">
            <div className="kbA-modalTitle">
              <div className="kbA-modalAvatar">{getInitials(getLeadDisplayName(lead))}</div>
              <div className="kbA-modalTitleText">
                <div className="kbA-modalName">{getLeadDisplayName(lead)}</div>
                <div className="kbA-modalStage">Etapa atual: <b>{stage}</b></div>
              </div>
            </div>
            <div className="kbA-modalActions">
              <select
                className="kbA-select kbA-select--tight"
                value={stage}
                onChange={(e) => {
                  const toStage = String(e.target.value || "").trim();
                  if (toStage && toStage !== stage) onChangeStage?.(toStage);
                }}
                title="Alterar estágio"
              >
                {KANBAN_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button className="kbA-btn kbA-btn--success" disabled={!proximo} onClick={() => proximo && onChangeStage?.(proximo)}>
                Avançar
              </button>
              <button className="kbA-btn kbA-btn--neutral" onClick={onClose}>Fechar</button>
            </div>
          </div>

          {/* Tabs */}
          <div className="kbA-tabs">
            <button className={`kbA-tab ${tab === "dados" ? "is-active" : ""}`} onClick={() => setTab("dados")}>Dados</button>
            <button className={`kbA-tab ${tab === "whats" ? "is-active" : ""}`} onClick={() => setTab("whats")}>WhatsApp</button>
          </div>

          {/* Body */}
          <div className="kbA-modalBody">
            {tab === "dados" && (
              <div className="kbA-detailsGrid">
                <Field label="Código" value={getLeadCode(lead) || "—"} />
                <Field label="Nome" value={getLeadDisplayName(lead)} />
                <Field label="Primeiro nome" value={getLeadFirstName(lead) || "—"} />
                <Field label="Telefone" value={getLeadPhone(lead) || "—"} />
                <Field label="Gênero" value={getLeadGender(lead) || "—"} />
                <Field label="Idade" value={getLeadAge(lead) || "—"} />
                <Field label="Última compra" value={getLeadLastPurchase(lead) || "—"} />
                <Field label="Cidade" value={getLeadCity(lead)} />
                <Field label="Campanha" value={lead?.campanha || lead?.campaign || "—"} />
              </div>
            )}

            {tab === "whats" && (
              <div className="kbA-whatsGrid">
                <div className="kbA-whatsTemplates">
                  <div className="kbA-sectionTitle">Templates disponíveis</div>
                  <TemplatePicker items={filteredTemplates} lead={lead} onPick={(texto) => setMsg(texto)} />
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
                      href={`https://wa.me/${onlyDigits(getLeadPhone(lead))}?text=${encodeURIComponent(msg)}`}
                      target="_blank" rel="noreferrer"
                    >
                      Abrir no WhatsApp
                    </a>
                    <button className="kbA-btn kbA-btn--primary" onClick={() => navigator.clipboard.writeText(msg)}>
                      Copiar mensagem
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="kbA-modalFooter" />
        </div>
      </div>
    </ModalPortal>
  );
}
function Field({ label, value }) {
  return (
    <div>
      <div className="kbA-fieldLabel">{label}</div>
      <div className="kbA-fieldValue">{value}</div>
    </div>
  );
}

/* ============================= */
/* MOBILE: telas full-screen     */
/* ============================= */

function MobileScreen({ title, onBack, right, children }) {
  return (
    <div className="kbM-screen">
      <div className="kbM-header">
        <button className="kbA-btn kbA-btn--neutral" onClick={onBack} aria-label="Voltar">←</button>
        <div className="kbM-title">{title}</div>
        <div className="kbM-right">{right || null}</div>
      </div>
      <div className="kbM-body">{children}</div>
    </div>
  );
}

function MobileLeadScreen({ lead, stage, onClose, onChangeStage, getTemplatesFor }) {
  const [tab, setTab] = useState("dados");
  const [msg, setMsg] = useState("");
  const campaignName = lead?.campanha || lead?.campaign || "";
  const filteredTemplates = useMemo(() => {
    return getTemplatesFor
      ? getTemplatesFor({ stage, campaign: campaignName, storeId: lead?.storeId || lead?.lojaId })
      : [];
  }, [getTemplatesFor, stage, campaignName, lead?.storeId, lead?.lojaId]);

  const stages = KANBAN_STAGES;
  const idx = stages.indexOf(stage);
  const proximo = idx >= 0 && idx < stages.length - 1 ? stages[idx + 1] : null;

  return (
    <MobileScreen
      title={getLeadDisplayName(lead)}
      onBack={onClose}
      right={
        <div className="flex gap-2">
          <select
            className="kbA-select kbA-select--tight"
            value={stage}
            onChange={(e) => onChangeStage?.(String(e.target.value || "").trim())}
            title="Alterar estágio"
          >
            {KANBAN_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="kbA-btn kbA-btn--success" disabled={!proximo} onClick={() => proximo && onChangeStage?.(proximo)}>
            Avançar
          </button>
        </div>
      }
    >
      <div className="kbM-tabs">
        <button className={`kbM-tab ${tab === "dados" ? "is-active" : ""}`} onClick={() => setTab("dados")}>Dados</button>
        <button className={`kbM-tab ${tab === "whats" ? "is-active" : ""}`} onClick={() => setTab("whats")}>WhatsApp</button>
      </div>

      {tab === "dados" && (
        <div className="kbA-detailsGrid" style={{ gridTemplateColumns: "1fr" }}>
          <Field label="Código" value={getLeadCode(lead) || "—"} />
          <Field label="Primeiro nome" value={getLeadFirstName(lead) || "—"} />
          <Field label="Telefone" value={getLeadPhone(lead) || "—"} />
          <Field label="Gênero" value={getLeadGender(lead) || "—"} />
          <Field label="Idade" value={getLeadAge(lead) || "—"} />
          <Field label="Última compra" value={getLeadLastPurchase(lead) || "—"} />
          <Field label="Cidade" value={getLeadCity(lead)} />
          <Field label="Campanha" value={lead?.campanha || lead?.campaign || "—"} />
        </div>
      )}

      {tab === "whats" && (
        <div className="kbA-whatsGrid" style={{ gridTemplateColumns: "1fr" }}>
          <div className="kbA-whatsTemplates">
            <div className="kbA-sectionTitle">Templates disponíveis</div>
            <TemplatePicker items={filteredTemplates} lead={lead} onPick={(texto) => setMsg(texto)} />
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
                href={`https://wa.me/${onlyDigits(getLeadPhone(lead))}?text=${encodeURIComponent(msg)}`}
                target="_blank" rel="noreferrer"
              >
                WhatsApp
              </a>
              <button className="kbA-btn kbA-btn--primary" onClick={() => navigator.clipboard.writeText(msg)}>
                Copiar
              </button>
            </div>
          </div>
        </div>
      )}
    </MobileScreen>
  );
}

function MobileFiltersScreen({
  q, setQ,
  campaigns, campaign, setCampaign,
  phoneFilter, setPhoneFilter,
  ageMin, setAgeMin,
  ageMax, setAgeMax,
  gender, setGender,
  onClose,
  onClear,
}) {
  return (
    <MobileScreen
      title="Filtros"
      onBack={onClose}
      right={<button className="kbA-btn kbA-btn--neutral" onClick={onClear}>Limpar</button>}
    >
      <div className="kbM-form">
        <label>Buscar</label>
        <input className="kbA-input" value={q || ""} onChange={(e) => setQ(e.target.value)} placeholder="Nome, telefone…" />

        <label>Campanha</label>
        <select className="kbA-select" value={campaign || ""} onChange={(e) => setCampaign(e.target.value)}>
          {(campaigns?.length ?? 0) === 0 ? (
            <option value="">(sem campanha)</option>
          ) : (
            <>
              <option value="">Todas as campanhas</option>
              {campaigns.map((c) => {
                const label = getCampaignLabel(c);
                return <option key={label || "sem-nome"} value={label}>{label || "(sem nome)"}</option>;
              })}
            </>
          )}
        </select>

        <label>Telefone</label>
        <select className="kbA-select" value={phoneFilter} onChange={(e) => setPhoneFilter(e.target.value)}>
          <option value="all">Todos</option>
          <option value="has">Com telefone</option>
          <option value="no">Sem telefone</option>
        </select>

        <div className="kbM-row2">
          <div>
            <label>Idade mín.</label>
            <input className="kbA-input" type="number" min="0" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} />
          </div>
          <div>
            <label>Idade máx.</label>
            <input className="kbA-input" type="number" min="0" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} />
          </div>
        </div>

        <label>Gênero</label>
        <select className="kbA-select" value={gender} onChange={(e) => setGender(e.target.value)}>
          <option value="all">Todos</option>
          <option value="M">Masculino</option>
          <option value="F">Feminino</option>
        </select>

        <button className="kbA-btn kbA-btn--primary" onClick={onClose}>Aplicar</button>
      </div>
    </MobileScreen>
  );
}

/* ============================= */
/* LeadCard / Sortable / Column  */
function LeadCard({ lead }) {
  const name = getLeadDisplayName(lead);
  const city = getLeadCity(lead);
  const phone = getLeadPhone(lead);
  const code = getLeadCode(lead);
  const gender = getLeadGender(lead);
  const age = getLeadAge(lead);
  const last = getLeadLastPurchase(lead);
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
        {code ? <span className="kbA-chip">🆔 {code}</span> : null}
        {phone ? <span className="kbA-chip">📞 {phone}</span> : <span className="kbA-chip opacity-70">📞 sem telefone</span>}
        {gender ? <span className="kbA-chip">⚧ {gender}</span> : null}
        {age || age === 0 ? <span className="kbA-chip">🎂 {age}</span> : null}
        {last ? <span className="kbA-chip">🛒 {last}</span> : null}
        {lead?.campanha || lead?.campaign ? <span className="kbA-chip">🎯 {lead.campanha || lead.campaign}</span> : null}
        {lead?.valor || lead?.value ? <span className="kbA-chip">💰 {lead.valor || lead.value}</span> : null}
      </div>
    </>
  );
}
function SortableLeadCard({ lead, stage, onOpen }) {
  const id = leadId(lead);
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
      <button className="kbA-dragHandle" {...listeners} {...attributes} onClick={(e) => e.stopPropagation()} title="Arrastar para mover" aria-label="Arrastar cartão">⋮⋮</button>
      <LeadCard lead={lead} stage={stage} />
    </div>
  );
}
function Column({ stage, leads, visibleCount, onOpenLead, onLoadMore }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const shown = leads.slice(0, visibleCount);
  return (
    <section className="kbA-column">
      <div className="kbA-columnHeader">
        <span className="kbA-colDot" />
        <span className="kbA-colTitle">{stage}</span>
        <span className="kbA-colCount">{leads.length}</span>
      </div>
      <div ref={setNodeRef} className={`kbA-columnContent ${isOver ? "kbA-dropHover" : ""}`}>
        <SortableContext items={shown.map((l) => leadId(l)).filter(Boolean)} strategy={rectSortingStrategy}>
          {shown.map((lead) => (
            <SortableLeadCard key={leadId(lead)} lead={lead} stage={stage} onOpen={() => onOpenLead(lead, stage)} />
          ))}
        </SortableContext>
        {visibleCount < leads.length && (
          <button className="kbA-loadMore" onClick={() => onLoadMore?.(stage)} title="Carregar mais">Carregar mais 10</button>
        )}
      </div>
    </section>
  );
}
function Board({ itemsByStage, onMove, onOpenLead, visibleByStage }) {
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [activeLead, setActiveLead] = useState(null);

  const findStageOfId = useCallback((id) => {
    for (const st of stages) {
      const arr = itemsCanon[st] || [];
      if (arr.some((x) => leadId(x) === id)) return st;
    }
    return null;
  }, [itemsCanon, stages]);

  function handleDragStart(event) {
    const id = event.active.id;
    const fromStage = findStageOfId(id);
    const item = (itemsCanon[fromStage] || []).find((x) => leadId(x) === id) || null;
    setActiveLead(item);
  }
  function handleDragEnd(event) {
    const { active, over } = event;
    setActiveLead(null);
    if (!over) return;
    const activeId = active.id;
    if (!activeId) return;
    const fromLabel = findStageOfId(activeId);
    let toLabel = findStageOfId(over.id) || over.id;
    if (!fromLabel || !toLabel || fromLabel === toLabel) return;
    const fromNorm = canonNorm(fromLabel);
    const toNorm = canonNorm(toLabel);
    onMove?.({ from: fromLabel, to: toLabel, id: activeId });
    onMove?.({ from: fromNorm, to: toNorm, id: activeId });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="kbA-board">
        {stages.map((stage) => (
          <Column
            key={stage}
            stage={stage}
            leads={itemsCanon[stage] || []}
            visibleCount={visibleByStage?.[stage] ?? 10}
            onOpenLead={onOpenLead}
            onLoadMore={(st) => visibleByStage?.onLoadMore?.(st)}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeLead ? (
          <div className="kbA-card kbA-dragOverlay">
            <div className="flex items-start gap-3">
              <div className="kbA-avatar">{getInitials(getLeadDisplayName(activeLead))}</div>
              <div className="min-w-0">
                <div className="font-medium truncate">{getLeadDisplayName(activeLead)}</div>
                <div className="text-[12px] text-neutral-500 truncate">{getLeadCity(activeLead)}</div>
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/* ============================= */
/* Página                        */
export default function Kanban() {
  const {
    loading,
    itemsByStage,
    onMove,
    q, setQ,
    campaigns, campaign, setCampaign,
  } = useKanban();

  const { canonLabel, canonNorm } = useStageCanon();
  const { getTemplatesFor } = useTemplates();

  const isMobile = useIsMobile(768);

  // ===== Filtros extras =====
  const [phoneFilter, setPhoneFilter] = useState("all"); // all | has | no
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [gender, setGender] = useState("all"); // all | M | F

  const passesExtraFilters = useCallback((lead) => {
    const hasPhone = !!onlyDigits(getLeadPhone(lead));
    if (phoneFilter === "has" && !hasPhone) return false;
    if (phoneFilter === "no" && hasPhone) return false;

    const age = getLeadAge(lead);
    if (age !== "" && !Number.isNaN(Number(age))) {
      if (ageMin !== "" && Number(age) < Number(ageMin)) return false;
      if (ageMax !== "" && Number(age) > Number(ageMax)) return false;
    } else {
      if (ageMin !== "" || ageMax !== "") return false;
    }

    if (gender !== "all") {
      const g = (getLeadGender(lead) || "").toString().trim().toUpperCase();
      if (!g.startsWith(gender.toUpperCase())) return false;
    }
    return true;
  }, [phoneFilter, ageMin, ageMax, gender]);

  const itemsByStageFiltered = useMemo(() => {
    const out = {};
    Object.entries(itemsByStage || {}).forEach(([stage, arr]) => {
      out[stage] = (arr || []).filter(passesExtraFilters);
    });
    return out;
  }, [itemsByStage, passesExtraFilters]);

  // ===== Paginação por coluna =====
  const [visibleByStage, setVisibleByStage] = useState(() => {
    const init = {};
    KANBAN_STAGES.forEach((s) => (init[s] = 10));
    // callback para Column
    init.onLoadMore = (stageLabel) => {
      setVisibleByStage((prev) => ({ ...prev, [stageLabel]: (prev[stageLabel] || 10) + 10, onLoadMore: prev.onLoadMore }));
    };
    return init;
  });
  useEffect(() => {
    const next = {};
    KANBAN_STAGES.forEach((s) => (next[s] = 10));
    next.onLoadMore = visibleByStage.onLoadMore;
    setVisibleByStage(next);
  }, [campaign, q, phoneFilter, ageMin, ageMax, gender, Object.keys(itemsByStageFiltered).length]); // reset paginação quando filtros mudam

  // ===== Mobile: “navegação” interna =====
  const [mobileView, setMobileView] = useState("board"); // board | filters | lead
  const [modal, setModal] = useState({ open: false, lead: null, stage: "" }); // desktop modal
  const [leadMobile, setLeadMobile] = useState({ lead: null, stage: "" }); // mobile lead

  const openLead = (lead, stage) => {
    const stageLabel = canonLabel(stage);
    if (isMobile) {
      setLeadMobile({ lead, stage: stageLabel });
      setMobileView("lead");
    } else {
      setModal({ open: true, lead, stage: stageLabel });
    }
  };

  const closeLead = () => setModal({ open: false, lead: null, stage: "" });

  const changeStage = useCallback((toStageRaw, leadObj, currentStageLabel, setStageCb) => {
    if (!leadObj) return;
    const fromLabel = canonLabel(currentStageLabel);
    const toLabel = canonLabel(toStageRaw);
    if (!toLabel || toLabel === fromLabel) return;
    const id = leadId(leadObj);
    if (!id) return;
    const fromNorm = canonNorm(fromLabel);
    const toNorm = canonNorm(toLabel);
    try {
      onMove?.({ from: fromLabel, to: toLabel, id });
      onMove?.({ from: fromNorm, to: toNorm, id });
      setStageCb?.(toLabel);
    } catch (err) {
      console.error("[KANBAN] onMove throw:", err);
    }
  }, [onMove, canonLabel, canonNorm]);

  const changeStageFromModal = useCallback(
    (toStageRaw) => changeStage(toStageRaw, modal.lead, modal.stage, (to) => setModal((m) => ({ ...m, stage: to }))),
    [modal.lead, modal.stage, changeStage]
  );
  const changeStageFromMobile = useCallback(
    (toStageRaw) => changeStage(toStageRaw, leadMobile.lead, leadMobile.stage, (to) => setLeadMobile((m) => ({ ...m, stage: to }))),
    [leadMobile.lead, leadMobile.stage, changeStage]
  );

  if (loading) {
    return (
      <div className="kbA-page">
        <div className="kbA-loading">Carregando Kanban…</div>
      </div>
    );
  }

  const clearExtraFilters = () => {
    setPhoneFilter("all"); setAgeMin(""); setAgeMax(""); setGender("all");
  };

  return (
    <div className="kbA-page">
      <header className="kbA-topbar">
        <div>
          <h1 className="kbA-title">Kanban de Vendas</h1>
        </div>

        {/* Desktop: filtros inline */}
        {!isMobile && (
          <div className="kbA-topbar-right kbA-filters kbA-filters--desktop">
            <input className="kbA-input" value={q || ""} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, telefone…" title="Buscar" />
            <select className="kbA-select" value={campaign || ""} onChange={(e) => setCampaign(e.target.value)} title="Campanha">
              {(campaigns?.length ?? 0) === 0 ? (
                <option value="">(sem campanha)</option>
              ) : (
                <>
                  <option value="">Todas as campanhas</option>
                  {campaigns.map((c) => {
                    const label = getCampaignLabel(c);
                    return <option key={label || "sem-nome"} value={label}>{label || "(sem nome)"}</option>;
                  })}
                </>
              )}
            </select>
            <select className="kbA-select" value={phoneFilter} onChange={(e) => setPhoneFilter(e.target.value)} title="Telefone">
              <option value="all">Telefone: todos</option>
              <option value="has">Com telefone</option>
              <option value="no">Sem telefone</option>
            </select>
            <input className="kbA-input kbA-input--tight" type="number" min="0" placeholder="Idade mín." value={ageMin} onChange={(e) => setAgeMin(e.target.value)} />
            <input className="kbA-input kbA-input--tight" type="number" min="0" placeholder="Idade máx." value={ageMax} onChange={(e) => setAgeMax(e.target.value)} />
            <select className="kbA-select" value={gender} onChange={(e) => setGender(e.target.value)} title="Gênero">
              <option value="all">Gênero: todos</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </select>
            <button className="kbA-btn kbA-btn--neutral" onClick={clearExtraFilters} title="Limpar filtros">Limpar</button>
          </div>
        )}

        {/* Mobile: botão para abrir filtros em tela */}
        {isMobile && (
          <div className="kbA-topbar-right">
            <input
              className="kbA-input"
              value={q || ""}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nome, telefone…"
              title="Buscar"
              style={{ flex: 1 }}
            />
            <button className="kbA-btn kbA-btn--neutral" onClick={() => setMobileView("filters")} aria-label="Abrir filtros">
              ☰ Filtros
            </button>
          </div>
        )}
      </header>

      <main className="kbA-boardWrap">
        <Board
          itemsByStage={itemsByStageFiltered}
          onMove={onMove}
          onOpenLead={openLead}
          visibleByStage={visibleByStage}
        />
      </main>

      {/* Desktop modal */}
      {!isMobile && (
        <LeadModal
          open={modal.open}
          onClose={closeLead}
          lead={modal.lead}
          stage={canonLabel(modal.stage)}
          getTemplatesFor={getTemplatesFor}
          onChangeStage={changeStageFromModal}
        />
      )}

      {/* Mobile screens */}
      {isMobile && mobileView === "filters" && (
        <MobileFiltersScreen
          q={q} setQ={setQ}
          campaigns={campaigns} campaign={campaign} setCampaign={setCampaign}
          phoneFilter={phoneFilter} setPhoneFilter={setPhoneFilter}
          ageMin={ageMin} setAgeMin={setAgeMin}
          ageMax={ageMax} setAgeMax={setAgeMax}
          gender={gender} setGender={setGender}
          onClose={() => setMobileView("board")}
          onClear={clearExtraFilters}
        />
      )}

      {isMobile && mobileView === "lead" && leadMobile.lead && (
        <MobileLeadScreen
          lead={leadMobile.lead}
          stage={leadMobile.stage}
          onClose={() => setMobileView("board")}
          onChangeStage={changeStageFromMobile}
          getTemplatesFor={getTemplatesFor}
        />
      )}
    </div>
  );
}
