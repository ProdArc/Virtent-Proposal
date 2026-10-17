import { listConnections } from "@/lib/pluggy-connections";
import { ConfigError, EmptyState, PageHeader } from "@/components/financeiro/ui";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmButton } from "@/app/financeiro/[id]/ConfirmButton";
import { ConnectBankButton } from "./ConnectBankButton";
import { removeConnectionAction, syncNowAction } from "./actions";

const dateFmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "ainda não sincronizado";

export const dynamic = "force-dynamic";

export default async function ConectarBancoPage() {
  if (!process.env.PLUGGY_CLIENT_ID || !process.env.PLUGGY_CLIENT_SECRET) {
    return (
      <>
        <PageHeader back={{ href: "/financeiro/caixa/banco", label: "Voltar" }} title="Conectar banco" />
        <ConfigError message="PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET não configuradas no .env.local." />
      </>
    );
  }

  let connections: Awaited<ReturnType<typeof listConnections>> = [];
  let configError: string | null = null;
  try {
    connections = await listConnections();
  } catch (err) {
    configError = err instanceof Error ? err.message : "Erro ao carregar conexões.";
  }

  if (configError) {
    return (
      <>
        <PageHeader back={{ href: "/financeiro/caixa/banco", label: "Voltar" }} title="Conectar banco" />
        <ConfigError message={`${configError} Rode a migração 012_pluggy_connections.sql no SQL Editor do Supabase.`} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        back={{ href: "/financeiro/caixa/banco", label: "Voltar" }}
        title="Conectar banco"
        subtitle="Suas credenciais do banco nunca passam pelo nosso servidor — o widget abaixo é da própria Pluggy."
      />

      <div className="mb-6">
        <ConnectBankButton />
      </div>

      {connections.length === 0 ? (
        <EmptyState
          title="Nenhuma conta conectada ainda"
          description="Depois de conectar, as movimentações novas chegam automaticamente (via webhook) ou você sincroniza na mão."
        />
      ) : (
        <div className="rounded-3xl bg-card shadow-card overflow-hidden">
          {connections.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3.5 last:border-b-0 sm:px-5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{c.institution_name}</p>
                <p className="text-xs text-secondary-ink">
                  {c.account_name ?? "Conta"} · última sincronização: {dateFmt(c.last_synced_at)}
                </p>
              </div>
              <form action={removeConnectionAction}>
                <input type="hidden" name="id" value={c.id} />
                <ConfirmButton
                  confirmText={`Desconectar "${c.institution_name}"? As movimentações já importadas continuam no extrato — só para de buscar novas.`}
                  className="shrink-0 text-xs font-medium text-overdue-ink transition-colors hover:text-overdue-deep"
                >
                  Desconectar
                </ConfirmButton>
              </form>
            </div>
          ))}
        </div>
      )}

      {connections.length > 0 && (
        <form action={syncNowAction} className="mt-4">
          <SubmitButton
            pendingLabel="Sincronizando..."
            className="inline-flex h-10 items-center justify-center rounded-full bg-card px-4 text-xs font-semibold text-ink ring-1 ring-line transition-colors hover:bg-neutral-bg"
          >
            Sincronizar agora
          </SubmitButton>
        </form>
      )}
    </>
  );
}
