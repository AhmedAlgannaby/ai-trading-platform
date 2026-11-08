import React from "react";
import { getBlockDef, COLOR_MAP } from "./blockDefinitions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { X, Settings2 } from "lucide-react";

export default function BlockConfigPanel({ block, onUpdate, onClose }) {
  const def = getBlockDef(block.type);
  if (!def) return null;
  const colors = COLOR_MAP[def.color];

  const setParam = (key, value) => {
    onUpdate(block.id, { params: { ...block.params, [key]: value } });
  };

  return (
    <div className="w-72 flex-shrink-0 glass-card p-4 overflow-y-auto scrollbar-thin">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings2 className={`w-4 h-4 ${colors.text}`} />
          <span className="font-semibold text-sm">{def.label}</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{def.description}</p>

      {/* Custom Label */}
      <div className="space-y-1.5 mb-4">
        <Label className="text-xs">اسم مخصص (اختياري)</Label>
        <Input
          value={block.label || ""}
          onChange={e => onUpdate(block.id, { label: e.target.value })}
          placeholder={def.label}
          className="bg-secondary border-0 h-8 text-sm"
        />
      </div>

      {/* Params */}
      {def.params?.length > 0 && (
        <div className="space-y-3">
          <p className={`text-xs font-semibold ${colors.text}`}>الإعدادات</p>
          {def.params.map(p => (
            <div key={p.key} className="space-y-1.5">
              <Label className="text-xs">{p.label}</Label>
              {p.type === "number" && (
                <Input
                  type="number"
                  value={block.params?.[p.key] ?? p.default}
                  onChange={e => setParam(p.key, +e.target.value)}
                  className="bg-secondary border-0 h-8 text-sm"
                />
              )}
              {p.type === "select" && (
                <Select
                  value={String(block.params?.[p.key] ?? p.default)}
                  onValueChange={v => setParam(p.key, v)}
                >
                  <SelectTrigger className="bg-secondary border-0 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {p.options.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {p.type === "boolean" && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={block.params?.[p.key] ?? p.default}
                    onCheckedChange={v => setParam(p.key, v)}
                  />
                  <span className="text-xs text-muted-foreground">
                    {(block.params?.[p.key] ?? p.default) ? "مفعّل" : "معطّل"}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Outputs */}
      {def.outputs?.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">المخرجات</p>
          {def.outputs.map(out => (
            <div key={out} className={`flex items-center gap-2 text-[11px] px-2 py-1 rounded-lg ${colors.bg}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
              <span className="font-mono text-muted-foreground">{out}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}