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
  sma200: number;
  ema12: number;
  ema26: number;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    percentB: number;
    breakout: boolean;
  };
  stochastic: {
    k: number;
    d: number;
  };
  atr: number;
  adx: number;
  supertrend: {
    direction: "BULLISH" | "BEARISH";
    value: number;
  };
  candlePattern: string | null;
  trend: "BULLISH" | "BEARISH" | "NEUTRAL";
  momentum: "STRONG" | "MODERATE" | "WEAK";
  volatility: "HIGH" | "MEDIUM" | "LOW";
}

export type PairAccuracy = "HIGH" | "MEDIUM" | "LOW";
export type SessionTime = "MORNING" | "AFTERNOON" | "EVENING";

const HIGH_ACCURACY_PAIRS = ["GBP/USD", "EUR/JPY", "USD/JPY", "USD/CAD", "GBP/JPY"];
const MEDIUM_ACCURACY_PAIRS = ["EUR/USD", "AUD/USD", "EUR/AUD", "EUR/GBP"];
const LOW_ACCURACY_PAIRS = ["USD/CHF", "AUD/JPY", "NZD/USD"];

function getPairAccuracy(pair: string): PairAccuracy {
  if (HIGH_ACCURACY_PAIRS.includes(pair)) return "HIGH";
  if (MEDIUM_ACCURACY_PAIRS.includes(pair)) return "MEDIUM";
  return "LOW";
}

function getCurrentSessionTime(): SessionTime {
  // Get current time in Kenya (UTC+3)
  const KENYA_OFFSET_MS = 3 * 60 * 60 * 1000;
  const nowUTC = new Date();
  const nowKenya = new Date(nowUTC.getTime() + KENYA_OFFSET_MS);
  const hour = nowKenya.getHours();

  if (hour >= 7 && hour < 12) return "MORNING";
  if (hour >= 12 && hour < 17) return "AFTERNOON";
  return "EVENING";
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

function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): { upper: number; middle: number; lower: number; percentB: number } {
  const middle = calculateSMA(prices, period);
  const slice = prices.slice(-period);

  const variance = slice.reduce((sum, price) => sum + Math.pow(price - middle, 2), 0) / period;
  const standardDeviation = Math.sqrt(variance);

  const upper = middle + (standardDeviation * stdDev);
  const lower = middle - (standardDeviation * stdDev);

  const currentPrice = prices[prices.length - 1];
  const percentB = (currentPrice - lower) / (upper - lower);

  return { upper, middle, lower, percentB };
}

function calculateStochastic(candles: CandleData[], kPeriod: number = 14, dPeriod: number = 3): { k: number; d: number } {
  if (candles.length < kPeriod) return { k: 50, d: 50 };

  const slice = candles.slice(-kPeriod);
  const currentClose = candles[candles.length - 1].close;
  const lowestLow = Math.min(...slice.map(c => c.low));
  const highestHigh = Math.max(...slice.map(c => c.high));

  const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;

  const kValues: number[] = [];
  for (let i = kPeriod - 1; i < candles.length; i++) {
    const periodSlice = candles.slice(i - kPeriod + 1, i + 1);
    const close = candles[i].close;
    const low = Math.min(...periodSlice.map(c => c.low));
    const high = Math.max(...periodSlice.map(c => c.high));
    kValues.push(((close - low) / (high - low)) * 100);
  }

  const d = kValues.length >= dPeriod 
    ? kValues.slice(-dPeriod).reduce((a, b) => a + b, 0) / dPeriod 
    : k;

  return { k, d };
}

