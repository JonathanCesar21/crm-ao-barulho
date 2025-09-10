// src/pages/admin/TemplatesWhatsApp.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useTemplates } from "../../hooks/useTemplates";
import { KANBAN_STAGES } from "../../constants/kanbanStages";
import { useRole } from "../../contexts/RoleContext";
import toast from "react-hot-toast";
import "./templateswhatsapp.css";

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

export default function TemplatesWhatsApp() {
  const { role } = useRole() || {};
  const { loading, templates, save, remove } = useTemplates();

  // ======= CRIAÇÃO (um único campo) =======
  const [newText, setNewText] = useState("");
  const [newStages, setNewStages] = useState(["*"]);
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
      } catch {}
    });
  }

  async function onCreate() {
    const text = (newText || "").trim();
    const stages = (newStages && newStages.length ? newStages : ["*"]);
    if (!text) {
      toast.error("Escreva a mensagem do template.");
      return;
    }
    try {
      const id = `tpl_${Date.now()}`;
      await save(id, text, stages);
      toast.success("Template criado com sucesso.");
      setNewText("");
      setNewStages(["*"]);
    } catch (e) {
      console.error(e);
      toast.error("Falha ao criar template.");
    }
  }

  // ======= LISTAGEM/EDIÇÃO =======
  const items = useMemo(() => {
    if (!templates) return [];
    return Object.entries(templates).map(([id, data]) => ({
      id,
      text: data?.text ?? "",
      stages: Array.isArray(data?.stages) && data.stages.length ? data.stages : ["*"],
    }));
  }, [templates]);

  const [editMap, setEditMap] = useState({});
  const editRefs = useRef({});

  useEffect(() => {
    if (!loading && items.length) {
      const next = {};
      items.forEach((it) => {
        next[it.id] = { text: it.text, stages: it.stages };
      });
      setEditMap(next);
    } else if (!loading && items.length === 0) {
      setEditMap({});
    }
  }, [loading, items.length]);

  const getEditText = (id) => editMap?.[id]?.text ?? "";
  const getEditStages = (id) => editMap?.[id]?.stages ?? ["*"];

  function setEditText(id, text) {
    setEditMap((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), text } }));
  }
  function setEditStages(id, stages) {
    setEditMap((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), stages } }));
  }

  function insertVarEdit(id, token) {
    const el = editRefs.current?.[id];
    if (!el) {
      setEditText(id, `${getEditText(id)}${getEditText(id) ? " " : ""}${token}`);
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const value = el.value || "";
    const next = value.slice(0, start) + token + value.slice(end);
    setEditText(id, next);
    requestAnimationFrame(() => {
      try {
        el.focus();
        const pos = start + token.length;
        el.setSelectionRange(pos, pos);
      } catch {}
    });
  }

  async function onSaveEdit(id) {
    try {
      await save(id, getEditText(id), getEditStages(id));
      toast.success("Template atualizado.");
    } catch (e) {
      console.error(e);
      toast.error("Falha ao salvar template.");
    }
  }

  async function onRemove(id) {
    if (!remove) return;
    if (!confirm("Excluir este template?")) return;
    try {
      await remove(id);
      toast.success("Template excluído.");
    } catch (e) {
      console.error(e);
      toast.error("Falha ao excluir template.");
    }
  }

  // ======= GATE de permissão =======
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
      {/* Cabeçalho */}
      

      {/* Novo Template */}
      <div className="card twt-new">
        <div className="twt-section-title">Novo template</div>

        <div className="twt-stack">
          <div className="twt-field">
            <label className="twt-label" htmlFor="new-stages">Aparece em</label>
            <select
              id="new-stages"
              multiple
              value={newStages}
              onChange={(e) =>
                setNewStages(Array.from(e.target.selectedOptions).map((o) => o.value))
              }
            >
              <option value="*">Todas as etapas</option>
              {KANBAN_STAGES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
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

      {/* Lista / Edição */}
      {loading ? (
        <div className="card twt-loading">Carregando…</div>
      ) : items.length === 0 ? (
        <div className="card twt-empty">Nenhum template cadastrado ainda.</div>
      ) : (
        <div className="twt-grid">
          {items.map((tpl) => (
            <div key={tpl.id} className="card twt-stack">
              <div className="twt-item-head">
                <div className="twt-item-title">Template</div>
                {remove && (
                  <button
                    type="button"
                    onClick={() => onRemove(tpl.id)}
                    className="twt-btn twt-btn-danger"
                    aria-label="Excluir template"
                  >
                    Excluir
                  </button>
                )}
              </div>

              <div className="twt-field">
                <label className="twt-label" htmlFor={`stages-${tpl.id}`}>Aparece em</label>
                <select
                  id={`stages-${tpl.id}`}
                  multiple
                  value={getEditStages(tpl.id)}
                  onChange={(e) =>
                    setEditStages(
                      tpl.id,
                      Array.from(e.target.selectedOptions).map((o) => o.value)
                    )
                  }
                >
                  <option value="*">Todas as etapas</option>
                  {KANBAN_STAGES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <div className="twt-help">Segure CTRL (Windows) ou ⌘ (Mac) para selecionar múltiplas.</div>
              </div>

              <div className="twt-field">
                <label className="twt-label" htmlFor={`text-${tpl.id}`}>Mensagem</label>
                <textarea
                  id={`text-${tpl.id}`}
                  ref={(el) => (editRefs.current[tpl.id] = el)}
                  rows={6}
                  placeholder="Mensagem do template"
                  value={getEditText(tpl.id)}
                  onChange={(e) => setEditText(tpl.id, e.target.value)}
                />
              </div>

              <div className="twt-chips" aria-label="Variáveis rápidas">
                {VARIAVEIS.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertVarEdit(tpl.id, v.key)}
                    className="twt-chip"
                    title={v.key}
                  >
                    + {v.label}
                  </button>
                ))}
              </div>

              <div className="twt-preview" aria-label="Prévia">
                <b>Prévia:</b>
                <div>{replacePreview(getEditText(tpl.id))}</div>
              </div>

              <div className="twt-actions">
                <button
                  type="button"
                  onClick={() => onSaveEdit(tpl.id)}
                  className="twt-btn twt-btn-primary"
                >
                  Salvar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
