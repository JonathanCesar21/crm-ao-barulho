// src/hooks/useKanban.js
import { useEffect, useMemo, useState, useCallback } from "react";
import { KANBAN_STAGES } from "../constants/kanbanStages";
import { subscribeLeadsByShop, moveLeadStage } from "../services/leadsService";
import { useRole } from "../contexts/RoleContext";

function getMillis(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  return ts instanceof Date ? ts.getTime() : Number(ts) || 0;
}

export function useKanban() {
  const { shopId, role, user } = useRole();
  const [allLeads, setAllLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [campaign, setCampaign] = useState("");
  const [campaigns, setCampaigns] = useState([]); // [{name, latestMs}]

  useEffect(() => {
    if (!shopId) return;
    setLoading(true);
    const unsub = subscribeLeadsByShop(shopId, (list) => {
      setAllLeads(list);
      setLoading(false);
    });
    return () => unsub && unsub();
  }, [shopId]);

  // Vendedor: só vê seus leads + não atribuídos
  const visibleForRole = useMemo(() => {
    if (role === "seller" && user?.uid) {
      return allLeads.filter((l) => !l.sellerUid || l.sellerUid === user.uid);
    }
    return allLeads;
  }, [allLeads, role, user]);

  // Campanhas
  useEffect(() => {
    const map = new Map();
    for (const l of visibleForRole) {
      const name = (l.campaign || "").trim() || "(sem campanha)";
      const ms = getMillis(l.createdAt);
      const cur = map.get(name);
      if (!cur || ms > cur.latestMs) map.set(name, { name, latestMs: ms });
    }
    const list = Array.from(map.values()).sort((a, b) => b.latestMs - a.latestMs);
    setCampaigns(list);

    if (!campaign && list.length) setCampaign(list[0].name);
    if (campaign && list.length && !list.find((c) => c.name === campaign)) {
      setCampaign(list[0].name);
    }
  }, [visibleForRole]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filtros
  const filtered = useMemo(() => {
    let arr = visibleForRole;

    if (campaign) {
      const canon = campaign.trim();
      arr = arr.filter(
        (l) => ((l.campaign || "").trim() || "(sem campanha)") === canon
      );
    }

    if (q.trim()) {
      const t = q.trim().toLowerCase();
      arr = arr.filter(
        (l) =>
          (l.nome || "").toLowerCase().includes(t) ||
          (l.telefone || "").toLowerCase().includes(t) ||
          (l.cidade || "").toLowerCase().includes(t)
      );
    }
    return arr;
  }, [visibleForRole, q, campaign]);

  // Agrupa por etapa
  const itemsByStage = useMemo(() => {
    const obj = Object.fromEntries(KANBAN_STAGES.map((s) => [s, []]));
    for (const lead of filtered) {
      const stage = lead.stage || "Novo";
      if (!obj[stage]) obj[stage] = [];
      obj[stage].push(lead);
    }
    return obj;
  }, [filtered]);

  // onMove resiliente: aceita (leadId, toStage) ou (fromStage, toStage, leadId)
  const onMove = useCallback(
    async (...args) => {
      if (!shopId) return;
      let leadId, toStage;

      if (args.length === 2) {
        // (leadId, toStage)
        [leadId, toStage] = args;
      } else if (args.length === 3) {
        // (fromStage, toStage, leadId)
        [, toStage, leadId] = args;
      } else {
        return;
      }

      // só envia os 2 campos que as rules permitem para seller
      await moveLeadStage(shopId, leadId, toStage);
    },
    [shopId]
  );

  const counts = useMemo(() => {
    const c = {};
    for (const s of KANBAN_STAGES) c[s] = (itemsByStage[s] || []).length;
    return c;
  }, [itemsByStage]);

  return {
    loading,
    itemsByStage,
    onMove,
    q, setQ,
    counts,
    campaigns, campaign, setCampaign,
  };
}
