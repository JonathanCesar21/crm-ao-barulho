export default function TemplatePicker({
  open,
  onClose,
  stage,
  lead,
  templatesById,
  onChooseTemplate,
}) {
  console.log("🔍 TemplatePicker render:", { open, stage, lead });

  if (!open) return null;

  const list = Object.entries(templatesById || {})
    .map(([id, t]) => ({ id, ...t }))
    .filter((t) => {
      const arr = Array.isArray(t.stages) ? t.stages : ["*"];
      return arr.includes("*") || arr.includes(stage);
    });

  console.log("📋 Templates filtrados:", list);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg max-w-lg w-full p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold text-lg mb-2">Escolha um template</h3>
        <p className="text-sm text-neutral-600 mb-3">
          Lead: {lead?.nome} — Etapa: {stage}
        </p>

        {list.length === 0 ? (
          <div className="text-sm text-neutral-500 mb-3">
            Nenhum template para esta etapa. Será enviada a saudação padrão.
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-auto">
            {list.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  console.log("👉 Clicou no template:", t);
                  onChooseTemplate(t.id, t.text);
                }}
                className="w-full text-left border rounded-lg p-2 hover:bg-black/5"
              >
                {t.text}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex justify-between">
          <button
            onClick={() => {
              console.log("👉 Escolheu saudação padrão");
              onChooseTemplate(null, null);
            }}
            className="px-3 py-1.5 rounded border"
          >
            Usar padrão
          </button>
          <button
            onClick={() => {
              console.log("👉 Cancelou no TemplatePicker");
              onClose();
            }}
            className="px-3 py-1.5 rounded border"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
