"use client";

import { useState } from "react";
import { PluggyConnect } from "react-pluggy-connect";
import { createConnectTokenAction, saveConnectionAction } from "./actions";

// Conector "MeuPluggy" (meu.pluggy.ai) — id fixo no catálogo da Pluggy,
// confirmado via GET /connectors?name=MeuPluggy. É o plano gratuito: conecta
// contas do MESMO titular via OAuth, sem entrar no plano pago "Dados" (esse
// é só pra conectar contas de terceiros/clientes). Travar nele aqui evita
// que o widget mostre bancos "de verdade", que cairiam no plano pago.
const MEU_PLUGGY_CONNECTOR_ID = 200;

/**
 * Abre o widget oficial da Pluggy pra conectar uma conta bancária. O token
 * de conexão é gerado no servidor (precisa do CLIENT_SECRET, que nunca vai
 * pro navegador) e dura pouco — por isso só busca um token novo quando o
 * usuário de fato clica em conectar, não no carregamento da página.
 */
export function ConnectBankButton() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startConnect() {
    setError(null);
    setLoading(true);
    const result = await createConnectTokenAction();
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setToken(result.token ?? null);
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={startConnect}
        disabled={loading || saving}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Abrindo..." : saving ? "Salvando conta..." : "Conectar via Meu Pluggy (grátis)"}
      </button>

      {error && (
        <p className="rounded-lg border border-overdue-line bg-overdue-bg px-3 py-2 text-xs text-overdue-ink">
          {error}
        </p>
      )}

      {token && (
        <PluggyConnect
          connectToken={token}
          connectorIds={[MEU_PLUGGY_CONNECTOR_ID]}
          onSuccess={async ({ item }) => {
            setToken(null);
            setSaving(true);
            const result = await saveConnectionAction(item.id);
            setSaving(false);
            if (result.error) setError(result.error);
            else window.location.reload();
          }}
          onError={({ message }) => {
            setToken(null);
            setError(message);
          }}
          onClose={() => setToken(null)}
        />
      )}
    </div>
  );
}
