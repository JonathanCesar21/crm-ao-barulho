// src/services/scriptsService.js
import { db } from "../config/firebaseConfig";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

const col = (shopId) => collection(db, "shops", shopId, "scripts");

/** Cria um script (template) */
export async function addScript(shopId, { title, body }) {
  if (!shopId) throw new Error("shopId obrigatório.");
  const ref = await addDoc(col(shopId), {
    title: title || "Sem título",
    body: body || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Atualiza script */
export async function updateScript(shopId, scriptId, { title, body }) {
  if (!shopId || !scriptId) throw new Error("ids obrigatórios.");
  const ref = doc(db, "shops", shopId, "scripts", scriptId);
  await updateDoc(ref, {
    ...(title !== undefined ? { title } : {}),
    ...(body !== undefined ? { body } : {}),
    updatedAt: serverTimestamp(),
  });
}

/** Exclui script */
export async function deleteScript(shopId, scriptId) {
  if (!shopId || !scriptId) throw new Error("ids obrigatórios.");
  const ref = doc(db, "shops", shopId, "scripts", scriptId);
  await deleteDoc(ref);
}

/** Lista (consulta única) */
export async function listScripts(shopId) {
  const qy = query(col(shopId), orderBy("createdAt", "desc"));
  const snap = await getDocs(qy);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Subscribe em tempo real */
export function subscribeScripts(shopId, onData) {
  const qy = query(col(shopId), orderBy("createdAt", "desc"));
  return onSnapshot(qy, (snap) => {
    const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    onData(arr);
  });
}
