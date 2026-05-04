interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  showDots?: boolean;
}

export function Sparkline({
  values,
  width = 240,
  height = 64,
  stroke = "#34d399",
  fill = "rgba(52,211,153,0.10)",
  showDots = true,
}: SparklineProps) {
  if (values.length === 0) {
    return (
      <div className="text-xs text-zinc-600 font-mono tnum italic h-16 flex items-center">
        — pas encore de données —
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padX = 4, padY = 6;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const stepX = values.length > 1 ? innerW / (values.length - 1) : 0;

  const points = values.map((v, i) => {
    const x = padX + i * stepX;
    const y = padY + innerH - ((v - min) / range) * innerH;
    return [x, y] as const;
  });

  const path = points.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(" ");
  const area = `${path} L${points[points.length - 1][0]},${padY + innerH} L${points[0][0]},${padY + innerH} Z`;

  const last = points[points.length - 1];
  const isUp = values.length > 1 && values[values.length - 1] >= values[0];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="overflow-visible">
      <path d={area} fill={fill} />
      <path d={path} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {showDots && points.map(([x, y], i) => {
        const isLast = i === points.length - 1;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={isLast ? 4 : 2.2}
            fill={isLast ? (isUp ? "#b6ff3c" : "#ff6b1a") : stroke}
            stroke={isLast ? "rgba(0,0,0,0.6)" : "none"}
            strokeWidth={isLast ? 2 : 0}
          />
        );
      })}
      {last && (
        <text
          x={last[0]}
          y={Math.max(12, last[1] - 8)}
          textAnchor="end"
          fontSize="10"
          fontFamily="JetBrains Mono, monospace"
          fontWeight="700"
          fill={isUp ? "#b6ff3c" : "#ff6b1a"}
        >
          {Math.round(values[values.length - 1])}
        </text>
      )}
    </svg>
  );
}
