import { log } from "./index";

export interface ForexQuote {
  pair: string;
  price: number;
  bid: number;
  ask: number;
  timestamp: number;
  change: number;
  changePercent: number;
}

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface TechnicalAnalysis {
  rsi: number;
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
  };
  sma20: number;
  sma50: number;
  ema12: number;
  ema26: number;
  trend: "BULLISH" | "BEARISH" | "NEUTRAL";
  momentum: "STRONG" | "MODERATE" | "WEAK";
}

export interface SignalAnalysis {
  pair: string;
  currentPrice: number;
  signalType: "CALL" | "PUT";
  confidence: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  technicals: TechnicalAnalysis;
  reasoning: string[];
}

const FOREX_PAIR_MAP: Record<string, { from: string; to: string }> = {
  "EUR/USD": { from: "EUR", to: "USD" },
  "GBP/USD": { from: "GBP", to: "USD" },
  "USD/JPY": { from: "USD", to: "JPY" },
  "USD/CHF": { from: "USD", to: "CHF" },
  "AUD/USD": { from: "AUD", to: "USD" },
  "USD/CAD": { from: "USD", to: "CAD" },
  "NZD/USD": { from: "NZD", to: "USD" },
  "EUR/GBP": { from: "EUR", to: "GBP" },
  "EUR/JPY": { from: "EUR", to: "JPY" },
  "GBP/JPY": { from: "GBP", to: "JPY" },
  "AUD/JPY": { from: "AUD", to: "JPY" },
  "EUR/AUD": { from: "EUR", to: "AUD" },
};

const priceCache: Map<string, { data: ForexQuote; timestamp: number }> = new Map();
const candleCache: Map<string, { data: CandleData[]; timestamp: number }> = new Map();
const CACHE_DURATION = 60000;

