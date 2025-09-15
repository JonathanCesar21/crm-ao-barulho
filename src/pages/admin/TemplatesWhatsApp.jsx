// src/pages/admin/TemplatesWhatsApp.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useTemplates } from "../../hooks/useTemplates";
import { KANBAN_STAGES } from "../../constants/kanbanStages";
import { useRole } from "../../contexts/RoleContext";
import toast from "react-hot-toast";
import "./templateswhatsapp.css";
import { createPortal } from "react-dom";

/* ===== Variáveis dinâmicas ===== */
const VARIAVEIS = [
  { key: "{{nome}}", label: "Nome completo" },
  { key: "{{primeiroNome}}", label: "Primeiro nome" },
  { key: "{{telefone}}", label: "Telefone" },
  { key: "{{cidade}}", label: "Cidade" },
  { key: "{{origem}}", label: "Origem" },
  { key: "{{observacao}}", label: "Observação" },
];

const MOCK = {
  nome: "João Silva",
  primeiroNome: "João",
  telefone: "(11) 98888-7777",
  cidade: "São Paulo",
  origem: "Facebook Ads",
  observacao: "Prefere contato à tarde",
};

function replacePreview(msg) {
  let out = String(msg || "");
  for (const [k, v] of Object.entries(MOCK)) {
    out = out.replaceAll(`{{${k}}}`, v);
  }
  return out;
}

