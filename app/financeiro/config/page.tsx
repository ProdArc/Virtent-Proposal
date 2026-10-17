import Link from "next/link";
import { CaretRight, Plug, SignOut, UserCircle } from "@phosphor-icons/react/dist/ssr";
import { getSessionUser } from "@/lib/auth";
import { logoutAction } from "@/app/logout/actions";
import { Panel, PageHeader } from "@/components/financeiro/ui";

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const user = await getSessionUser();
  const name = user ? capitalize(user) : "Virtent";

  return (
    <>
      <PageHeader title="Configurações" subtitle="Conta e integrações do financeiro." />

      <div className="flex flex-col gap-3">
        <Panel padded={false}>
          <div className="flex items-center gap-3 px-5 py-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand-ink">
              <UserCircle size={24} weight="fill" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">{name}</p>
              <p className="text-xs text-secondary-ink">Sessão atual</p>
            </div>
          </div>
        </Panel>

        <Panel padded={false}>
          <Link
            href="/financeiro/caixa/banco/conectar"
            className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-surface"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand-ink">
              <Plug size={22} weight="bold" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">Open Finance</p>
              <p className="text-xs text-secondary-ink">Conectar banco e gerenciar contas sincronizadas</p>
            </div>
            <CaretRight size={18} weight="bold" aria-hidden="true" className="shrink-0 text-subtle" />
          </Link>
        </Panel>

        <Panel padded={false}>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-surface"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-overdue-bg text-overdue-ink">
                <SignOut size={22} weight="bold" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">Sair</span>
                <span className="block text-xs text-secondary-ink">Encerrar a sessão neste aparelho</span>
              </span>
            </button>
          </form>
        </Panel>
      </div>
    </>
  );
}
