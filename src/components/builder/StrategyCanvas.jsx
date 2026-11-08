import React from "react";
import { Droppable } from "@hello-pangea/dnd";
import CanvasBlock from "./CanvasBlock";
import { LayoutGrid } from "lucide-react";
import { BLOCK_CATEGORIES, COLOR_MAP } from "./blockDefinitions";

const ZONE_CONFIG = [
  { id: "indicators", label: "المؤشرات الفنية", icon: "📊", color: "cyan", hint: "ضع مؤشراتك هنا" },
  { id: "filters",    label: "الفلاتر",          icon: "🔍", color: "purple", hint: "فلاتر اختيارية" },
  { id: "entry",      label: "شروط الدخول",     icon: "🟢", color: "green", hint: "متى تدخل الصفقة؟" },
  { id: "risk",       label: "إدارة المخاطر",   icon: "🛡️", color: "yellow", hint: "حجم الصفقة والحماية" },
  { id: "exit",       label: "شروط الخروج",     icon: "🔴", color: "red", hint: "متى تخرج من الصفقة؟" },
];

export default function StrategyCanvas({ blocks, selectedId, onSelect, onRemove }) {
  const getZoneBlocks = (zoneId) =>
    blocks.filter(b => {
      const cat = BLOCK_CATEGORIES.find(c => c.blocks.some(bl => bl.type === b.type));
      return cat?.id === zoneId;
    });

  return (
    <div className="flex-1 overflow-auto scrollbar-thin">
      {blocks.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
          <LayoutGrid className="w-12 h-12 opacity-20" />
          <p className="text-sm">اسحب اللبنات من القائمة اليسرى وأفلتها هنا</p>
          <p className="text-xs opacity-60">ابدأ بالمؤشرات ثم شروط الدخول والخروج</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {ZONE_CONFIG.map(zone => {
          const zoneBlocks = getZoneBlocks(zone.id);
          const colors = COLOR_MAP[zone.color];
          return (
            <div key={zone.id}>
              <div className={`flex items-center gap-2 mb-2 px-1`}>
                <span className="text-base">{zone.icon}</span>
                <span className={`text-xs font-semibold ${colors.text}`}>{zone.label}</span>
                {zoneBlocks.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text} font-medium`}>
                    {zoneBlocks.length}
                  </span>
                )}
              </div>
              <Droppable droppableId={`zone_${zone.id}`} direction="horizontal">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[110px] rounded-xl border-2 border-dashed p-3 flex flex-wrap gap-3 transition-all ${
                      snapshot.isDraggingOver
                        ? `${colors.border} ${colors.bg}`
                        : "border-border/40 bg-secondary/20"
                    }`}
                  >
                    {zoneBlocks.length === 0 && !snapshot.isDraggingOver && (
                      <p className="text-[11px] text-muted-foreground/40 self-center px-2">{zone.hint}</p>
                    )}
                    {zoneBlocks.map((block, index) => (
                      <div key={block.id} className="w-52">
                        <CanvasBlock
                          block={block}
                          index={blocks.indexOf(block)}
                          isSelected={selectedId === block.id}
                          onSelect={onSelect}
                          onRemove={onRemove}
                        />
                      </div>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </div>
  );
}