// src/components/Sidebar.jsx
import { NavLink } from "react-router-dom";
import { Circle } from "lucide-react";
import clsx from "clsx";
import "./sidebar.css"; // << importa o css dedicado

export default function Sidebar({ items = [], role }) {
  return (
    <aside className="app-sidebar">
      <div className="brand">
        <img src="/src/assets/logo.svg" alt="logo" height={24} />
      </div>

      <nav className="nav">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) =>
              clsx("sb-link", isActive ? "is-active" : "")
            }
          >
            <Circle aria-hidden size={14} />
            <span className="sb-text">{it.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="role-line">
          Papel: <span className="role-badge">{role || "—"}</span>
        </div>
        <a className="logout" href="/logout">Sair</a>
      </div>
    </aside>
  );
}
