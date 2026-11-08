import React from "react";

export default function ChartCard({ title, subtitle, children, className = "" }) {
  return (
    <div className={`glass-card p-5 ${className}`}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function EmptyChart({ text = "لا توجد صفقات مغلقة بعد" }) {
  return (
    <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">{text}</div>
  );
}

export const axisTick = { fontSize: 10, fill: "hsl(215, 20%, 55%)" };
export const gridStroke = "hsl(222, 30%, 16%)";
export const tooltipStyle = {
  background: "hsl(222, 47%, 9%)",
  border: "1px solid hsl(222, 30%, 16%)",
  borderRadius: 8,
  fontSize: 12,
};