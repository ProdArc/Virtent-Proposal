import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Gate simples de Basic Auth só para a listagem interna de propostas.
// "middleware.ts" foi renomeado para "proxy.ts" no Next 16 — ver
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md.

function unauthorized() {
  return new Response("Autenticação necessária.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Propostas Virtent"' },
  });
}

export function proxy(request: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD;

  // Fail closed: sem senha configurada, não libera a listagem por padrão.
  if (!expected) {
    return new Response(
      "ADMIN_PASSWORD não configurada no ambiente — veja .env.local.example.",
      { status: 500 }
    );
  }

  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    const decoded = Buffer.from(auth.slice(6), "base64").toString("utf-8");
    // Só a senha importa — o campo "usuário" do Basic Auth pode ser qualquer coisa.
    const password = decoded.slice(decoded.indexOf(":") + 1);
    if (password === expected) {
      return NextResponse.next();
    }
  }

  return unauthorized();
}

export const config = {
  matcher: ["/propostas", "/propostas/:path*"],
};
