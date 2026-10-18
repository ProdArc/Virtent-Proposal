"use client";

import { btnGhost } from "@/components/financeiro/ui";

/** Seletor de arquivo que envia sozinho assim que uma imagem é escolhida — sem botão "Enviar" separado. */
export function AvatarPicker({
  action,
  hasAvatar,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hasAvatar: boolean;
}) {
  return (
    <form action={action} encType="multipart/form-data" className="flex items-center">
      <label className={`${btnGhost} h-8 cursor-pointer px-0 text-xs`}>
        <input
          type="file"
          name="file"
          accept="image/*"
          required
          className="hidden"
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        />
        {hasAvatar ? "Trocar foto" : "Adicionar foto"}
      </label>
    </form>
  );
}
