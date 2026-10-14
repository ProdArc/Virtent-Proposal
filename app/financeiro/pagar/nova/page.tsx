import { listCategories, listSuppliers } from "@/lib/payables";
import { PageHeader } from "@/components/financeiro/ui";
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
    <div className="mx-auto max-w-2xl">
      <PageHeader
        back={{ href: "/financeiro/pagar", label: "Voltar para A pagar" }}
        title="Nova conta a pagar"
        subtitle="Fornecedor, categoria, valor e vencimento bastam. O resto é opcional."
      />

      {loadError ? (
        <p className="rounded-2xl border border-pending-line bg-pending-bg px-4 py-3 text-sm text-pending-ink">
          {loadError}
        </p>
      ) : (
        <NewPayableForm suppliers={suppliers} categories={categories} />
      )}
    </div>
  );
}
