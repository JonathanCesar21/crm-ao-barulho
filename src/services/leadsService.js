// src/services/leadsService.js
import { db } from "../config/firebaseConfig";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy,
  writeBatch,
  deleteDoc,
} from "firebase/firestore";

/** Bulk insert simples: shops/{shopId}/leads */
export async function addLeadsBulk(shopId, rows) {
  const colRef = collection(db, "shops", shopId, "leads");
  const chunk = 400;
  for (let i = 0; i < rows.length; i += chunk) {
    const batch = writeBatch(db);
    rows.slice(i, i + chunk).forEach((r) => {
      const lead = {
        nome: r.nome || "",
        telefone: r.telefone || "",
        cidade: r.cidade || "",
        origem: r.origem || "",
        observacao: r.observacao || "",
        stage: "Novo",
        sellerUid: r.sellerUid || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const ref = doc(colRef); // auto-id
      batch.set(ref, lead);
    });
    await batch.commit();
  }
}

/** Move lead de etapa (Kanban) */
export async function moveLeadStage(shopId, leadId, nextStage) {
  const ref = doc(db, "shops", shopId, "leads", leadId);
  await updateDoc(ref, { stage: nextStage, updatedAt: new Date() });
}

/** Busca leads por etapa (consulta pontual) */
export async function getLeadsByStage(shopId, stage) {
  const colRef = collection(db, "shops", shopId, "leads");
  const qy = query(colRef, where("stage", "==", stage));
  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Atribui lead a um vendedor */
export async function assignLeadToSeller(shopId, leadId, sellerUid) {
  const ref = doc(db, "shops", shopId, "leads", leadId);
  await updateDoc(ref, { sellerUid: sellerUid || null, updatedAt: new Date() });
}

/** Excluir lead por ID */
export async function deleteLeadById(shopId, leadId) {
  const ref = doc(db, "shops", shopId, "leads", leadId);
  await deleteDoc(ref);
}

/** Subscribe: retorna unsubscribe — lista linear ordenada por createdAt desc */
export function subscribeLeadsByShop(shopId, onData) {
  const colRef = collection(db, "shops", shopId, "leads");
  const qy = query(colRef, orderBy("createdAt", "desc"));
  return onSnapshot(qy, (snap) => {
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    onData(all);
  });
}

/** (Opcional) listar leads de um vendedor específico */
export async function getLeadsBySeller(shopId, sellerUid) {
  const colRef = collection(db, "shops", shopId, "leads");
  const qy = query(colRef, where("sellerUid", "==", sellerUid));
  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addLeadsBulkWithCampaign(
  shopId,
  rows,
  { campaign, assignToSellerUid = null }
) {
  if (!shopId) throw new Error("shopId obrigatório.");
  const chunk = 400;
  for (let i = 0; i < rows.length; i += chunk) {
    const batch = writeBatch(db);
    rows.slice(i, i + chunk).forEach((r) => {
      const lead = {
        nome: r.nome || "",
        telefone: r.telefone || "",
        cidade: r.cidade || "",
        origem: r.origem || "",
        observacao: r.observacao || "",
        campaign: campaign || "",
        stage: "Novo",
        sellerUid: assignToSellerUid || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const ref = doc(collection(db, "shops", shopId, "leads"));
      batch.set(ref, lead);
    });
    await batch.commit();
  }
}
