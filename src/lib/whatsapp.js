// src/lib/whatsapp.js

export function buildWaLink(phoneRaw, text) {
  const phone = String(phoneRaw || "").replace(/\D/g, "");
  const msg = encode(text || "");
  return `https://wa.me/${phone}?text=${msg}`;
}

/**
 * Monta link usando template por etapa.
 */
export function buildWaLinkForStage({ shopId, stage, lead, fallback }) {
  const phone = String(lead?.telefone || "").replace(/\D/g, "");
  const firstName = (lead?.nome || "").split(" ")[0] || "";
  const templateText = (lead?.templateTextForStage || "").trim();

  const message = templateText
    ? injectLeadVars(templateText, { lead, firstName })
    : (fallback || `Olá ${firstName}! Podemos falar rapidinho?`);

  return `https://wa.me/${phone}?text=${encode(message)}`;
}

export function injectLeadVars(tpl, { lead, firstName }) {
  return (tpl || "")
    .replace(/\{\{\s*nome\s*\}\}/gi, lead?.nome || "")
    .replace(/\{\{\s*primeiroNome\s*\}\}/gi, firstName)
    .replace(/\{\{\s*cidade\s*\}\}/gi, lead?.cidade || "")
    .replace(/\{\{\s*origem\s*\}\}/gi, lead?.origem || "")
    .replace(/\{\{\s*observacao\s*\}\}/gi, lead?.observacao || "");
}

/** helper mini para encode */
function encode(s) {
  return encodeURIComponent(s || "");
}
