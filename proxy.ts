import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isValidBasicAuth } from "@/lib/auth";

// Gate simples de Basic Auth só para as áreas internas (propostas e financeiro).
// "middleware.ts" foi renomeado para "proxy.ts" no Next 16 — ver
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md.

function unauthorized() {
  return new Response("Autenticação necessária.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Propostas Virtent"' },
  });
}

export function proxy(request: NextRequest) {
  // Fail closed: sem senha configurada, não libera a listagem por padrão.
  if (!process.env.ADMIN_PASSWORD) {
    return new Response(
      "ADMIN_PASSWORD não configurada no ambiente — veja .env.local.example.",
      { status: 500 }
    );
  }

  if (isValidBasicAuth(request.headers.get("authorization"))) {
    return NextResponse.next();
  }

  return unauthorized();
}

export const config = {
  matcher: ["/propostas", "/propostas/:path*", "/financeiro", "/financeiro/:path*"],
};
