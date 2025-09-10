// src/hooks/useKanban.js
import { useEffect, useMemo, useState } from "react";
import { KANBAN_STAGES } from "../constants/kanbanStages";
import { subscribeLeadsByShop, moveLeadStage } from "../services/leadsService";
import { useRole } from "../contexts/RoleContext";

function getMillis(ts) {
  if (!ts) return 0;
  // Firestore Timestamp -> ms
  if (typeof ts.toMillis === "function") return ts.toMillis();
  // Date | number
  return ts instanceof Date ? ts.getTime() : Number(ts) || 0;
}

export function useKanban() {
  const { shopId, role, user } = useRole();
  const [allLeads, setAllLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // busca e campanha selecionadas
  const [q, setQ] = useState("");
  const [campaign, setCampaign] = useState("");           // campanha selecionada
  const [campaigns, setCampaigns] = useState([]);         // [{name, latestMs}]

  useEffect(() => {
    if (!shopId) return;
    setLoading(true);
    const unsub = subscribeLeadsByShop(shopId, (list) => {
      setAllLeads(list);
      setLoading(false);
    });
    return () => unsub && unsub();
  }, [shopId]);

  // Leva em conta papel: vendedor vê seus leads + não atribuídos
  const visibleForRole = useMemo(() => {
    if (role === "seller" && user?.uid) {
      return allLeads.filter((l) => !l.sellerUid || l.sellerUid === user.uid);
    }
    return allLeads;
  }, [allLeads, role, user]);

  // Monta lista de campanhas e define a default (última do vendedor) quando necessário
  useEffect(() => {
    // agrupa por campaign
    const map = new Map();
    for (const l of visibleForRole) {
      const name = (l.campaign || "").trim() || "(sem campanha)";
      const ms = getMillis(l.createdAt);
      const cur = map.get(name);
      if (!cur || ms > cur.latestMs) map.set(name, { name, latestMs: ms });
    }
    const list = Array.from(map.values()).sort((a, b) => b.latestMs - a.latestMs);
    setCampaigns(list);

    // se não houver campanha selecionada, escolhe a última
    if (!campaign && list.length) {
      setCampaign(list[0].name);
    }
    // se a campanha selecionada sumiu, volta para a mais recente
    if (campaign && list.length && !list.find((c) => c.name === campaign)) {
      setCampaign(list[0].name);
    }
  }, [visibleForRole]); // eslint-disable-line react-hooks/exhaustive-deps

  // aplica filtro por busca e campanha
  const filtered = useMemo(() => {
    let arr = visibleForRole;

    if (campaign) {
      const canon = campaign.trim();
      arr = arr.filter((l) => ((l.campaign || "").trim() || "(sem campanha)") === canon);
    }

    if (q.trim()) {
      const t = q.trim().toLowerCase();
      arr = arr.filter((l) =>
        (l.nome || "").toLowerCase().includes(t) ||
        (l.telefone || "").toLowerCase().includes(t) ||
        (l.cidade || "").toLowerCase().includes(t)
      );
    }
    return arr;
  }, [visibleForRole, q, campaign]);

  // agrupa por etapa
  const itemsByStage = useMemo(() => {
    const obj = Object.fromEntries(KANBAN_STAGES.map((s) => [s, []]));
    for (const lead of filtered) {
      const stage = lead.stage || "Novo";
      if (!obj[stage]) obj[stage] = [];
      obj[stage].push(lead);
    }
    return obj;
  }, [filtered]);

  async function onMove(leadId, toStage) {
    if (!shopId) return;
    await moveLeadStage(shopId, leadId, toStage);
  }

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
