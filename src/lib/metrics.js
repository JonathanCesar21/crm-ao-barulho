// src/lib/metrics.js
import { format, startOfDay, isAfter, isBefore } from "date-fns";

function toMs(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  if (ts instanceof Date) return ts.getTime();
  const n = Number(ts);
  return Number.isFinite(n) ? n : 0;
}

export function filterLeads(leads, { from = null, to = null, sellerUid = null, campaign = null } = {}) {
  return (leads || []).filter((l) => {
    // período
    const when = toMs(l.updatedAt || l.createdAt);
    if (from && when < +from) return false;
    if (to && when > +to) return false;

    // seller (permitir não atribuídos quando sellerUid === "_unassigned")
    if (sellerUid != null) {
      if (sellerUid === "_unassigned") {
        if (l.sellerUid) return false;
      } else if (l.sellerUid !== sellerUid) return false;
    }

    // campanha (normaliza vazio)
    if (campaign != null) {
      const lc = (l.campaign || "").trim() || "(sem campanha)";
      if (lc !== campaign) return false;
    }

    return true;
  });
}

export function aggregate(leads, sellers) {
  const nameByUid = new Map();
  (sellers || []).forEach((s) => {
    const nm = s.displayName || s.email || s.id;
    nameByUid.set(s.id, nm);
    if (s.uid) nameByUid.set(s.uid, nm);
  });

  const total = leads.length;

  // By stage
  const byStage = {};
  leads.forEach((l) => {
    const st = l.stage || "Novo";
    byStage[st] = (byStage[st] || 0) + 1;
  });

  // By seller
  const bySellerMap = new Map();
  leads.forEach((l) => {
    const key = l.sellerUid || "_unassigned";
    bySellerMap.set(key, (bySellerMap.get(key) || 0) + 1);
  });
  const bySeller = Array.from(bySellerMap.entries())
    .map(([key, count]) => ({
      key,
      label: key === "_unassigned" ? "Não atribuído" : (nameByUid.get(key) || key),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // By campaign
  const byCampaignMap = new Map();
  leads.forEach((l) => {
    const c = (l.campaign || "").trim() || "(sem campanha)";
    byCampaignMap.set(c, (byCampaignMap.get(c) || 0) + 1);
  });
  const byCampaign = Array.from(byCampaignMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Time series (por dia)
  const seriesMap = new Map();
  leads.forEach((l) => {
    const d = format(startOfDay(new Date(toMs(l.createdAt || l.updatedAt))), "yyyy-MM-dd");
    seriesMap.set(d, (seriesMap.get(d) || 0) + 1);
  });
  const timeSeries = Array.from(seriesMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  // Recent
  const recent = [...leads]
    .sort((a, b) => toMs(b.updatedAt || b.createdAt) - toMs(a.updatedAt || a.createdAt))
    .slice(0, 10);

  // Conversão (ajuste nomes conforme seu funil)
  const closed = (byStage["Fechado"] || byStage["Ganhou"] || 0);
  const lost = (byStage["Perdido"] || byStage["Perda"] || 0);
  const convRate = total ? Math.round((closed / total) * 100) : 0;

  return { total, byStage, bySeller, byCampaign, timeSeries, recent, closed, lost, convRate };
}
