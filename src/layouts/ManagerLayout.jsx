import RootLayout from "./RootLayout";
export default function ManagerLayout() {
  const items = [
    { label: "Dashboard", to: "/manager/dashboard" },
    { label: "Vendedores", to: "/manager/vendedores" },
    { label: "Leads (Upload CSV)", to: "/manager/leads/upload" },
    { label: "Leads da Loja", to: "/manager/leads" },
  ];
  return <RootLayout navItems={items} />;
}
