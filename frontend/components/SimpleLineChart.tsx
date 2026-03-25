"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = {
  label: string;
  value: number | null;
};

type Props = {
  title: string;
  points: Point[];
  colorClassName: "line-primary" | "line-secondary";
  valueFormatter?: (value: number) => string;
};

const COLOR_MAP: Record<Props["colorClassName"], string> = {
  "line-primary": "#2563eb",
  "line-secondary": "#16a34a",
};

export function SimpleLineChart({ title, points, colorClassName, valueFormatter = (value) => value.toFixed(2) }: Props) {
  const validPoints = points.filter((point) => point.value !== null) as Array<{ label: string; value: number }>;

  if (validPoints.length === 0) {
    return (
      <section className="chart-card">
        <h3>{title}</h3>
        <p className="muted">No sufficient data points for chart rendering.</p>
      </section>
    );
  }

  const color = COLOR_MAP[colorClassName];

  return (
    <section className="chart-card">
      <h3>{title}</h3>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#6b7280" />
            <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" tickFormatter={(value) => valueFormatter(Number(value))} />
            <Tooltip formatter={(value: number) => valueFormatter(Number(value))} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2.5}
              connectNulls
              dot={{ r: 3, fill: color }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-footnote">
        <span>{points[0]?.label}</span>
        <span>Latest: {valueFormatter(validPoints[validPoints.length - 1].value)}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </section>
  );
}
