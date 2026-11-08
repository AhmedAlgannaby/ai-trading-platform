import { base44 } from "@/api/base44Client";

const MIN_SAMPLES = 5;
const MAX_PENALTY = 25;

/** يستخرج العوامل من نص سبب الدخول المحفوظ في الصفقة */
export function extractFactors(trade) {
  const reason = (trade.entry_reason || "").replace("[تلقائي]", "");
  const factors = reason.split("—").map(s => s.trim()).filter(s => s && !s.startsWith("تعلّم:"))
    .map(f => f.replace(/\d+/g, "").trim()); // نوحّد "RSI تشبع بيعي 28" و "... 31"
  return [...new Set(factors)];
}

/** يسجل درساً لكل صفقة مغلقة لم تُسجَّل بعد */
export async function recordLessons() {
  const [closed, lessons] = await Promise.all([
    base44.entities.Trade.filter({ status: "closed", mode: "paper" }, "-closed_at", 50),
    base44.entities.TradeLesson.list("-created_date", 200),
  ]);
  const known = new Set(lessons.map(l => l.trade_id));
  const fresh = closed.filter(t => t.pnl_accounting_version === 2 && !known.has(t.id));
  if (!fresh.length) return 0;

  const records = fresh.map(t => {
    const win = (t.pnl || 0) > 0;
    const factors = extractFactors(t);
    return {
      trade_id: t.id,
      pair: t.pair,
      direction: t.type,
      outcome: win ? "win" : "loss",
      pnl: t.pnl || 0,
      pnl_percent: t.pnl_percent || 0,
      factors,
      exit_reason: t.exit_reason || "",
      lesson: win
        ? `نجحت صفقة ${t.type === "long" ? "شراء" : "بيع"} ${t.pair}`
        : `خسرت صفقة ${t.type === "long" ? "شراء" : "بيع"} ${t.pair} (${t.exit_reason || "—"}) — عوامل الدخول: ${factors.join("، ") || "—"}`,
    };
  });
  await base44.entities.TradeLesson.bulkCreate(records);
  return records.length;
}

function bucket(map, key, win) {
  if (!map[key]) map[key] = { wins: 0, losses: 0 };
  map[key][win ? "wins" : "losses"]++;
}

/** يبني إحصاءات الأداء لكل زوج+اتجاه ولكل عامل */
export async function buildStats() {
  const lessons = await base44.entities.TradeLesson.list("-created_date", 300);
  const combos = {};
  const factors = {};
  for (const l of lessons) {
    const win = l.outcome === "win";
    bucket(combos, `${l.pair}|${l.direction}`, win);
    (l.factors || []).forEach(f => bucket(factors, `${l.direction}|${f}`, win));
  }
  return { combos, factors, total: lessons.length };
}

function winRate(b) {
  const n = b.wins + b.losses;
  return n ? b.wins / n : 1;
}

/**
 * يقيّم إشارة جديدة بناءً على الدروس:
 * يعيد { blocked, adjustedConfidence, notes }
 */
export function evaluateSignal(stats, signal) {
  const dir = signal.direction === "buy" ? "long" : "short";
  const notes = [];
  let penalty = 0;

  const combo = stats.combos[`${signal.pair}|${dir}`];
  if (combo && combo.wins + combo.losses >= MIN_SAMPLES) {
    const wr = winRate(combo);
    if (wr < 0.3) return { blocked: true, adjustedConfidence: 0, notes: [`تجنّب ${signal.pair} ${dir}: نجاح ${(wr * 100).toFixed(0)}% فقط`] };
    if (wr < 0.5) { penalty += 10; notes.push(`خصم ثقة: ${signal.pair} ${dir} نجاح ${(wr * 100).toFixed(0)}%`); }
  }

  for (const reason of signal.reasons || []) {
    const key = `${dir}|${reason.replace(/\d+/g, "").trim()}`;
    const f = stats.factors[key];
    if (f && f.wins + f.losses >= MIN_SAMPLES && winRate(f) < 0.4) {
      penalty += 5;
      notes.push(`عامل ضعيف: ${reason}`);
    }
  }

  penalty = Math.min(penalty, MAX_PENALTY);
  return { blocked: false, adjustedConfidence: signal.confidence - penalty, notes };
}