import RootLayout from "./RootLayout";
export default function AdminLayout() {
  const items = [
    { label: "Dashboard", to: "/admin/dashboard" },
    { label: "Lojas", to: "/admin/lojas" },
    { label: "Usuários", to: "/admin/usuarios" },
    { label: "Templates WhatsApp", to: "/admin/templates" },
  ];
  return <RootLayout navItems={items} />;
}
