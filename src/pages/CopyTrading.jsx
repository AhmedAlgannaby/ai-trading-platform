import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Copy, Users, Rocket } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import TraderCard from "@/components/copytrading/TraderCard";
import FollowModal from "@/components/copytrading/FollowModal";
import MyFollowings from "@/components/copytrading/MyFollowings";
import PublishProfileForm from "@/components/copytrading/PublishProfileForm";

const SORT_OPTIONS = [
  { value: "total_return_percent", label: "الأعلى عائداً" },
  { value: "win_rate", label: "أعلى Win Rate" },
  { value: "followers_count", label: "الأكثر متابعة" },
  { value: "monthly_return_percent", label: "أفضل هذا الشهر" },
];

export default function CopyTrading() {
  const [tab, setTab] = useState("discover");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("total_return_percent");
  const [selectedTrader, setSelectedTrader] = useState(null);
  const qc = useQueryClient();

  const { data: traders = [] } = useQuery({
    queryKey: ["trader_profiles"],
    queryFn: () => base44.entities.TraderProfile.filter({ is_published: true }),
  });

  const { data: myFollowings = [], refetch: refetchFollowings } = useQuery({
    queryKey: ["my_followings"],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.CopyFollow.filter({ follower_email: user.email });
    },
  });

  const { data: myProfile } = useQuery({
    queryKey: ["my_trader_profile"],
    queryFn: async () => {
      const user = await base44.auth.me();
      const list = await base44.entities.TraderProfile.filter({ created_by: user.email });
      return list[0] || null;
    },
  });

  const followingIds = new Set(myFollowings.filter(f => f.status === "active").map(f => f.trader_id));

  const filteredTraders = traders
    .filter(t => !search || t.display_name?.toLowerCase().includes(search.toLowerCase()) || t.bio?.includes(search))
    .sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));

  const activeFollowings = myFollowings.filter(f => f.status !== "stopped");
  const totalPnl = myFollowings.reduce((sum, f) => sum + (f.total_pnl || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Copy className="w-5 h-5 text-primary" />
            نسخ التداول
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            تابع أفضل المتداولين وانسخ صفقاتهم تلقائياً
          </p>
        </div>
        {/* Summary Stats */}
        <div className="flex gap-3">
          <div className="glass-card px-4 py-2.5 text-center">
            <p className="text-[11px] text-muted-foreground">تتابع</p>
            <p className="text-lg font-bold text-primary">{activeFollowings.length}</p>
          </div>
          <div className="glass-card px-4 py-2.5 text-center">
            <p className="text-[11px] text-muted-foreground">إجمالي PnL</p>
            <p className={`text-lg font-bold font-mono ${totalPnl >= 0 ? "text-trading-green" : "text-trading-red"}`}>
              {totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(2)}$
            </p>
          </div>
          <div className="glass-card px-4 py-2.5 text-center">
            <p className="text-[11px] text-muted-foreground">المتداولون</p>
            <p className="text-lg font-bold">{traders.length}</p>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-secondary h-9">
          <TabsTrigger value="discover" className="text-xs gap-1.5">
            <Users className="w-3.5 h-3.5" /> اكتشف المتداولين
          </TabsTrigger>
          <TabsTrigger value="my_copy" className="text-xs gap-1.5">
            <Copy className="w-3.5 h-3.5" /> صفقاتي المنسوخة
            {activeFollowings.length > 0 && (
              <Badge className="bg-primary/20 text-primary border-0 text-[10px] h-4 px-1.5 mr-1">
                {activeFollowings.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="publish" className="text-xs gap-1.5">
            <Rocket className="w-3.5 h-3.5" />
            {myProfile ? "ملفي الاحترافي" : "كن متداولاً محترفاً"}
          </TabsTrigger>
        </TabsList>

        {/* Discover Tab */}
        <TabsContent value="discover" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="ابحث عن متداول..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="pr-9 bg-secondary border-0 h-9" />
            </div>
            <div className="flex gap-1.5">
              {SORT_OPTIONS.map(s => (
                <button key={s.value} onClick={() => setSortBy(s.value)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    sortBy === s.value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}>{s.label}</button>
              ))}
            </div>
          </div>

          {filteredTraders.length === 0 ? (
            <div className="glass-card p-12 text-center text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">لا يوجد متداولون حتى الآن.</p>
              <p className="text-xs mt-1">كن أول من ينشر ملفه الاحترافي!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTraders.map((t, i) => (
                <TraderCard
                  key={t.id}
                  trader={t}
                  index={i}
                  isFollowing={followingIds.has(t.id)}
                  onFollow={setSelectedTrader}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* My Copy Tab */}
        <TabsContent value="my_copy" className="mt-4">
          <MyFollowings followings={myFollowings} onUpdate={refetchFollowings} />
        </TabsContent>

        {/* Publish Tab */}
        <TabsContent value="publish" className="mt-4 max-w-2xl">
          <PublishProfileForm
            existing={myProfile}
            onSaved={() => qc.invalidateQueries({ queryKey: ["my_trader_profile", "trader_profiles"] })}
          />
        </TabsContent>
      </Tabs>

      {/* Follow Modal */}
      <AnimatePresence>
        {selectedTrader && (
          <FollowModal
            trader={selectedTrader}
            onClose={() => setSelectedTrader(null)}
            onSuccess={() => {
              refetchFollowings();
              setSelectedTrader(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}