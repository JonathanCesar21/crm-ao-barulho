export default function MiniKpi({ title, value }) {
  return (
    <div className="card">
      <div className="text-sm text-neutral-600">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
