import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listMovements, KIND_LABEL, type MovementKind } from "@/lib/cash";
import { normalizeName } from "@/lib/payables";
import { todayIso } from "@/lib/urgency";

function csvCell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

const brl = (n: number) => n.toFixed(2).replace(".", ",");
const stamp = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

const KINDS: MovementKind[] = ["opening", "setup", "monthly", "payable"];

/** Extrato em CSV, com o mesmo recorte da tela e o saldo corrente em cada linha. */
export async function GET(request: NextRequest) {
  if (!(await getSessionUser())) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const type = sp.get("type") ?? "";
  const kind = sp.get("kind") ?? "";
  const q = sp.get("q") ?? "";
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";

  const movements = await listMovements();

  // Saldo corrente sobre a base completa, como na tela.
  const chronological = [...movements].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
  const runningById = new Map<string, number>();
  let running = 0;
  for (const m of chronological) {
    running += m.direction === "in" ? Number(m.amount) : -Number(m.amount);
    runningById.set(m.id, Math.round(running * 100) / 100);
  }

  const needle = normalizeName(q);
  const rows = movements.filter((m) => {
    if (type && m.direction !== type) return false;
    if (kind && KINDS.includes(kind as MovementKind) && m.kind !== kind) return false;
    if (from && m.occurred_at.slice(0, 10) < from) return false;
    if (to && m.occurred_at.slice(0, 10) > to) return false;
    if (needle && !normalizeName(`${m.description} ${m.counterpart ?? ""}`).includes(needle))
      return false;
    return true;
  });

  const header = [
    "Data",
    "Tipo",
    "Origem",
    "Descrição",
    "Contraparte",
    "Entrada",
    "Saída",
    "Saldo acumulado",
    "Estorno",
  ];

  const lines = [
    header.map(csvCell).join(";"),
    ...rows.map((m) =>
      [
        stamp(m.occurred_at),
        m.direction === "in" ? "Entrada" : "Saída",
        KIND_LABEL[m.kind],
        m.description,
        m.counterpart ?? "",
        m.direction === "in" ? brl(Number(m.amount)) : "",
        m.direction === "out" ? brl(Number(m.amount)) : "",
        brl(runningById.get(m.id) ?? 0),
        m.reverses_id ? "Sim" : "",
      ]
        .map(csvCell)
        .join(";")
    ),
  ];

  // ";" + BOM: o que o Excel pt-BR abre direto, sem assistente de importação.
  const csv = "﻿" + lines.join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="extrato-caixa-${todayIso()}.csv"`,
    },
  });
}
