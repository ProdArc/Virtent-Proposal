import "server-only";
import { headers } from "next/headers";

/**
 * Celular (não tablet): "Mobi" cobre Android e iOS em modo celular, "iPhone"/
 * "iPod" garantem o Safari. Tablets ficam de fora de propósito — iPad novo se
 * identifica como Macintosh e tablets Android não trazem "Mobile" — porque a
 * tela larga comporta o painel normalmente.
 */
export async function isPhone(): Promise<boolean> {
  const ua = (await headers()).get("user-agent") ?? "";
  return /Mobi|iPhone|iPod/i.test(ua);
}

/**
 * Para onde mandar quem entra sem destino definido: no celular o painel de
 * escolha (propostas x financeiro) é um passo a mais — vai direto ao financeiro.
 */
export async function defaultHome(): Promise<string> {
  return (await isPhone()) ? "/financeiro" : "/painel";
}
