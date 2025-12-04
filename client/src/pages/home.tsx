import { useState, useEffect } from "react";
import { MarketTicker } from "@/components/market-ticker";
import { SignalGenerator } from "@/components/signal-generator";
import { TradingChart } from "@/components/trading-chart";
import { RecentSignals } from "@/components/recent-signals";
import { type Signal } from "@/lib/constants";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [activePair, setActivePair] = useState("EUR/USD");
  const { toast } = useToast();

  // Auto-resolve signals effect
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentTimeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

      setSignals(prevSignals => 
        prevSignals.map(signal => {
          if (signal.status !== 'active') return signal;

          // Simple check: if current time > endTime, resolve it
          // Note: In a real app, we'd compare timestamps. Here we rely on the string format HH:mm
          // To be safe, we can also use the creation timestamp + duration
          
          // Parse HH:mm
          const [endH, endM] = signal.endTime.split(':').map(Number);
          const [currH, currM] = currentTimeStr.split(':').map(Number);
          
          const endMinutes = endH * 60 + endM;
          const currMinutes = currH * 60 + currM;
          
          // Account for midnight wrap
          const isExpired = currMinutes >= endMinutes || (currMinutes < 100 && endMinutes > 1300); // simple wrap check

          if (isExpired) {
            // Random win/loss for simulation
            return {
              ...signal,
              status: Math.random() > 0.3 ? 'won' : 'lost'
            };
          }
          return signal;
        })
      );
    }, 10000); // Check every 10 seconds

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
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      <MarketTicker />
      
      <main className="container mx-auto p-4 md:p-8 space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-primary/20 pb-6 relative">
          <div className="absolute -bottom-[1px] left-0 w-1/3 h-[1px] bg-gradient-to-r from-primary to-transparent" />
          <div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-secondary drop-shadow-[0_0_10px_rgba(0,255,255,0.3)]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              POCKET<span className="text-white">TRADE</span>MASTER
            </h1>
            <p className="text-primary/80 font-mono text-sm mt-2 tracking-[0.2em] uppercase flex items-center gap-2">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              AI-Powered Neural Network V2.0
            </p>
          </div>
          <div className="flex items-center gap-4 bg-card/80 backdrop-blur border border-primary/30 p-2 px-4 rounded-none tech-border">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">System Status</span>
              <span className="text-xs font-mono text-emerald-400 font-bold animate-pulse">OPERATIONAL</span>
            </div>
            <div className="h-8 w-[1px] bg-primary/20" />
            <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Controls */}
          <div className="lg:col-span-4 space-y-6">
            <SignalGenerator 
              onSignalGenerated={handleSignalGenerated} 
              onPairChange={setActivePair}
            />
            <div className="hidden lg:block h-[400px]">
              <RecentSignals signals={signals} />
            </div>
          </div>

          {/* Right Column: Charts */}
          <div className="lg:col-span-8 space-y-6 h-[500px] lg:h-[800px] flex flex-col">
            <div className="flex-1 min-h-0">
              <TradingChart pair={activePair} />
            </div>
            <div className="lg:hidden">
              <RecentSignals signals={signals} />
            </div>
          </div>
        </div>
      </main>
      <Toaster />
    </div>
  );
}
