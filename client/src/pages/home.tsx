
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
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
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
                whileHover={{ scale: 1.1, rotate: 360 }}
                transition={{ duration: 0.6 }}
                className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/40 rounded-2xl shadow-2xl relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Activity className="w-7 h-7 md:w-8 md:h-8 text-primary relative z-10" />
              </motion.div>
              
              <div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight">
                  <span className="gradient-text">POCKET</span>
                  <span className="text-white ml-1">TRADE</span>
                </h1>
                <p className="text-xs text-muted-foreground font-mono tracking-widest uppercase mt-1 flex items-center gap-2">
                  <Zap className="w-3 h-3 text-primary" />
                  Advanced Signal Intelligence
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
                className="glass-panel px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 group hover:bg-primary/10 transition-all duration-300"
              >
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-mono text-emerald-400 font-bold tracking-wide">LIVE</span>
                <div className="relative">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                </div>
              </motion.div>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: "spring" }}
                className="glass-panel px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3"
              >
                <BarChart3 className="w-4 h-4 text-primary" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Signals</span>
                  <span className="text-sm font-bold text-primary">{signals.length}</span>
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
