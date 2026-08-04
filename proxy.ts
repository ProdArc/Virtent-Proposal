import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

// Gate de sessão (cookie assinado) para as áreas internas (propostas e
// financeiro) e o painel. "middleware.ts" foi renomeado para "proxy.ts" no
// Next 16 — ver node_modules/next/dist/docs/.../proxy.md. Proxy roda em
// runtime Node.js por padrão nessa versão, por isso lib/auth.ts pode usar o
// módulo "crypto" nativo direto aqui, sem precisar de Web Crypto/Edge.

export function proxy(request: NextRequest) {
  // Fail closed: sem as env vars configuradas, não libera acesso por padrão.
  if (!process.env.AUTH_SECRET || (!process.env.ADMIN_PASSWORD && !process.env.LUCAS_PASSWORD)) {
    return new Response(
      "AUTH_SECRET e ao menos uma senha (ADMIN_PASSWORD/LUCAS_PASSWORD) precisam estar configuradas — veja .env.local.example.",
      { status: 500 }
    );
  }

  const user = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (user) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/painel", "/propostas", "/propostas/:path*", "/financeiro", "/financeiro/:path*"],
};
