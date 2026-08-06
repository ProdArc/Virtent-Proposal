import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listCategories, listPayables, listSuppliers, normalizeName } from "@/lib/payables";
import {
  matchesPayableFilter,
  payableState,
  remainingAmount,
  PAYABLE_STATE_LABEL,
  PAYMENT_METHOD_LABEL,
  type PayableFilter,
} from "@/lib/payables-status";
import { todayIso } from "@/lib/urgency";

/** Escapa um campo pro CSV: aspas dobradas e o campo inteiro entre aspas. */
function csvCell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

const brl = (n: number) => n.toFixed(2).replace(".", ",");
const brDate = (iso: string | null) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR") : "";

/**
 * Exporta a lista filtrada em CSV. Recebe os MESMOS parâmetros da tela, então
 * o arquivo é exatamente o recorte que está na frente do usuário.
 */
export async function GET(request: NextRequest) {
  // O proxy.ts já cobre /financeiro/:path*, mas route handlers merecem a
  // checagem própria — a doc do Next recomenda não confiar só no matcher.
  if (!(await getSessionUser())) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const status = (sp.get("status") ?? "") as PayableFilter;
  const search = sp.get("q") ?? "";
  const supplierFilter = sp.get("supplier") ?? "";
  const categoryFilter = sp.get("category") ?? "";
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";

  const [payables, suppliers, categories] = await Promise.all([
    listPayables(),
    listSuppliers(),
    listCategories(true),
  ]);

  const suppliersById = new Map(suppliers.map((s) => [s.id, s]));
  const categoriesById = new Map(categories.map((c) => [c.id, c]));
  const today = todayIso();
  const needle = normalizeName(search);

  const rows = payables.filter((p) => {
    if (!matchesPayableFilter(p, today, status)) return false;
    if (supplierFilter && p.supplier_id !== supplierFilter) return false;
    if (categoryFilter && p.category_id !== categoryFilter) return false;
    if (from && p.due_date < from) return false;
    if (to && p.due_date > to) return false;
    if (needle) {
      const haystack = normalizeName(
        `${p.title} ${suppliersById.get(p.supplier_id)?.name ?? ""} ${categoriesById.get(p.category_id)?.name ?? ""}`
      );
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  const header = [
    "Vencimento",
    "Fornecedor",
    "Categoria",
    "Descrição",
    "Valor",
    "Pago",
    "Restante",
    "Status",
    "Forma de pagamento",
    "Origem",
    "Centro de custo",
    "Emissão",
    "Observações",
  ];

  const lines = [
    header.map(csvCell).join(";"),
    ...rows.map((p) =>
      [
        brDate(p.due_date),
        suppliersById.get(p.supplier_id)?.name ?? "",
        categoriesById.get(p.category_id)?.name ?? "",
        p.title,
        brl(Number(p.amount)),
        brl(Number(p.paid_amount)),
        brl(remainingAmount(p)),
        PAYABLE_STATE_LABEL[payableState(p, today)],
        p.payment_method ? (PAYMENT_METHOD_LABEL[p.payment_method] ?? p.payment_method) : "",
        p.account_origin ?? "",
        p.cost_center ?? "",
        brDate(p.issue_date),
        p.notes ?? "",
      ]
        .map(csvCell)
        .join(";")
    ),
  ];

  // Separador ";" e BOM: é o que o Excel em pt-BR abre sem pedir importação
  // e sem quebrar os acentos.
  const csv = "﻿" + lines.join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contas-a-pagar-${today}.csv"`,
    },
  });
}