/* ===== helpers ===== */
function norm(s = "") {
  return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
function normStage(s = "") {
  return norm(s);
}
function useStageCanon() {
  const normToLabel = useMemo(() => {
    const m = {};
    KANBAN_STAGES.forEach((label) => (m[normStage(label)] = label));
    return m;
  }, []);
  const canonLabel = (s) => normToLabel[normStage(s)] ?? s;
  return { canonLabel };
}

/* ===== Modal (Portal) ===== */
function ModalPortal({ children }) {
  const elRef = useRef(null);
  if (!elRef.current) elRef.current = document.createElement("div");

  useEffect(() => {
    const el = elRef.current;
    const host = document.querySelector(".tw-templates") || document.body;
    host.appendChild(el);
    return () => {
      host.removeChild(el);
    };
  }, []);

  // Se estiver renderizando apenas no cliente, isso é suficiente.
  // (Se tiver SSR, você pode checar typeof document !== 'undefined')
  return createPortal(children, elRef.current);
}

/* ===== Modal de Edição ===== */
function EditTemplateModal({ open, onClose, template, onSave, onRemove }) {
  const [text, setText] = useState(template?.text || "");
  const [stages, setStages] = useState(template?.stages || ["*"]);
  const [scope, setScope] = useState(template?.scope || "global");
  const [campaign, setCampaign] = useState(template?.campaign || "");
  const editRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setText(template?.text || "");
    setStages(template?.stages || ["*"]);
    setScope(template?.scope || "global");
    setCampaign(template?.campaign || "");
  }, [open, template]);

  function insertVar(token) {
    const el = editRef.current;
    if (!el) {
      setText((prev) => `${prev}${prev ? " " : ""}${token}`);
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const value = el.value || "";
    const next = value.slice(0, start) + token + value.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      try {
        el.focus();
        const pos = start + token.length;
        el.setSelectionRange(pos, pos);
      } catch { }
    });
  }

  if (!open) return null;

  return (
    <ModalPortal>
      <div className="twt-modalOverlay" onClick={onClose} role="dialog" aria-modal="true">
        <div className="twt-modalPanel" onClick={(e) => e.stopPropagation()}>
          <div className="twt-modalHeader">
            <div className="twt-modalTitle">
              Editar template
              <span className="twt-badge twt-badge--soft">
                {scope === "global" ? "Global" : scope === "campaign" ? `Campanha: ${campaign || "—"}` : "—"}
              </span>
            </div>
            <button className="twt-btn twt-btn-ghost" onClick={onClose} aria-label="Fechar">Fechar</button>
          </div>

          <div className="twt-modalBody">
            <div className="twt-row">
              <div className="twt-field">
                <label className="twt-label">Escopo</label>
                <select value={scope} onChange={(e) => setScope(e.target.value)}>
                  <option value="global">Global</option>
                  <option value="campaign">Por campanha</option>
                </select>
              </div>

              {scope === "campaign" && (
                <div className="twt-field">
                  <label className="twt-label">Campanha</label>
                  <input
                    type="text"
                    placeholder="Ex.: Black Friday 2025"
                    value={campaign}
                    onChange={(e) => setCampaign(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="twt-field">
              <label className="twt-label">Aparece nas etapas</label>
              <select
                multiple
                value={stages}
                onChange={(e) => setStages(Array.from(e.target.selectedOptions).map((o) => o.value))}
              >
                <option value="*">Todas as etapas</option>
                {KANBAN_STAGES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
              <div className="twt-help">Segure CTRL (Windows) ou ⌘ (Mac) para múltiplas.</div>
            </div>

            <div className="twt-field">
              <label className="twt-label">Mensagem</label>
              <textarea
                ref={editRef}
                rows={8}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Mensagem do template"
              />
            </div>

            <div className="twt-chips" aria-label="Variáveis rápidas">
              {VARIAVEIS.map((v) => (
                <button key={v.key} type="button" onClick={() => insertVar(v.key)} className="twt-chip" title={v.key}>
                  + {v.label}
                </button>
              ))}
            </div>

            <div className="twt-preview">
              <b>Prévia:</b>
              <div>{replacePreview(text)}</div>
            </div>
          </div>

          <div className="twt-modalFooter">
            {onRemove && (
              <button
                className="twt-btn twt-btn-danger"
                onClick={() => onRemove(template.id)}
                aria-label="Excluir template"
              >
                Excluir
              </button>
            )}

            <div className="twt-footerRight">
              <button className="twt-btn" onClick={onClose}>Cancelar</button>
              <button
                className="twt-btn twt-btn-primary"
                onClick={() => {
                  if (scope === "campaign" && !String(campaign || "").trim()) {
                    return toast.error("Informe a campanha para este template.");
                  }
                  const normalized = (stages || []).map((s) => (s === "*" ? "*" : s));
                  onSave({
                    ...template,
                    text,
                    stages: normalized,
                    scope,
                    campaign: campaign || null,
                  });
                }}
              >
                Salvar alterações
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

export default function TemplatesWhatsApp() {
  const { role } = useRole() || {};
  const { loading, templates, save, remove } = useTemplates();
  const { canonLabel } = useStageCanon();

  // ======= CRIAÇÃO =======
  const [newText, setNewText] = useState("");
  const [newStages, setNewStages] = useState(["*"]);
  const [newScope, setNewScope] = useState("global"); // 'global' | 'campaign'
  const [newCampaign, setNewCampaign] = useState("");
  const newTextRef = useRef(null);

  function insertVarNew(token) {
    const el = newTextRef.current;
    if (!el) {
      setNewText((prev) => `${prev}${prev ? " " : ""}${token}`);
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const value = el.value || "";
    const next = value.slice(0, start) + token + value.slice(end);
    setNewText(next);
    requestAnimationFrame(() => {
      try {
        el.focus();
        const pos = start + token.length;
        el.setSelectionRange(pos, pos);
      } catch { }
    });
  }

  async function onCreate() {
    const text = (newText || "").trim();
    const stagesRaw = newStages && newStages.length ? newStages : ["*"];
    if (!text) return toast.error("Escreva a mensagem do template.");

    const stages = stagesRaw.map((s) => (s === "*" ? "*" : canonLabel(s)));

    if (newScope === "campaign" && !newCampaign.trim()) {
      return toast.error("Informe a campanha para este template.");
    }

    try {
      const id = `tpl_${Date.now()}`;
      await save(id, {
        text,
        stages,
        scope: newScope,
        campaign: newCampaign || null,
      });
      toast.success("Template criado com sucesso.");
      setNewText("");
      setNewStages(["*"]);
      setNewScope("global");
      setNewCampaign("");
    } catch (e) {
      console.error(e);
      toast.error("Falha ao criar template.");
    }
  }

  // ======= LISTAGEM COMPACTA + FILTROS =======
  const items = useMemo(() => {
    if (!templates) return [];
    return Object.entries(templates).map(([id, data]) => ({
      id,
      text: data?.text ?? "",
      stages: Array.isArray(data?.stages) && data.stages.length ? data.stages : ["*"],
      scope: data?.scope || "global",
      campaign: data?.campaign || "",
      storeId: data?.storeId || null,
      updatedAt: data?.updatedAt || null,
    }));
  }, [templates]);

  // filtros
  const [filterCampaign, setFilterCampaign] = useState(""); // "" = todas, "__global" = só globais, "X" = só campanha X
  const [filterStage, setFilterStage] = useState("");       // "" = todas, valor = apenas aquela etapa
  const [search, setSearch] = useState("");

  // opções de campanha detectadas dos itens
  const campaignOptions = useMemo(() => {
    const set = new Set();
    items.forEach((t) => {
      if (t.scope === "campaign" && t.campaign) set.add(t.campaign);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(() => {
    const q = norm(search);
    const fc = filterCampaign;
    const fs = filterStage;

    return items.filter((t) => {
      // filtro por campanha
      if (fc === "__global") {
        if (t.scope !== "global") return false;
      } else if (fc) {
        if (t.scope !== "campaign" || norm(t.campaign) !== norm(fc)) return false;
      }

      // filtro por etapa
      if (fs) {
        const okStage = (t.stages || []).some((s) => s === "*" || normStage(s) === normStage(fs));
        if (!okStage) return false;
      }

      // busca textual
      if (q) {
        const hay = `${t.text} ${t.campaign || ""} ${(t.stages || []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    }).sort((a, b) => {
      // ordena por especificidade e atualização
      const rank = { store: 3, campaign: 2, global: 1 };
      const ra = rank[a.scope] || 0;
      const rb = rank[b.scope] || 0;
      if (ra !== rb) return rb - ra;
      const ta = a.updatedAt?.toMillis?.() ?? 0;
      const tb = b.updatedAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
  }, [items, filterCampaign, filterStage, search]);

  // modal de edição
  const [modal, setModal] = useState({ open: false, tpl: null });

  // ======= GATE =======
  if (role !== "admin") {
    return (
      <div className="tw-templates">
        <div className="card twt-header">
          <h3>Templates de WhatsApp</h3>
          <p className="twt-subtle">Apenas administradores podem cadastrar/editar templates.</p>
        </div>
      </div>
    );
  }

  // ======= UI =======
  return (
    <div className="tw-templates">
      <div className="twt-columns">
        {/* === Coluna ESQUERDA: criação === */}
        <section className="twt-col-left">
          <div className="card twt-new">
            <div className="twt-section-title">Novo template</div>

            <div className="twt-stack">
              <div className="twt-row">
                <div className="twt-field">
                  <label className="twt-label" htmlFor="new-scope">Escopo</label>
                  <select id="new-scope" value={newScope} onChange={(e) => setNewScope(e.target.value)}>
                    <option value="global">Global (todas as lojas/campanhas)</option>
                    <option value="campaign">Por campanha</option>
                  </select>
                  <div className="twt-help">Defina onde este script deve aparecer.</div>
                </div>

                {newScope === "campaign" && (
                  <div className="twt-field">
                    <label className="twt-label" htmlFor="new-campaign">Campanha</label>
                    <input
                      id="new-campaign"
                      placeholder="Ex.: Black Friday 2025"
                      value={newCampaign}
                      onChange={(e) => setNewCampaign(e.target.value)}
                    />
                    <div className="twt-help">Nome/slug da campanha (igual aos leads).</div>
                  </div>
                )}
              </div>

              <div className="twt-field">
                <label className="twt-label" htmlFor="new-stages">Aparece nas etapas</label>
                <select
                  id="new-stages"
                  multiple
                  value={newStages}
                  onChange={(e) => setNewStages(Array.from(e.target.selectedOptions).map((o) => o.value))}
                >
                  <option value="*">Todas as etapas</option>
                  {KANBAN_STAGES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
                <div className="twt-help">Segure CTRL (Windows) ou ⌘ (Mac) para selecionar múltiplas.</div>
              </div>

              <div className="twt-field">
                <label className="twt-label" htmlFor="new-text">Mensagem</label>
                <textarea
                  id="new-text"
                  ref={newTextRef}
                  rows={6}
                  placeholder="Escreva a mensagem do template"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                />
              </div>

              <div className="twt-chips" aria-label="Variáveis rápidas">
                {VARIAVEIS.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertVarNew(v.key)}
                    className="twt-chip"
                    title={v.key}
                  >
                    + {v.label}
                  </button>
                ))}
              </div>

              <div className="twt-preview" aria-label="Prévia">
                <b>Prévia:</b>
                <div>{replacePreview(newText)}</div>
              </div>

              <div className="twt-actions">
                <button type="button" onClick={onCreate} className="twt-btn twt-btn-primary">
                  Adicionar template
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* === Coluna DIREITA: filtros + lista === */}
        <section className="twt-col-right">
          <div className="card twt-header">
            <h3>Templates de WhatsApp</h3>
            <div className="twt-filters">
              <input
                className="twt-input"
                placeholder="Buscar por texto/campanha/etapa…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <select
                className="twt-select"
                value={filterCampaign}
                onChange={(e) => setFilterCampaign(e.target.value)}
                title="Filtrar por campanha"
              >
                <option value="">Todas as campanhas</option>
                <option value="__global">Somente globais</option>
                {campaignOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <select
                className="twt-select"
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
                title="Filtrar por etapa"
              >
                <option value="">Todas as etapas</option>
                <option value="*">Qualquer etapa (*)</option>
                {KANBAN_STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="twt-tip">Clique em um item da lista para editar no modal.</div>
          </div>

          {loading ? (
            <div className="card twt-loading">Carregando…</div>
          ) : filtered.length === 0 ? (
            <div className="card twt-empty">Nenhum template encontrado com os filtros atuais.</div>
          ) : (
            <div className="twt-list">
              {filtered.map((tpl) => (
                <button
                  key={tpl.id}
                  className="twt-list-item"
                  onClick={() => setModal({ open: true, tpl })}
                  title="Clique para editar"
                >
                  <div className="twt-list-top">
                    <span className={`twt-badge ${tpl.scope === "global" ? "twt-badge--global" : "twt-badge--campaign"}`}>
                      {tpl.scope === "global" ? "Global" : `Campanha: ${tpl.campaign || "—"}`}
                    </span>

                    <div className="twt-list-right">
                      <span className="twt-badge twt-badge--soft" title="Etapas">
                        {(tpl.stages || ["*"]).join(", ")}
                      </span>
                    </div>
                  </div>

                  <div className="twt-list-text" aria-label="Conteúdo">
                    {tpl.text}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Modal de edição */}
      <EditTemplateModal
        open={modal.open}
        template={modal.tpl}
        onClose={() => setModal({ open: false, tpl: null })}
        onSave={async (data) => {
          try {
            await save(data.id, {
              text: data.text,
              stages: data.stages,
              scope: data.scope,
              campaign: data.campaign || null,
              storeId: data.storeId || null,
            });
            toast.success("Template atualizado.");
            setModal({ open: false, tpl: null });
          } catch (e) {
            console.error(e);
            toast.error("Falha ao salvar template.");
          }
        }}
        onRemove={remove ? async (id) => {
          if (!confirm("Excluir este template?")) return;
          try {
            await remove(id);
            toast.success("Template excluído.");
            setModal({ open: false, tpl: null });
          } catch (e) {
            console.error(e);
            toast.error("Falha ao excluir template.");
          }
        } : undefined}
      />
    </div>
  );

}
