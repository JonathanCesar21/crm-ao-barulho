// src/routes/RoleGate.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useRole } from "../contexts/RoleContext";

// Uso: <RoleGate allow={['admin']} />   ou   <RoleGate allow={['manager','admin']} />
// Opcional: <RoleGate allow={['manager']} requireShop />
export default function RoleGate({ allow = [], requireShop = false, redirectTo = "/" }) {
  const { role, shopId, loading } = useRole();

  if (loading) {
    return (
      <div className="min-h-screen grid-center">
        <span className="text-neutral-600">Carregando…</span>
      </div>
    );
  }

  const roleOk = allow.length === 0 || allow.includes(role);
  const shopOk = !requireShop || Boolean(shopId);

  if (roleOk && shopOk) return <Outlet />;

  return <Navigate to={redirectTo} replace />;
}
