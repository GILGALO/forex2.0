
import { useState, useEffect } from "react";
import { MarketTicker } from "@/components/market-ticker";
import { SignalGenerator } from "@/components/signal-generator";
import { TradingChart } from "@/components/trading-chart";
import { RecentSignals } from "@/components/recent-signals";
import { type Signal } from "@/lib/constants";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { Activity, Wifi, TrendingUp, Zap, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [activePair, setActivePair] = useState("EUR/USD");
  const { toast } = useToast();

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentTimeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

      setSignals(prevSignals => 
        prevSignals.map(signal => {
          if (signal.status !== 'active') return signal;
          
          const [endH, endM] = signal.endTime.split(':').map(Number);
          const [currH, currM] = currentTimeStr.split(':').map(Number);
          
          const endMinutes = endH * 60 + endM;
          const currMinutes = currH * 60 + currM;
          
          const isExpired = currMinutes >= endMinutes || (currMinutes < 100 && endMinutes > 1300);

          if (isExpired) {
            return {
              ...signal,
              status: Math.random() > 0.3 ? 'won' : 'lost'
            };
          }
          return signal;
        })
      );
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleSignalGenerated = (signal: Signal) => {
    setSignals(prev => [signal, ...prev]);
    toast({
      title: "New Signal Generated",
      description: `${signal.type} ${signal.pair} @ ${signal.entry.toFixed(5)}`,
      duration: 5000,
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 relative overflow-hidden">
      {/* Cyberpunk Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none cyber-grid opacity-30">
        <div className="absolute top-10 left-10 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-20 left-1/3 w-[600px] h-[600px] bg-primary/15 rounded-full blur-[140px] animate-float" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-full blur-[160px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <MarketTicker />
      
      <main className="container mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8 relative z-10">
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 md:mb-10"
        >
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-primary/20 relative">
            <div className="absolute -bottom-[1px] left-0 w-full h-[2px] bg-gradient-to-r from-primary via-primary/50 to-transparent" />
            
            <div className="flex items-center gap-4">
              <motion.div 
                whileHover={{ scale: 1.15, rotate: 360 }}
                transition={{ duration: 0.8, type: "spring" }}
                className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center bg-gradient-to-br from-primary/30 via-accent/20 to-primary/30 border-2 border-primary/60 rounded-3xl shadow-2xl relative overflow-hidden group neon-glow"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-accent/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-gradient-shift" />
                <Activity className="w-9 h-9 md:w-11 md:h-11 text-primary relative z-10 drop-shadow-[0_0_10px_rgba(190,24,255,0.8)]" />
              </motion.div>
              
              <div>
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-1">
                  <span className="gradient-text neon-text">POCKET</span>
                  <span className="text-white ml-2 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">TRADE</span>
                </h1>
                <p className="text-xs md:text-sm text-primary/80 font-mono tracking-[0.3em] uppercase flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary animate-pulse" />
                  <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-bold">AI-POWERED SIGNAL INTELLIGENCE</span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <motion.div 
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3, type: "spring", bounce: 0.6 }}
                className="glass-panel px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 group hover:neon-glow transition-all duration-500 border-2 border-emerald-500/40"
              >
                <Wifi className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                <span className="text-sm font-mono text-emerald-400 font-black tracking-wider neon-text">LIVE</span>
                <div className="relative">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                  <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                </div>
              </motion.div>

              <motion.div
                initial={{ scale: 0, rotate: 180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.4, type: "spring", bounce: 0.6 }}
                className="glass-panel px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border-2 border-primary/40 cyan-glow"
              >
                <BarChart3 className="w-5 h-5 text-primary drop-shadow-[0_0_10px_rgba(190,24,255,0.8)]" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Signals</span>
                  <span className="text-lg font-black text-primary neon-text">{signals.length}</span>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="xl:col-span-4 space-y-6"
          >
            <SignalGenerator 
              onSignalGenerated={handleSignalGenerated} 
              onPairChange={setActivePair}
            />
            
            <div className="block xl:hidden">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="h-[400px] sm:h-[450px] md:h-[500px]"
              >
                <TradingChart pair={activePair} />
              </motion.div>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="max-h-[350px] sm:max-h-[400px] xl:max-h-[450px]"
            >
              <RecentSignals signals={signals} />
            </motion.div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="hidden xl:block xl:col-span-8"
          >
            <div className="h-[750px] sticky top-4">
              <TradingChart pair={activePair} />
            </div>
          </motion.div>
        </div>
      </main>
      <Toaster />
    </div>
  );
}