async function fetchWithRetry(url: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

export async function getForexQuote(pair: string, apiKey?: string): Promise<ForexQuote> {
  const cached = priceCache.get(pair);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const pairInfo = FOREX_PAIR_MAP[pair];
  if (!pairInfo) {
    throw new Error(`Unknown pair: ${pair}`);
  }

  if (apiKey) {
    try {
      const url = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${pairInfo.from}&to_currency=${pairInfo.to}&apikey=${apiKey}`;
      const data = await fetchWithRetry(url);
      
      if (data["Realtime Currency Exchange Rate"]) {
        const rate = data["Realtime Currency Exchange Rate"];
        const price = parseFloat(rate["5. Exchange Rate"]);
        const bid = parseFloat(rate["8. Bid Price"]) || price * 0.99995;
        const ask = parseFloat(rate["9. Ask Price"]) || price * 1.00005;
        
        const quote: ForexQuote = {
          pair,
          price,
          bid,
          ask,
          timestamp: Date.now(),
          change: 0,
          changePercent: 0,
        };

        priceCache.set(pair, { data: quote, timestamp: Date.now() });
        return quote;
      }
    } catch (error) {
      log(`Alpha Vantage API error for ${pair}: ${error}`, "forex");
    }
  }

  return generateRealisticQuote(pair);
}

export async function getForexCandles(
  pair: string,
  interval: string = "5min",
  apiKey?: string
): Promise<CandleData[]> {
  const cacheKey = `${pair}-${interval}`;
  const cached = candleCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const pairInfo = FOREX_PAIR_MAP[pair];
  if (!pairInfo) {
    throw new Error(`Unknown pair: ${pair}`);
  }

  if (apiKey) {
    try {
      const url = `https://www.alphavantage.co/query?function=FX_INTRADAY&from_symbol=${pairInfo.from}&to_symbol=${pairInfo.to}&interval=${interval}&apikey=${apiKey}`;
      const data = await fetchWithRetry(url);
      
      const timeSeriesKey = Object.keys(data).find(k => k.includes("Time Series"));
      if (timeSeriesKey && data[timeSeriesKey]) {
        const timeSeries = data[timeSeriesKey];
        const candles: CandleData[] = Object.entries(timeSeries)
          .slice(0, 100)
          .map(([timestamp, values]: [string, any]) => ({
            timestamp: new Date(timestamp).getTime(),
            open: parseFloat(values["1. open"]),
            high: parseFloat(values["2. high"]),
            low: parseFloat(values["3. low"]),
            close: parseFloat(values["4. close"]),
          }))
          .reverse();

        candleCache.set(cacheKey, { data: candles, timestamp: Date.now() });
        return candles;
      }
    } catch (error) {
      log(`Alpha Vantage candles error for ${pair}: ${error}`, "forex");
    }
  }

  return generateRealisticCandles(pair, 100);
}

function getBasePriceForPair(pair: string): number {
  const basePrices: Record<string, number> = {
    "EUR/USD": 1.0850,
    "GBP/USD": 1.2650,
    "USD/JPY": 149.50,
    "USD/CHF": 0.8850,
    "AUD/USD": 0.6550,
    "USD/CAD": 1.3650,
    "NZD/USD": 0.6050,
    "EUR/GBP": 0.8580,
    "EUR/JPY": 162.20,
    "GBP/JPY": 189.10,
    "AUD/JPY": 97.90,
    "EUR/AUD": 1.6560,
  };
  return basePrices[pair] || 1.0;
}

function generateRealisticQuote(pair: string): ForexQuote {
  const basePrice = getBasePriceForPair(pair);
  const volatility = pair.includes("JPY") ? 0.0002 : 0.00002;
  const randomWalk = (Math.random() - 0.5) * 2 * volatility * basePrice;
  const price = basePrice + randomWalk;
  const spread = pair.includes("JPY") ? 0.02 : 0.00002;
  
  return {
    pair,
    price,
    bid: price - spread / 2,
    ask: price + spread / 2,
    timestamp: Date.now(),
    change: randomWalk,
    changePercent: (randomWalk / basePrice) * 100,
  };
}

function generateRealisticCandles(pair: string, count: number): CandleData[] {
  const candles: CandleData[] = [];
  let basePrice = getBasePriceForPair(pair);
  const volatility = pair.includes("JPY") ? 0.001 : 0.0001;
  const now = Date.now();
  const interval = 5 * 60 * 1000;

  for (let i = count - 1; i >= 0; i--) {
    const timestamp = now - i * interval;
    const trend = Math.sin(i * 0.1) * volatility * basePrice;
    const noise = (Math.random() - 0.5) * volatility * basePrice;
    
    const open = basePrice;
    const change = trend + noise;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility * basePrice * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * basePrice * 0.5;
    
    candles.push({
      timestamp,
      open,
      high,
      low,
      close,
    });
    
    basePrice = close;
  }

  return candles;
}

function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1];
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1];
  
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  
  return ema;
}

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMACD(prices: number[]): { macdLine: number; signalLine: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12 - ema26;
  
  const macdHistory: number[] = [];
  for (let i = 26; i <= prices.length; i++) {
    const slice = prices.slice(0, i);
    const e12 = calculateEMA(slice, 12);
    const e26 = calculateEMA(slice, 26);
    macdHistory.push(e12 - e26);
  }
  
  const signalLine = macdHistory.length >= 9 
    ? calculateEMA(macdHistory, 9) 
    : macdLine;
  
  return {
    macdLine,
    signalLine,
    histogram: macdLine - signalLine,
  };
}

export function analyzeTechnicals(candles: CandleData[]): TechnicalAnalysis {
  const closes = candles.map(c => c.close);
  
  const rsi = calculateRSI(closes, 14);
  const macd = calculateMACD(closes);
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  
  const currentPrice = closes[closes.length - 1];
  
  let trend: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
  let bullishSignals = 0;
  let bearishSignals = 0;
  
  if (currentPrice > sma20) bullishSignals++;
  else bearishSignals++;
  
  if (currentPrice > sma50) bullishSignals++;
  else bearishSignals++;
  
  if (ema12 > ema26) bullishSignals++;
  else bearishSignals++;
  
  if (macd.histogram > 0) bullishSignals++;
  else bearishSignals++;
  
  if (rsi < 30) bullishSignals += 2;
  else if (rsi > 70) bearishSignals += 2;
  
  if (bullishSignals > bearishSignals + 1) trend = "BULLISH";
  else if (bearishSignals > bullishSignals + 1) trend = "BEARISH";
  
  const momentum: "STRONG" | "MODERATE" | "WEAK" = 
    Math.abs(macd.histogram) > Math.abs(macd.signalLine) * 0.5 ? "STRONG" :
    Math.abs(macd.histogram) > Math.abs(macd.signalLine) * 0.2 ? "MODERATE" : "WEAK";
  
  return {
    rsi,
    macd,
    sma20,
    sma50,
    ema12,
    ema26,
    trend,
    momentum,
  };
}

