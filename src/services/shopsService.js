import { db } from "../config/firebaseConfig";
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, serverTimestamp
} from "firebase/firestore";

/**
 * Templates por loja:
 * /shops/{shopId}/templates/{id} => { text: string, stages: string[] | ["*"], updatedAt }
 */

export async function getTemplate(shopId, id) {
  const ref = doc(db, "shops", shopId, "templates", id);
  const snap = await getDoc(ref);
  return snap.exists() ? { id, ...snap.data() } : null;
}

export async function getAllTemplates(shopId) {
  const colRef = collection(db, "shops", shopId, "templates");
  const snap = await getDocs(colRef);
  const obj = {};
  snap.forEach((d) => {
    const data = d.data() || {};
    obj[d.id] = {
      text: data.text || "",
      stages: Array.isArray(data.stages) && data.stages.length ? data.stages : ["*"],
      updatedAt: data.updatedAt || null,
    };
  });
  return obj;
}

/**
 * setTemplate agora aceita:
 * - (shopId, id, "texto")                       -> salva { text, stages: ["*"] }
 * - (shopId, id, { text, stages })              -> salva objeto completo
 * - (shopId, id, "texto", ["Novo","Contato"])   -> compat
 */
export async function setTemplate(shopId, id, dataOrText, stagesOpt) {
  const ref = doc(db, "shops", shopId, "templates", id);
  let data;
  if (typeof dataOrText === "string") {
    data = { text: dataOrText || "", stages: Array.isArray(stagesOpt) && stagesOpt.length ? stagesOpt : ["*"] };
  } else {
    data = {
      text: dataOrText?.text || "",
      stages: Array.isArray(dataOrText?.stages) && dataOrText.stages.length ? dataOrText.stages : ["*"],
    };
  }
  await setDoc(ref, { ...data, updatedAt: new Date() }, { merge: true });
}

export async function updateTemplate(shopId, id, data) {
  const ref = doc(db, "shops", shopId, "templates", id);
  await updateDoc(ref, { ...(data || {}), updatedAt: new Date() });
}

// Lista todas as lojas (id = doc.id)
export async function listShops() {
  const col = collection(db, "shops");
  const snap = await getDocs(col);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Cria/atualiza uma loja
export async function upsertShop(shopId, data = {}) {
  const ref = doc(db, "shops", shopId);
  await setDoc(ref, {
    name: data.name || shopId,
    active: data.active ?? true,
    updatedAt: serverTimestamp(),
    createdAt: data.createdAt || serverTimestamp(),
  }, { merge: true });
}
