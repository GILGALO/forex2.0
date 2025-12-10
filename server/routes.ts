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
import { sendToTelegram } from "./telegram";
import { log } from "./index";

const FOREX_PAIRS = [
  "EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF",
  "AUD/USD", "USD/CAD", "NZD/USD", "EUR/GBP",
  "EUR/JPY", "GBP/JPY", "AUD/JPY", "EUR/AUD"
];


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
      const { timeframe, maxRescans = 5, minConfidenceThreshold = 70 } = req.body;
      const tf = timeframe || "M5";
      
      log(`[SCAN] Starting smart rescan for ${FOREX_PAIRS.length} pairs (maxRescans: ${maxRescans}, minThreshold: ${minConfidenceThreshold}%)`, "scan");
      
      const signals = await Promise.all(
        FOREX_PAIRS.map(pair => generateSignalAnalysis(pair, tf, apiKey, maxRescans, minConfidenceThreshold))
      );
      
      const sortedSignals = signals.sort((a, b) => b.confidence - a.confidence);
      const validSignals = sortedSignals.filter(s => s.confidence > 0);
      
      log(`[SCAN] Complete - Found ${validSignals.length}/${signals.length} valid signals. Best: ${sortedSignals[0]?.confidence || 0}%`, "scan");
      
      res.json({
        timestamp: Date.now(),
        timeframe: tf,
        signals: sortedSignals,
        bestSignal: sortedSignals[0],
        stats: {
          total: signals.length,
          valid: validSignals.length,
          blocked: signals.length - validSignals.length,
          maxRescans,
          minConfidenceThreshold
        }
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

      // CRITICAL: Verify signal passed all safety filters before sending
      if (signal.confidence <= 0) {
        log(`[TELEGRAM BLOCKED] ${signal.pair} - Confidence ${signal.confidence}% (filtered out)`, "telegram");
        return res.json({ 
          success: false, 
          message: "Signal blocked by safety filters (confidence 0%)",
          blocked: true,
          reason: "Risk filters prevented this signal from being sent"
        });
      }

      // Check for blocking indicators in analysis reasoning
      if (analysis?.reasoning) {
        const hasBlockingReason = analysis.reasoning.some(r => 
          r.includes("BLOCKED") || r.includes("SKIP:") || r.includes("🚫") || r.includes("TRADE BLOCKED")
        );
        if (hasBlockingReason) {
          log(`[TELEGRAM BLOCKED] ${signal.pair} - Contains blocking reason in analysis`, "telegram");
          return res.json({ 
            success: false, 
            message: "Signal blocked by analysis filters",
            blocked: true,
            reason: analysis.reasoning.find(r => r.includes("BLOCKED") || r.includes("SKIP"))
          });
        }
      }

      const sent = await sendToTelegram(signal, analysis, isAuto);
      res.json({ 
        success: sent, 
        blocked: false,
        message: sent ? "Signal sent to Telegram ✅" : "Telegram not configured or failed" 
      });
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
