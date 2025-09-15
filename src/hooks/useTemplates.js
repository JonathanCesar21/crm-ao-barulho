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

// helpers de normalização (case/acento-insensível)
function norm(s = "") {
  return String(s)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim();
}

/**
 * Coleção GLOBAL: /templatesWhatsapp
 * Doc: tpl_*
 * {
 *   text: string,
 *   stages: string[],               // ["*", "Novo", ...]
 *   scope?: "global"|"campaign"|"store",
 *   campaign?: string|null,
 *   storeId?: string|null,
 *   createdAt, updatedAt
 * }
 *
 * API:
 *   const { loading, templates, save, remove, getTemplatesFor } = useTemplates();
 *   - getTemplatesFor({ stage, campaign, storeId }) -> [{id, text, stages, scope, campaign, storeId}]
 */
export function useTemplates() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState({}); // { id: data }

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
            scope: data.scope || "global",
            campaign: data.campaign ?? null,
            storeId: data.storeId ?? null,
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

  // Compat: save(id, text, stages)  |  Novo: save(id, { text, stages, scope, campaign, storeId })
  async function save(id, a, b) {
    if (!id) throw new Error("id do template obrigatório em save(id, ...).");
    const ref = doc(db, "templatesWhatsapp", id);

    let payload;
    if (typeof a === "object" && a !== null) {
      payload = { ...a };
    } else {
      payload = { text: a, stages: b };
    }

    if (!Array.isArray(payload.stages) || payload.stages.length === 0) {
      payload.stages = ["*"];
    }
    if (!payload.scope) payload.scope = "global";
    if (payload.scope === "campaign" && payload.campaign == null) {
      payload.campaign = "";
    }
    if (payload.scope !== "store") {
      payload.storeId = payload.storeId ?? null;
    }

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
        text: payload.text ?? "",
        stages: payload.stages,
        scope: payload.scope,
        campaign: payload.campaign ?? null,
        storeId: payload.storeId ?? null,
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

  /**
   * Seleciona templates aplicáveis a uma combinação de etapa+campanha+loja
   * - stage: string (obrigatório para filtrar por etapa)
   * - campaign: string|null
   * - storeId: string|null
   */
  function getTemplatesFor({ stage, campaign, storeId } = {}) {
    const stageN = norm(stage || "");
    const campN = norm(campaign || "");
    const storeN = norm(storeId || "");

    const all = Object.entries(items).map(([id, data]) => ({ id, ...data }));

    const filtered = all.filter((tpl) => {
      // filtro por etapa
      const okStage =
        (tpl.stages || []).some((st) => st === "*" || norm(st) === stageN);

      if (!okStage) return false;

      // filtro por scope
      const scope = tpl.scope || "global";
      if (scope === "global") return true;

      if (scope === "campaign") {
        return campN && norm(tpl.campaign || "") === campN;
      }

      if (scope === "store") {
        return storeN && norm(tpl.storeId || "") === storeN;
      }

      // desconhecido -> ignora
      return false;
    });

    // Ordena dando preferência aos mais específicos (store > campaign > global), depois por updatedAt desc
    const rank = { store: 3, campaign: 2, global: 1 };
    filtered.sort((a, b) => {
      const ra = rank[a.scope || "global"] || 0;
      const rb = rank[b.scope || "global"] || 0;
      if (ra !== rb) return rb - ra;
      const ta = a.updatedAt?.toMillis?.() ?? 0;
      const tb = b.updatedAt?.toMillis?.() ?? 0;
      return tb - ta;
    });

    return filtered;
  }

  return { loading, templates: items, save, remove, getTemplatesFor };
}

export default useTemplates;
