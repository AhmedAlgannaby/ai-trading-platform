import React, { useState } from "react";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { BLOCK_CATEGORIES, COLOR_MAP } from "./blockDefinitions";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function BlockPalette() {
  const [expanded, setExpanded] = useState({ indicators: true, entry: true, exit: true, risk: false, filters: false });

  const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  return (
    <div className="w-64 flex-shrink-0 flex flex-col gap-2 overflow-y-auto scrollbar-thin pb-4">
      <p className="text-xs text-muted-foreground px-1 mb-1">اسحب اللبنات إلى منطقة البناء</p>
      {BLOCK_CATEGORIES.map(cat => {
        const colors = COLOR_MAP[cat.color];
        return (
          <div key={cat.id} className="glass-card overflow-hidden">
            <button
              onClick={() => toggle(cat.id)}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary/50 transition-colors"
            >
              <span className="flex items-center gap-2 text-xs font-semibold">
                <span>{cat.icon}</span>
                <span className={colors.text}>{cat.label}</span>
              </span>
              {expanded[cat.id] ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>

            {expanded[cat.id] && (
              <Droppable droppableId={`palette_${cat.id}`} isDropDisabled={true}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="px-2 pb-2 space-y-1.5">
                    {cat.blocks.map((block, index) => (
                      <Draggable key={`palette_${block.type}`} draggableId={`palette_${block.type}`} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`rounded-lg px-3 py-2 cursor-grab select-none border transition-all ${colors.bg} ${colors.border} ${
                              snapshot.isDragging ? "shadow-lg scale-105 rotate-1 opacity-90" : "hover:opacity-80"
                            }`}
                          >
                            <p className={`text-xs font-semibold ${colors.text}`}>{block.label}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{block.description}</p>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            )}
          </div>
        );
      })}
    </div>
  );
}