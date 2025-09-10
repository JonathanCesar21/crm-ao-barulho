import { useState } from "react";
import { useTemplates } from "../../hooks/useTemplates";
import { KANBAN_STAGES } from "../../constants/kanbanStages";
import toast from "react-hot-toast";

export default function TemplatesWhatsApp() {
  const { loading, templates, save } = useTemplates();
  const [local, setLocal] = useState({});

  function getVal(stage) {
    return (local[stage] ?? templates?.[stage]?.text ?? "");
  }

  function onChange(stage, v) {
    setLocal((prev) => ({ ...prev, [stage]: v }));
  }

  async function onSave(stage) {
    try {
      await save(stage, getVal(stage));
      toast.success(`Template "${stage}" salvo.`);
    } catch {
      toast.error("Falha ao salvar template.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h3 className="font-medium mb-2">Templates de WhatsApp por Etapa</h3>
        <p className="text-sm text-neutral-600">
          Use variáveis: <code>{`{{nome}} {{primeiroNome}} {{cidade}} {{origem}} {{observacao}}`}</code>
        </p>
      </div>

      {loading ? (
        <div className="text-neutral-600">Carregando…</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {KANBAN_STAGES.map((stage) => (
            <div key={stage} className="card">
              <div className="font-medium mb-2">{stage}</div>
              <textarea
                rows={6}
                className="w-full border rounded-lg p-2"
                placeholder={`Mensagem para etapa "${stage}"`}
                value={getVal(stage)}
                onChange={(e) => onChange(stage, e.target.value)}
              />
              <div className="mt-2">
                <button
                  onClick={() => onSave(stage)}
                  className="px-3 py-1.5 rounded-lg border hover:bg-black/5 transition"
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