function calculateADX(candles: CandleData[], period: number = 14): number {
  if (candles.length < period + 1) return 25;

  const dmPlus: number[] = [];
  const dmMinus: number[] = [];
  const tr: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const highDiff = candles[i].high - candles[i - 1].high;
    const lowDiff = candles[i - 1].low - candles[i].low;

    dmPlus.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
    dmMinus.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);

    const trueRange = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    tr.push(trueRange);
  }

  const smoothDmPlus = dmPlus.slice(-period).reduce((a, b) => a + b, 0);
  const smoothDmMinus = dmMinus.slice(-period).reduce((a, b) => a + b, 0);
  const smoothTr = tr.slice(-period).reduce((a, b) => a + b, 0);

  const diPlus = (smoothDmPlus / smoothTr) * 100;
  const diMinus = (smoothDmMinus / smoothTr) * 100;

  const dx = Math.abs(diPlus - diMinus) / (diPlus + diMinus) * 100;
  return dx;
}

function calculateSupertrend(candles: CandleData[], period: number = 10, multiplier: number = 3): { direction: "BULLISH" | "BEARISH"; value: number } {
  if (candles.length < period + 1) {
    return { direction: "NEUTRAL" as "BULLISH" | "BEARISH", value: candles[candles.length - 1].close };
  }

  const atr = calculateATR(candles, period);
  const currentCandle = candles[candles.length - 1];
  const hl2 = (currentCandle.high + currentCandle.low) / 2;

  const upperBand = hl2 + (multiplier * atr);
  const lowerBand = hl2 - (multiplier * atr);

  const prevCandle = candles[candles.length - 2];
  const prevClose = prevCandle.close;

  let direction: "BULLISH" | "BEARISH";
  let value: number;

  if (currentCandle.close > upperBand) {
    direction = "BULLISH";
    value = lowerBand;
  } else if (currentCandle.close < lowerBand) {
    direction = "BEARISH";
    value = upperBand;
  } else {
    direction = prevClose > hl2 ? "BULLISH" : "BEARISH";
    value = direction === "BULLISH" ? lowerBand : upperBand;
  }

  return { direction, value };
}

function detectCandlePattern(candles: CandleData[]): string | null {
  if (candles.length < 3) return null;

  const current = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const prevPrev = candles[candles.length - 3];

  const bodySize = Math.abs(current.close - current.open);
  const upperWick = current.high - Math.max(current.open, current.close);
  const lowerWick = Math.min(current.open, current.close) - current.low;
  const totalRange = current.high - current.low;

  const prevBodySize = Math.abs(prev.close - prev.open);

  if (totalRange > 0) {
    if (current.close > current.open && prev.close < prev.open) {
      if (current.close > prev.open && current.open < prev.close && bodySize > prevBodySize * 0.8) {
        return "bullish_engulfing";
      }
    }

    if (current.close < current.open && prev.close > prev.open) {
      if (current.open > prev.close && current.close < prev.open && bodySize > prevBodySize * 0.8) {
        return "bearish_engulfing";
      }
    }

    if (bodySize / totalRange < 0.1 && upperWick > bodySize * 2 && lowerWick > bodySize * 2) {
      return "doji";
    }

    if (lowerWick > bodySize * 2 && upperWick < bodySize * 0.5) {
      if (prev.close < prev.open && prevPrev.close < prevPrev.open) {
        return "hammer";
      }
      return "pin_bar_bullish";
    }

    if (upperWick > bodySize * 2 && lowerWick < bodySize * 0.5) {
      if (prev.close > prev.open && prevPrev.close > prevPrev.open) {
        return "shooting_star";
      }
      return "pin_bar_bearish";
    }

    if (current.close > current.open && prev.close < prev.open && prevPrev.close < prevPrev.open) {
      if (current.close > (prev.open + prev.close) / 2) {
        return "morning_star";
      }
    }

    if (current.close < current.open && prev.close > prev.open && prevPrev.close > prevPrev.open) {
      if (current.close < (prev.open + prev.close) / 2) {
        return "evening_star";
      }
    }
  }

  return null;
}

