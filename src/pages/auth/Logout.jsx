// src/pages/auth/Logout.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { signOut } from "../../services/authService";

export default function Logout() {
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        await signOut();
        toast.success("Você saiu da conta.");
      } catch {
        // ignore
      } finally {
        nav("/login", { replace: true });
      }
    })();
  }, [nav]);

  return (
    <div className="min-h-screen grid-center">
      <span className="text-neutral-600">Saindo…</span>
    </div>
  );
}
