// src/services/importsService.js
import { db } from "../config/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Registra um log simples da importação (sem arquivo).
 * Ex.: summary = { rows: 120, ok: 120, errors: 0 }
 */
export async function logImport(shopId, summary = {}) {
  const logCol = collection(db, "shops", shopId, "imports");
  const log = {
    createdAt: serverTimestamp(),
    summary, // { rows, ok, errors }
    // sem filePath / fileName
  };
  await addDoc(logCol, log);
}
