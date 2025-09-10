// src/hooks/useTemplates.js
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  getDoc,
} from "firebase/firestore";
import { db } from "../config/firebaseConfig";

/**
 * Coleção GLOBAL: /templatesWhatsapp
 * Doc (ex.): tpl_1712345678901
 * {
 *   text: string,
 *   stages: string[],   // ["*", "Novo", "Em negociação", ...]
 *   createdAt: Timestamp,
 *   updatedAt: Timestamp
 * }
 *
 * API:
 *   const { loading, templates, save, remove } = useTemplates();
 *   - templates: { [id]: { text, stages, createdAt?, updatedAt? } }
 *   - save(id, text, stages)
 *   - remove(id)
 */
export function useTemplates() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState({}); // { id: { text, stages, createdAt, updatedAt } }

  const baseCol = useMemo(() => collection(db, "templatesWhatsapp"), []);

  useEffect(() => {
    const qy = query(baseCol, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      qy,
      (snap) => {
        const next = {};
        snap.forEach((d) => {
          const data = d.data() || {};
          next[d.id] = {
            text: data.text ?? "",
            stages: Array.isArray(data.stages) && data.stages.length ? data.stages : ["*"],
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        });
        setItems(next);
        setLoading(false);
      },
      (err) => {
        console.error("Falha ao carregar templates:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [baseCol]);

  async function save(id, text, stages) {
    if (!id) throw new Error("id do template obrigatório em save(id, text, stages).");
    const ref = doc(db, "templatesWhatsapp", id);

    // preserva createdAt se já existir
    let createdAt = serverTimestamp();
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const ex = snap.data();
      if (ex && ex.createdAt) createdAt = ex.createdAt;
    }

    await setDoc(
      ref,
      {
        text: text ?? "",
        stages: Array.isArray(stages) && stages.length ? stages : ["*"],
        createdAt,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  async function remove(id) {
    if (!id) throw new Error("id do template obrigatório em remove(id).");
    await deleteDoc(doc(db, "templatesWhatsapp", id));
  }

  return { loading, templates: items, save, remove };
}

export default useTemplates;
