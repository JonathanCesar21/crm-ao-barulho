// src/services/leadsService.js
import { db } from "../config/firebaseConfig";
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";

/** Coleção de leads da loja */
function leadsCol(shopId) {
  if (!shopId) throw new Error("shopId obrigatório");
  return collection(db, "shops", shopId, "leads");
}

/* =================================================================== */
/* Assinatura reativa                                                  */
/* =================================================================== */
/**
 * Escuta mudanças nos leads da loja.
 * @param {string} shopId
 * @param {(rows:any[])=>void} callback
 * @param {{orderByField?: string, direction?: "asc"|"desc"}} opts
 * @returns {() => void} unsubscribe
 */
export function subscribeLeadsByShop(
  shopId,
  callback,
  { orderByField = "createdAt", direction = "desc" } = {}
) {
  const qy = query(leadsCol(shopId), orderBy(orderByField, direction));
  const unsub = onSnapshot(
    qy,
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback?.(rows);
    },
    (err) => {
      console.error("[leadsService] subscribeLeadsByShop:", err);
      callback?.([]);
    }
  );
  return unsub;
}

/* =================================================================== */
/* Atribuição e remoção                                                */
/* =================================================================== */
/**
 * Atribui (ou remove) um vendedor no lead.
 * @param {string} shopId
 * @param {string} leadId
 * @param {string|null} sellerUid
 */
