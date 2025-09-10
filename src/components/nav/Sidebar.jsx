import { NavLink } from "react-router-dom";
import { Circle } from "lucide-react";
import clsx from "clsx";

export default function Sidebar({ items = [], role }) {
  return (
    <aside className="hidden md:flex w-60 shrink-0 border-r min-h-screen flex-col">
      <div className="h-14 border-b flex items-center px-4">
        <img src="/src/assets/logo.svg" alt="logo" height={24} />
      </div>
      <nav className="p-3 space-y-1">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition",
                isActive ? "bg-black text-white" : "hover:bg-black/5"
              )
            }
          >
            <Circle size={12} />
            <span className="text-sm">{it.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto p-3 text-xs text-neutral-600">
        <div>Papel: <b>{role || "—"}</b></div>
        <div className="mt-2">
          <a className="hover:underline" href="/logout">Sair</a>
        </div>
      </div>
    </aside>
  );
}
