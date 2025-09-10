// src/hooks/useTemplates.js
import { useEffect, useState } from "react";
import { getAllTemplates, setTemplate } from "../services/shopsService";
import { useRole } from "../contexts/RoleContext";

export function useTemplates() {
  const { shopId } = useRole();
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!shopId) return;
      setLoading(true);
      try {
        const all = await getAllTemplates(shopId);
        setTemplates(all || {});
      } finally {
        setLoading(false);
      }
    })();
  }, [shopId]);

  async function save(stage, text) {
    if (!shopId) return;
    await setTemplate(shopId, stage, text);
    setTemplates((prev) => ({ ...prev, [stage]: { text } }));
  }

  return { loading, templates, save };
}