export async function assignLeadToSeller(shopId, leadId, sellerUid) {
  if (!shopId || !leadId) throw new Error("shopId e leadId obrigatórios");
  await updateDoc(doc(leadsCol(shopId), leadId), {
    sellerUid: sellerUid || null,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Exclui um lead pelo id.
 * @param {string} shopId
 * @param {string} leadId
 */
export async function deleteLeadById(shopId, leadId) {
  if (!shopId || !leadId) throw new Error("shopId e leadId obrigatórios");
  await deleteDoc(doc(leadsCol(shopId), leadId));
}

/* =================================================================== */
/* Importação em lote                                                  */
/* =================================================================== */
/**
 * Importa um array de leads em lote.
 * Espera objetos no padrão:
 * {
 *   codigo, nome, primeiroNome, celular, telefone, genero, idade,
 *   ultimaCompra, ultimaDataCompra,
 *   campaign, campanha, stage, sellerUid
 * }
 */
export async function importLeads(shopId, items = []) {
  if (!shopId) throw new Error("shopId obrigatório");
  if (!Array.isArray(items) || items.length === 0) return;

  const CHUNK = 450; // margem de segurança (< 500 por batch)
  for (let i = 0; i < items.length; i += CHUNK) {
    const part = items.slice(i, i + CHUNK);
    const batch = writeBatch(db);

    part.forEach((it) => {
      const ref = doc(leadsCol(shopId)); // id automático
      batch.set(ref, {
        // dados principais
        codigo: it.codigo ?? "",
        nome: it.nome ?? "",
        primeiroNome: it.primeiroNome ?? "",
        celular: it.celular ?? "",
        telefone: it.telefone ?? it.celular ?? "",

        genero: it.genero ?? "",
        idade: typeof it.idade === "number" ? it.idade : it.idade ?? "",

        // última compra (gravamos nos 2 nomes para compatibilidade)
        ultimaCompra: it.ultimaCompra ?? it.ultimaDataCompra ?? "",
        ultimaDataCompra: it.ultimaDataCompra ?? it.ultimaCompra ?? "",

        // campanha + estágio inicial
        campaign: it.campaign ?? "",
        campanha: it.campanha ?? it.campaign ?? "",
        stage: it.stage ?? "Novo",

        // atribuição opcional
        sellerUid: it.sellerUid ?? null,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
  }
}

/* =================================================================== */
/* Movimentação de estágio                                             */
/* =================================================================== */
/**
 * Move o lead para outro estágio.
 * Assinaturas aceitas:
 *   moveLeadStage(shopId, from, to, id)
 *   moveLeadStage(shopId, { from, to, id })
 *   moveLeadStage(shopId, from, to, { id })
 */
export async function moveLeadStage(shopId, a, b, c) {
  if (!shopId) throw new Error("shopId obrigatório");

  let from, to, id;
  if (typeof a === "object" && a) {
    ({ from, to, id } = a); // (shopId, { from, to, id })
  } else {
    from = a;
    to = b;
    id = typeof c === "object" && c ? (c.id || c.leadId) : c; // (shopId, from, to, id|{id})
  }

  if (!to) throw new Error("Parâmetro 'to' (novo estágio) é obrigatório");
  if (!id) throw new Error("Parâmetro 'id' do lead é obrigatório");

  const ref = doc(leadsCol(shopId), id);
  await updateDoc(ref, {
    stage: to,
    updatedAt: serverTimestamp(),
  });

  // Obs.: se quiser histórico, dá pra anexar aqui via arrayUnion(...)
}

/* =================================================================== */
/* Wrapper de compatibilidade (opcional)                               */
/* =================================================================== */
/** Helpers de normalização usados no wrapper */
function _normKey(s = "") {
  return String(s)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim();
}
function _onlyDigits(s = "") {
  return String(s).replace(/\D/g, "");
}
function _firstNameFrom(full = "") {
  const p = String(full || "").trim().split(/\s+/);
  return p[0] || "";
}
function _pick(row = {}, candidates = []) {
  const keys = Object.keys(row);
  for (const cand of candidates) {
    const hit = keys.find((k) => _normKey(k) === _normKey(cand));
    if (hit) return row[hit];
  }
  return "";
}

/**
 * Compat com código antigo que chamava `addLeadsBulkWithCampaign`.
 * Aceita linhas (objetos) vindas do CSV e normaliza para `importLeads`.
 * @param {string} shopId
 * @param {string} campaignName
 * @param {Array<object>} rows
 */
export async function addLeadsBulkWithCampaign(shopId, campaignName, rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) return;

  const items = rows
    .map((r) => {
      const codigo = (_pick(r, ["Código", "codigo", "CÓDIGO"]) || "").toString().trim();
      const nomeCompleto =
        (_pick(r, ["Nome completo", "nome completo", "Nome"]) || "").toString().trim();
      const primeiroNome =
        (_pick(r, ["Primeiro nome", "primeiro nome"]) || _firstNameFrom(nomeCompleto))
          .toString()
          .trim();

      const celular = _onlyDigits(
        _pick(r, ["Celular", "celular", "Telefone", "telefone", "WhatsApp", "whatsapp"]) || ""
      );

      const genero =
        (_pick(r, ["Gênero", "Genero", "genero", "Sexo", "sexo"]) || "").toString().trim();

      const idadeStr = (_pick(r, ["Idade", "idade"]) || "").toString().trim();
      const idadeNum = idadeStr ? parseInt(idadeStr, 10) : NaN;
      const idade = Number.isNaN(idadeNum) ? "" : idadeNum;

      // última data de compra (aceita variações de cabeçalho)
      const ultimaCompra =
        (_pick(r, [
          "Última data de compra",
          "ultima data de compra",
          "ultimaDataCompra",
          "ultimadatacompra",
        ]) || "").toString().trim();

      if (!codigo && !nomeCompleto && !celular) return null; // ignora linha 100% vazia

      return {
        codigo,
        nome: nomeCompleto,
        primeiroNome,
        celular,
        telefone: celular, // compat
        genero,
        idade,

        // grava nos dois nomes para compat
        ultimaCompra,
        ultimaDataCompra: ultimaCompra,

        campaign: campaignName || "",
        campanha: campaignName || "",
        stage: "Novo",
      };
    })
    .filter(Boolean);

  if (items.length === 0) return;
  await importLeads(shopId, items);
}
