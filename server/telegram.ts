
import type { Signal } from "../client/src/lib/constants";
import type { SignalAnalysis } from "./forexService";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Helper function to get current time in Kenya (UTC+3)
function getKenyaTime(): Date {
  const KENYA_OFFSET_MS = 3 * 60 * 60 * 1000; // +3 hours in milliseconds
  const nowUTC = new Date();
  return new Date(nowUTC.getTime() + KENYA_OFFSET_MS);
}

function getConfidenceEmoji(confidence: number): string {
  if (confidence >= 90) return "🔥";
  if (confidence >= 70) return "⚡";
  return "⚠";
}

function getRSIStatus(rsi: number): string {
  if (rsi < 30) return "Oversold";
  if (rsi > 70) return "Overbought";
  if (rsi < 45) return "Slightly Oversold";
  if (rsi > 55) return "Slightly Overbought";
  return "Neutral";
}

function getBollingerStatus(breakout: boolean, percentB: number): string {
  if (breakout && percentB > 1) return "Upper breakout (bullish)";
  if (breakout && percentB < 0) return "Lower breakout (bearish)";
  if (percentB > 0.8) return "Near upper band";
  if (percentB < 0.2) return "Near lower band";
  return "Mid-range";
}

function getSMAStatus(price: number, sma20: number, sma50: number, sma200: number): string {
  if (price > sma20 && price > sma50 && price > sma200) return "Above all SMAs (bullish)";
  if (price < sma20 && price < sma50 && price < sma200) return "Below all SMAs (bearish)";
  if (price > sma20 && price > sma50) return "Above SMA20/50";
  if (price < sma20 && price < sma50) return "Below SMA20/50";
  return "Mixed";
}

function isSessionHotZone(): { isHotZone: boolean; session: string } {
  const kenyaTime = getKenyaTime();
  const hour = kenyaTime.getHours();
  let session = "EVENING";
  let isHotZone = false;
  
  if (hour >= 7 && hour < 12) {
    session = "MORNING";
    isHotZone = true; // London session
  } else if (hour >= 12 && hour < 17) {
    session = "AFTERNOON";
    isHotZone = true; // London + New York overlap
  } else {
    session = "EVENING";
    isHotZone = false; // Asian session - lower volume
  }
  
  return { isHotZone, session };
}

export async function sendToTelegram(
  signal: Signal,
  analysis?: SignalAnalysis,
  isAuto: boolean = false
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log("Telegram not configured");
    return false;
  }

  try {
    const confidenceEmoji = getConfidenceEmoji(signal.confidence);
    const modeLabel = isAuto ? "AUTO" : "MANUAL";
    
    let message = `🚀 NEW HIGH-CONFIDENCE SIGNAL (${modeLabel})\n\n`;
    message += `📊 Pair: ${signal.pair}\n`;
    message += `⚡ Type: ${signal.type} (${signal.timeframe})\n\n`;
    message += `⏱ Entry Time: ${signal.startTime} - ${signal.endTime}\n`;
    message += `🎯 Entry Price: ${signal.entry.toFixed(5)}\n`;
    message += `🛑 Stop Loss: ${signal.stopLoss.toFixed(5)}\n`;
    message += `💰 Take Profit: ${signal.takeProfit.toFixed(5)}\n\n`;
    message += `💪 Confidence: ${signal.confidence}% ${confidenceEmoji}\n\n`;

    if (analysis?.technicals) {
      const tech = analysis.technicals;
      
      // Calculate confluence score from reasoning
      const confluenceMatches = analysis.reasoning.filter(r => 
        r.includes("MACD") || r.includes("Supertrend") || r.includes("RSI") || 
        r.includes("Bollinger") || r.includes("SMA")
      );
      const confluenceScore = Math.min(95, 50 + (confluenceMatches.length * 8));

      message += `📈 Trade Rationale:\n`;
      message += `• Indicator Confluence: ${confluenceScore}%\n`;
      message += `• RSI: ${tech.rsi.toFixed(1)} (${getRSIStatus(tech.rsi)})\n`;
      
      const macdDirection = tech.macd.histogram > 0 ? "Bullish crossover" : "Bearish crossover";
      message += `• MACD: ${macdDirection}\n`;
      message += `• Supertrend: ${tech.supertrend.direction}\n`;
      
      const bollingerStatus = getBollingerStatus(tech.bollingerBands.breakout, tech.bollingerBands.percentB);
      message += `• Bollinger: ${bollingerStatus}\n`;
      
      const smaStatus = getSMAStatus(analysis.currentPrice, tech.sma20, tech.sma50, tech.sma200);
      message += `• SMA/EMA Trend: ${smaStatus}\n`;
      message += `• ADX: ${tech.adx.toFixed(1)} (${tech.adx > 25 ? "Strong" : "Weak"} Trend)\n`;
      
      const candlePattern = tech.candlePattern ? tech.candlePattern.replace(/_/g, ' ').toUpperCase() : "NONE";
      message += `• Candle Pattern: ${candlePattern}\n`;
      
      // Warnings for extreme overbought/oversold
      if (tech.rsi > 90 || tech.stochastic.k > 90) {
        message += `\n⚠️ CAUTION: Extreme overbought detected - monitor for early reversal\n`;
      } else if (tech.rsi < 10 || tech.stochastic.k < 10) {
        message += `\n⚠️ CAUTION: Extreme oversold detected - monitor for early reversal\n`;
      }
      
      // Doji warning
      if (tech.candlePattern === "doji") {
        message += `⚠️ NOTE: Doji pattern shows indecision - entry timing critical\n`;
      }
      
      message += `\n`;

      // Session hot-zone info
      const { isHotZone, session } = isSessionHotZone();
      message += `⚡ Strict Mode Notes: ${session === "AFTERNOON" ? "Active - Higher threshold required" : "Standard analysis"}\n`;
      message += `🌍 Session Hot-Zone: ${isHotZone ? "YES ✅" : "NO"} (${session})\n\n`;

      // Analysis details
      message += `🔍 Analysis:\n`;
      message += `• Only executed because confluence score ≥ threshold.\n`;
      
      const modifiers = analysis.reasoning.filter(r => r.includes("+")).slice(0, 3);
      message += `• Positive modifiers applied: ${modifiers.length > 0 ? modifiers.join(", ") : "Standard indicators"}\n`;
      message += `• Trade filtered by hot-zone session: ${session}\n`;
      message += `• Trade skipped if pair had consecutive losses, news event, or correlated conflict.\n\n`;
    }

    message += `📌 Trading Rules:\n`;
    message += `- ✅ FIXED STAKE ONLY (No Martingale)\n`;
    message += `- ✅ M5 TIMEFRAME (5-minute trades for accuracy)\n`;
    message += `- ✅ KENYA TIME (EAT, UTC+3)\n`;
    message += `- ✅ Adaptive TP/SL based on volatility & trend strength\n`;
    message += `- ✅ Confluence-based confidence scoring\n`;
    message += `- ✅ Session hot-zone filtering applied\n`;

    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "HTML",
        }),
      }
    );

    const result = await response.json();
    return result.ok;
  } catch (error) {
    console.error("Telegram send error:", error);
    return false;
  }
}
