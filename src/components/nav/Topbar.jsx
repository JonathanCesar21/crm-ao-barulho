import { Link } from "react-router-dom";
import { LogOut } from "lucide-react";

export default function Topbar() {
  return (
    <header className="topbar h-14 w-full flex items-center justify-between px-4">
      <div className="font-semibold">CRM Ao Barulho</div>
      <Link to="/logout" className="inline-flex items-center gap-2 text-sm border px-3 py-1.5 rounded-lg hover:bg-black/5 transition">
        <LogOut size={16} />
        Sair
      </Link>
    </header>
  );
}
