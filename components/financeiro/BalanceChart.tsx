const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const compact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});
const monthShort = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" });

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
 * largura do container sem recalcular nada no cliente.
 */
export function BalanceChart({ series }: { series: BalancePoint[] }) {
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

  return (
    <div>
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
            stroke="#E4E4E7"
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
        {series.map((p, i) => (
          <circle
            key={p.key}
            cx={x(i)}
            cy={y(p.balance)}
            r={i === series.length - 1 ? 4 : 2.5}
            fill={i === series.length - 1 ? "#065F46" : "#1baf7a"}
          />
        ))}
      </svg>

      {/* Rótulos fora do SVG: dentro dele o preserveAspectRatio="none" os deformaria. */}
      <div className="mt-1 flex justify-between">
        {series.map((p, i) => (
          <span
            key={p.key}
            className={`text-[10px] tabular-nums ${
              i === series.length - 1 ? "font-bold text-ink" : "text-secondary-ink"
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
