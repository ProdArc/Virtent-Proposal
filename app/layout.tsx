import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// Metadata genérica — cada proposta em /[slug] sobrescreve title/description
// via generateMetadata com o conteúdo real daquele cliente.
export const metadata: Metadata = {
  title: "Virtent — Propostas Comerciais",
  description: "Propostas comerciais personalizadas da Virtent.",
  // Ícones (app/icon.png, app/apple-icon.png e app/favicon.ico) o Next liga
  // sozinho pelo nome do arquivo. Aqui fica só o "salvar na tela de início" do
  // iOS: abre sem a barra do Safari, como app, com o nome curto abaixo do ícone.
  appleWebApp: {
    capable: true,
    title: "Virtent",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="bg-[#F9FBF8] text-[#18181B] min-h-full">
        {children}
      </body>
    </html>
  );
}
