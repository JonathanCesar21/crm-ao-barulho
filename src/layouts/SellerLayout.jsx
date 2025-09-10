import RootLayout from "./RootLayout";
export default function SellerLayout() {
  const items = [
    { label: "Kanban", to: "/seller/kanban" },
    { label: "Minha carteira", to: "/seller/leads" },
  ];
  return <RootLayout navItems={items} />;
}
