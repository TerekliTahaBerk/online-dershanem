"use client";
import {
  ResponsiveContainer,
  LineChart, Line,
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

const COLORS = ["#7BB6E8", "#A8D0B8", "#F4C28A", "#E89BAB", "#B8A4D4", "#8FCAD0"];

const axisProps = {
  stroke: "var(--pd-ink-3)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};

const tooltipStyle = {
  background: "var(--pd-card)",
  border: "1px solid var(--pd-line)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--pd-ink-1)",
};

export type Series = { name: string; data: { x: string; y: number }[] };

export function LineChartCard({ data, height = 220, color = COLORS[0] }: { data: { x: string; y: number }[]; height?: number; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid stroke="var(--pd-line)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="x" {...axisProps} />
        <YAxis {...axisProps} width={36} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--pd-line)" }} />
        <Line type="monotone" dataKey="y" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function AreaChartCard({ data, height = 220, color = COLORS[0] }: { data: { x: string; y: number }[]; height?: number; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="od-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.45} />
            <stop offset="100%" stopColor={color} stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--pd-line)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="x" {...axisProps} />
        <YAxis {...axisProps} width={36} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="y" stroke={color} strokeWidth={2} fill="url(#od-area-grad)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BarChartCard({ data, height = 220, color = COLORS[1] }: { data: { x: string; y: number }[]; height?: number; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid stroke="var(--pd-line)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="x" {...axisProps} />
        <YAxis {...axisProps} width={36} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--pd-bg-2)" }} />
        <Bar dataKey="y" fill={color} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PieChartCard({ data, height = 220 }: { data: { name: string; value: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--pd-ink-2)" }} />
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

export function MultiLineChartCard({
  series, height = 240,
}: { series: Series[]; height?: number }) {
  // Pivot series → [{ x, name1: y, name2: y, ...}]
  const xs = Array.from(new Set(series.flatMap((s) => s.data.map((p) => p.x))));
  const merged = xs.map((x) => {
    const row: Record<string, string | number> = { x };
    series.forEach((s) => {
      const p = s.data.find((d) => d.x === x);
      row[s.name] = p ? p.y : 0;
    });
    return row;
  });
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={merged}>
        <CartesianGrid stroke="var(--pd-line)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="x" {...axisProps} />
        <YAxis {...axisProps} width={36} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--pd-ink-2)" }} />
        {series.map((s, i) => (
          <Line key={s.name} type="monotone" dataKey={s.name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
