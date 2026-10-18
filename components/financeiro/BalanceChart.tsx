"use client";

import { useRef, useState } from "react";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const compact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});
const monthShort = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" });
const monthLong = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export interface BalancePoint {
  key: string; // "2026-08"
  balance: number;
}

const W = 720;
const H = 200;
const PAD = { top: 16, right: 12, bottom: 26, left: 12 };

/**
 * Linha da evolução do saldo. SVG inline em vez de biblioteca: o projeto não
 * tem nenhuma, e um gráfico de uma série não justifica adicionar.
 *
 * viewBox + preserveAspectRatio="none" no eixo X deixa o traçado acompanhar a
 * largura do container sem recalcular nada no cliente — só o índice do ponto
 * sob o ponteiro (mouse ou toque) precisa de matemática em tempo real, feita
 * em cima da largura real do container (getBoundingClientRect), não do viewBox.
 */
export function BalanceChart({ series }: { series: BalancePoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (series.length === 0) {
    return (
      <p className="text-sm text-neutral-ink">
        Nenhuma movimentação registrada ainda — o gráfico aparece assim que houver a primeira baixa
        ou pagamento.
      </p>
    );
  }

  if (series.length === 1) {
    const only = series[0];
    return (
      <div className="flex items-baseline gap-3">
        <p className="text-2xl font-bold tabular-nums text-ink">{currency.format(only.balance)}</p>
        <p className="text-xs text-secondary-ink">
          em {monthShort.format(new Date(`${only.key}-01T00:00:00`))} — a linha aparece a partir do
          segundo mês com movimentação
        </p>
      </div>
    );
  }

  const values = series.map((p) => p.balance);
  // O zero sempre entra na escala: sem isso um saldo negativo pareceria alto.
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const span = max - min || 1;

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (i / (series.length - 1)) * innerW;
  const y = (v: number) => PAD.top + (1 - (v - min) / span) * innerH;

  const line = series.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.balance)}`).join(" ");
  const area =
    `M ${x(0)} ${y(min)} ` +
    series.map((p, i) => `L ${x(i)} ${y(p.balance)}`).join(" ") +
    ` L ${x(series.length - 1)} ${y(min)} Z`;

  const last = series[series.length - 1];
  const zeroY = y(0);

  const updateFromClientX = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setHoverIndex(Math.round(fraction * (series.length - 1)));
  };

  const active = hoverIndex !== null ? series[hoverIndex] : null;
  // Posição do tooltip em %, com o próprio tooltip se deslocando perto das
  // bordas (via CSS, translateX condicional) pra nunca vazar do card.
  const activeXPct = hoverIndex !== null ? (x(hoverIndex) / W) * 100 : 0;
  const tooltipAlign = activeXPct < 12 ? "left" : activeXPct > 88 ? "right" : "center";

  return (
    <div>
      <div
        ref={containerRef}
        className="relative touch-pan-y select-none"
        onPointerMove={(e) => updateFromClientX(e.clientX)}
        onPointerDown={(e) => updateFromClientX(e.clientX)}
        onPointerLeave={() => setHoverIndex(null)}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Evolução do saldo. Último valor: ${currency.format(last.balance)}`}
          className="h-52 w-full"
        >
          <defs>
            <linearGradient id="balance-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1baf7a" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#1baf7a" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Linha do zero: separa saldo positivo de negativo */}
          {min < 0 && (
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={zeroY}
              y2={zeroY}
              className="stroke-border"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          )}

          <path d={area} fill="url(#balance-fill)" />
          <path
            d={line}
            fill="none"
            stroke="#1baf7a"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* Crosshair: acompanha o ponto mais próximo do ponteiro, não exige mirar na linha de 2px. */}
          {hoverIndex !== null && (
            <line
              x1={x(hoverIndex)}
              x2={x(hoverIndex)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              className="stroke-border"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {series.map((p, i) => {
            const isLast = i === series.length - 1;
            const isHovered = i === hoverIndex;
            return (
              <circle
                key={p.key}
                cx={x(i)}
                cy={y(p.balance)}
                r={isHovered ? 5 : isLast ? 4 : 2.5}
                fill="#1baf7a"
                className={isLast ? "fill-brand-ink" : undefined}
                stroke={isHovered ? "var(--color-card)" : undefined}
                strokeWidth={isHovered ? 2 : undefined}
              />
            );
          })}
        </svg>

        {/* Tooltip HTML por cima do SVG — texto nítido em qualquer escala, sem deformar com preserveAspectRatio="none". */}
        {active && (
          <div
            className="pointer-events-none absolute top-1 z-10 rounded-xl px-3 py-2 text-white shadow-float"
            style={{
              // Cor fixa (não o token "ink", que inverte no tema escuro) — o
              // tooltip precisa continuar escuro com texto branco nos dois temas.
              backgroundColor: "#18181B",
              left: `${activeXPct}%`,
              transform:
                tooltipAlign === "left"
                  ? "translateX(0)"
                  : tooltipAlign === "right"
                    ? "translateX(-100%)"
                    : "translateX(-50%)",
            }}
          >
            <p className="whitespace-nowrap text-[10px] font-medium text-white/70">
              {capitalize(monthLong.format(new Date(`${active.key}-01T00:00:00`)))}
            </p>
            <p className="whitespace-nowrap text-sm font-bold tabular-nums">
              {currency.format(active.balance)}
            </p>
          </div>
        )}
      </div>

      {/* Rótulos fora do SVG: dentro dele o preserveAspectRatio="none" os deformaria. */}
      <div className="mt-1 flex justify-between">
        {series.map((p, i) => (
          <span
            key={p.key}
            className={`text-[10px] tabular-nums ${
              i === hoverIndex ? "font-bold text-brand-ink" : i === series.length - 1 ? "font-bold text-ink" : "text-secondary-ink"
            }`}
          >
            {monthShort.format(new Date(`${p.key}-01T00:00:00`)).replace(".", "")}
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs text-secondary-ink">
        Saldo ao fim de {monthShort.format(new Date(`${last.key}-01T00:00:00`))}:{" "}
        <strong className="text-ink tabular-nums">{currency.format(last.balance)}</strong> · pico{" "}
        {compact.format(max)}
      </p>
    </div>
  );
}
