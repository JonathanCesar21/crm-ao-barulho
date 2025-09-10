// opcional: se quiser um card genérico p/ outros usos
export default function Card({ children }) {
  return <div className="border rounded-lg p-3 bg-white">{children}</div>;
}
