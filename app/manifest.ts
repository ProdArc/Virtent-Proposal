import type { MetadataRoute } from "next";

// Usado pelo Chrome/Android no "Adicionar à tela inicial" — o ícone do iOS
// vem de app/apple-icon.png (convenção automática do Next), esse arquivo cobre
// o lado Android/PWA. "icon-512-maskable" tem a logo com respiro nas bordas
// pra não cortar quando o Android aplica a máscara circular/squircle dele.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Virtent — Financeiro",
    short_name: "Virtent",
    description: "Gestão financeira e propostas comerciais da Virtent.",
    start_url: "/painel",
    display: "standalone",
    background_color: "#F0F3EF",
    theme_color: "#F0F3EF",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
