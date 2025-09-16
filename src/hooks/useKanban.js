// src/hooks/useKanban.js
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useRole } from "../contexts/RoleContext";
import { KANBAN_STAGES } from "../constants/kanbanStages";
import {
  subscribeLeadsByShop,
  moveLeadStage,
} from "../services/leadsService";

/* ===== helpers ===== */
function normStage(s = "") {
  return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
function useStageCanon() {
  return useMemo(() => {
    const normToLabel = {};
    KANBAN_STAGES.forEach((label) => (normToLabel[normStage(label)] = label));
    const labelToNorm = {};
    Object.entries(normToLabel).forEach(([n, label]) => (labelToNorm[label] = n));
    const canonLabel = (s) => normToLabel[normStage(s)] ?? s;
    const canonNorm = (s) => labelToNorm[canonLabel(s)] ?? normStage(s);
    return { canonLabel, canonNorm };
  }, []);
}
function leadId(lead) {
  return lead?.id || lead?.uid || null;
}
function normTxt(s = "") {
  return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function useKanban() {
  const { shopId } = useRole() || {};
  const { canonLabel } = useStageCanon();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);           // todos os leads
  const [q, setQ] = useState("");                 // busca
  const [campaign, setCampaign] = useState("");   // filtro de campanha
  const [campaigns, setCampaigns] = useState([]); // lista para o select

  // Assina os leads da loja
  useEffect(() => {
    if (!shopId) return;
    setLoading(true);
    const unsub = subscribeLeadsByShop(
      shopId,
      (list) => {
        setRows(list || []);
        setLoading(false);
      },
      { orderByField: "createdAt", direction: "desc" }
    );
    return () => unsub && unsub();
  }, [shopId]);

  // Deriva lista de campanhas a partir dos leads
  useEffect(() => {
    const set = new Map();
    rows.forEach((r) => {
      const c = (r.campanha || r.campaign || "").trim();
      if (!c) return;
      set.set(c, true);
    });
    setCampaigns(Array.from(set.keys()).map((name) => ({ id: name, name })));
  }, [rows]);

  // Filtro por campanha e busca
  const filtered = useMemo(() => {
    const qq = normTxt(q);
    return rows.filter((r) => {
      // campanha
      if (campaign) {
        const rc = (r.campanha || r.campaign || "").trim();
        if (normTxt(rc) !== normTxt(campaign)) return false;
      }
      // busca por nome/telefone/código
      if (!qq) return true;
      const blob =
        `${r.nome || ""} ${r.name || ""} ${r.telefone || ""} ${r.celular || ""} ${r.codigo || ""}`;
      return normTxt(blob).includes(qq);
    });
  }, [rows, q, campaign]);

  // Agrupa por estágio (respeitando labels canônicas)
  const itemsByStage = useMemo(() => {
    const acc = {};
    KANBAN_STAGES.forEach((s) => (acc[s] = []));
    filtered.forEach((r) => {
      const label = canonLabel(r.stage || "Novo");
      if (!acc[label]) acc[label] = [];
      acc[label].push(r);
    });
    return acc;
  }, [filtered, canonLabel]);

  // onMove robusto: aceita (from,to,id) | ({from,to,id}) | (from,to,{id})
  const onMove = useCallback(
    async (a, b, c) => {
      try {
        let from, to, id;
        if (typeof a === "object" && a) {
          ({ from, to, id } = a);
        } else if (typeof c === "object" && c) {
          from = a;
          to = b;
          id = c.id || c.leadId || c;
        } else {
          from = a;
          to = b;
          id = c;
        }

        // normaliza labels
        from = from ? canonLabel(from) : "";
        to = to ? canonLabel(to) : "";
        if (!id || !to || !from || from === to) return;

        // update otimista local
        setRows((prev) => {
          const i = prev.findIndex((x) => leadId(x) === id);
          if (i === -1) return prev;
          const clone = [...prev];
          clone[i] = { ...clone[i], stage: to };
          return clone;
        });

        // persistência
        await moveLeadStage(shopId, { from, to, id });
      } catch (err) {
        console.error("[useKanban] onMove error:", err);
        toast.error("Falha ao mover lead.");
        // (opcional) você pode reverter o otimista se quiser
      }
    },
    [shopId, canonLabel]
  );

  return {
    loading,
    itemsByStage,
    onMove,
    q,
    setQ,
    campaigns,
    campaign,
    setCampaign,
  };
}

export default useKanban;
