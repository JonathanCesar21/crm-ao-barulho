// src/services/shopsService.js
import { db } from "../config/firebaseConfig";
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, serverTimestamp
} from "firebase/firestore";

/**
 * templates por loja:
 * /shops/{shopId}/templates/{stage} => { text: "...", updatedAt }
 */

export async function getTemplate(shopId, stage) {
  const ref = doc(db, "shops", shopId, "templates", stage);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: stage, ...snap.data() } : null;
}

export async function getAllTemplates(shopId) {
  const col = collection(db, "shops", shopId, "templates");
  const snap = await getDocs(col);
  const obj = {};
  snap.forEach(d => (obj[d.id] = d.data()));
  return obj;
}

export async function setTemplate(shopId, stage, text) {
  const ref = doc(db, "shops", shopId, "templates", stage);
  await setDoc(ref, { text: text || "", updatedAt: new Date() }, { merge: true });
}

export async function updateTemplate(shopId, stage, data) {
  const ref = doc(db, "shops", shopId, "templates", stage);
  await updateDoc(ref, { ...data, updatedAt: new Date() });
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