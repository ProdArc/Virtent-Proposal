import { NextResponse, type NextRequest } from "next/server";
import { fetchRecentTransactions } from "@/lib/pluggy";
import { upsertBankTransactions } from "@/lib/bank-transactions";

/**
 * Recebido pela Pluggy quando algo muda numa conexão bancária. Fora do
 * matcher do proxy.ts de propósito — quem chama aqui é a Pluggy, não um
 * usuário logado, então a autenticação é o `secret` compartilhado na URL
 * (configurado no painel da Pluggy ao cadastrar o webhook), não o cookie de
 * sessão.
 *
 * A Pluggy avisa que HOUVE sincronização nova, mas não manda as transações
 * no corpo do webhook — por isso busca de volta na API (fetchRecentTransactions)
 * em vez de confiar no payload.
 */
export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  const expected = process.env.PLUGGY_WEBHOOK_SECRET;
  if (!expected || secret !== expected) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const event = payload?.event as string | undefined;
  const accountId = payload?.accountId as string | undefined;

  if (event === "transactions/created" && accountId) {
    try {
      const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const transactions = await fetchRecentTransactions(accountId, from);
      await upsertBankTransactions(transactions);
    } catch (err) {
      // Nunca propaga erro pra Pluggy — ela reenviaria o webhook em loop.
      // Fica só no log; a próxima sincronização cobre o que faltou.
      console.error("Falha ao processar webhook da Pluggy:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
