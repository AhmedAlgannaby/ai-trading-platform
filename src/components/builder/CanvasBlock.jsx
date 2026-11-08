import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { getBlockDef, COLOR_MAP } from "./blockDefinitions";
import { Settings2, X, GripVertical } from "lucide-react";

export default function CanvasBlock({ block, index, isSelected, onSelect, onRemove }) {
  const def = getBlockDef(block.type);
  if (!def) return null;
  const colors = COLOR_MAP[def.color];

  return (
    <Draggable draggableId={block.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`rounded-xl border-2 transition-all select-none ${colors.bg} ${
            isSelected ? `${colors.border} shadow-lg` : "border-transparent hover:border-white/10"
          } ${snapshot.isDragging ? "shadow-2xl rotate-1 scale-105 z-50" : ""}`}
          onClick={() => onSelect(block.id)}
        >
          {/* Header */}
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-t-xl ${colors.bg}`}>
            <div {...provided.dragHandleProps} className="cursor-grab text-muted-foreground hover:text-foreground">
              <GripVertical className="w-4 h-4" />
            </div>
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
            <span className={`text-xs font-bold flex-1 ${colors.text}`}>{block.label || def.label}</span>
            <button
              onClick={e => { e.stopPropagation(); onSelect(block.id); }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onRemove(block.id); }}
              className="text-muted-foreground hover:text-trading-red transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Params Preview */}
          <div className="px-3 pb-2.5 space-y-1">
            {def.params?.slice(0, 3).map(p => (
              <div key={p.key} className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">{p.label}:</span>
                <span className="text-foreground font-mono font-medium">
                  {block.params?.[p.key] ?? p.default}
                  {p.type === "boolean" ? "" : ""}
                </span>
              </div>
            ))}
            {def.params?.length > 3 && (
              <p className="text-[10px] text-muted-foreground">+{def.params.length - 3} إعدادات أخرى</p>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}