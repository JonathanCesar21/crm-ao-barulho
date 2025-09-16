// src/pages/manager/Leads.jsx
import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { useRole } from "../../contexts/RoleContext";
import { listSellersOfShop } from "../../services/usersService";
import {
  subscribeLeadsByShop,
  assignLeadToSeller,
  deleteLeadById,
  importLeads,
} from "../../services/leadsService";
import {
  listCampaigns,
  deleteCampaign,
} from "../../services/campaignsService";
import toast from "react-hot-toast";
import LeadsTable from "../../components/Leads";
import "./leads.css";

/* ===== utils ===== */
function norm(s = "") {
  return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/* ======= Modal: apenas IMPORTAR CSV + selecionar vendedor ======= */
function CampaignModal({ open, onClose, shopId, onImported }) {
  // importar csv
  const [targetCampaign, setTargetCampaign] = useState("");
  const [assignTo, setAssignTo] = useState(""); // uid do vendedor ou "" para não atribuir
  const [loadingSellers, setLoadingSellers] = useState(false);
  const [sellers, setSellers] = useState([]);

  const [file, setFile] = useState(null);
  const [rowsPreview, setRowsPreview] = useState([]);
  const [csvError, setCsvError] = useState("");

  // --- Helpers ---
  const normKey = (s = "") =>
    String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const onlyDigits = (s = "") => String(s).replace(/\D/g, "");
  const firstNameFrom = (full = "") => (String(full).trim().split(/\s+/)[0] || "");

  // corrige mojibake comum (Latin-1 lido como UTF-8)
  const fixLatin1Mojibake = (s) =>
    s
      .replace(/[\uFEFF]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/CÃ\u00B3digo/gi, "Código")
      .replace(/GÃªnero/gi, "Gênero")
      .replace(/Ãºltima/gi, "Última")
      .replace(/Ã§/gi, "ç")
      .replace(/Ã¡/gi, "á")
      .replace(/Ã¢/gi, "â")
      .replace(/Ã£/gi, "ã")
      .replace(/Ã©/gi, "é")
      .replace(/Ãª/gi, "ê")
      .replace(/Ã­/gi, "í")
      .replace(/Ã³/gi, "ó")
      .replace(/Ã´/gi, "ô")
      .replace(/Ãº/gi, "ú")
      .replace(/Ã¼/gi, "ü")
      .replace(/â€“/g, "–")
      .replace(/â€”/g, "—")
      .replace(/â€œ|â€\u009d/gi, '"')
      .replace(/â€˜|â€™/g, "'");

  // aliases canônicos
  const ALIAS = {
    codigo: ["Código", "codigo", "CÓDIGO", "Cod", "cod"],
    nome: ["Nome completo", "nome completo", "Nome", "nome"],
    primeiroNome: ["Primeiro nome", "primeiro nome"],
    celular: ["Celular", "celular", "Telefone", "telefone", "WhatsApp", "whatsapp"],
    genero: ["Gênero", "Genero", "genero", "Sexo", "sexo"],
    idade: ["Idade", "idade"],
    ultimaCompraVenda: [
      "Última data de compra",
      "ultima data de compra",
      "ultimadatacompra",
      "ultimaDataCompra",
      "Última data de venda",
      "ultima data de venda",
      "ultimadatavenda",
      "ultimaDataVenda",
    ], // opcional
  };
  const hasAny = (keys, aliases) =>
    aliases.some((a) => keys.some((k) => normKey(k) === normKey(a)));

  // transforma cabeçalhos para nomes canônicos
  const transformHeader = (h) => {
    let s = (h || "").toString();
    try { s = decodeURIComponent(escape(s)); } catch {}
    s = fixLatin1Mojibake(s);
    s = s.replace(/\(opcional\)/i, "").trim();

    const b = normKey(s);
    if (ALIAS.codigo.some((a) => normKey(a) === b)) return "Código";
    if (ALIAS.nome.some((a) => normKey(a) === b)) return "Nome completo";
    if (ALIAS.primeiroNome.some((a) => normKey(a) === b)) return "Primeiro nome";
    if (ALIAS.celular.some((a) => normKey(a) === b)) return "Celular";
    if (ALIAS.genero.some((a) => normKey(a) === b)) return "Gênero";
    if (ALIAS.idade.some((a) => normKey(a) === b)) return "Idade";
    if (ALIAS.ultimaCompraVenda.some((a) => normKey(a) === b)) return "Última data";
    return s;
  };

  // pick por alias já transformado (usa nomes canônicos)
  const pick = (row = {}, keys = []) => {
    const ks = Object.keys(row);
    for (const k of keys) {
      const hit = ks.find((kk) => normKey(kk) === normKey(k));
      if (hit) return row[hit];
    }
    return "";
  };

  useEffect(() => {
    if (!open) return;
    // reset ao abrir
    setTargetCampaign("");
    setAssignTo("");
    setFile(null);
    setRowsPreview([]);
    setCsvError("");

    // carrega vendedores
    (async () => {
      if (!shopId) return;
      try {
        setLoadingSellers(true);
        const list = await listSellersOfShop(shopId);
        setSellers(list || []);
      } catch (e) {
        console.error(e);
        toast.error("Falha ao carregar vendedores.");
      } finally {
        setLoadingSellers(false);
      }
    })();
  }, [open, shopId]);

  /* ===== CSV: pré-visualização ===== */
  async function handleFileChange(f) {
    setCsvError("");
    setRowsPreview([]);
    setFile(f || null);
    if (!f) return;

    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      encoding: "ISO-8859-1", // Latin-1 comum em planilhas BR
      delimiter: "",          // auto (, ou ;)
      transformHeader,
      complete: (res) => {
        const data = (res.data || []).filter((r) => Object.keys(r).length > 0);
        if (!data.length) {
          setCsvError("CSV vazio.");
          return;
        }
        const keys = Object.keys(data[0]);

        const okCodigo = hasAny(keys, ["Código"]);
        const okNome = hasAny(keys, ["Nome completo"]);
        const okCel = hasAny(keys, ["Celular"]);
        const okGen = hasAny(keys, ["Gênero"]);
        const okIdade = hasAny(keys, ["Idade"]);

        if (!(okCodigo && okNome && okCel && okGen && okIdade)) {
          setCsvError(
            'Cabeçalhos inválidos. Esperado: "Código, Nome completo, Primeiro nome (opcional), Celular, Gênero, Idade".'
          );
          return;
        }

        const prev = data.slice(0, 10).map((r) => {
          const nomeCompleto = (pick(r, ["Nome completo"]) || "").toString().trim();
          const primeiro =
            (pick(r, ["Primeiro nome"]) || firstNameFrom(nomeCompleto)).toString().trim();
          return {
            codigo: (pick(r, ["Código"]) || "").toString().trim(),
            nomeCompleto,
            primeiroNome: primeiro,
            celular: (pick(r, ["Celular"]) || "").toString().trim(),
            genero: (pick(r, ["Gênero"]) || "").toString().trim(),
            idade: (pick(r, ["Idade"]) || "").toString().trim(),
            ultimaData: (pick(r, ["Última data"]) || "").toString().trim(), // opcional
          };
        });
        setRowsPreview(prev);
      },
      error: () => setCsvError("Falha ao ler CSV."),
    });
  }

  /* ===== CSV: importação efetiva ===== */
  async function onImportCsv() {
    setCsvError("");

    const campaign = (targetCampaign || "").trim();
    if (!campaign) {
      setCsvError("Informe o nome da campanha de destino.");
      return;
    }
    if (!file) {
      setCsvError("Selecione um arquivo CSV.");
      return;
    }
    if (!shopId) {
      setCsvError("Loja não encontrada.");
      return;
    }

    try {
      const parsed = await new Promise((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          encoding: "ISO-8859-1",
          delimiter: "",
          transformHeader,
          complete: (res) => resolve(res.data || []),
          error: (err) => reject(err || new Error("Falha ao ler CSV.")),
        });
      });

      const data = parsed.filter((r) => Object.keys(r).length > 0);
      if (!data.length) throw new Error("Nenhuma linha de dados no CSV.");

      const keys = Object.keys(data[0] || {});
      const okCodigo = hasAny(keys, ["Código"]);
      const okNome = hasAny(keys, ["Nome completo"]);
      const okCel = hasAny(keys, ["Celular"]);
      const okGen = hasAny(keys, ["Gênero"]);
      const okIdade = hasAny(keys, ["Idade"]);

      if (!(okCodigo && okNome && okCel && okGen && okIdade)) {
        throw new Error(
          'Cabeçalhos inválidos. Esperado: "Código, Nome completo, Primeiro nome (opcional), Celular, Gênero, Idade".'
        );
      }

      const payload = data
        .map((r) => {
          const nomeCompleto = (pick(r, ["Nome completo"]) || "").toString().trim();
          const primeiro =
            (pick(r, ["Primeiro nome"]) || firstNameFrom(nomeCompleto)).toString().trim();

          const celularRaw = (pick(r, ["Celular"]) || "").toString();
          const celular = onlyDigits(celularRaw);

          const genero = (pick(r, ["Gênero"]) || "").toString().trim();
          const idadeStr = (pick(r, ["Idade"]) || "").toString().trim();
          const idadeNum = idadeStr ? parseInt(idadeStr, 10) : NaN;

          const codigo = (pick(r, ["Código"]) || "").toString().trim();

          const ultima = (pick(r, ["Última data"]) || "").toString().trim(); // compra/venda (opcional)

          if (!codigo && !nomeCompleto && !celular) return null;

          return {
            codigo,
            nome: nomeCompleto,
            primeiroNome: primeiro,
            celular,
            telefone: celular, // compat
            genero,
            idade: Number.isNaN(idadeNum) ? "" : idadeNum,

            // grava nos dois campos para compat
            ultimaCompra: ultima,
            ultimaDataCompra: ultima,

            campaign,
            campanha: campaign,
            stage: "Novo",
            sellerUid: assignTo || null, // atribui todos ao vendedor selecionado (ou deixa null)
          };
        })
        .filter(Boolean);

      if (!payload.length) throw new Error("Nenhuma linha válida para importar.");

      await importLeads(shopId, payload);

      toast.success(`Importados ${payload.length} leads em "${campaign}".`);
      onImported?.();
      // mantém campaign/assignTo e preview se quiser repetir import
    } catch (e) {
      console.error(e);
      setCsvError(e.message || "Falha ao importar CSV.");
    }
  }

  /* CSV de exemplo */
  const sampleCsv =
    "Código,Nome completo,Primeiro nome,Celular,Gênero,Idade,Última data de compra\n" +
    '12345,Maria das Dores,Maria,(11) 91234-5678,F,34,2024-10-05\n' +
    '98765,João Souza,,11987654321,M,28,05/09/2024\n';

  if (!open) return null;

  return (
    <div className="ml-modalOverlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="ml-modalPanel" onClick={(e) => e.stopPropagation()}>
        <div className="ml-modalHeader">
          <div className="ml-tabs">
            <button className="ml-tab is-active" disabled>
              Importar CSV
            </button>
          </div>
          <button className="ml-btn ml-btn-ghost" onClick={onClose}>Fechar</button>
        </div>

        <div className="ml-modalBody">
          <div className="ml-field">
            <label className="ml-label">Campanha de destino *</label>
            <input
              className="ml-input"
              placeholder="Ex.: Black Friday 2025"
              value={targetCampaign}
              onChange={(e) => setTargetCampaign(e.target.value)}
            />
            <div className="ml-help">
              Os leads importados receberão <b>campanha = "{targetCampaign || "—"}"</b>.
            </div>
          </div>

          <div className="ml-field">
            <label className="ml-label">Atribuir todos para (opcional)</label>
            {loadingSellers ? (
              <div className="ml-help">Carregando vendedores…</div>
            ) : (
              <select
                className="ml-input"
                value={assignTo}
                onChange={(e) => setAssignTo(e.target.value)}
              >
                <option value="">— Não atribuir (todos verão) —</option>
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.displayName || s.email || s.id}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="ml-field">
            <label className="ml-label">Arquivo CSV</label>
            <div
              className="ml-dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) handleFileChange(f);
              }}
            >
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => handleFileChange(e.target.files?.[0])}
              />
              {file ? (
                <div className="ml-drop-info">
                  <b>{file.name}</b> — {(file.size / 1024).toFixed(1)} KB
                </div>
              ) : (
                <div className="ml-drop-hint">
                  Arraste o arquivo aqui ou clique para selecionar.
                  <div className="ml-help">
                    Campos recomendados no CSV:{" "}
                    <b>Código, Nome completo, Primeiro nome (opcional), Celular, Gênero, Idade, Última data de compra/venda</b>.
                  </div>
                </div>
              )}
            </div>
            <a
              className="ml-btn"
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(sampleCsv)}`}
              download="modelo-importacao.csv"
            >
              Baixar modelo CSV
            </a>
          </div>

          {csvError && <div className="ml-error">{csvError}</div>}

          {!!rowsPreview.length && (
            <div className="ml-preview">
              <div className="ml-preview-title">Prévia (primeiras linhas)</div>
              <div className="ml-tableWrap">
                <table className="ml-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Nome completo</th>
                      <th>Primeiro nome</th>
                      <th>Celular</th>
                      <th>Gênero</th>
                      <th>Idade</th>
                      <th>Última data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rowsPreview.map((r, i) => (
                      <tr key={i}>
                        <td>{r.codigo}</td>
                        <td>{r.nomeCompleto}</td>
                        <td>{r.primeiroNome}</td>
                        <td>{r.celular}</td>
                        <td>{r.genero}</td>
                        <td>{r.idade}</td>
                        <td>{r.ultimaData || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="ml-modalFooter">
          <button className="ml-btn" onClick={onClose}>Cancelar</button>
          <button className="ml-btn ml-btn-primary" onClick={onImportCsv}>
            Importar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ======= Página ======= */
export default function ManagerLeads() {
  const { shopId } = useRole() || {};
  const [rows, setRows] = useState([]);
  const [sellers, setSellers] = useState([]);

  // campanhas
  const [campaigns, setCampaigns] = useState([]); // [{id,name,description?,leadCount?}]
  const [campaignFilter, setCampaignFilter] = useState(""); // "" = todas
  const [searchCampaign, setSearchCampaign] = useState("");

  // modal
  const [openModal, setOpenModal] = useState(false);

  // Assina leads da loja
  useEffect(() => {
    if (!shopId) return;
    const unsub = subscribeLeadsByShop(shopId, (list) => setRows(list || []));
    return () => unsub && unsub();
  }, [shopId]);

  // Carrega vendedores (para atribuição na tabela de leads)
  useEffect(() => {
    (async () => {
      if (!shopId) return;
      try {
        const list = await listSellersOfShop(shopId);
        setSellers(list || []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [shopId]);

  // Carrega campanhas
  async function refreshCampaigns() {
    if (!shopId) return;
    try {
      const list = (await listCampaigns?.(shopId)) || [];
      setCampaigns(list);
    } catch (e) {
      // fallback: derivar a partir dos leads (ignorando "sem campanha")
      const setMap = new Map();
      rows.forEach((r) => {
        const c = (r.campanha || r.campaign || "").trim();
        if (!c) return; // 👈 não conta "sem campanha"
        setMap.set(c, { id: c, name: c, leadCount: (setMap.get(c)?.leadCount || 0) + 1 });
      });
      setCampaigns(Array.from(setMap.values()));
    }
  }
  useEffect(() => { refreshCampaigns(); /* eslint-disable-next-line */ }, [shopId, rows.length]);

  // Ações em leads
  async function onAssign(leadId, sellerUid) {
    try {
      await assignLeadToSeller(shopId, leadId, sellerUid || null);
      toast.success("Lead atribuído.");
    } catch {
      toast.error("Falha ao atribuir lead.");
    }
  }
  async function onDeleteLead(leadId) {
    const ok = window.confirm("Tem certeza que deseja excluir este lead?");
    if (!ok) return;
    try {
      await deleteLeadById(shopId, leadId);
      toast.success("Lead excluído.");
    } catch (e) {
      console.error(e);
      toast.error("Falha ao excluir lead.");
    }
  }

  // Excluir campanha (escolha limpar ou deletar leads)
  async function handleDeleteCampaign(c) {
    const title = c?.name || c?.id || "";
    const ok = window.confirm(
      `Excluir a campanha "${title}"?\n\nOK = limpar campanha dos leads (manter leads)\nCancelar = APAGAR os leads dessa campanha`
    );
    const mode = ok ? "clear" : "deleteLeads";

    try {
      const res = await deleteCampaign?.(shopId, title, { mode });
      const msg =
        mode === "deleteLeads"
          ? `Campanha excluída. ${res.total} leads afetados (${res.deleted} deletados).`
          : `Campanha excluída. ${res.total} leads afetados (${res.updated} limpos).`;
      toast.success(msg);

      if (campaignFilter === (c.name || c.id)) setCampaignFilter("");
      await refreshCampaigns();
    } catch (e) {
      console.error(e);
      toast.error("Falha ao excluir campanha.");
    }
  }

  // campanhas com contagem derivada (fallback), ignorando vazias
  const countsByCampaign = useMemo(() => {
    const m = new Map();
    rows.forEach((r) => {
      const c = (r.campanha || r.campaign || "").trim();
      if (!c) return; // 👈 não agrupa “sem campanha”
      m.set(c, (m.get(c) || 0) + 1);
    });
    return m;
  }, [rows]);

  const shownCampaigns = useMemo(() => {
    const q = norm(searchCampaign);
    const arr = (campaigns && campaigns.length
      ? campaigns
      : Array.from(countsByCampaign.entries()).map(([k, v]) => ({ id: k, name: k, leadCount: v }))
    );
    return arr
      .filter((c) => (q ? norm(c.name).includes(q) : true))
      .sort((a, b) => (b.leadCount || 0) - (a.leadCount || 0));
  }, [campaigns, countsByCampaign, searchCampaign]);

  // leads filtrados pela campanha no lado direito
  const rowsByCampaign = useMemo(() => {
    if (!campaignFilter) return rows;
    return rows.filter((r) => {
      const c = (r.campanha || r.campaign || "").trim();
      return norm(c) === norm(campaignFilter);
    });
  }, [rows, campaignFilter]);

  return (
    <div className="ml-page">
      <div className="ml-columns">
        {/* === Coluna esquerda: campanhas === */}
        <section className="ml-col-left">
          <div className="ml-card ml-sticky">
            <div className="ml-header-row">
              <div>
                <h3 className="ml-title">Campanhas</h3>
                <div className="ml-subtle">Selecione para filtrar os leads.</div>
              </div>
              <button className="ml-btn ml-btn-primary" onClick={() => setOpenModal(true)}>
                Nova campanha
              </button>
            </div>

            <div className="ml-field mt-2">
              <input
                className="ml-input"
                placeholder="Buscar campanha…"
                value={searchCampaign}
                onChange={(e) => setSearchCampaign(e.target.value)}
              />
            </div>

            <div className="ml-campaigns">
              <button
                className={`ml-campaign ${!campaignFilter ? "is-active" : ""}`}
                onClick={() => setCampaignFilter("")}
                title="Todas as campanhas"
              >
                <div className="ml-camp-name">Todas as campanhas</div>
                <div className="ml-camp-count">{rows.length}</div>
              </button>

              {shownCampaigns.map((c) => (
                <div key={c.id || c.name} className="ml-campaign-wrap">
                  <button
                    className={`ml-campaign ${campaignFilter === (c.name || c.id) ? "is-active" : ""}`}
                    onClick={() => setCampaignFilter(c.name || c.id)}
                    title={c.name}
                  >
                    <div className="ml-camp-name">{c.name}</div>
                    <div className="ml-camp-count">{c.leadCount ?? countsByCampaign.get(c.name) ?? 0}</div>
                  </button>
                  <button
                    className="ml-camp-delete"
                    title="Excluir campanha"
                    onClick={() => handleDeleteCampaign(c)}
                  >
                    ✕
                  </button>
                </div>
              ))}

              {/* Removido o bloco "Sem campanha" */}
            </div>
          </div>
        </section>

        {/* === Coluna direita: leads === */}
        <section className="ml-col-right">
          <div className="ml-card">
            <div className="ml-header-row">
              <div>
                <h3 className="ml-title">Leads</h3>
                <div className="ml-subtle">
                  {campaignFilter ? <>Filtrando por <b>{campaignFilter}</b>.</> : "Todas as campanhas."}
                </div>
              </div>
            </div>

            <LeadsTable
              rows={rowsByCampaign}
              sellers={sellers}
              onAssign={onAssign}
              onDelete={onDeleteLead}
              showCampaignColumn
            />
          </div>
        </section>
      </div>

      <CampaignModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        shopId={shopId}
        onImported={() => {
          setOpenModal(false);
          // atualiza a lista após importar
          setTimeout(() => {
            // Firestore propaga; subscribeLeadsByShop já atualiza a grid
            refreshCampaigns();
          }, 250);
        }}
      />
    </div>
  );
}
