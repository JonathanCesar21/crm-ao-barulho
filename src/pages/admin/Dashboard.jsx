import MiniKpi from "../../components/charts/MiniKpi";

export default function AdminDashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <MiniKpi title="Lojas ativas" value="—" />
      <MiniKpi title="Leads totais" value="—" />
      <MiniKpi title="Conversão" value="—" />
      <div className="card md:col-span-3">
        <h3 className="font-medium mb-2">Visão geral</h3>
        <p className="text-sm text-neutral-600">Em breve: gráficos e filtros por data.</p>
      </div>
    </div>
  );
}
