import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { registerManager } from "../../services/authService";
import { listShops } from "../../services/shopsService";
import { ShieldPlus, UserCog } from "lucide-react";

export default function Usuarios() {
  const [shops, setShops] = useState([]);
  const [loadingShops, setLoadingShops] = useState(true);

  const [mName, setMName] = useState("");
  const [mEmail, setMEmail] = useState("");
  const [mPass, setMPass] = useState("");
  const [mShopId, setMShopId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setShops(await listShops());
      } catch (e) {
        console.error(e);
        toast.error("Falha ao carregar lojas.");
      } finally {
        setLoadingShops(false);
      }
    })();
  }, []);

  async function onCreateManager(e) {
    e.preventDefault();
    if (!mName || !mEmail || !mPass || !mShopId) {
      toast.error("Preencha nome, e-mail, senha e loja.");
      return;
    }
    setSaving(true);
    try {
      await registerManager({
        email: mEmail.trim(),
        password: mPass,
        displayName: mName.trim(),
        shopId: mShopId,
      });
      toast.success("Gerente criado!");
      setMName(""); setMEmail(""); setMPass(""); setMShopId("");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível criar o gerente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-medium mb-2 flex items-center gap-2">
          <UserCog size={18} /> Criar gerente
        </h3>
        <form onSubmit={onCreateManager} className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-neutral-700">Nome</label>
            <input className="w-full border rounded-lg px-3 py-2"
              value={mName} onChange={(e) => setMName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-neutral-700">E-mail</label>
            <input className="w-full border rounded-lg px-3 py-2" type="email"
              value={mEmail} onChange={(e) => setMEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-neutral-700">Senha</label>
            <input className="w-full border rounded-lg px-3 py-2" type="password"
              value={mPass} onChange={(e) => setMPass(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-neutral-700">Loja</label>
            {loadingShops ? (
              <div className="text-sm text-neutral-600">Carregando lojas…</div>
            ) : (
              <select className="w-full border rounded-lg px-3 py-2"
                value={mShopId} onChange={(e) => setMShopId(e.target.value)}>
                <option value="">Selecione…</option>
                {shops.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.id} {s.name ? `— ${s.name}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="md:col-span-2">
            <button className="px-4 py-2 rounded-lg bg-black text-white hover:opacity-90 transition"
              disabled={saving}>
              {saving ? "Criando…" : "Criar gerente"}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3 className="font-medium mb-2 flex items-center gap-2">
          <ShieldPlus size={18} /> Observação
        </h3>
        <p className="text-sm text-neutral-600">
          Após criar o gerente, faça logout e entre com o novo e-mail/senha para acessar o painel do gerente.
          Lá você poderá criar vendedores, enviar convites e importar CSV de leads.
        </p>
      </div>
    </div>
  );
}
