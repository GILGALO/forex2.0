import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FOREX_PAIRS, TIMEFRAMES, type Signal, type SignalType } from "@/lib/constants";
import { Loader2, Target, ShieldAlert, Timer, Zap, Clock, Send } from "lucide-react";
import { format, addMinutes } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface SignalGeneratorProps {
  onSignalGenerated: (signal: Signal) => void;
  onPairChange: (pair: string) => void;
}

const TELEGRAM_BOT_TOKEN = "7867193391:AAGX8056zlFM_8lHY4DXYu3wZnyc-JBDL-o";
const TELEGRAM_CHAT_ID = "-1003204026619";

export function SignalGenerator({ onSignalGenerated, onPairChange }: SignalGeneratorProps) {
  const [selectedPair, setSelectedPair] = useState<string>(FOREX_PAIRS[0]);
  const [timeframe, setTimeframe] = useState<string>(TIMEFRAMES[1]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastSignal, setLastSignal] = useState<Signal | null>(null);
  const [autoMode, setAutoMode] = useState(false);
  const [scanMode, setScanMode] = useState(true); // Default to scanning all pairs in auto
  const [nextSignalTime, setNextSignalTime] = useState<number | null>(null);
  const { toast } = useToast();

  // Send to Telegram function
  const sendToTelegram = async (signal: Signal) => {
    const message = `
🚀 *NEW SIGNAL ALERT ${autoMode ? '(AUTO)' : '(MANUAL)'}* 🚀

📊 *Pair:* ${signal.pair}
⚡ *Type:* ${signal.type === 'CALL' ? '🟢 BUY/CALL' : '🔴 SELL/PUT'}
⏱ *Timeframe:* ${signal.timeframe}
⏰ *Start Time:* ${signal.startTime}
🏁 *End Time:* ${signal.endTime}

🎯 *Entry:* ${signal.entry.toFixed(5)}
🛑 *Stop Loss:* ${signal.stopLoss.toFixed(5)}
💰 *Take Profit:* ${signal.takeProfit.toFixed(5)}

💪 *Confidence:* ${signal.confidence}%
    `.trim();

    try {
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'Markdown',
        }),
      });
      
      if (!response.ok) {
        console.error('Failed to send to Telegram', await response.text());
        toast({
          title: "Telegram Error",
          description: "Signal generated but failed to send to Telegram (Check console)",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Sent to Telegram",
          description: "Signal broadcasted to channel successfully",
        });
      }
    } catch (error) {
      console.error('Telegram network error', error);
      toast({
        title: "Network Error",
        description: "Could not reach Telegram API",
        variant: "destructive"
      });
    }
  };

  const generateSignal = (isAuto = false) => {
    setIsAnalyzing(true);
    setLastSignal(null);

    // For auto mode, analysis is faster
    const delay = isAuto ? 1000 : 2500;

    setTimeout(() => {
      const now = new Date();
      
      // Parse timeframe to minutes
      let intervalMinutes = 5; // Default M5
      if (timeframe.startsWith('M')) {
        intervalMinutes = parseInt(timeframe.substring(1));
      } else if (timeframe.startsWith('H')) {
        intervalMinutes = parseInt(timeframe.substring(1)) * 60;
      }

      // Calculate minimum start time (now + 7 minutes)
      const minStartTime = addMinutes(now, 7);
      
      // Round up to the next candle start
      const intervalMs = intervalMinutes * 60 * 1000;
      const nextCandleTimestamp = Math.ceil(minStartTime.getTime() / intervalMs) * intervalMs;
      const startTimeDate = new Date(nextCandleTimestamp);
      
      // End time is 5 minutes after start time (fixed duration)
      const endTimeDate = addMinutes(startTimeDate, 5);

      const type: SignalType = Math.random() > 0.5 ? "CALL" : "PUT";
      
      // Determine pair: use selected if manual or scanMode off, random if auto and scanMode on
      const currentPair = (isAuto && scanMode) 
        ? FOREX_PAIRS[Math.floor(Math.random() * FOREX_PAIRS.length)]
        : selectedPair;

      // Update selected pair visually if scanning
      if (isAuto && scanMode) {
        setSelectedPair(currentPair);
        onPairChange(currentPair);
      }

      const entry = 1.0850 + (Math.random() * 0.01);
      
      const signal: Signal = {
        id: Math.random().toString(36).substring(7),
        pair: currentPair,
        timeframe: timeframe,
        type: type,
        entry: entry,
        stopLoss: type === "CALL" ? entry - 0.0020 : entry + 0.0020,
        takeProfit: type === "CALL" ? entry + 0.0040 : entry - 0.0040,
        confidence: 85 + Math.floor(Math.random() * 14),
        timestamp: Date.now(),
        startTime: format(startTimeDate, "HH:mm"),
        endTime: format(endTimeDate, "HH:mm"),
        status: "active"
      };

      setLastSignal(signal);
      onSignalGenerated(signal);
      sendToTelegram(signal);
      setIsAnalyzing(false);

      if (isAuto) {
        // Schedule next signal in 7 minutes
        const nextTime = Date.now() + 7 * 60 * 1000;
        setNextSignalTime(nextTime);
      }
    }, delay);
  };

  const handleGenerate = () => generateSignal(false);

  // Auto mode effect
  useEffect(() => {
    if (autoMode) {
      // Start immediately if just turned on
      if (!nextSignalTime) {
        generateSignal(true);
        setNextSignalTime(Date.now() + 7 * 60 * 1000);
      }

      const checkInterval = setInterval(() => {
        if (nextSignalTime && Date.now() >= nextSignalTime && !isAnalyzing) {
          generateSignal(true);
        }
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

  // Countdown timer component
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
    return <span className="font-mono text-primary">{timeLeft}</span>;
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/30 bg-card/80 glass-panel overflow-hidden relative rounded-none">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />
        <div className="scan-line opacity-20" />
        
        <CardContent className="p-6 space-y-6 relative z-20">
          <div className="flex items-center justify-between bg-black/40 p-4 border border-primary/20 backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center gap-3 relative z-10">
              <div className={`p-2 rounded bg-background border border-border ${autoMode ? "border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)]" : ""}`}>
                <Zap className={`w-5 h-5 ${autoMode ? "text-yellow-400 fill-yellow-400 animate-pulse" : "text-muted-foreground"}`} />
              </div>
              <div>
                <Label htmlFor="auto-mode" className="font-mono text-sm cursor-pointer font-bold tracking-wider text-foreground">AUTO-TRADE BOT</Label>
                <div className="text-[10px] text-muted-foreground font-mono">AI AUTOMATION PROTOCOL</div>
              </div>
            </div>
            <div className="flex items-center gap-4 relative z-10">
              {autoMode && (
                <div className="bg-black/50 px-3 py-1 border border-primary/30 text-primary font-mono text-sm shadow-[0_0_10px_rgba(0,255,255,0.1)]">
                  <Countdown />
                </div>
              )}
              <Switch id="auto-mode" checked={autoMode} onCheckedChange={setAutoMode} className="data-[state=checked]:bg-primary data-[state=checked]:shadow-[0_0_15px_cyan]" />
            </div>
          </div>
          
          {autoMode && (
             <div className="flex items-center justify-between pl-4 border-l-2 border-primary/50 ml-2 py-1">
                <Label htmlFor="scan-mode" className="font-mono text-xs text-primary/80 cursor-pointer tracking-widest">SCAN ALL PAIRS</Label>
                <Switch id="scan-mode" checked={scanMode} onCheckedChange={setScanMode} className="scale-75 origin-right data-[state=checked]:bg-secondary" />
              </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-primary/60 uppercase tracking-widest">Asset Pair</label>
              <Select value={selectedPair} onValueChange={handlePairChange}>
                <SelectTrigger className="bg-black/40 border-primary/30 font-mono h-12 focus:ring-primary/50 focus:border-primary transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-primary/30">
                  {FOREX_PAIRS.map(pair => (
                    <SelectItem key={pair} value={pair} className="font-mono focus:bg-primary/20 focus:text-primary">{pair}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-mono text-primary/60 uppercase tracking-widest">Timeframe</label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="bg-black/40 border-primary/30 font-mono h-12 focus:ring-primary/50 focus:border-primary transition-all">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-primary/30">
                  {TIMEFRAMES.map(tf => (
                    <SelectItem key={tf} value={tf} className="font-mono focus:bg-primary/20 focus:text-primary">{tf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            className="w-full h-14 text-lg font-bold relative overflow-hidden group border border-primary/50 bg-primary/10 hover:bg-primary/20 text-primary transition-all shadow-[0_0_20px_rgba(0,255,255,0.1)] hover:shadow-[0_0_30px_rgba(0,255,255,0.3)] rounded-none" 
            onClick={handleGenerate}
            disabled={isAnalyzing || autoMode}
          >
            {isAnalyzing ? (
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="tracking-widest">ANALYZING NEURAL NET...</span>
              </div>
            ) : autoMode ? (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Clock className="h-6 w-6 text-primary animate-pulse" />
                  <div className="absolute inset-0 bg-primary/50 blur-lg animate-pulse" />
                </div>
                <span className="tracking-widest text-primary drop-shadow-[0_0_5px_cyan]">AUTO PILOT ENGAGED</span>
              </div>
            ) : (
              <>
                <span className="relative z-10 tracking-[0.2em] drop-shadow-[0_0_5px_rgba(0,0,0,1)]">INITIALIZE SIGNAL SCAN</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/40 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              </>
            )}
          </Button>
          
          <div className="text-[10px] text-center font-mono text-muted-foreground/50 uppercase tracking-widest mt-4">
            * System running in Simulation Mode. Market data is emulated.
          </div>
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        {lastSignal && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
          >
            <Card className={`border-2 ${lastSignal.type === "CALL" ? "border-emerald-500 bg-emerald-950/30" : "border-rose-500 bg-rose-950/30"} overflow-hidden relative backdrop-blur-xl rounded-none shadow-[0_0_50px_rgba(0,0,0,0.5)]`}>
              {/* Animated scanning line */}
              <motion.div 
                className={`absolute top-0 left-0 w-full h-full bg-gradient-to-b ${lastSignal.type === "CALL" ? "from-emerald-500/10" : "from-rose-500/10"} to-transparent pointer-events-none`}
                animate={{ opacity: [0.3, 0.1, 0.3], backgroundPosition: ["0% 0%", "0% 100%"] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              
              {/* Corner Accents */}
              <div className={`absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 ${lastSignal.type === "CALL" ? "border-emerald-500" : "border-rose-500"}`} />
              <div className={`absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 ${lastSignal.type === "CALL" ? "border-emerald-500" : "border-rose-500"}`} />
              <div className={`absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 ${lastSignal.type === "CALL" ? "border-emerald-500" : "border-rose-500"}`} />
              <div className={`absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 ${lastSignal.type === "CALL" ? "border-emerald-500" : "border-rose-500"}`} />

              <CardContent className="p-6 relative z-10">
                <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-[10px] font-mono text-muted-foreground mb-1 uppercase tracking-[0.2em]">Predicted Direction</h3>
                    <div className="flex items-baseline gap-3">
                      <span className={`text-5xl font-black tracking-tighter ${lastSignal.type === "CALL" ? "text-emerald-500 neon-text-green" : "text-rose-500 neon-text-red"}`}>
                        {lastSignal.type}
                      </span>
                      <span className="text-2xl font-mono font-bold text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
                        {lastSignal.pair}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-xs font-mono bg-black/30 p-2 rounded border border-white/5 inline-flex">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-primary" />
                        <span className="text-white">{lastSignal.startTime}</span>
                      </div>
                      <div className="w-4 h-[1px] bg-white/20" />
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-3 h-3 text-primary" />
                        <span className="text-white">{lastSignal.endTime}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-mono text-muted-foreground mb-1 uppercase tracking-widest">Probability</div>
                    <div className="text-3xl font-bold text-primary neon-text-cyan">{lastSignal.confidence}%</div>
                    <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-emerald-400 uppercase tracking-wider">
                      <Send className="w-3 h-3" /> Telegram Sent
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-black/40 border border-white/5 text-center relative group overflow-hidden">
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Entry</div>
                    <div className="font-mono font-bold text-lg text-white">{lastSignal.entry.toFixed(5)}</div>
                  </div>
                  <div className="p-3 bg-black/40 border border-rose-500/20 text-center relative group overflow-hidden">
                    <div className="absolute inset-0 bg-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="text-[10px] text-rose-400 uppercase tracking-widest mb-1">Stop Loss</div>
                    <div className="font-mono font-bold text-lg text-rose-400">{lastSignal.stopLoss.toFixed(5)}</div>
                  </div>
                  <div className="p-3 bg-black/40 border border-emerald-500/20 text-center relative group overflow-hidden">
                    <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="text-[10px] text-emerald-400 uppercase tracking-widest mb-1">Take Profit</div>
                    <div className="font-mono font-bold text-lg text-emerald-400">{lastSignal.takeProfit.toFixed(5)}</div>
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
