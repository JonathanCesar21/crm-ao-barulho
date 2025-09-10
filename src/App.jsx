import { Routes, Route, Navigate } from "react-router-dom";
import Topbar from "./components/nav/Topbar"; // opcional manter na Home
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleGate from "./routes/RoleGate";

import AdminLayout from "./layouts/AdminLayout";
import ManagerLayout from "./layouts/ManagerLayout";
import SellerLayout from "./layouts/SellerLayout";

import Login from "./pages/auth/Login";
import ForgotPassword from "./pages/auth/ForgotPassword";
import Logout from "./pages/auth/Logout";

import AdminDashboard from "./pages/admin/Dashboard";
import LojasList from "./pages/admin/LojasList";
import Usuarios from "./pages/admin/Usuarios";
import TemplatesWhatsApp from "./pages/admin/TemplatesWhatsApp";

import ManagerDashboard from "./pages/manager/Dashboard";
import Vendedores from "./pages/manager/Vendedores";
import LeadsUpload from "./pages/manager/LeadsUpload";
import LeadsLoja from "./pages/manager/Leads";

import Setup from "./pages/auth/Setup";

import Invite from "./pages/auth/Invite";

import Kanban from "./pages/seller/Kanban";
import LeadsMinhaCarteira from "./pages/seller/LeadsMinhaCarteira";

// Home simples (pode manter do passo anterior)
function Home() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2">Bem-vindo 👋</h1>
      <p className="text-neutral-600 mb-6">Faça login para acessar seu painel.</p>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <Topbar />
      <main>
        <Routes>
          {/* Públicas */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/logout" element={<Logout />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/invite" element={<Invite />} />

          {/* Protegidas */}
          <Route element={<ProtectedRoute />}>
            {/* Admin */}
            <Route element={<RoleGate allow={['admin']} />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/lojas" element={<LojasList />} />
                <Route path="/admin/usuarios" element={<Usuarios />} />
                <Route path="/admin/templates" element={<TemplatesWhatsApp />} />
              </Route>
            </Route>

            {/* Manager */}
            <Route element={<RoleGate allow={['manager']} requireShop />}>
              <Route element={<ManagerLayout />}>
                <Route path="/manager/dashboard" element={<ManagerDashboard />} />
                <Route path="/manager/vendedores" element={<Vendedores />} />
                <Route path="/manager/leads/upload" element={<LeadsUpload />} />
                <Route path="/manager/leads" element={<LeadsLoja />} />
              </Route>
            </Route>

            {/* Seller */}
            <Route element={<RoleGate allow={['seller']} requireShop />}>
              <Route element={<SellerLayout />}>
                <Route path="/seller/kanban" element={<Kanban />} />
                <Route path="/seller/leads" element={<LeadsMinhaCarteira />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
