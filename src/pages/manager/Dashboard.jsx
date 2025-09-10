// src/pages/manager/Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { useRole } from "../../contexts/RoleContext";
import { useShopDashboard } from "../../hooks/useShopDashboard";
import { filterLeads, aggregate } from "../../lib/metrics";
import {
  TrendingUp, Users, FolderKanban, Target, Clock4, Filter, RotateCcw, BarChart2, PieChart, LineChart
} from "lucide-react";

// Gráficos (Recharts)
import {
  LineChart as RLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart as RBarChart, Bar, PieChart as RPieChart, Pie, Cell, Legend,
} from "recharts";

import "./dashboard.css";

const COLORS = ["#6366F1", "#22C55E", "#F59E0B", "#EF4444", "#06B6D4", "#A855F7", "#10B981", "#F97316"];

function Stat({ icon: Icon, label, value, hint }) {
  return (
    <div className="card stat">
      <div className="stat-icon">
        <Icon size={18} />
      </div>
      <div className="stat-content">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {hint ? <div className="stat-hint">{hint}</div> : null}
      </div>
    </div>
  );
}

function Section({ title, right, children }) {
  return (
    <div className="card section">
      <div className="section-head">
        <h3 className="section-title">{title}</h3>
        <div className="section-right">{right}</div>
      </div>
      {children}
    </div>
  );
}