export async function generateSignalAnalysis(
  pair: string,
  timeframe: string,
  apiKey?: string
): Promise<SignalAnalysis> {
  const intervalMap: Record<string, string> = {
    "M1": "1min",
    "M5": "5min",
    "M15": "15min",
    "M30": "30min",
    "H1": "60min",
    "H4": "60min",
  };
  
  const interval = intervalMap[timeframe] || "5min";
  const candles = await getForexCandles(pair, interval, apiKey);
  const technicals = analyzeTechnicals(candles);
  const currentPrice = candles[candles.length - 1].close;
  
  const reasoning: string[] = [];
  let bullishScore = 0;
  let bearishScore = 0;
  
  if (technicals.rsi < 30) {
    bullishScore += 25;
    reasoning.push(`RSI oversold at ${technicals.rsi.toFixed(1)} - potential reversal up`);
  } else if (technicals.rsi > 70) {
    bearishScore += 25;
    reasoning.push(`RSI overbought at ${technicals.rsi.toFixed(1)} - potential reversal down`);
  } else if (technicals.rsi < 45) {
    bullishScore += 10;
    reasoning.push(`RSI at ${technicals.rsi.toFixed(1)} - slight bullish bias`);
  } else if (technicals.rsi > 55) {
    bearishScore += 10;
    reasoning.push(`RSI at ${technicals.rsi.toFixed(1)} - slight bearish bias`);
  }
  
  if (technicals.macd.histogram > 0 && technicals.macd.macdLine > technicals.macd.signalLine) {
    bullishScore += 20;
    reasoning.push("MACD bullish crossover confirmed");
  } else if (technicals.macd.histogram < 0 && technicals.macd.macdLine < technicals.macd.signalLine) {
    bearishScore += 20;
    reasoning.push("MACD bearish crossover confirmed");
  }
  
  if (currentPrice > technicals.sma20 && currentPrice > technicals.sma50) {
    bullishScore += 15;
    reasoning.push("Price above both SMA20 and SMA50 - uptrend confirmed");
  } else if (currentPrice < technicals.sma20 && currentPrice < technicals.sma50) {
    bearishScore += 15;
    reasoning.push("Price below both SMA20 and SMA50 - downtrend confirmed");
  }
  
  if (technicals.ema12 > technicals.ema26) {
    bullishScore += 10;
    reasoning.push("EMA12 > EMA26 - short-term momentum bullish");
  } else {
    bearishScore += 10;
    reasoning.push("EMA12 < EMA26 - short-term momentum bearish");
  }
  
  if (technicals.momentum === "STRONG") {
    if (bullishScore > bearishScore) bullishScore += 15;
    else bearishScore += 15;
    reasoning.push(`${technicals.momentum} momentum detected`);
  }
  
  const signalType: "CALL" | "PUT" = bullishScore >= bearishScore ? "CALL" : "PUT";
  const totalScore = bullishScore + bearishScore;
  const confidence = Math.min(95, Math.max(60, 
    50 + Math.abs(bullishScore - bearishScore) + (technicals.momentum === "STRONG" ? 10 : 0)
  ));
  
  const pipValue = pair.includes("JPY") ? 0.01 : 0.0001;
  const atr = calculateATR(candles, 14);
  const slPips = Math.max(atr * 1.5, pipValue * 20);
  const tpPips = slPips * 2;
  
  const entry = currentPrice;
  const stopLoss = signalType === "CALL" 
    ? currentPrice - slPips 
    : currentPrice + slPips;
  const takeProfit = signalType === "CALL" 
    ? currentPrice + tpPips 
    : currentPrice - tpPips;
  
  return {
    pair,
    currentPrice,
    signalType,
    confidence: Math.round(confidence),
    entry,
    stopLoss,
    takeProfit,
    technicals,
    reasoning,
  };
}

function calculateATR(candles: CandleData[], period: number = 14): number {
  if (candles.length < period + 1) {
    return (candles[candles.length - 1].high - candles[candles.length - 1].low);
  }
  
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trs.push(tr);
  }
  
  return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

export async function getAllQuotes(pairs: string[], apiKey?: string): Promise<ForexQuote[]> {
  const quotes = await Promise.all(
    pairs.map(pair => getForexQuote(pair, apiKey))
  );
  return quotes;
}
