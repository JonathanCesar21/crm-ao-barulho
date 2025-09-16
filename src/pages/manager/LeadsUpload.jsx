// src/pages/manager/LeadsUpload.jsx
import { useEffect, useState } from "react";
import Papa from "papaparse";
import toast from "react-hot-toast";
import { useRole } from "../../contexts/RoleContext";
import { importLeads } from "../../services/leadsService";
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

    // Corrige mojibake Latin-1 -> UTF-8 mais comum (ex.: CÃ³digo -> Código)
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

    const transformHeader = (h) => {
      let s = (h || "").toString();
      // tenta des-mojibar genericamente
      try {
        s = decodeURIComponent(escape(s));
      } catch {}
      s = fixLatin1Mojibake(s);

      // remove “(opcional)”
      s = s.replace(/\(opcional\)/i, "").trim();

      // normaliza sem acentos para mapear canônico
      const base = s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

      if (base === "codigo" || /(^|[^a-z])cod(igo)?($|[^a-z])/.test(base)) return "Código";
      if (base === "nome completo" || base === "nome") return "Nome completo";
      if (base === "primeiro nome") return "Primeiro nome";
      if (["celular", "telefone", "whatsapp"].some((k) => base.includes(k))) return "Celular";
      if (base === "genero" || base === "sexo") return "Gênero";
      if (base === "idade") return "Idade";
      if (base.includes("ultima") && base.includes("compra")) return "Última data de compra";

      return s; // fallback
    };

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      // ⬇️ força encoding Latin-1 (seu arquivo “teste ituverava 3.csv” está assim)
      encoding: "ISO-8859-1",
      // pode deixar auto-detectar ; ou , (ou troque para ";" se quiser travar)
      delimiter: "",
      transformHeader,
      complete: (res) => {
        setRows(res.data || []);
        // debug opcional: veja as chaves finais
        if (res.data && res.data[0]) {
          // eslint-disable-next-line no-console
          console.log("[CSV headers vistos]", Object.keys(res.data[0]));
        }
      },
      error: () => toast.error("Falha ao ler CSV."),
    });
  }

  async function persist() {
    if (!shopId) return toast.error("Loja não encontrada.");
    if (!campaign.trim()) return toast.error("Informe o nome da campanha.");
    if (!rows?.length) return toast.error("Nenhum lead no arquivo.");

    const campaignName = campaign.trim();

    const normKey = (s = "") =>
      String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const onlyDigits = (s = "") => String(s).replace(/\D/g, "");
    const firstNameFrom = (full = "") => (String(full).trim().split(/\s+/)[0] || "");
    const pick = (row = {}, candidates = []) => {
      const keys = Object.keys(row);
      for (const label of candidates) {
        const hit = keys.find((k) => normKey(k) === normKey(label));
        if (hit) return row[hit];
      }
      return "";
    };

    // ===== Validação TOLERANTE de cabeçalho =====
    const keys = Object.keys(rows[0] || {});
    const hasAny = (aliases) =>
      aliases.some((a) => keys.some((k) => normKey(k) === normKey(a)));

    const okCodigo = hasAny(["Código", "codigo", "CÓDIGO", "CÃ³digo", "Cod", "cod"]);
    const okNome = hasAny(["Nome completo", "nome completo", "Nome", "nome"]);
    const okCel = hasAny(["Celular", "celular", "Telefone", "telefone", "WhatsApp", "whatsapp"]);
    const okGen = hasAny(["Gênero", "Genero", "genero", "Sexo", "sexo"]);
    const okIdade = hasAny(["Idade", "idade"]);

    if (!(okCodigo && okNome && okCel && okGen && okIdade)) {
      console.warn("[CSV] Cabeçalhos detectados:", keys);
      toast.error(
        'Cabeçalhos incompletos. Verifique se contém: Código, Nome completo, Celular, Gênero, Idade.'
      );
      // Se quiser bloquear de cara, descomente a linha abaixo:
      // return;
    }
    // ============================================

    setImporting(true);
    try {
      const items = rows
        .map((r) => {
          const codigo = (pick(r, ["Código", "codigo", "CÓDIGO"]) || "").toString().trim();
          const nomeCompleto =
            (pick(r, ["Nome completo", "nome completo", "Nome"]) || "").toString().trim();
          const primeiroNome =
            (pick(r, ["Primeiro nome", "primeiro nome"]) || firstNameFrom(nomeCompleto))
              .toString()
              .trim();
          const celular = onlyDigits(
            pick(r, ["Celular", "celular", "Telefone", "telefone", "WhatsApp", "whatsapp"]) || ""
          );
          const genero = (pick(r, ["Gênero", "Genero", "genero", "Sexo", "sexo"]) || "")
            .toString()
            .trim();
          const idadeStr = (pick(r, ["Idade", "idade"]) || "").toString().trim();
          const idadeNum = idadeStr ? parseInt(idadeStr, 10) : NaN;
          const idade = Number.isNaN(idadeNum) ? "" : idadeNum;

          // Última data de compra (opcional)
          const ultimaCompra =
            (
              pick(r, [
                "Última data de compra",
                "ultima data de compra",
                "ultimaDataCompra",
                "ultimadatacompra",
              ]) || ""
            )
              .toString()
              .trim();

          // linha totalmente vazia?
          if (!codigo && !nomeCompleto && !celular) return null;

          return {
            codigo,
            nome: nomeCompleto,
            primeiroNome,
            celular,
            telefone: celular, // compat
            genero,
            idade,

            // novo campo
            ultimaCompra,
            ultimaDataCompra: ultimaCompra,

            campaign: campaignName,
            campanha: campaignName,
            stage: "Novo",
            sellerUid: assignTo || null,
          };
        })
        .filter(Boolean);

      if (!items.length) {
        return toast.error("Nenhuma linha válida para importar.");
      }

      await importLeads(shopId, items);

      await logImport(shopId, {
        rows: rows.length,
        ok: items.length,
        errors: rows.length - items.length,
        campaign: campaignName,
        assignedTo: assignTo || null,
        fileName: fileName || null,
      });

      toast.success(`Importados ${items.length} leads na campanha "${campaignName}".`);
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
          Campos recomendados no CSV:{" "}
          <b>
            Código, Nome completo, Primeiro nome (opcional), Celular, Gênero, Idade, Última data de
            compra (opcional)
          </b>
          .
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
          <li>
            <b>Campanha</b>: cada lead recebe o campo <code>campaign</code> com o nome informado.
          </li>
          <li>
            <b>Atribuição</b>: escolha um vendedor para atribuir <i>todos</i> os leads desta
            importação, ou deixe em branco para não atribuir.
          </li>
          <li>
            <b>Não atribuído</b>: se não atribuir, os leads ficam visíveis a todos os vendedores
            (ver ajuste abaixo do Kanban).
          </li>
        </ul>
      </div>
    </div>
  );
}
