import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import { DEFAULT_FILTERS } from "@/components/history/tradeFilters";

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

export default function AdvancedFilters({ filters, onChange, pairs, strategies }) {
  const set = (key) => (value) => onChange({ ...filters, [key]: value });
  const trigger = "h-8 text-xs bg-secondary";

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">فلاتر متقدمة</h3>
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => onChange(DEFAULT_FILTERS)}>
          <RotateCcw className="w-3 h-3" /> إعادة ضبط
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="الاستراتيجية">
          <Select value={filters.strategy} onValueChange={set("strategy")}>
            <SelectTrigger className={trigger}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الاستراتيجيات</SelectItem>
              {strategies.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        <Field label="الزوج">
          <Select value={filters.pair} onValueChange={set("pair")}>
            <SelectTrigger className={trigger}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأزواج</SelectItem>
              {pairs.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        <Field label="النتيجة">
          <Select value={filters.outcome} onValueChange={set("outcome")}>
            <SelectTrigger className={trigger}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="win">رابحة فقط</SelectItem>
              <SelectItem value="loss">خاسرة فقط</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="نوع الصفقة">
          <Select value={filters.type} onValueChange={set("type")}>
            <SelectTrigger className={trigger}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="long">LONG</SelectItem>
              <SelectItem value="short">SHORT</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="أدنى ربح/خسارة %">
          <Input type="number" placeholder="مثال: -5" value={filters.minPnl}
            onChange={(e) => set("minPnl")(e.target.value)} className="h-8 text-xs bg-secondary font-mono" />
        </Field>

        <Field label="أعلى ربح/خسارة %">
          <Input type="number" placeholder="مثال: 10" value={filters.maxPnl}
            onChange={(e) => set("maxPnl")(e.target.value)} className="h-8 text-xs bg-secondary font-mono" />
        </Field>

        <Field label="الترتيب">
          <Select value={filters.sort} onValueChange={set("sort")}>
            <SelectTrigger className={trigger}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">الأحدث أولاً</SelectItem>
              <SelectItem value="date_asc">الأقدم أولاً</SelectItem>
              <SelectItem value="pct_desc">أعلى نسبة ربح %</SelectItem>
              <SelectItem value="pct_asc">أعلى نسبة خسارة %</SelectItem>
              <SelectItem value="pnl_desc">أعلى ربح $</SelectItem>
              <SelectItem value="pnl_asc">أعلى خسارة $</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
    </div>
  );
}