export function analyzeTechnicals(candles: CandleData[]): TechnicalAnalysis {
  const closes = candles.map(c => c.close);

  const rsi = calculateRSI(closes, 14);
  const macd = calculateMACD(closes);
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const sma200 = calculateSMA(closes, 200);
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const bbands = calculateBollingerBands(closes, 20, 2);
  const stochastic = calculateStochastic(candles, 14, 3);
  const atr = calculateATR(candles, 14);
  const adx = calculateADX(candles, 14);
  const supertrend = calculateSupertrend(candles, 10, 3);
  const candlePattern = detectCandlePattern(candles);

  const currentPrice = closes[closes.length - 1];

  const bollingerBreakout = currentPrice > bbands.upper || currentPrice < bbands.lower;
  const bollingerBands = {
    ...bbands,
    breakout: bollingerBreakout,
  };

  let trend: "BULLISH" | "BEARISH" | "NEUTRAL" = "NEUTRAL";
  let bullishSignals = 0;
  let bearishSignals = 0;

  if (currentPrice > sma20) bullishSignals += 1.5;
  else bearishSignals += 1.5;

  if (currentPrice > sma50) bullishSignals += 2;
  else bearishSignals += 2;

  if (currentPrice > sma200) bullishSignals += 2.5;
  else bearishSignals += 2.5;

  if (ema12 > ema26) bullishSignals += 2;
  else bearishSignals += 2;

  if (macd.histogram > 0 && macd.macdLine > macd.signalLine) bullishSignals += 2.5;
  else if (macd.histogram < 0 && macd.macdLine < macd.signalLine) bearishSignals += 2.5;

  if (rsi < 30) bullishSignals += 3;
  else if (rsi < 40) bullishSignals += 1;
  else if (rsi > 70) bearishSignals += 3;
  else if (rsi > 60) bearishSignals += 1;

  if (bollingerBands.percentB < 0.2) bullishSignals += 2;
  else if (bollingerBands.percentB > 0.8) bearishSignals += 2;

  if (stochastic.k < 20 && stochastic.d < 20) bullishSignals += 2;
  else if (stochastic.k > 80 && stochastic.d > 80) bearishSignals += 2;

  if (stochastic.k > stochastic.d && stochastic.k < 50) bullishSignals += 1;
  else if (stochastic.k < stochastic.d && stochastic.k > 50) bearishSignals += 1;

  if (supertrend.direction === "BULLISH") bullishSignals += 3;
  else bearishSignals += 3;

  if (adx > 25) {
    if (bullishSignals > bearishSignals) bullishSignals += 1.5;
    else bearishSignals += 1.5;
  }

  if (bullishSignals > bearishSignals + 2) trend = "BULLISH";
  else if (bearishSignals > bullishSignals + 2) trend = "BEARISH";

  const momentum: "STRONG" | "MODERATE" | "WEAK" = 
    adx > 40 || Math.abs(macd.histogram) > Math.abs(macd.signalLine) * 0.5 ? "STRONG" :
    adx > 25 || Math.abs(macd.histogram) > Math.abs(macd.signalLine) * 0.2 ? "MODERATE" : "WEAK";

  const volatility: "HIGH" | "MEDIUM" | "LOW" = 
    atr > bollingerBands.middle * 0.015 ? "HIGH" :
    atr > bollingerBands.middle * 0.008 ? "MEDIUM" : "LOW";

  return {
    rsi,
    macd,
    sma20,
    sma50,
    sma200,
    ema12,
    ema26,
    bollingerBands,
    stochastic,
    atr,
    adx,
    supertrend,
    candlePattern,
    trend,
    momentum,
    volatility,
  };
}

