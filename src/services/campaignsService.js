// src/services/campaignsService.js
import {
  doc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  orderBy,
  startAfter,
  limit,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../config/firebaseConfig";

/**
 * Lista campanhas salvas em shops/{shopId}/campaigns
 * (opcional; mantenha se já usa em outras telas)
 */
export async function listCampaigns(shopId) {
  try {
    const col = collection(db, "shops", shopId, "campaigns");
    const snap = await getDocs(col);
    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() || {}),
    }));
  } catch (e) {
    // Se não houver coleção/permite fallback por leads na UI
    return [];
  }
}

/**
 * Exclui a campanha e trata os leads dessa campanha.
 * @param {string} shopId
 * @param {string} campaignName  // use o nome (ex.: "Black Friday 2025")
 * @param {{ mode?: 'clear'|'deleteLeads' }} options
 *    - clear: limpa os campos campanha/campaign nos leads (padrão)
 *    - deleteLeads: apaga os leads da campanha
 * @returns {Promise<{ total:number, updated:number, deleted:number, mode:string }>}
 */
export async function deleteCampaign(shopId, campaignName, options = {}) {
  const mode = options.mode || "clear";
  const leadsCol = collection(db, "shops", shopId, "leads");

  // 1) Remove o doc da campanha (se existir).
  //    Se o ID do doc for diferente do nome, ajuste aqui.
  try {
    await deleteDoc(doc(db, "shops", shopId, "campaigns", campaignName));
  } catch (_) {
    // ok se não existir
  }

  let total = 0;
  let updated = 0;
  let deleted = 0;

  /**
   * Varre os leads em páginas e aplica batch.
   * Usa orderBy('__name__') + startAfter(cursor) para paginação estável.
   */
  async function sweepByField(fieldName) {
    let cursor = null;

    // loop de paginação
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const constraints = [
        where(fieldName, "==", campaignName),
        orderBy("__name__"),
        limit(400), // margem abaixo do limite de 500 do batch
      ];
      if (cursor) constraints.push(startAfter(cursor));

      const q = query(leadsCol, ...constraints);
      const snap = await getDocs(q);

      if (snap.empty) break;

      const batch = writeBatch(db);
      for (const docSnap of snap.docs) {
        total++;
        if (mode === "deleteLeads") {
          batch.delete(docSnap.ref);
          deleted++;
        } else {
          batch.update(docSnap.ref, {
            campanha: "",
            campaign: "",
            updatedAt: serverTimestamp ? serverTimestamp() : new Date(),
          });
          updated++;
        }
      }

      await batch.commit();

      // avança cursor para a última doc da página
      cursor = snap.docs[snap.docs.length - 1];

      // Se retornou menos que o limite, não há mais páginas
      if (snap.size < 400) break;
    }
  }

  // 2) Primeiro limpa/deleta quem tem 'campanha'
  await sweepByField("campanha");
  // 3) Depois limpa/deleta quem porventura tenha apenas 'campaign'
  await sweepByField("campaign");

  return { total, updated, deleted, mode };
}
