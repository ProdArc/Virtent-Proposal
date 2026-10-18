import Link from "next/link";
import { CaretRight, Plug, SignOut, UserCircle } from "@phosphor-icons/react/dist/ssr";
import { getSessionUser } from "@/lib/auth";
import { getAvatarSignedUrl } from "@/lib/profile";
import { logoutAction } from "@/app/logout/actions";
import { Panel, PageHeader } from "@/components/financeiro/ui";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { AvatarPicker } from "./AvatarPicker";
import { removeAvatarAction, uploadAvatarAction } from "./actions";

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const user = await getSessionUser();
  const name = user ? capitalize(user) : "Virtent";
  const avatarUrl = user ? await getAvatarSignedUrl(user) : null;

  return (
    <>
      <PageHeader title="Configurações" subtitle="Conta e integrações do financeiro." />

      <div className="flex flex-col gap-3">
        <Panel>
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-light text-brand-ink">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserCircle size={34} weight="fill" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{name}</p>
              <p className="text-xs text-secondary-ink">Sessão atual</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <AvatarPicker action={uploadAvatarAction} hasAvatar={Boolean(avatarUrl)} />
                {avatarUrl && (
                  <form action={removeAvatarAction}>
                    <SubmitButton
                      pendingLabel="Removendo..."
                      className="text-xs font-semibold text-overdue-ink hover:text-overdue-deep transition-colors"
                    >
                      Remover foto
                    </SubmitButton>
                  </form>
                )}
              </div>
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
