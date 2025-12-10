import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FOREX_PAIRS, TIMEFRAMES, type Signal, getCurrentSession } from "@/lib/constants";
import { Loader2, Zap, Clock, Send, Activity, TrendingUp, TrendingDown, Target, Globe } from "lucide-react";
import { format, addMinutes } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface SignalGeneratorProps {
  onSignalGenerated: (signal: Signal) => void;
  onPairChange: (pair: string) => void;
}

interface TechnicalAnalysis {
  rsi: number;
  macd: { macdLine: number; signalLine: number; histogram: number };
  sma20: number;
  sma50: number;
  trend: "BULLISH" | "BEARISH" | "NEUTRAL";
  momentum: "STRONG" | "MODERATE" | "WEAK";
}

interface SignalAnalysisResponse {
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

export function SignalGenerator({ onSignalGenerated, onPairChange }: SignalGeneratorProps) {
  const [currentSession, setCurrentSession] = useState(getCurrentSession());
  const [availablePairs, setAvailablePairs] = useState<string[]>(currentSession.pairs);
  const [selectedPair, setSelectedPair] = useState<string>(currentSession.pairs[0]);
  const [timeframe, setTimeframe] = useState<string>(TIMEFRAMES[1]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastSignal, setLastSignal] = useState<Signal | null>(null);
  const [lastAnalysis, setLastAnalysis] = useState<SignalAnalysisResponse | null>(null);
  const [autoMode, setAutoMode] = useState(false);
  const [scanMode, setScanMode] = useState(true);
  const [manualMode, setManualMode] = useState(true); // true = manual pair selection, false = auto-scan best pair
  const [nextSignalTime, setNextSignalTime] = useState<number | null>(null);
  const [telegramConfigured, setTelegramConfigured] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/telegram/status')
      .then(res => res.json())
      .then(data => setTelegramConfigured(data.configured))
      .catch(() => setTelegramConfigured(false));
  }, []);

  // Update session and available pairs every minute
  useEffect(() => {
    const updateSession = () => {
      const session = getCurrentSession();
      setCurrentSession(session);
      setAvailablePairs(session.pairs);

      // If current pair is not in new session, switch to first available
      if (!session.pairs.includes(selectedPair)) {
        setSelectedPair(session.pairs[0]);
        onPairChange(session.pairs[0]);
      }
    };

    updateSession();
    const interval = setInterval(updateSession, 300000); // Check every 5 minutes
    return () => clearInterval(interval);
  }, [selectedPair, onPairChange]);

  const sendToTelegram = async (signal: Signal, analysis?: SignalAnalysisResponse) => {
    try {
      const response = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signal, analysis, isAuto: autoMode }),
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: "Telegram", description: "Signal sent successfully" });
      }
    } catch (error) {
      console.error('Telegram send error', error);
    }
  };

  const generateSignal = async (isAuto = false) => {
    setIsAnalyzing(true);
    setLastSignal(null);
    setLastAnalysis(null);

    try {
      let analysisResult: SignalAnalysisResponse;
      let currentPair = selectedPair;

      // Auto mode uses scanMode setting, manual button uses manualMode setting
      const shouldScan = isAuto ? scanMode : !manualMode;

      if (shouldScan) {
        const scanResponse = await fetch('/api/forex/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timeframe }),
        });
        if (!scanResponse.ok) throw new Error('Scan failed');
        const scanData = await scanResponse.json();
        analysisResult = scanData.bestSignal;
        currentPair = analysisResult.pair;
        setSelectedPair(currentPair);
        onPairChange(currentPair);
      } else {
        const response = await fetch('/api/forex/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pair: currentPair, timeframe }),
        });
        if (!response.ok) throw new Error('Signal generation failed');
        analysisResult = await response.json();
      }

      setLastAnalysis(analysisResult);

      const now = new Date();
      let intervalMinutes = 5;
      if (timeframe.startsWith('M')) intervalMinutes = parseInt(timeframe.substring(1));
      else if (timeframe.startsWith('H')) intervalMinutes = parseInt(timeframe.substring(1)) * 60;

      const minStartTime = addMinutes(now, 7);
      const intervalMs = intervalMinutes * 60 * 1000;
      const nextCandleTimestamp = Math.ceil(minStartTime.getTime() / intervalMs) * intervalMs;

      // Convert UTC to Kenya Time (UTC+3) by adding 3 hours
      const KENYA_OFFSET_MS = 3 * 60 * 60 * 1000; // +3 hours in milliseconds
      const startTimeDate = new Date(nextCandleTimestamp + KENYA_OFFSET_MS);
      const endTimeDate = addMinutes(startTimeDate, 5);

      // Calculate next entry time for Martingale (next candle)
      const timeframeMinutes = timeframe.startsWith('M') 
        ? parseInt(timeframe.substring(1)) 
        : parseInt(timeframe.substring(1)) * 60;
      const nextCandleTime = addMinutes(startTimeDate, timeframeMinutes);

      const signal: Signal = {
        id: Math.random().toString(36).substring(7),
        pair: analysisResult.pair,
        timeframe,
        type: analysisResult.signalType,
        entry: analysisResult.entry,
        stopLoss: analysisResult.stopLoss,
        takeProfit: analysisResult.takeProfit,
        confidence: analysisResult.confidence,
        timestamp: Date.now(),
        startTime: format(startTimeDate, "HH:mm"),
        endTime: format(endTimeDate, "HH:mm"),
        status: "active",
        martingale: {
          entryNumber: 1,
          canEnterNext: true,
          nextEntryTime: format(nextCandleTime, "HH:mm")
        }
      };

      setLastSignal(signal);
      onSignalGenerated(signal);
      sendToTelegram(signal, analysisResult);

      if (isAuto) setNextSignalTime(Date.now() + 7 * 60 * 1000);
    } catch (error) {
      console.error('Signal generation error:', error);
      toast({ title: "Error", description: "Analysis failed. Please retry.", variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (autoMode) {
      if (!nextSignalTime) {
        generateSignal(true);
        setNextSignalTime(Date.now() + 7 * 60 * 1000);
      }
      const checkInterval = setInterval(() => {
        if (nextSignalTime && Date.now() >= nextSignalTime && !isAnalyzing) generateSignal(true);
      }, 1000);
      return () => clearInterval(checkInterval);
    } else {
      setNextSignalTime(null);
    }
  }, [autoMode, nextSignalTime, isAnalyzing]);

  const handlePairChange = (val: string) => {
    setSelectedPair(val);
    onPairChange(val);
  };

  const Countdown = () => {
    const [timeLeft, setTimeLeft] = useState("");
    useEffect(() => {
      if (!nextSignalTime) return;
      const interval = setInterval(() => {
        const diff = Math.max(0, nextSignalTime - Date.now());
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
      }, 1000);
      return () => clearInterval(interval);
    }, []);
    if (!nextSignalTime) return null;
    return <span className="font-mono text-sm text-primary font-bold">{timeLeft}</span>;
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-card/90 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between p-4 bg-background/40 rounded-xl border border-border/40 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${autoMode ? "bg-yellow-500/20 border-yellow-500/50" : "bg-muted/50"} border transition-colors`}>
                <Zap className={`w-4 h-4 ${autoMode ? "text-yellow-400" : "text-muted-foreground"}`} />
              </div>
              <div>
                <Label htmlFor="auto-mode" className="text-sm font-semibold cursor-pointer">Auto Mode</Label>
                <p className="text-[10px] text-muted-foreground">Automated signals</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {autoMode && <Countdown />}
              <Switch id="auto-mode" checked={autoMode} onCheckedChange={setAutoMode} />
            </div>
          </div>

          {autoMode && (
            <div className="flex items-center justify-between px-3 py-2 bg-primary/5 rounded border border-primary/20">
              <Label htmlFor="scan-mode" className="text-xs text-primary cursor-pointer">Scan All Pairs</Label>
              <Switch id="scan-mode" checked={scanMode} onCheckedChange={setScanMode} className="scale-90" />
            </div>
          )}

          {!autoMode && (
            <div className="flex items-center justify-between p-4 bg-background/40 rounded-xl border border-border/40 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${!manualMode ? "bg-primary/20 border-primary/50" : "bg-muted/50"} border transition-colors`}>
                  <Target className={`w-4 h-4 ${!manualMode ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <Label htmlFor="signal-mode" className="text-sm font-semibold cursor-pointer">Signal Mode</Label>
                  <p className="text-[10px] text-muted-foreground">{manualMode ? "Manual: Select pair" : "Auto: Best pair"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Manual</span>
                <Switch id="signal-mode" checked={!manualMode} onCheckedChange={(checked) => setManualMode(!checked)} />
                <span className="text-xs text-muted-foreground">Auto</span>
              </div>
            </div>
          )}

          <div className="mb-3 p-2.5 bg-primary/10 rounded-lg border border-primary/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">{currentSession.name} Session</span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {availablePairs.length} pairs active
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Pair</label>
              <Select value={selectedPair} onValueChange={handlePairChange} disabled={!autoMode && !manualMode}>
                <SelectTrigger className="h-11 bg-background/50 border-border/50 font-mono text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availablePairs.map(pair => (
                    <SelectItem key={pair} value={pair} className="font-mono">{pair}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Timeframe</label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="h-11 bg-background/50 border-border/50 font-mono text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEFRAMES.map(tf => (
                    <SelectItem key={tf} value={tf} className="font-mono">{tf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            className="w-full h-12 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => generateSignal(false)}
            disabled={isAnalyzing || autoMode}
          >
            {isAnalyzing ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {manualMode || autoMode ? "Analyzing..." : "Scanning All Pairs..."}
              </span>
            ) : autoMode ? (
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Auto Mode Active
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                {manualMode ? `Generate Signal (${selectedPair})` : "Find Best Signal"}
              </span>
            )}
          </Button>

          <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
            <Activity className="w-3 h-3 text-emerald-500" />
            <span>Live Market Analysis</span>
            {telegramConfigured && (
              <>
                <span className="text-border">|</span>
                <Send className="w-3 h-3 text-primary" />
                <span>Telegram Connected</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        {lastSignal && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Card className={`border-2 overflow-hidden ${lastSignal.type === "CALL" ? "border-emerald-500/50 bg-emerald-950/20" : "border-rose-500/50 bg-rose-950/20"}`}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${lastSignal.type === "CALL" ? "bg-emerald-500/20" : "bg-rose-500/20"}`}>
                      {lastSignal.type === "CALL" ? (
                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-rose-500" />
                      )}
                    </div>
                    <div>
                      <div className={`text-2xl sm:text-3xl font-black ${lastSignal.type === "CALL" ? "text-emerald-500" : "text-rose-500"}`}>
                        {lastSignal.type}
                      </div>
                      <div className="text-sm font-mono text-muted-foreground">{lastSignal.pair}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl sm:text-3xl font-bold text-primary">{lastSignal.confidence}%</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Confidence</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4 text-xs font-mono text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{lastSignal.startTime} - {lastSignal.endTime}</span>
                  <span className="text-border">|</span>
                  <span>{lastSignal.timeframe}</span>
                  {lastSignal.martingale && (
                    <>
                      <span className="text-border">|</span>
                      <span className="text-primary font-semibold">
                        Entry #{lastSignal.martingale.entryNumber}
                      </span>
                      {lastSignal.martingale.canEnterNext && lastSignal.martingale.nextEntryTime && (
                        <>
                          <span className="text-border">|</span>
                          <span className="text-yellow-400">
                            Next: {lastSignal.martingale.nextEntryTime}
                          </span>
                        </>
                      )}
                    </>
                  )}
                  {telegramConfigured && (
                    <>
                      <span className="text-border">|</span>
                      <Send className="w-3 h-3 text-emerald-500" />
                    </>
                  )}
                </div>

                {lastAnalysis && (
                  <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-background/30 rounded-lg text-center">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase mb-1">RSI</div>
                      <div className={`font-mono font-semibold ${lastAnalysis.technicals.rsi < 30 ? "text-emerald-400" : lastAnalysis.technicals.rsi > 70 ? "text-rose-400" : "text-foreground"}`}>
                        {lastAnalysis.technicals.rsi.toFixed(1)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase mb-1">Trend</div>
                      <div className={`font-semibold text-sm ${lastAnalysis.technicals.trend === "BULLISH" ? "text-emerald-400" : lastAnalysis.technicals.trend === "BEARISH" ? "text-rose-400" : "text-yellow-400"}`}>
                        {lastAnalysis.technicals.trend}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase mb-1">Momentum</div>
                      <div className="font-semibold text-sm">{lastAnalysis.technicals.momentum}</div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="p-3 bg-background/40 rounded-lg text-center">
                    <div className="text-[10px] text-muted-foreground uppercase mb-1">Entry</div>
                    <div className="font-mono font-bold text-sm sm:text-base">{lastSignal.entry.toFixed(5)}</div>
                  </div>
                  <div className="p-3 bg-rose-500/10 rounded-lg text-center border border-rose-500/20">
                    <div className="text-[10px] text-rose-400 uppercase mb-1">Stop Loss</div>
                    <div className="font-mono font-bold text-sm sm:text-base text-rose-400">{lastSignal.stopLoss.toFixed(5)}</div>
                  </div>
                  <div className="p-3 bg-emerald-500/10 rounded-lg text-center border border-emerald-500/20">
                    <div className="text-[10px] text-emerald-400 uppercase mb-1">Take Profit</div>
                    <div className="font-mono font-bold text-sm sm:text-base text-emerald-400">{lastSignal.takeProfit.toFixed(5)}</div>
                  </div>
                </div>

                {lastAnalysis && lastAnalysis.reasoning.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/30">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Analysis</div>
                    <div className="space-y-1.5">
                      {lastAnalysis.reasoning.slice(0, 3).map((reason, i) => (
                        <div key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mt-3 border-yellow-500/30 bg-yellow-950/10">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <div className="p-1.5 rounded bg-yellow-500/20 mt-0.5">
                    <Target className="w-3 h-3 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-semibold text-yellow-400 mb-1">Martingale System Active</h4>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      • <strong>Entry #{lastSignal.martingale?.entryNumber || 1}:</strong> Enter at {lastSignal.startTime}<br/>
                      {lastSignal.martingale?.canEnterNext && lastSignal.martingale.nextEntryTime && (
                        <>• If this loses, enter <strong>next candle at {lastSignal.martingale.nextEntryTime}</strong><br/></>
                      )}
                      • Maximum 3 consecutive entries per signal<br/>
                      • Same direction ({lastSignal.type}) for all entries
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}