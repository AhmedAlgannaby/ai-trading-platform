import React, { useState, useEffect } from "react";
import { fetchBinanceAccount, placeBinanceOrder } from "@/components/binanceService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendingUp, TrendingDown, Wallet, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function TradeOrderPanel({ pair = "BTC/USDT", currentPrice }) {
  const [side, setSide] = useState("BUY");
  const [orderType, setOrderType] = useState("MARKET");
  const [quantity, setQuantity] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [usdtBalance, setUsdtBalance] = useState(null);
  const [baseBalance, setBaseBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // {type: 'success'|'error', msg}
  const [hasKeys, setHasKeys] = useState(false); // مفاتيح مضبوطة على السيرفر؟

  const symbol = pair.replace("/", "");
  const baseAsset = pair.split("/")[0];
  const execPrice = orderType === "LIMIT" ? parseFloat(limitPrice) : currentPrice;
  const totalUsdt = quantity && execPrice ? (parseFloat(quantity) * execPrice).toFixed(2) : null;

  // جلب الرصيد عبر وسيط السيرفر (المفاتيح لا تغادر السيرفر أبداً)
  useEffect(() => {
    fetchBinanceAccount()
      .then(account => {
        const balMap = {};
        account.balances?.forEach(b => { balMap[b.asset] = parseFloat(b.free); });
        setUsdtBalance(balMap["USDT"] || 0);
        setBaseBalance(balMap[baseAsset] || 0);
        setHasKeys(true);
      })
      .catch(() => { setHasKeys(false); });
  }, [baseAsset]);

  const handlePercentage = (pct) => {
    if (!execPrice) return;
    if (side === "BUY" && usdtBalance != null) {
      const amt = ((usdtBalance * pct) / 100 / execPrice).toFixed(6);
      setQuantity(amt);
    } else if (side === "SELL" && baseBalance != null) {
      const amt = ((baseBalance * pct) / 100).toFixed(6);
      setQuantity(amt);
    }
  };

  const handleSubmit = async () => {
    if (!hasKeys) {
      setStatus({ type: "error", msg: "أضف مفاتيح Binance API في الإعدادات أولاً" });
      return;
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      setStatus({ type: "error", msg: "أدخل الكمية" });
      return;
    }
    if (orderType === "LIMIT" && (!limitPrice || parseFloat(limitPrice) <= 0)) {
      setStatus({ type: "error", msg: "أدخل سعر الحد" });
      return;
    }
    // التحقق من الرصيد
    if (side === "BUY" && usdtBalance != null && totalUsdt && parseFloat(totalUsdt) > usdtBalance) {
      setStatus({ type: "error", msg: `الرصيد غير كافٍ (${usdtBalance?.toFixed(2)} USDT)` });
      return;
    }
    if (side === "SELL" && baseBalance != null && parseFloat(quantity) > baseBalance) {
      setStatus({ type: "error", msg: `الرصيد غير كافٍ (${baseBalance?.toFixed(6)} ${baseAsset})` });
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const result = await placeBinanceOrder({
        symbol,
        side,
        type: orderType,
        quantity: parseFloat(quantity),
        price: orderType === "LIMIT" ? parseFloat(limitPrice) : undefined,
      });
      setStatus({ type: "success", msg: `تم تنفيذ الأمر بنجاح! معرف: ${result.orderId}` });
      setQuantity("");
    } catch (e) {
      setStatus({ type: "error", msg: e.message || "فشل تنفيذ الأمر" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">إرسال أمر تداول</h3>

      {/* BUY / SELL */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setSide("BUY")}
          className={`py-2 rounded-lg text-sm font-bold transition-all ${
            side === "BUY"
              ? "bg-trading-green text-white shadow-lg shadow-green-900/30"
              : "bg-secondary text-muted-foreground hover:bg-trading-green/20"
          }`}
        >
          <TrendingUp className="w-4 h-4 inline ml-1" />
          شراء
        </button>
        <button
          onClick={() => setSide("SELL")}
          className={`py-2 rounded-lg text-sm font-bold transition-all ${
            side === "SELL"
              ? "bg-trading-red text-white shadow-lg shadow-red-900/30"
              : "bg-secondary text-muted-foreground hover:bg-trading-red/20"
          }`}
        >
          <TrendingDown className="w-4 h-4 inline ml-1" />
          بيع
        </button>
      </div>

      {/* MARKET / LIMIT */}
      <div className="flex gap-2">
        {["MARKET", "LIMIT"].map(t => (
          <button
            key={t}
            onClick={() => setOrderType(t)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              orderType === t
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            {t === "MARKET" ? "سوق" : "حد"}
          </button>
        ))}
      </div>

      {/* الرصيد */}
      {(usdtBalance != null || baseBalance != null) && (
        <div className="flex items-center justify-between text-[11px] bg-secondary/50 rounded-lg px-3 py-2">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Wallet className="w-3 h-3" />
            <span>الرصيد المتاح</span>
          </div>
          <div className="font-mono text-foreground">
            {side === "BUY"
              ? `${usdtBalance?.toFixed(2)} USDT`
              : `${baseBalance?.toFixed(6)} ${baseAsset}`
            }
          </div>
        </div>
      )}

      {/* السعر الحالي */}
      {currentPrice && (
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>السعر الحالي</span>
          <span className="font-mono text-foreground font-medium">
            ${currentPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: currentPrice < 1 ? 6 : 2 })}
          </span>
        </div>
      )}

      {/* سعر الحد */}
      {orderType === "LIMIT" && (
        <div>
          <label className="text-[11px] text-muted-foreground block mb-1">سعر الحد (USDT)</label>
          <Input
            type="number"
            placeholder={currentPrice?.toString()}
            value={limitPrice}
            onChange={e => setLimitPrice(e.target.value)}
            className="text-sm font-mono bg-secondary border-border"
          />
        </div>
      )}

      {/* الكمية */}
      <div>
        <label className="text-[11px] text-muted-foreground block mb-1">الكمية ({baseAsset})</label>
        <Input
          type="number"
          placeholder="0.00"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          className="text-sm font-mono bg-secondary border-border"
        />
        <div className="flex gap-1 mt-2">
          {[25, 50, 75, 100].map(pct => (
            <button
              key={pct}
              onClick={() => handlePercentage(pct)}
              className="flex-1 py-1 rounded text-[10px] bg-secondary hover:bg-secondary/80 text-muted-foreground transition-colors"
            >
              {pct}%
            </button>
          ))}
        </div>
      </div>

      {/* الإجمالي */}
      {totalUsdt && (
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">الإجمالي التقريبي</span>
          <span className="font-mono font-medium text-foreground">${totalUsdt} USDT</span>
        </div>
      )}

      {/* زر التنفيذ */}
      <Button
        onClick={handleSubmit}
        disabled={loading}
        className={`w-full font-bold ${
          side === "BUY"
            ? "bg-trading-green hover:bg-trading-green/90 text-white"
            : "bg-trading-red hover:bg-trading-red/90 text-white"
        }`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          `${side === "BUY" ? "شراء" : "بيع"} ${baseAsset}`
        )}
      </Button>

      {/* حالة الأمر */}
      {status && (
        <div className={`flex items-start gap-2 p-3 rounded-lg text-xs ${
          status.type === "success"
            ? "bg-trading-green/10 border border-trading-green/30 text-trading-green"
            : "bg-trading-red/10 border border-trading-red/30 text-trading-red"
        }`}>
          {status.type === "success"
            ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          }
          <span>{status.msg}</span>
        </div>
      )}
    </div>
  );
}