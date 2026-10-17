import Link from "next/link";
import { Plug } from "@phosphor-icons/react/dist/ssr";
import { listPendingBankTransactions } from "@/lib/bank-transactions";
import { listCategories, listSuppliers } from "@/lib/payables";
import { btnSecondary, ConfigError, EmptyState, PageHeader } from "@/components/financeiro/ui";
import { BankTransactionCard } from "./BankTransactionCard";

export const dynamic = "force-dynamic";

export default async function BankTransactionsPage() {
  let pending: Awaited<ReturnType<typeof listPendingBankTransactions>> = [];
  let suppliers: string[] = [];
  let categories: string[] = [];
  let configError: string | null = null;

  try {
    const [tx, s, c] = await Promise.all([
      listPendingBankTransactions(),
      listSuppliers().catch(() => []),
      listCategories().catch(() => []),
    ]);
    pending = tx;
    suppliers = s.map((x) => x.name);
    categories = c.map((x) => x.name);
  } catch (err) {
    configError = err instanceof Error ? err.message : "Erro ao carregar o extrato bancário.";
  }

  if (configError) {
    return (
      <>
        <PageHeader back={{ href: "/financeiro/caixa", label: "Voltar para o Caixa" }} title="Extrato bancário" />
        <ConfigError message={`${configError} Rode a migração 011_bank_transactions.sql no SQL Editor do Supabase.`} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        back={{ href: "/financeiro/caixa", label: "Voltar para o Caixa" }}
        title="Extrato bancário"
        subtitle="Tudo que entrou ou saiu da conta real, pra classificar e lançar — como já é feito hoje, só que automático a partir do banco."
        actions={
          <Link href="/financeiro/caixa/banco/conectar" className={btnSecondary}>
            <Plug size={18} weight="bold" aria-hidden="true" />
            Conectar banco
          </Link>
        }
      />

      {pending.length === 0 ? (
        <EmptyState
          title="Nada pendente"
          description="Assim que o banco conectado via Open Finance sincronizar, as movimentações novas aparecem aqui pra classificar."
        />
      ) : (
        <div className="rounded-3xl bg-card shadow-card overflow-hidden">
          {pending.map((tx) => (
            <BankTransactionCard key={tx.id} tx={tx} suppliers={suppliers} categories={categories} />
          ))}
        </div>
      )}
    </>
  );
}
