import Link from "next/link";
import { listCategories, listSuppliers } from "@/lib/payables";
import { NewPayableForm } from "./NewPayableForm";

export const dynamic = "force-dynamic";

export default async function NovaContaPage() {
  let suppliers: string[] = [];
  let categories: string[] = [];
  let loadError: string | null = null;

  try {
    const [s, c] = await Promise.all([listSuppliers(), listCategories()]);
    suppliers = s.map((x) => x.name);
    categories = c.map((x) => x.name);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Erro ao carregar dados.";
  }

  return (
    <main className="min-h-screen bg-surface py-12 sm:py-16 px-6">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/financeiro/pagar"
          className="text-xs text-neutral-ink hover:text-ink transition-colors"
        >
          ← Contas a pagar
        </Link>
        <p className="text-xs uppercase tracking-[0.18em] font-semibold text-brand mt-4 mb-3">
          Virtent
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink mb-1">Nova conta a pagar</h1>
        <p className="text-sm text-neutral-ink mb-8">
          Fornecedor, categoria, valor e vencimento bastam. O resto é opcional.
        </p>

        {loadError ? (
          <p className="rounded-lg border border-pending-line bg-pending-bg px-3 py-2 text-sm text-pending-ink">
            {loadError}
          </p>
        ) : (
          <NewPayableForm suppliers={suppliers} categories={categories} />
        )}
      </div>
    </main>
  );
}
