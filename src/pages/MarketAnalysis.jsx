import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PriceChart from "@/components/market/PriceChart";
import TechnicalIndicators from "@/components/market/TechnicalIndicators";
import PatternDetection from "@/components/market/PatternDetection";
import SupportResistance from "@/components/market/SupportResistance";
import TradeOrderPanel from "@/components/market/TradeOrderPanel";
import AutoSignalGenerator from "@/components/market/AutoSignalGenerator";
import { TRADING_PAIRS } from "@/lib/pairs";

const PAIRS = TRADING_PAIRS;

export default function MarketAnalysis() {
  const [selectedPair, setSelectedPair] = useState("BTC/USDT");
  const [livePrice, setLivePrice] = useState(null);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* مولد الإشارات التلقائي - يعمل في الخلفية */}
      <AutoSignalGenerator pair={selectedPair} />

      {/* Pair Selector */}
      <div className="flex items-center gap-4 flex-wrap">
        <Select value={selectedPair} onValueChange={setSelectedPair}>
          <SelectTrigger className="w-[180px] bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAIRS.map(pair => (
              <SelectItem key={pair} value={pair}>{pair}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Chart + Order Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <PriceChart pair={selectedPair} onPriceUpdate={setLivePrice} />
        </div>
        <div>
          <TradeOrderPanel pair={selectedPair} currentPrice={livePrice} />
        </div>
      </div>

      {/* Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TechnicalIndicators pair={selectedPair} />
        <PatternDetection pair={selectedPair} />
        <SupportResistance pair={selectedPair} />
      </div>
    </div>
  );
}