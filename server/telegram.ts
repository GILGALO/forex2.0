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

// Helper function to format time in Kenya (EAT)
function formatKenyaTime(date: Date): string {
  const kenyaTime = getKenyaTime();
  const hours = kenyaTime.getHours().toString().padStart(2, '0');
  const minutes = kenyaTime.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
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
    console.log("[telegram] Telegram credentials not configured");
    return false;
  }

  // Skip sending if confidence is 0 (trade was skipped by risk filters)
  if (signal.confidence === 0) {
    console.log("[telegram] Signal skipped - confidence is 0 (risk filter triggered)");
    return false;
  }

  try {
    const confidenceEmoji = getConfidenceEmoji(signal.confidence);
    const modeLabel = isAuto ? "AUTO" : "MANUAL";
    const { isHotZone, session } = isSessionHotZone();

    // Extract confluence score from reasoning
    let confluenceScore = 70;
    if (analysis?.reasoning) {
      const confluenceMatch = analysis.reasoning.find(r => r.includes("Final Confluence:"));
      if (confluenceMatch) {
        const match = confluenceMatch.match(/Final Confluence: (\d+)%/);
        if (match) confluenceScore = parseInt(match[1]);
      }
    }

    let message = `🚀 NEW SIGNAL (${modeLabel})\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Core Signal Info
    message += `📊 <b>Pair:</b> ${signal.pair}\n`;
    message += `⚡ <b>Signal:</b> ${signal.type === "CALL" ? "BUY 📈" : "SELL 📉"}\n`;
    message += `📉 <b>Timeframe:</b> ${signal.timeframe} (M5)\n\n`;

    // Kenya Time Start/End
    message += `⏰ <b>Kenya Time Start:</b> ${formatKenyaTime(new Date(signal.startTime))} EAT\n`;
    message += `⏰ <b>Kenya Time End:</b> ${formatKenyaTime(new Date(signal.endTime))} EAT\n\n`;

    // Trade Levels
    message += `🎯 <b>Entry:</b> ${signal.entry.toFixed(5)}\n`;
    message += `🛑 <b>Stop Loss:</b> ${signal.stopLoss.toFixed(5)}\n`;
    message += `💰 <b>Take Profit:</b> ${signal.takeProfit.toFixed(5)}\n\n`;

    // Confidence
    message += `💪 <b>Confidence:</b> ${signal.confidence}% ${confidenceEmoji}\n`;
    message += `📊 <b>Confluence Score:</b> ${confluenceScore}%\n\n`;

    if (analysis?.technicals) {
      const tech = analysis.technicals;

      message += `━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `📈 <b>TECHNICAL INDICATORS</b>\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

      // RSI & Stochastic
      message += `• <b>RSI:</b> ${tech.rsi.toFixed(1)} (${getRSIStatus(tech.rsi)})\n`;
      message += `• <b>Stochastic K/D:</b> ${tech.stochastic.k.toFixed(1)} / ${tech.stochastic.d.toFixed(1)}\n`;

      // MACD
      const macdDirection = tech.macd.histogram > 0 ? "Bullish" : "Bearish";
      message += `• <b>MACD:</b> ${macdDirection} (Hist: ${tech.macd.histogram.toFixed(5)})\n`;

      // Supertrend
      message += `• <b>Supertrend:</b> ${tech.supertrend.direction}\n`;

      // ADX
      message += `• <b>ADX:</b> ${tech.adx.toFixed(1)} (${tech.adx > 40 ? "Very Strong" : tech.adx > 25 ? "Strong" : "Weak"} Trend)\n`;

      // Bollinger
      const bollingerStatus = getBollingerStatus(tech.bollingerBands.breakout, tech.bollingerBands.percentB);
      message += `• <b>Bollinger:</b> ${bollingerStatus}\n`;

      // SMA Status
      const smaStatus = getSMAStatus(analysis.currentPrice, tech.sma20, tech.sma50, tech.sma200);
      message += `• <b>SMA Trend:</b> ${smaStatus}\n`;

      // Candle Pattern
      const candlePattern = tech.candlePattern ? tech.candlePattern.replace(/_/g, ' ').toUpperCase() : "None";
      message += `• <b>Candle Pattern:</b> ${candlePattern}\n\n`;

      // Risk Warnings
      if (tech.rsi > 90 || tech.stochastic.k > 90 || tech.stochastic.d > 90) {
        message += `⚠️ <b>CAUTION:</b> Extreme overbought - watch for reversal\n`;
      } else if (tech.rsi < 10 || tech.stochastic.k < 10 || tech.stochastic.d < 10) {
        message += `⚠️ <b>CAUTION:</b> Extreme oversold - watch for reversal\n`;
      }

      if (tech.candlePattern === "doji" || tech.candlePattern === "spinning_top") {
        message += `⚠️ <b>NOTE:</b> Indecision pattern - entry timing critical\n`;
      }
    }

    // Session Info
    message += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `🌍 <b>SESSION INFO</b>\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `• <b>Session:</b> ${session}\n`;
    message += `• <b>Hot Zone:</b> ${isHotZone ? "YES ✅" : "NO ⚠️"}\n`;
    message += `• <b>Mode:</b> ${session === "AFTERNOON" ? "STRICT (85%+ required)" : "Standard"}\n\n`;

    // Trading Rules
    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📌 <b>TRADING RULES</b>\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `✅ FIXED STAKE ONLY (No Martingale)\n`;
    message += `✅ M5 TIMEFRAME ONLY\n`;
    message += `✅ KENYA TIME (EAT, UTC+3)\n`;
    message += `✅ Confluence-based scoring\n`;
    message += `✅ Session risk filtering\n`;

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