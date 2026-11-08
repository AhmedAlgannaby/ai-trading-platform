/**
 * Binance Proxy - Backend Function
 * يعمل كوسيط للاتصال بـ Binance API من الخادم لتجاوز مشكلة CORS
 */
import { createClientFromRequest } from "npm:@base44/sdk";

const BINANCE_BASE = "https://api.binance.com";

async function hmacSha256(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action } = await req.json();

  const apiKey: string = user.binance_api_key || "";
  const secretKey: string = user.binance_secret_key || "";

  if (!apiKey || !secretKey) {
    return Response.json({ error: "Binance API keys not configured. Please go to Settings and add your API keys." }, { status: 400 });
  }

  try {
    if (action === "account") {
      // جلب بيانات الحساب والأرصدة
      const timestamp = Date.now();
      const qs = `timestamp=${timestamp}`;
      const signature = await hmacSha256(qs, secretKey);
      const res = await fetch(`${BINANCE_BASE}/api/v3/account?${qs}&signature=${signature}`, {
        headers: { "X-MBX-APIKEY": apiKey }
      });
      if (!res.ok) {
        const errBody = await res.text();
        return Response.json({ error: `Binance error ${res.status}: ${errBody}` }, { status: 400 });
      }
      return Response.json(await res.json());

    } else if (action === "ticker") {
      // جلب أسعار الأزواج (لا يحتاج API key)
      const symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "ADAUSDT", "XRPUSDT"];
      const param = encodeURIComponent(JSON.stringify(symbols));
      const res = await fetch(`${BINANCE_BASE}/api/v3/ticker/24hr?symbols=${param}`);
      if (!res.ok) {
        return Response.json({ error: `Binance ticker error: ${res.status}` }, { status: 400 });
      }
      return Response.json(await res.json());

    } else if (action === "openOrders") {
      // جلب الأوامر المفتوحة
      const timestamp = Date.now();
      const qs = `timestamp=${timestamp}`;
      const signature = await hmacSha256(qs, secretKey);
      const res = await fetch(`${BINANCE_BASE}/api/v3/openOrders?${qs}&signature=${signature}`, {
        headers: { "X-MBX-APIKEY": apiKey }
      });
      if (!res.ok) {
        const errBody = await res.text();
        return Response.json({ error: `Binance error ${res.status}: ${errBody}` }, { status: 400 });
      }
      return Response.json(await res.json());

    } else {
      return Response.json({ error: "Unknown action" }, { status: 400 });
    }

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});