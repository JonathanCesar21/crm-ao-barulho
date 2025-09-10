// src/routes/index.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import RoleGate from "./RoleGate";

// Import suas páginas reais quando estiverem prontas
// import AdminDashboard from "../pages/admin/Dashboard";
// import ManagerDashboard from "../pages/manager/Dashboard";
// import Kanban from "../pages/seller/Kanban";
// import Login from "../pages/auth/Login";

export default function AppRoutes() {
  return (
    <Routes>
      {/* públicas */}
      {/* <Route path="/login" element={<Login />} /> */}

      {/* protegidas */}
      <Route element={<ProtectedRoute />}>
        <Route element={<RoleGate allow={['admin']} />}>
          {/* <Route path="/admin/dashboard" element={<AdminDashboard />} /> */}
        </Route>

        <Route element={<RoleGate allow={['manager']} requireShop />}>
          {/* <Route path="/manager/dashboard" element={<ManagerDashboard />} /> */}
        </Route>

        <Route element={<RoleGate allow={['seller']} requireShop />}>
          {/* <Route path="/seller/kanban" element={<Kanban />} /> */}
        </Route>
      </Route>

      {/* fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
