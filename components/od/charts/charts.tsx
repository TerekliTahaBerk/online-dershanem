"use client";

import {
  Area,
  AreaChart as RAreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart as RLineChart,
  Pie,
  PieChart as RPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const PASTEL_COLORS = ["#D7E5D5", "#DCEAF6", "#FCEDB4", "#F2DBD0", "#E6E0F0", "#3A4A2C"];

const axis = { stroke: "var(--pd-line-2)", fontSize: 11 };
const grid = { stroke: "var(--pd-line)", strokeDasharray: "3 3" };
const tooltipStyle = {
  background: "var(--pd-bg-elevated)",
  border: "1px solid var(--pd-line)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--pd-ink)"
};

export function LineChart({
  data,
  xKey,
  series,
  height = 240
}: {
  data: any[];
  xKey: string;
  series: { key: string; label: string; color?: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RLineChart data={data}>
        <CartesianGrid {...grid} />
        <XAxis dataKey={xKey} {...axis} tickLine={false} />
        <YAxis {...axis} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color ?? PASTEL_COLORS[i % PASTEL_COLORS.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </RLineChart>
    </ResponsiveContainer>
  );
}

export function AreaChart({
  data,
  xKey,
  series,
  height = 240
}: {
  data: any[];
  xKey: string;
  series: { key: string; label: string; color?: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RAreaChart data={data}>
        <defs>
          {series.map((s, i) => {
            const color = s.color ?? PASTEL_COLORS[i % PASTEL_COLORS.length];
            return (
              <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                <stop offset="100%" stopColor={color} stopOpacity={0.1} />
              </linearGradient>
            );
          })}
        </defs>
        <CartesianGrid {...grid} />
        <XAxis dataKey={xKey} {...axis} tickLine={false} />
        <YAxis {...axis} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        {series.map((s, i) => {
          const color = s.color ?? PASTEL_COLORS[i % PASTEL_COLORS.length];
          return (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={color}
              strokeWidth={2}
              fill={`url(#fill-${s.key})`}
            />
          );
        })}
      </RAreaChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({
  data,
  height = 240,
  innerRadius = 56,
  outerRadius = 86
}: {
  data: { name: string; value: number; color?: string }[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RPieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={3}
          stroke="var(--pd-bg-elevated)"
          strokeWidth={2}
        >
          {data.map((d, i) => (
            <Cell key={d.name} fill={d.color ?? PASTEL_COLORS[i % PASTEL_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </RPieChart>
    </ResponsiveContainer>
  );
}
