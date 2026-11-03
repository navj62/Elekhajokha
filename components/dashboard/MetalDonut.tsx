"use client";

// The dashboard's metal-split donut. Its own module so the dashboard can load
// it (and recharts with it) via next/dynamic — the card sits below the fold.
// Must not be imported statically from the dashboard, or recharts lands back
// in the page's initial bundle.

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

export interface MetalDonutProps {
  data: { name: string; value: number; color: string }[];
  tooltipFormatter: (value: number) => string;
}

export default function MetalDonut({ data, tooltipFormatter }: MetalDonutProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={72} paddingAngle={2} stroke="none">
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value, name) => [tooltipFormatter(Number(value)), String(name)]} />
      </PieChart>
    </ResponsiveContainer>
  );
}
