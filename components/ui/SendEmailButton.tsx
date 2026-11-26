"use client";

import { useState, useTransition } from "react";

/**
 * Botão que abre um modal com a prévia real do e-mail (destinatário, assunto,
 * corpo renderizado) antes de disparar o envio de verdade — pra nunca sair um
 * e-mail de cobrança sem o usuário conferir o conteúdo primeiro.
 *
 * O envio é disparado chamando a server action direto (em vez de `<form
 * action={action}>`, fire-and-forget) justamente pra poder esperar ela
 * terminar e fechar o modal sozinho — sem isso, o modal ficava aberto com
 * "Confirmar envio" clicável depois do e-mail já ter saído, e um segundo
 * clique sem querer mandava o mesmo e-mail de novo pro cliente.
 */
export function SendEmailButton({
  action,
  hiddenFields,
  to,
  subject,
  previewHtml,
  blockedReason,
  sentAt,
  triggerLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  hiddenFields: Record<string, string>;
  to: string;
  subject: string;
  previewHtml: string;
  blockedReason: string | null;
  sentAt: string | null;
  triggerLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    const formData = new FormData();
    for (const [name, value] of Object.entries(hiddenFields)) {
      formData.set(name, value);
    }
    startTransition(async () => {
      await action(formData);
      setOpen(false);
    });
  }

  const sentBadge = sentAt && (
    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-paid-bg text-brand-ink">
      E-mail enviado em {new Date(sentAt).toLocaleDateString("pt-BR")}
    </span>
  );

  if (blockedReason) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {sentBadge}
        <span className="text-xs text-subtle">
          {sentAt ? "Reenvio" : triggerLabel} indisponível — {blockedReason}
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {sentBadge}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={
            sentAt
              ? "text-xs font-semibold text-brand-ink hover:underline"
              : "text-xs font-semibold px-4 py-1.5 rounded-full border border-border text-ink hover:bg-surface transition-colors min-h-10"
          }
        >
          {sentAt ? "Reenviar" : triggerLabel}
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="w-full max-w-lg max-h-full overflow-y-auto rounded-2xl bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs uppercase tracking-[0.18em] font-semibold text-brand-ink mb-3">
              Prévia do e-mail
            </p>
            <p className="text-xs text-secondary-ink mb-1">
              Para: <span className="font-medium text-ink">{to}</span>
            </p>
            <p className="text-sm font-semibold text-ink mb-3">{subject}</p>
            <div
              className="rounded-2xl border border-hairline overflow-hidden mb-5"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={handleConfirm}
                className="text-sm font-semibold px-4 py-2 rounded-full bg-brand text-white hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed transition-colors min-h-10"
              >
                {pending ? "Enviando..." : "Confirmar envio"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-secondary-ink hover:text-ink transition-colors disabled:opacity-60"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
