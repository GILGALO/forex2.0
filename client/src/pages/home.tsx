import { useState, useEffect } from "react";
import { MarketTicker } from "@/components/market-ticker";
import { SignalGenerator } from "@/components/signal-generator";
import { TradingChart } from "@/components/trading-chart";
import { RecentSignals } from "@/components/recent-signals";
import { type Signal } from "@/lib/constants";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { Activity, Wifi } from "lucide-react";

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
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      <MarketTicker />
      
      <main className="container mx-auto px-3 py-4 md:px-6 md:py-6 lg:px-8">
        <header className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-primary/20 relative">
            <div className="absolute -bottom-[1px] left-0 w-1/3 h-[2px] bg-gradient-to-r from-primary via-primary/50 to-transparent rounded-full" />
            
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex w-10 h-10 md:w-12 md:h-12 items-center justify-center bg-primary/15 border border-primary/30 rounded-xl shadow-lg">
                <Activity className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight">
                  <span className="text-primary">POCKET</span>
                  <span className="text-white">TRADE</span>
                </h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-mono tracking-widest uppercase">
                  Real-Time Signal Analysis
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-card/80 backdrop-blur border border-primary/30 px-4 py-2.5 rounded-xl shadow-lg">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs sm:text-sm font-mono text-emerald-400 font-semibold">LIVE</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 md:gap-7">
          <div className="xl:col-span-4 space-y-4 md:space-y-6">
            <SignalGenerator 
              onSignalGenerated={handleSignalGenerated} 
              onPairChange={setActivePair}
            />
            
            <div className="block xl:hidden">
              <div className="h-[350px] sm:h-[400px] md:h-[450px]">
                <TradingChart pair={activePair} />
              </div>
            </div>
            
            <div className="max-h-[300px] sm:max-h-[350px] xl:max-h-[400px]">
              <RecentSignals signals={signals} />
            </div>
          </div>

          <div className="hidden xl:block xl:col-span-8">
            <div className="h-[700px] sticky top-4">
              <TradingChart pair={activePair} />
            </div>
          </div>
        </div>
      </main>
      <Toaster />
    </div>
  );
}
