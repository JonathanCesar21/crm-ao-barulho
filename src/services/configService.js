// src/services/configService.js
import { db } from "../config/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";

const APP_DOC = doc(db, "config", "app");

export async function getAdminCreatedFlag() {
  const snap = await getDoc(APP_DOC);
  if (!snap.exists()) return false;
  const data = snap.data() || {};
  return !!data.adminCreated;
}

export async function setAdminCreatedFlag() {
  await setDoc(APP_DOC, { adminCreated: true, updatedAt: new Date() }, { merge: true });
}
