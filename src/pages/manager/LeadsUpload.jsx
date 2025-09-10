import { useEffect, useState } from "react";
import Papa from "papaparse";
import toast from "react-hot-toast";
import { useRole } from "../../contexts/RoleContext";
import { addLeadsBulkWithCampaign } from "../../services/leadsService";
import { logImport } from "../../services/importsService";
import { listSellersOfShop } from "../../services/usersService";

export default function LeadsUpload() {
  const { shopId } = useRole();

  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [campaign, setCampaign] = useState("");
  const [sellers, setSellers] = useState([]);
  const [assignTo, setAssignTo] = useState(""); // uid do vendedor ou "" para não atribuir
  const [loadingSellers, setLoadingSellers] = useState(true);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!shopId) return;
      try {
        setLoadingSellers(true);
        const list = await listSellersOfShop(shopId);
        setSellers(list);
      } catch (e) {
        console.error(e);
        toast.error("Falha ao carregar vendedores.");
      } finally {
        setLoadingSellers(false);
      }
    })();
  }, [shopId]);

  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        setRows(res.data || []);
      },
      error: () => toast.error("Falha ao ler CSV."),
    });
  }

  async function persist() {
    if (!shopId) return toast.error("Loja não encontrada.");
    if (!campaign.trim()) return toast.error("Informe o nome da campanha.");
    if (!rows?.length) return toast.error("Nenhum lead no arquivo.");

    setImporting(true);
    try {
      await addLeadsBulkWithCampaign(shopId, rows, {
        campaign: campaign.trim(),
        assignToSellerUid: assignTo || null,
      });

      await logImport(shopId, {
        rows: rows.length,
        ok: rows.length,
        errors: 0,
        campaign: campaign.trim(),
        assignedTo: assignTo || null,
        fileName: fileName || null,
      });

      toast.success(`Importados ${rows.length} leads na campanha "${campaign}".`);
      // limpa estado
      setRows([]);
      setFileName("");
      setCampaign("");
      setAssignTo("");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar leads.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h3 className="font-medium mb-2">Upload de CSV com Campanha</h3>
        <p className="text-sm text-neutral-600">
          Campos recomendados no CSV: <b>nome, telefone, cidade, origem, observacao</b>.
        </p>

        <div className="grid md:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-sm text-neutral-700">Nome da campanha *</label>
            <input
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Ex.: Black Friday Set/2025"
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-neutral-700">Atribuir todos para (opcional)</label>
            {loadingSellers ? (
              <div className="text-sm text-neutral-600 py-2">Carregando vendedores…</div>
            ) : (
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={assignTo}
                onChange={(e) => setAssignTo(e.target.value)}
              >
                <option value="">— Não atribuir (todos vendedores verão) —</option>
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.displayName || s.email || s.id}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="mt-3">
          <input type="file" accept=".csv" onChange={onFile} />
          {fileName ? <div className="text-xs text-neutral-600 mt-1">{fileName}</div> : null}
        </div>

        {rows.length > 0 && (
          <div className="mt-3 text-sm">
            <b>{rows.length}</b> linhas lidas.
            <button
              onClick={persist}
              disabled={importing}
              className="ml-3 px-3 py-1.5 rounded-lg border hover:bg-black/5 transition"
            >
              {importing ? "Importando..." : "Importar"}
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h4 className="font-medium mb-1">Como funciona</h4>
        <ul className="list-disc pl-5 text-sm text-neutral-700 space-y-1">
          <li><b>Campanha</b>: cada lead recebe o campo <code>campaign</code> com o nome informado.</li>
          <li><b>Atribuição</b>: escolha um vendedor para atribuir <i>todos</i> os leads desta importação, ou deixe em branco para não atribuir.</li>
          <li><b>Não atribuído</b>: se não atribuir, os leads ficam visíveis a todos os vendedores (ver ajuste abaixo do Kanban).</li>
        </ul>
      </div>
    </div>
  );
}
