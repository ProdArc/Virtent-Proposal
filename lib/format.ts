/**
 * Formatadores de campo. Puros e sem server-only de propósito: os mesmos
 * usados na máscara enquanto se digita valem para exibir o valor salvo, então
 * o dado nunca aparece de dois jeitos diferentes no sistema.
 */

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * CPF (11 dígitos) ou CNPJ (14). Decide pelo tamanho enquanto digita, então o
 * mesmo campo atende pessoa física e jurídica sem precisar escolher o tipo.
 */
export function formatDocument(value: string): string {
  const d = onlyDigits(value).slice(0, 14);

  if (d.length <= 11) {
    // CPF: 000.000.000-00
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }

  // CNPJ: 00.000.000/0000-00
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** Rótulo do tipo de documento, para deixar claro o que foi reconhecido. */
export function documentKind(value: string): "CPF" | "CNPJ" | null {
  const len = onlyDigits(value).length;
  if (len === 11) return "CPF";
  if (len === 14) return "CNPJ";
  return null;
}

/** Telefone BR: (11) 91234-5678 (celular) ou (11) 1234-5678 (fixo). */
export function formatPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/**
 * Formata um valor já salvo para exibição. Devolve o original quando não
 * reconhece o formato — é melhor mostrar o que o usuário digitou do que uma
 * máscara errada por cima de um dado estrangeiro ou incompleto.
 */
export function displayDocument(value: string | null): string {
  if (!value) return "";
  const len = onlyDigits(value).length;
  return len === 11 || len === 14 ? formatDocument(value) : value;
}

export function displayPhone(value: string | null): string {
  if (!value) return "";
  const len = onlyDigits(value).length;
  return len === 10 || len === 11 ? formatPhone(value) : value;
}