export default function ManagerDashboard() {
  const { shopId } = useRole();
  const { loading, metrics, ...rest } = useShopDashboard(shopId);

  // Expor leads/sellers do hook (fallback caso ainda não estejam expostos)
  const { leads, shopSellers } = useMemo(() => {
    return {
      leads: rest?.leads || [],
      shopSellers: rest?.sellers || []
    };
  }, [rest]);

  // === Filtros ===
  const [period, setPeriod] = useState("30"); // "7" | "30" | "90" | "all" | "custom"
  const [from, setFrom] = useState(startOfDay(subDays(new Date(), 30)));
  const [to, setTo] = useState(endOfDay(new Date()));
  const [selSeller, setSelSeller] = useState(null);      // uid | "_unassigned" | null
  const [selCampaign, setSelCampaign] = useState(null);  // string | null

  useEffect(() => {
    const now = new Date();
    if (period === "7") {
      setFrom(startOfDay(subDays(now, 7)));
      setTo(endOfDay(now));
    } else if (period === "30") {
      setFrom(startOfDay(subDays(now, 30)));
      setTo(endOfDay(now));
    } else if (period === "90") {
      setFrom(startOfDay(subDays(now, 90)));
      setTo(endOfDay(now));
    } else if (period === "all") {
      setFrom(null);
      setTo(null);
    }
  }, [period]);

  // aplica filtros
  const visible = useMemo(() => {
    return filterLeads(leads, {
      from, to,
      sellerUid: selSeller ?? null,
      campaign: selCampaign ?? null,
    });
  }, [leads, from, to, selSeller, selCampaign]);

  const aggr = useMemo(() => aggregate(visible, shopSellers), [visible, shopSellers]);

  if (loading) {
    return <div className="manager-dashboard"><div className="loading">Carregando métricas…</div></div>;
  }

  const { total, byStage, bySeller, byCampaign, timeSeries, recent, convRate, closed, lost } = aggr;

  const resetDrill = () => { setSelSeller(null); setSelCampaign(null); };

  return (
    <div className="manager-dashboard">
      {/* Cabeçalho + filtros */}
      <div className="topbar">
        <div className="title-group">
          <h2>Dashboard da Loja</h2>
          <p className="subtitle">Loja: <b>{shopId}</b></p>
        </div>

        <div className="filters">
          <div className="filters-icon"><Filter size={16} /></div>
          <select
            className="input"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            title="Período"
          >
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="all">Todos</option>
            <option value="custom">Customizado</option>
          </select>

          {period === "custom" && (
            <>
              <input
                type="date"
                className="input"
                value={from ? format(from, "yyyy-MM-dd") : ""}
                onChange={(e) => setFrom(e.target.value ? startOfDay(new Date(e.target.value)) : null)}
                title="De"
              />
              <input
                type="date"
                className="input"
                value={to ? format(to, "yyyy-MM-dd") : ""}
                onChange={(e) => setTo(e.target.value ? endOfDay(new Date(e.target.value)) : null)}
                title="Até"
              />
            </>
          )}

          {(selSeller || selCampaign) && (
            <button
              className="btn btn-ghost"
              onClick={resetDrill}
              title="Limpar drill-down"
            >
              <RotateCcw size={14} /> <span>Limpar</span>
            </button>
          )}
        </div>
      </div>

      {/* Cards topo */}
      <div className="grid-cards grid-4">
        <Stat icon={FolderKanban} label="Leads no período" value={total} />
        <Stat icon={TrendingUp} label="Conversão" value={`${convRate}%`} hint={`${closed} fechados / ${total} totais`} />
        <Stat icon={Users} label="Não atribuídos" value={bySeller.find(s => s.key === "_unassigned")?.count || 0} hint="Disponíveis" />
        <Stat icon={Target} label="Perdidos" value={lost} />
      </div>

      {/* Série temporal */}
      <Section
        title="Leads por dia"
        right={<span className="legend"><LineChart size={16} /> Série</span>}
      >
        {timeSeries.length === 0 ? (
          <div className="muted">Sem dados no período.</div>
        ) : (
          <div className="chart">
            <ResponsiveContainer>
              <RLineChart data={timeSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke={COLORS[0]} strokeWidth={2} dot={false} />
              </RLineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Section>

      {/* Etapas (pizza) + por vendedor (barra) */}
      <div className="grid-cards grid-2">
        <Section
          title="Leads por etapa"
          right={<span className="legend"><PieChart size={16} /> Pizza</span>}
        >
          {Object.keys(byStage).length === 0 ? (
            <div className="muted">Sem dados.</div>
          ) : (
            <div className="chart">
              <ResponsiveContainer>
                <RPieChart>
                  <Pie
                    data={Object.entries(byStage).map(([name, value]) => ({ name, value }))}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={90}
                    label
                  >
                    {Object.entries(byStage).map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </RPieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>

        <Section
          title="Leads por vendedor"
          right={<span className="legend"><BarChart2 size={16} /> Barras</span>}
        >
          {bySeller.length === 0 ? (
            <div className="muted">Sem vendedores ou leads.</div>
          ) : (
            <>
              <div className="hint">Clique em uma barra para filtrar por vendedor.</div>
              <div className="chart">
                <ResponsiveContainer>
                  <RBarChart
                    data={bySeller.map((s) => ({ name: s.label, uid: s.key, count: s.count }))}
                    onClick={(e) => {
                      const uid = e?.activePayload?.[0]?.payload?.uid;
                      if (uid !== undefined) setSelSeller(uid);
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill={COLORS[2]} radius={[6, 6, 0, 0]} />
                  </RBarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </Section>
      </div>

      {/* Por campanha (barra) + últimos atualizados (tabela) */}
      <div className="grid-cards grid-2">
        <Section title="Leads por campanha" right={null}>
          {byCampaign.length === 0 ? (
            <div className="muted">Sem campanhas.</div>
          ) : (
            <>
              <div className="hint">Clique em uma barra para filtrar por campanha.</div>
              <div className="chart">
                <ResponsiveContainer>
                  <RBarChart
                    data={byCampaign.map((c) => ({ name: c.name, count: c.count }))}
                    onClick={(e) => {
                      const name = e?.activePayload?.[0]?.payload?.name;
                      if (name) setSelCampaign(name);
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill={COLORS[1]} radius={[6, 6, 0, 0]} />
                  </RBarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </Section>

        <Section title="Últimos atualizados" right={<Clock4 size={16} className="icon-muted" />}>
          {recent.length === 0 ? (
            <div className="muted">Sem movimentações.</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Campanha</th>
                    <th>Etapa</th>
                    <th>Atribuído a</th>
                    <th>Atualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((l) => (
                    <tr key={l.id}>
                      <td>{l.nome || "—"}</td>
                      <td>{(l.campaign || "").trim() || "(sem campanha)"}</td>
                      <td><span className="badge">{l.stage || "Novo"}</span></td>
                      <td>{l.sellerUid || "Não atribuído"}</td>
                      <td>
                        {new Date((l.updatedAt || l.createdAt)?.toDate?.() || (l.updatedAt || l.createdAt) || Date.now()).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