export async function generateSignalAnalysis(
  pair: string,
  timeframe: string,
  apiKey?: string
): Promise<SignalAnalysis | null> {
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

  const pairAccuracy = getPairAccuracy(pair);
  const sessionTime = getCurrentSessionTime();
  const strictMode = sessionTime === "AFTERNOON" && (pairAccuracy === "MEDIUM" || pairAccuracy === "LOW");

  const reasoning: string[] = [];
  let bullishScore = 0;
  let bearishScore = 0;

  if (technicals.macd.histogram > 0 && technicals.macd.macdLine > technicals.macd.signalLine) {
    bullishScore += 40;
    reasoning.push("MACD bullish crossover with positive histogram (+40)");
  } else if (technicals.macd.histogram < 0 && technicals.macd.macdLine < technicals.macd.signalLine) {
    bearishScore += 40;
    reasoning.push("MACD bearish crossover with negative histogram (+40)");
  }

  if (technicals.supertrend.direction === "BULLISH") {
    bullishScore += 40;
    reasoning.push("Supertrend bullish - trend confirmation (+40)");
  } else {
    bearishScore += 40;
    reasoning.push("Supertrend bearish - trend confirmation (+40)");
  }

  if (technicals.bollingerBands.breakout) {
    if (currentPrice > technicals.bollingerBands.upper) {
      bearishScore += 30;
      reasoning.push("Bollinger Band upper breakout - potential reversal (+30)");
    } else {
      bullishScore += 30;
      reasoning.push("Bollinger Band lower breakout - potential reversal (+30)");
    }
  } else if (technicals.bollingerBands.percentB < 0.2) {
    bullishScore += 15;
    reasoning.push("Price near lower Bollinger Band (+15)");
  } else if (technicals.bollingerBands.percentB > 0.8) {
    bearishScore += 15;
    reasoning.push("Price near upper Bollinger Band (+15)");
  }

  if (technicals.rsi >= 70) {
    bearishScore += 20;
    reasoning.push(`RSI overbought at ${technicals.rsi.toFixed(1)} - reversal signal (+20)`);
  } else if (technicals.rsi <= 30) {
    bullishScore += 20;
    reasoning.push(`RSI oversold at ${technicals.rsi.toFixed(1)} - reversal signal (+20)`);
  } else if (technicals.rsi > 60) {
    bearishScore += 10;
    reasoning.push(`RSI elevated at ${technicals.rsi.toFixed(1)} - bearish bias (+10)`);
  } else if (technicals.rsi < 40) {
    bullishScore += 10;
    reasoning.push(`RSI depressed at ${technicals.rsi.toFixed(1)} - bullish bias (+10)`);
  }

  if (currentPrice > technicals.sma20 && currentPrice > technicals.sma50 && currentPrice > technicals.sma200) {
    bullishScore += 15;
    reasoning.push("Price above all major SMAs - strong uptrend (+15)");
  } else if (currentPrice < technicals.sma20 && currentPrice < technicals.sma50 && currentPrice < technicals.sma200) {
    bearishScore += 15;
    reasoning.push("Price below all major SMAs - strong downtrend (+15)");
  } else if (currentPrice > technicals.sma20 && currentPrice > technicals.sma50) {
    bullishScore += 10;
    reasoning.push("Price above SMA20 and SMA50 (+10)");
  } else if (currentPrice < technicals.sma20 && currentPrice < technicals.sma50) {
    bearishScore += 10;
    reasoning.push("Price below SMA20 and SMA50 (+10)");
  }

  if (technicals.stochastic.k < 20 && technicals.stochastic.d < 20) {
    bullishScore += 15;
    reasoning.push(`Stochastic oversold (K:${technicals.stochastic.k.toFixed(1)}, D:${technicals.stochastic.d.toFixed(1)}) (+15)`);
  } else if (technicals.stochastic.k > 80 && technicals.stochastic.d > 80) {
    bearishScore += 15;
    reasoning.push(`Stochastic overbought (K:${technicals.stochastic.k.toFixed(1)}, D:${technicals.stochastic.d.toFixed(1)}) (+15)`);
  }

  const candlePattern = technicals.candlePattern;
  const confirmingPatterns = ["bullish_engulfing", "bearish_engulfing", "pin_bar_bullish", "pin_bar_bearish", "hammer", "shooting_star", "doji", "morning_star", "evening_star"];
  const bullishPatterns = ["bullish_engulfing", "pin_bar_bullish", "hammer", "morning_star"];
  const bearishPatterns = ["bearish_engulfing", "pin_bar_bearish", "shooting_star", "evening_star"];

  if (candlePattern && confirmingPatterns.includes(candlePattern)) {
    if (bullishPatterns.includes(candlePattern)) {
      bullishScore += 15;
      reasoning.push(`Candle pattern: ${candlePattern.replace(/_/g, ' ')} (bullish +15)`);
    } else if (bearishPatterns.includes(candlePattern)) {
      bearishScore += 15;
      reasoning.push(`Candle pattern: ${candlePattern.replace(/_/g, ' ')} (bearish +15)`);
    } else if (candlePattern === "doji") {
      reasoning.push("Candle pattern: doji (neutral - indecision)");
    }
  }

  if (technicals.adx > 40) {
    if (bullishScore > bearishScore) bullishScore += 10;
    else bearishScore += 10;
    reasoning.push(`Very strong trend (ADX: ${technicals.adx.toFixed(1)}) - high conviction (+10)`);
  } else if (technicals.adx > 25) {
    if (bullishScore > bearishScore) bullishScore += 5;
    else bearishScore += 5;
    reasoning.push(`Strong trend (ADX: ${technicals.adx.toFixed(1)}) (+5)`);
  }

  const scoreDiff = Math.abs(bullishScore - bearishScore);
  const signalType: "CALL" | "PUT" = bullishScore >= bearishScore ? "CALL" : "PUT";
  
  // FINAL SIGNAL ACCURACY RULES IMPLEMENTATION
  // Skip extreme overbought/oversold conditions
  if (technicals.rsi > 97 || technicals.rsi < 3) {
    reasoning.push(`⚠ Skipped: RSI extreme (${technicals.rsi.toFixed(1)})`);
    return null;
  }
  if (technicals.stochastic.k > 97 || technicals.stochastic.d > 97 || technicals.stochastic.k < 3 || technicals.stochastic.d < 3) {
    reasoning.push(`⚠ Skipped: Stochastic extreme (K:${technicals.stochastic.k.toFixed(1)}, D:${technicals.stochastic.d.toFixed(1)})`);
    return null;
  }

  // Short-term volatility filter
  const lastCandle = candles[candles.length - 1];
  const lastCandleRange = lastCandle.high - lastCandle.low;
  const avgRange = technicals.atr;
  if (lastCandleRange >= 1.5 * avgRange) {
    reasoning.push(`⚠ Skipped: High short-term volatility (last candle range ${lastCandleRange.toFixed(4)} >= 1.5 * ATR ${avgRange.toFixed(4)})`);
    return null;
  }

  // Candle confirmation check
  const last2Candles = candles.slice(-2);
  const bullishCandles = last2Candles.filter(c => c.close > c.open).length;
  const bearishCandles = last2Candles.filter(c => c.close < c.open).length;

  if (signalType === "CALL" && bullishCandles < 2) {
    reasoning.push(`⚠ CALL signal requires 2 bullish candles - only ${bullishCandles} found - SKIPPED`);
    return null;
  }
  if (signalType === "PUT" && bearishCandles < 2) {
    reasoning.push(`⚠ PUT signal requires 2 bearish candles - only ${bearishCandles} found - SKIPPED`);
    return null;
  }

  // Skip on indecision candles in extreme zones
  if ((technicals.rsi > 90 || technicals.rsi < 10) && candlePattern && (candlePattern === 'doji' || candlePattern.includes('spinning'))) {
    reasoning.push(`⚠ Skipped: Indecision candle (${candlePattern}) in extreme RSI zone`);
    return null;
  }

  // Session-based filters
  const isAfternoon = sessionTime === "AFTERNOON";
  const isLowAccuracy = pairAccuracy === "LOW";
  const isMediumAccuracy = pairAccuracy === "MEDIUM";

  if (isAfternoon && (isLowAccuracy || isMediumAccuracy)) {
    reasoning.push(`[Strict Mode] Afternoon session with ${pairAccuracy} accuracy pair.`);
    if (scoreDiff < 40) {
      reasoning.push(`⚠ Skipped: Low confluence (${scoreDiff}) in Strict Mode.`);
      return null;
    }
    if (technicals.volatility === "HIGH") {
        reasoning.push(`⚠ Skipped: High volatility in Strict Mode.`);
        return null;
    }
  }

  const winningScore = Math.max(bullishScore, bearishScore);
  const losingScore = Math.min(bullishScore, bearishScore);
  
  // Confluence categorization
  const confluenceScore = Math.round((winningScore / (winningScore + losingScore)) * 100);
  
  let baseConfidence = confluenceScore;
  let confidenceReductions: string[] = [];

  // Apply confidence reductions
  if (technicals.rsi > 90 || technicals.stochastic.k > 90 || technicals.stochastic.d > 90) {
      baseConfidence -= 10;
      confidenceReductions.push(`⚠ Extreme overbought - reduced confidence by 10%`);
  } else if (technicals.rsi < 10 || technicals.stochastic.k < 10 || technicals.stochastic.d < 10) {
      baseConfidence -= 10;
      confidenceReductions.push(`⚠ Extreme oversold - reduced confidence by 10%`);
  }

  if (candlePattern && (candlePattern === 'doji' || candlePattern.includes('spinning'))) {
      baseConfidence -= 8;
      confidenceReductions.push(`⚠ Neutral candle pattern (${candlePattern}) - reduced confidence by 8%`);
  }

  let confidence = baseConfidence;
  const isPatternAligned = candlePattern && 
    ((signalType === 'CALL' && (bullishPatterns.includes(candlePattern))) ||
     (signalType === 'PUT' && (bearishPatterns.includes(candlePattern))));

  // Apply score difference caps
  if (scoreDiff < 20) {
      confidence = Math.min(confidence, 56);
      confidenceReductions.push(`Low score difference (<20) - confidence capped at 56%`);
  } else if (scoreDiff < 40) {
      confidence = Math.min(confidence, 70);
      confidenceReductions.push(`Medium score difference (20-40) - confidence capped at 70%`);
  } else if (scoreDiff < 60) {
      confidence = Math.min(confidence, 85);
      confidenceReductions.push(`Good score difference (40-60) - confidence capped at 85%`);
  } else {
      confidence = Math.min(confidence, 98);
  }

  // Apply strict mode penalty
  if (isAfternoon && (isLowAccuracy || isMediumAccuracy)) {
    confidence = Math.max(confidence - 20, 0);
    confidence = Math.min(confidence, 55);
    confidenceReductions.push(`⚠ STRICT MODE: Medium/Low accuracy pair in afternoon - confidence reduced by 20% and capped at 55%`);
  }

  reasoning.push(...confidenceReductions);

  // Calculate TP/SL
  const riskRewardRatio = scoreDiff >= 60 ? 3.0 : scoreDiff >= 40 ? 2.5 : scoreDiff >= 20 ? 2.0 : 1.8;
  const pipValue = pair.includes("JPY") ? 0.01 : 0.0001;
  let stopLossPips = 15;

  if (technicals.rsi > 90 || technicals.rsi < 10 || technicals.stochastic.k > 90 || technicals.stochastic.k < 10) {
    stopLossPips = 12; // Tighter SL in extreme zones
    reasoning.push(`⚠ Tighter SL (12 pips) due to extreme zone`);
  }

  const takeProfitPips = stopLossPips * riskRewardRatio;

  const stopLoss = signalType === "CALL" 
    ? currentPrice - (stopLossPips * pipValue)
    : currentPrice + (stopLossPips * pipValue);

  const takeProfit = signalType === "CALL"
    ? currentPrice + (takeProfitPips * pipValue)
    : currentPrice - (takeProfitPips * pipValue);

  reasoning.push(`Final Confluence: ${confluenceScore}% | Score diff: ${scoreDiff} | R/R: 1:${riskRewardRatio.toFixed(1)} | Confidence: ${confidence.toFixed(0)}%`);

  return {
    pair,
    currentPrice,
    signalType,
    confidence,
    entry: currentPrice,
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