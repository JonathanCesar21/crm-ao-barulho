// src/services/campaignsService.js
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  orderBy,
  serverTimestamp,
  query,
  where,
  writeBatch,
  getCountFromServer,
} from "firebase/firestore";
// or-queries (SDK recente). Se seu sdk não tiver, há um fallback mais abaixo.
import { or as qOr } from "firebase/firestore";
import { db } from "../config/firebaseConfig";

/** Slug simples e estável para id de campanha (bom pra URL e chavear por nome) */
function slugify(s = "") {
  return String(s)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80) || "campanha";
}

/** Caminhos base */
function campaignsCol(shopId) {
  if (!shopId) throw new Error("shopId é obrigatório");
  return collection(db, "shops", shopId, "campaigns");
}
function leadsCol(shopId) {
  if (!shopId) throw new Error("shopId é obrigatório");
  return collection(db, "shops", shopId, "leads");
}

/**
 * Lista campanhas da loja.
 * @param {string} shopId
 * @param {{ includeCounts?: boolean }} opts
 * @returns {Promise<Array<{id:string, name:string, description?:string, createdAt?:any, updatedAt?:any, leadCount?:number}>>}
 */
export async function listCampaigns(shopId, { includeCounts = true } = {}) {
  const qy = query(campaignsCol(shopId), orderBy("createdAt", "desc"));
  const snap = await getDocs(qy);

  const items = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() || {}),
  }));

  if (!includeCounts || items.length === 0) return items;

  // Conta leads por campanha (considera campos 'campaign' OU 'campanha')
  const leadsRef = leadsCol(shopId);

  async function countFor(name) {
    if (!name) return 0;

    // Tenta OR query (SDKs recentes)
    try {
      const agg = await getCountFromServer(
        query(leadsRef, qOr(
          where("campaign", "==", name),
          where("campanha", "==", name)
        ))
      );
      return agg.data().count || 0;
    } catch {
      // Fallback: soma 2 contagens separadas (para SDKs sem "or()")
      const [c1, c2] = await Promise.all([
        getCountFromServer(query(leadsRef, where("campaign", "==", name))),
        getCountFromServer(query(leadsRef, where("campanha", "==", name))),
      ]);
      return (c1.data().count || 0) + (c2.data().count || 0);
    }
  }

  const counts = await Promise.all(items.map((it) => countFor(it.name)));
  return items.map((it, i) => ({ ...it, leadCount: counts[i] || 0 }));
}

/**
 * Cria campanha. Usa slug do nome como id (estável e legível).
 * @param {string} shopId
 * @param {{ name:string, description?:string, id?:string }} data
 */
export async function createCampaign(shopId, { name, description = "", id } = {}) {
  if (!name) throw new Error("name é obrigatório");

  const cid = id || slugify(name);
  const ref = doc(campaignsCol(shopId), cid);

  await setDoc(ref, {
    name,
    description,
    normalizedName: name
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });

  return { id: cid, name, description };
}

/**
 * Exclui campanha.
 * Por padrão **não** mexe nos leads. Você pode passar `cascade`:
 *  - "none" (default): só remove a campanha.
 *  - "clear": limpar o campo campanha dos leads.
 *  - "delete": excluir todos os leads da campanha.
 *  - { moveTo: "Outra Campanha" }: mover leads para outra campanha (string destino).
 *
 * @param {string} shopId
 * @param {string} idOrName  id (slug) OU nome da campanha
 * @param {{ cascade?: "none"|"clear"|"delete"|{moveTo:string} }} opts
 */
export async function deleteCampaign(shopId, idOrName, opts = { cascade: "none" }) {
  if (!idOrName) throw new Error("id/nome da campanha obrigatório");

  const ref = doc(campaignsCol(shopId), idOrName);
  let name = idOrName;

  // Se o doc existir, pegamos o name oficial (pra bater com os leads)
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data() || {};
    if (data.name) name = data.name;
  }

  // 1) Cascata (opcional)
  if (opts?.cascade && opts.cascade !== "none") {
    await cascadeLeadsForCampaign(shopId, name, opts.cascade);
  }

  // 2) Remove o doc da campanha
  await deleteDoc(ref);
}

/** 
 * Aplica a regra de cascata nos leads de uma campanha.
 * @param {string} shopId
 * @param {string} campaignName
 * @param {"clear"|"delete"|{moveTo:string}} action
 */
async function cascadeLeadsForCampaign(shopId, campaignName, action) {
  const leadsRef = leadsCol(shopId);

  // Busca todos os leads onde (campaign == name) OR (campanha == name)
  let docs = [];
  try {
    const snap = await getDocs(
      query(leadsRef, qOr(
        where("campaign", "==", campaignName),
        where("campanha", "==", campaignName)
      ))
    );
    docs = snap.docs;
  } catch {
    // Fallback (sem OR): junta dois conjuntos
    const [s1, s2] = await Promise.all([
      getDocs(query(leadsRef, where("campaign", "==", campaignName))),
      getDocs(query(leadsRef, where("campanha", "==", campaignName))),
    ]);
    const seen = new Set();
    docs = [...s1.docs, ...s2.docs].filter((d) => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });
  }

  if (!docs.length) return;

  // Firestore tem limite de 500 por batch
  const CHUNK = 450;
  for (let i = 0; i < docs.length; i += CHUNK) {
    const part = docs.slice(i, i + CHUNK);
    const batch = writeBatch(db);

    part.forEach((d) => {
      const ref = d.ref;
      if (action === "delete") {
        batch.delete(ref);
      } else if (action === "clear") {
        batch.update(ref, { campaign: "", campanha: "" });
      } else if (typeof action === "object" && action.moveTo) {
        batch.update(ref, { campaign: action.moveTo, campanha: action.moveTo });
      }
    });

    await batch.commit();
  }
}
