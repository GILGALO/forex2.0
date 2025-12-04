import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  getForexQuote,
  getForexCandles,
  getAllQuotes,
  generateSignalAnalysis,
  analyzeTechnicals,
} from "./forexService";

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

  return httpServer;
}
