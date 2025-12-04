import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  getForexQuote,
  getForexCandles,
  getAllQuotes,
  generateSignalAnalysis,
  analyzeTechnicals,
  type SignalAnalysis,
} from "./forexService";
import { log } from "./index";

const FOREX_PAIRS = [
  "EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF",
  "AUD/USD", "USD/CAD", "NZD/USD", "EUR/GBP",
  "EUR/JPY", "GBP/JPY", "AUD/JPY", "EUR/AUD"
];

async function sendToTelegram(signal: any, analysis?: SignalAnalysis, isAuto = false): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  if (!botToken || !chatId) {
    log("Telegram credentials not configured", "telegram");
    return false;
  }

  const reasoningText = analysis?.reasoning?.length 
    ? `\n📈 *Analysis:*\n${analysis.reasoning.map((r: string) => `• ${r}`).join('\n')}`
    : '';

  const technicalsText = analysis?.technicals
    ? `\n📊 *Technicals:*\n• RSI: ${analysis.technicals.rsi.toFixed(1)}\n• Trend: ${analysis.technicals.trend}\n• Momentum: ${analysis.technicals.momentum}`
    : '';

  const message = `
🚀 *NEW SIGNAL ALERT ${isAuto ? '(AUTO)' : '(MANUAL)'}* 🚀

📊 *Pair:* ${signal.pair}
⚡ *Type:* ${signal.type === 'CALL' ? '🟢 BUY/CALL' : '🔴 SELL/PUT'}
⏱ *Timeframe:* ${signal.timeframe}
⏰ *Start Time:* ${signal.startTime}
🏁 *End Time:* ${signal.endTime}

🎯 *Entry:* ${signal.entry.toFixed(5)}
🛑 *Stop Loss:* ${signal.stopLoss.toFixed(5)}
💰 *Take Profit:* ${signal.takeProfit.toFixed(5)}

💪 *Confidence:* ${signal.confidence}%
${technicalsText}
${reasoningText}
  `.trim();

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });
    
    if (!response.ok) {
      log(`Telegram API error: ${await response.text()}`, "telegram");
      return false;
    }
    return true;
  } catch (error) {
    log(`Telegram network error: ${error}`, "telegram");
    return false;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

  app.get("/api/forex/quote/:pair", async (req, res) => {
    try {
      const pair = decodeURIComponent(req.params.pair);
      const quote = await getForexQuote(pair, apiKey);
      res.json(quote);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/forex/quotes", async (req, res) => {
    try {
      const quotes = await getAllQuotes(FOREX_PAIRS, apiKey);
      res.json(quotes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/forex/candles/:pair", async (req, res) => {
    try {
      const pair = decodeURIComponent(req.params.pair);
      const interval = (req.query.interval as string) || "5min";
      const candles = await getForexCandles(pair, interval, apiKey);
      res.json(candles);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/forex/analysis/:pair", async (req, res) => {
    try {
      const pair = decodeURIComponent(req.params.pair);
      const interval = (req.query.interval as string) || "5min";
      const candles = await getForexCandles(pair, interval, apiKey);
      const technicals = analyzeTechnicals(candles);
      res.json({
        pair,
        currentPrice: candles[candles.length - 1].close,
        technicals,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/forex/signal", async (req, res) => {
    try {
      const { pair, timeframe } = req.body;
      if (!pair || !timeframe) {
        return res.status(400).json({ error: "Missing pair or timeframe" });
      }
      const signal = await generateSignalAnalysis(pair, timeframe, apiKey);
      res.json(signal);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/forex/scan", async (req, res) => {
    try {
      const { timeframe } = req.body;
      const tf = timeframe || "M5";
      
      const signals = await Promise.all(
        FOREX_PAIRS.map(pair => generateSignalAnalysis(pair, tf, apiKey))
      );
      
      const sortedSignals = signals.sort((a, b) => b.confidence - a.confidence);
      
      res.json({
        timestamp: Date.now(),
        timeframe: tf,
        signals: sortedSignals,
        bestSignal: sortedSignals[0],
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/telegram/send", async (req, res) => {
    try {
      const { signal, analysis, isAuto } = req.body;
      if (!signal) {
        return res.status(400).json({ error: "Missing signal data" });
      }
      const sent = await sendToTelegram(signal, analysis, isAuto);
      res.json({ success: sent, message: sent ? "Signal sent to Telegram" : "Telegram not configured or failed" });
    } catch (error: any) {
      res.status(500).json({ error: error.message, success: false });
    }
  });

  app.get("/api/telegram/status", (req, res) => {
    const configured = !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
    res.json({ configured });
  });

  return httpServer;
}
