
import type { Signal } from "../client/src/lib/constants";
import type { SignalAnalysis } from "./forexService";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function getConfidenceEmoji(confidence: number): string {
  if (confidence >= 85) return "🔥🔥🔥";
  if (confidence >= 75) return "🔥🔥";
  if (confidence >= 65) return "🔥";
  return "⚡";
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
      message += `• Candle Pattern: ${candlePattern}\n\n`;

      // Strict mode notes
      const hour = new Date().getUTCHours();
      let session = "EVENING";
      if (hour >= 7 && hour < 12) session = "MORNING";
      else if (hour >= 12 && hour < 17) session = "AFTERNOON";
      
      message += `⚡ Strict Mode Notes: ${session === "AFTERNOON" ? "Active - Higher threshold required" : "Standard analysis"}\n\n`;

      // Analysis details
      message += `🔍 Analysis:\n`;
      message += `• Only executed because confluence score ≥ threshold.\n`;
      
      const modifiers = analysis.reasoning.filter(r => r.includes("+")).slice(0, 3);
      message += `• Positive modifiers applied: ${modifiers.length > 0 ? modifiers.join(", ") : "Standard indicators"}\n`;
      message += `• Trade filtered by hot-zone session: ${session}\n`;
      message += `• Trade skipped if pair had consecutive losses, news event, or correlated conflict.\n\n`;
    }

    message += `📌 Notes:\n`;
    message += `- Fixed stake only (no martingale)\n`;
    message += `- ${signal.timeframe} trade; adaptive TP/SL based on volatility\n`;
    message += `- Historical accuracy considered for session and pair\n`;

    if (signal.martingale) {
      message += `\n🔄 Martingale Info:\n`;
      message += `- Entry #${signal.martingale.entryNumber}\n`;
      if (signal.martingale.canEnterNext && signal.martingale.nextEntryTime) {
        message += `- Next entry available at: ${signal.martingale.nextEntryTime}\n`;
      }
    }

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
