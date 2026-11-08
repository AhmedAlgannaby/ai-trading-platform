/**
 * SignalMarketplace — سوق الإشارات
 * مشاركة إشارات AI الناجحة، متابعة المتداولين، نسخ الصفقات
 */
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Radio, Star, TrendingUp, TrendingDown, Zap, Share2 } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import ShareSignalModal from "@/components/signals/ShareSignalModal";
import SignalCard from "@/components/signals/SignalCard";
import CopySignalModal from "@/components/signals/CopySignalModal";

const SORT_OPTIONS = [
  { value: "confidence", label: "الأعلى ثقة" },
  { value: "created_date", label: "الأحدث" },
  { value: "pair", label: "حسب الزوج" },
];

const DIRECTION_FILTERS = [
  { value: "all", label: "الكل" },
  { value: "buy", label: "🟢 شراء" },
  { value: "sell", label: "🔴 بيع" },
];

export default function SignalMarketplace() {
  const [tab, setTab] = useState("market");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_date");
  const [dirFilter, setDirFilter] = useState("all");
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState(null);
  const qc = useQueryClient();

  // إشارات AI المشاركة (status=pending, direction!=hold)
  const { data: publicSignals = [], isLoading } = useQuery({
    queryKey: ["public_signals"],
    queryFn: () => base44.entities.Signal.filter({ status: "pending" }, "-created_date", 50),
    refetchInterval: 60_000,
  });

  // إشاراتي
  const { data: mySignals = [] } = useQuery({
    queryKey: ["my_signals"],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Signal.filter({ created_by: user.email }, "-created_date", 20);
    },
  });

  // ترتيب وفلترة
  const filtered = publicSignals
    .filter(s => s.direction !== "hold")
    .filter(s => dirFilter === "all" || s.direction === dirFilter)
    .filter(s => !search || s.pair?.toLowerCase().includes(search.toLowerCase()) || s.strategy?.includes(search))
    .sort((a, b) => {
      if (sortBy === "confidence") return (b.confidence || 0) - (a.confidence || 0);
      if (sortBy === "pair") return (a.pair || "").localeCompare(b.pair || "");
      return new Date(b.created_date) - new Date(a.created_date);
    });

  const buySignals = filtered.filter(s => s.direction === "buy");
  const sellSignals = filtered.filter(s => s.direction === "sell");
  const highConfidence = filtered.filter(s => s.confidence >= 75);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Radio className="w-5 h-5 text-primary" />
            سوق الإشارات
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            إشارات AI مباشرة · شارك إشاراتك · انسخ صفقات المتداولين
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="glass-card px-3 py-2 text-center">
            <p className="text-[10px] text-muted-foreground">إشارات نشطة</p>
            <p className="text-lg font-bold text-primary">{publicSignals.filter(s => s.direction !== "hold").length}</p>
          </div>
          <div className="glass-card px-3 py-2 text-center">
            <p className="text-[10px] text-muted-foreground">ثقة عالية ≥75%</p>
            <p className="text-lg font-bold text-trading-green">{highConfidence.length}</p>
          </div>
          <Button size="sm" onClick={() => setShowShareModal(true)} className="bg-primary gap-2">
            <Share2 className="w-3.5 h-3.5" /> شارك إشارة
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-secondary h-9">
          <TabsTrigger value="market" className="text-xs gap-1.5">
            <Radio className="w-3.5 h-3.5" /> السوق المباشر
          </TabsTrigger>
          <TabsTrigger value="my_signals" className="text-xs gap-1.5">
            <Star className="w-3.5 h-3.5" /> إشاراتي
            {mySignals.length > 0 && (
              <Badge className="bg-primary/20 text-primary border-0 text-[10px] h-4 px-1 mr-0.5">{mySignals.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="top" className="text-xs gap-1.5">
            <Zap className="w-3.5 h-3.5" /> الأقوى
          </TabsTrigger>
        </TabsList>

        {/* السوق المباشر */}
        <TabsContent value="market" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-44">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="ابحث بالزوج أو الاستراتيجية..." value={search}
                onChange={e => setSearch(e.target.value)} className="pr-9 bg-secondary border-0 h-9" />
            </div>
            <div className="flex gap-1.5">
              {DIRECTION_FILTERS.map(f => (
                <button key={f.value} onClick={() => setDirFilter(f.value)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${dirFilter === f.value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              {SORT_OPTIONS.map(s => (
                <button key={s.value} onClick={() => setSortBy(s.value)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${sortBy === s.value ? "bg-secondary-foreground/20 text-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <div key={i} className="h-52 glass-card animate-pulse bg-secondary/30 rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass-card p-16 text-center text-muted-foreground">
              <Radio className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">لا توجد إشارات حالياً.</p>
              <p className="text-xs mt-1">ستظهر إشارات AI تلقائياً خلال دقائق أو شاركها يدوياً.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {filtered.map((signal, i) => (
                  <SignalCard key={signal.id} signal={signal} index={i} onCopy={() => setSelectedSignal(signal)} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* إشاراتي */}
        <TabsContent value="my_signals" className="mt-4">
          {mySignals.length === 0 ? (
            <div className="glass-card p-16 text-center text-muted-foreground">
              <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">لم تشارك أي إشارات بعد.</p>
              <Button size="sm" className="mt-4 gap-2" onClick={() => setShowShareModal(true)}>
                <Share2 className="w-3.5 h-3.5" /> شارك إشارتك الأولى
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mySignals.map((signal, i) => (
                <SignalCard key={signal.id} signal={signal} index={i} isOwn onCopy={() => setSelectedSignal(signal)} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* الأقوى */}
        <TabsContent value="top" className="mt-4 space-y-4">
          {/* ملخص */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-card p-4 border-t-2 border-trading-green">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-trading-green" />
                <span className="text-xs text-muted-foreground">إشارات شراء</span>
              </div>
              <p className="text-2xl font-bold text-trading-green">{buySignals.length}</p>
            </div>
            <div className="glass-card p-4 border-t-2 border-trading-red">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-trading-red" />
                <span className="text-xs text-muted-foreground">إشارات بيع</span>
              </div>
              <p className="text-2xl font-bold text-trading-red">{sellSignals.length}</p>
            </div>
            <div className="glass-card p-4 border-t-2 border-primary">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">ثقة ≥ 75%</span>
              </div>
              <p className="text-2xl font-bold text-primary">{highConfidence.length}</p>
            </div>
          </div>

          {highConfidence.length === 0 ? (
            <div className="glass-card p-12 text-center text-muted-foreground">
              <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">لا توجد إشارات بثقة عالية حالياً.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {highConfidence.map((signal, i) => (
                <SignalCard key={signal.id} signal={signal} index={i} highlighted onCopy={() => setSelectedSignal(signal)} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AnimatePresence>
        {showShareModal && (
          <ShareSignalModal
            onClose={() => setShowShareModal(false)}
            onShared={() => {
              qc.invalidateQueries({ queryKey: ["public_signals", "my_signals"] });
              setShowShareModal(false);
            }}
          />
        )}
        {selectedSignal && (
          <CopySignalModal
            signal={selectedSignal}
            onClose={() => setSelectedSignal(null)}
            onCopied={() => {
              qc.invalidateQueries({ queryKey: ["my_signals"] });
              setSelectedSignal(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}