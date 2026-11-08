import React, { useState, useCallback } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Wand2, Plus, ChevronLeft, Save, Trash2 } from "lucide-react";
import { BLOCK_CATEGORIES, getBlockDef } from "@/components/builder/blockDefinitions";
import BlockPalette from "@/components/builder/BlockPalette";
import StrategyCanvas from "@/components/builder/StrategyCanvas";
import BlockConfigPanel from "@/components/builder/BlockConfigPanel";
import StrategySummary from "@/components/builder/StrategySummary";
import { motion, AnimatePresence } from "framer-motion";
import { TRADING_SYMBOLS } from "@/lib/pairs";

const PAIRS = TRADING_SYMBOLS;
const TIMEFRAMES = ["1m","5m","15m","1h","4h","1d"];

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function StrategyBuilder() {
  const [view, setView] = useState("list"); // list | editor
  const [strategyName, setStrategyName] = useState("استراتيجيتي الجديدة");
  const [pair, setPair] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState("4h");
  const [blocks, setBlocks] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const qc = useQueryClient();

  const { data: strategies = [] } = useQuery({
    queryKey: ["custom_strategies"],
    queryFn: () => base44.entities.CustomStrategy.list("-created_date"),
  });

  const selectedBlock = blocks.find(b => b.id === selectedId);

  const onDragEnd = useCallback((result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    // Drop from palette to canvas zone
    if (source.droppableId.startsWith("palette_") && destination.droppableId.startsWith("zone_")) {
      const blockType = draggableId.replace("palette_", "");
      const def = getBlockDef(blockType);
      if (!def) return;
      const defaultParams = {};
      def.params?.forEach(p => { defaultParams[p.key] = p.default; });
      const newBlock = { id: generateId(), type: blockType, label: "", params: defaultParams };
      setBlocks(prev => [...prev, newBlock]);
      setSelectedId(newBlock.id);
      return;
    }

    // Reorder within canvas
    if (source.droppableId.startsWith("zone_") && destination.droppableId.startsWith("zone_")) {
      setBlocks(prev => {
        const updated = [...prev];
        const srcIdx = updated.findIndex(b => b.id === draggableId);
        if (srcIdx === -1) return prev;
        const [moved] = updated.splice(srcIdx, 1);
        const zoneBlocks = updated.filter(b => {
          const cat = BLOCK_CATEGORIES.find(c => c.blocks.some(bl => bl.type === b.type));
          return `zone_${cat?.id}` === destination.droppableId;
        });
        const insertAfter = zoneBlocks[destination.index - 1];
        const insertIdx = insertAfter ? updated.indexOf(insertAfter) + 1 : updated.length;
        updated.splice(insertIdx, 0, moved);
        return updated;
      });
    }
  }, []);

  const updateBlock = (id, updates) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates, params: { ...b.params, ...updates.params } } : b));
  };

  const removeBlock = (id) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const saveStrategy = async () => {
    setIsSaving(true);
    const data = { name: strategyName, pair, timeframe, blocks, status: "draft" };
    if (editingId) {
      await base44.entities.CustomStrategy.update(editingId, data);
    } else {
      await base44.entities.CustomStrategy.create(data);
    }
    setIsSaving(false);
    qc.invalidateQueries({ queryKey: ["custom_strategies"] });
    setView("list");
  };

  const loadStrategy = (s) => {
    setStrategyName(s.name);
    setPair(s.pair || "BTCUSDT");
    setTimeframe(s.timeframe || "4h");
    setBlocks(s.blocks || []);
    setEditingId(s.id);
    setSelectedId(null);
    setView("editor");
  };

  const newStrategy = () => {
    setStrategyName("استراتيجيتي الجديدة");
    setPair("BTCUSDT");
    setTimeframe("4h");
    setBlocks([]);
    setEditingId(null);
    setSelectedId(null);
    setView("editor");
  };

  const deleteStrategy = async (id, e) => {
    e.stopPropagation();
    await base44.entities.CustomStrategy.delete(id);
    qc.invalidateQueries({ queryKey: ["custom_strategies"] });
  };

  if (view === "list") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" /> محرر الاستراتيجيات المرئي
            </h2>
            <p className="text-sm text-muted-foreground mt-1">ابنِ استراتيجيتك بالسحب والإفلات دون كتابة كود</p>
          </div>
          <Button className="gap-2" onClick={newStrategy}>
            <Plus className="w-4 h-4" /> استراتيجية جديدة
          </Button>
        </div>

        {strategies.length === 0 ? (
          <div className="glass-card p-16 text-center text-muted-foreground flex flex-col items-center gap-4">
            <Wand2 className="w-12 h-12 opacity-20" />
            <p>لا توجد استراتيجيات مخصصة حتى الآن</p>
            <Button onClick={newStrategy} className="gap-2"><Plus className="w-4 h-4" /> ابدأ الآن</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {strategies.map((s, i) => (
              <motion.div key={s.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="glass-card p-5 cursor-pointer hover:border-primary/30 transition-colors group"
                onClick={() => loadStrategy(s)}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-sm">{s.name}</h3>
                  <div className="flex items-center gap-1">
                    <Badge className={`text-[10px] px-1.5 h-4 border-0 ${
                      s.status === "active" ? "bg-trading-green/20 text-trading-green" : "bg-secondary text-muted-foreground"
                    }`}>{s.status === "active" ? "نشطة" : "مسودة"}</Badge>
                    <button onClick={(e) => deleteStrategy(s.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-trading-red transition-all p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <span>{s.pair}</span><span>·</span><span>{s.timeframe}</span>
                  <span>·</span><span>{s.blocks?.length || 0} لبنة</span>
                </div>
                {s.test_win_rate && (
                  <div className="flex gap-3 text-xs">
                    <span className="text-trading-green">Win Rate: {s.test_win_rate}%</span>
                    <span className="text-trading-cyan">+{s.test_return}%</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex flex-col gap-4 h-full">
        {/* Toolbar */}
        <div className="glass-card p-3 flex items-center gap-3 flex-wrap">
          <button onClick={() => setView("list")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <Input
            value={strategyName}
            onChange={e => setStrategyName(e.target.value)}
            className="bg-secondary border-0 h-8 text-sm font-semibold w-52"
          />
          <Select value={pair} onValueChange={setPair}>
            <SelectTrigger className="bg-secondary border-0 h-8 text-xs w-28"><SelectValue /></SelectTrigger>
            <SelectContent>{PAIRS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="bg-secondary border-0 h-8 text-xs w-20"><SelectValue /></SelectTrigger>
            <SelectContent>{TIMEFRAMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Badge className="bg-secondary text-muted-foreground border-0 text-xs">{blocks.length} لبنة</Badge>
          <Button size="sm" className="gap-1.5 mr-auto h-8 text-xs" onClick={saveStrategy} disabled={isSaving}>
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "جارٍ الحفظ..." : "حفظ"}
          </Button>
        </div>

        {/* Main Layout */}
        <div className="flex gap-4 flex-1 min-h-0" style={{ height: "calc(100vh - 240px)" }}>
          {/* Palette */}
          <BlockPalette />

          {/* Canvas */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <StrategyCanvas
              blocks={blocks}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onRemove={removeBlock}
            />
          </div>

          {/* Right: Config + Summary */}
          <div className="flex flex-col gap-4 w-72 flex-shrink-0 overflow-y-auto scrollbar-thin">
            <AnimatePresence mode="wait">
              {selectedBlock ? (
                <motion.div key={selectedBlock.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <BlockConfigPanel
                    block={selectedBlock}
                    onUpdate={updateBlock}
                    onClose={() => setSelectedId(null)}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
            <StrategySummary
              blocks={blocks}
              strategyName={strategyName}
              pair={pair}
              timeframe={timeframe}
              onSave={saveStrategy}
              isSaving={isSaving}
              onTest={(res) => {
                if (editingId) {
                  base44.entities.CustomStrategy.update(editingId, {
                    test_win_rate: res.estimated_win_rate,
                    test_return: res.estimated_return,
                  });
                }
              }}
            />
          </div>
        </div>
      </div>
    </DragDropContext>
  );
}