
export const FOREX_PAIRS = [
  "EUR/USD", "GBP/USD", "USD/JPY", "USD/CHF", 
  "AUD/USD", "USD/CAD", "NZD/USD", "EUR/GBP",
  "EUR/JPY", "GBP/JPY", "AUD/JPY", "EUR/AUD"
] as const;

export const TIMEFRAMES = [
  "M1", "M5", "M15", "M30", "H1", "H4"
] as const;

export type SignalType = "CALL" | "PUT";

export interface Signal {
  id: string;
  pair: string;
  timeframe: string;
  type: SignalType;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  timestamp: number;
  startTime: string;
  endTime: string;
  status: "active" | "expired" | "won" | "lost";
}
