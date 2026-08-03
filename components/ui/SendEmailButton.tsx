"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

function ConfirmSendButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-sm font-semibold px-4 py-2 rounded-lg bg-[#065F46] text-white hover:bg-[#047857] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? "Enviando..." : "Confirmar envio"}
    </button>
  );
}

/**
 * Botão que abre um modal com a prévia real do e-mail (destinatário, assunto,
 * corpo renderizado) antes de disparar o envio de verdade — pra nunca sair um
 * e-mail de cobrança sem o usuário conferir o conteúdo primeiro.
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
  action: (formData: FormData) => void;
  hiddenFields: Record<string, string>;
  to: string;
  subject: string;
  previewHtml: string;
  blockedReason: string | null;
  sentAt: string | null;
  triggerLabel: string;
}) {
  const [open, setOpen] = useState(false);

  if (sentAt) {
    return (
      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#ECFDF5] text-[#065F46]">
        E-mail enviado em {new Date(sentAt).toLocaleDateString("pt-BR")}
      </span>
    );
  }

  if (blockedReason) {
    return (
      <span className="text-xs text-[#A1A1AA]">
        {triggerLabel} indisponível — {blockedReason}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#E4E4E7] text-[#18181B] hover:bg-[#F9FBF8] transition-colors"
      >
        {triggerLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg max-h-full overflow-y-auto rounded-2xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs uppercase tracking-[0.18em] font-semibold text-[#065F46] mb-3">
              Prévia do e-mail
            </p>
            <p className="text-xs text-[#71717A] mb-1">
              Para: <span className="font-medium text-[#18181B]">{to}</span>
            </p>
            <p className="text-sm font-semibold text-[#18181B] mb-3">{subject}</p>
            <div
              className="rounded-xl border border-[#E4E4E7] overflow-hidden mb-5"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
            <form action={action} className="flex items-center gap-3">
              {Object.entries(hiddenFields).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
              ))}
              <ConfirmSendButton />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-[#71717A] hover:text-[#18181B] transition-colors"
              >
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
