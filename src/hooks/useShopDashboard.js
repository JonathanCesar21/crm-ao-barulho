// src/hooks/useShopDashboard.js
import { useEffect, useMemo, useState } from "react";
import { subscribeLeadsByShop } from "../services/leadsService";
import { listSellersOfShop } from "../services/usersService";

function toMs(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  if (ts instanceof Date) return ts.getTime();
  const n = Number(ts);
  return Number.isFinite(n) ? n : 0;
}

export function useShopDashboard(shopId) {
  const [leads, setLeads] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Leads em tempo real
  useEffect(() => {
    if (!shopId) {
      setLeads([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeLeadsByShop(shopId, (list) => {
      setLeads(list || []);
      setLoading(false);
    });
    return () => unsub?.();
  }, [shopId]);

  // Vendedores (snapshot)
  useEffect(() => {
    if (!shopId) {
      setSellers([]);
      return;
    }
    (async () => {
      try {
        const list = await listSellersOfShop(shopId);
        setSellers(list || []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [shopId]);

  const sellerName = useMemo(() => {
    const map = new Map();
    sellers.forEach((s) => {
      const name = s.displayName || s.email || s.id;
      map.set(s.id, name);
      if (s.uid) map.set(s.uid, name);
    });
    return (uid) => map.get(uid) || "—";
  }, [sellers]);

  const metrics = useMemo(() => {
    const total = leads.length;

    // Por etapa
    const byStage = {};
    leads.forEach((l) => {
      const s = l.stage || "Novo";
      byStage[s] = (byStage[s] || 0) + 1;
    });

    // Por vendedor
    const bySellerMap = new Map();
    leads.forEach((l) => {
      const key = l.sellerUid || "_unassigned";
      bySellerMap.set(key, (bySellerMap.get(key) || 0) + 1);
    });
    const bySeller = Array.from(bySellerMap.entries())
      .map(([key, count]) => ({
        key,
        label: key === "_unassigned" ? "Não atribuído" : sellerName(key),
        count,
      }))
      .sort((a, b) => b.count - a.count);

    // Por campanha
    const byCampaignMap = new Map();
    leads.forEach((l) => {
      const c = (l.campaign || "").trim() || "(sem campanha)";
      byCampaignMap.set(c, (byCampaignMap.get(c) || 0) + 1);
    });
    const byCampaign = Array.from(byCampaignMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Recentes
    const recent = [...leads]
      .sort((a, b) => toMs(b.updatedAt || b.createdAt) - toMs(a.updatedAt || a.createdAt))
      .slice(0, 10);

    // Conversão (ajuste nomes conforme seu funil)
    const closed = byStage["Fechado"] || byStage["Ganhou"] || 0;
    const lost   = byStage["Perdido"] || byStage["Perda"] || 0;
    const convRate = total ? Math.round((closed / total) * 100) : 0;

    return { total, byStage, bySeller, byCampaign, recent, closed, lost, convRate };
  }, [leads, sellerName]);

  return { loading, metrics, leads, sellers, sellerName };
}
