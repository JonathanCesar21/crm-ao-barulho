// src/contexts/RoleContext.jsx
import { createContext, useContext, useMemo } from "react";
import { useAuth } from "./AuthContext";

// Este contexto expõe atalhos de papel e loja.
// Útil se depois quisermos permitir trocar loja (multi-tenant) no futuro.

const RoleContext = createContext(null);

export function RoleProvider({ children }) {
  const { role, shopId, profile, user, loading } = useAuth();

  const value = useMemo(
    () => ({
      loading,
      user,
      role,     // 'admin' | 'manager' | 'seller' | null
      shopId,   // string | null
      profile,  // doc completo
      isAdmin: role === "admin",
      isManager: role === "manager",
      isSeller: role === "seller",
    }),
    [loading, user, role, shopId, profile]
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole deve ser usado dentro de <RoleProvider>");
  return ctx;
}
