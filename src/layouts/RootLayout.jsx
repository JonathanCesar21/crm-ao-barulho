import { Outlet } from "react-router-dom";
import Sidebar from "../components/nav/Sidebar";
import Topbar from "../components/nav/Topbar";
import { useRole } from "../contexts/RoleContext";

export default function RootLayout({ navItems = [] }) {
  const { role } = useRole();

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex">
      <Sidebar items={navItems} role={role} />
      <div className="flex-1 min-w-0">
        <Topbar />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
