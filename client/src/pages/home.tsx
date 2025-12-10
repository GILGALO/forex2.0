import { useState, useEffect } from "react";
import { type Signal } from "@/lib/constants";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { Activity, Wifi, TrendingUp, Zap, BarChart3, Target, TrendingDown, Award, Clock, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const MarketTicker = lazy(() => import("@/components/market-ticker"));
const SignalGenerator = lazy(() => import("@/components/signal-generator"));
const RecentSignals = lazy(() => import("@/components/recent-signals"));
const TradingChart = lazy(() => import("@/components/trading-chart"));


export default function Home() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [activePair, setActivePair] = useState("EUR/USD");
  const { toast } = useToast();

  const [currentDate, setCurrentDate] = useState(new Date());

  // Calculate stats
  const totalSignals = signals.length;
  const wonSignals = signals.filter(s => s.status === 'won').length;
  const lostSignals = signals.filter(s => s.status === 'lost').length;
  const activeSignals = signals.filter(s => s.status === 'active').length;
  const winRate = totalSignals > 0 ? ((wonSignals / (wonSignals + lostSignals)) * 100).toFixed(1) : '0.0';
  const avgConfidence = totalSignals > 0 ? (signals.reduce((acc, s) => acc + s.confidence, 0) / totalSignals).toFixed(1) : '0.0';

  useEffect(() => {
    const dateInterval = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);

    return () => clearInterval(dateInterval);
  }, []);

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
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-20 left-20 w-[400px] h-[400px] bg-emerald-500/15 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute top-1/3 right-20 w-[350px] h-[350px] bg-cyan-500/15 rounded-full blur-[90px] animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-20 left-1/3 w-[450px] h-[450px] bg-blue-500/10 rounded-full blur-[110px] animate-float" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-emerald-500/8 via-cyan-500/8 to-blue-500/8 rounded-full blur-[130px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="mb-8">
        <Suspense fallback={<Skeleton className="h-16 w-full" />}>
          <MarketTicker />
        </Suspense>
      </div>

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
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ duration: 0.5, type: "spring" }}
                className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center bg-gradient-to-br from-emerald-500/20 via-cyan-500/20 to-blue-500/20 border-2 border-emerald-400/60 rounded-2xl shadow-xl relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/40 via-cyan-500/30 to-blue-500/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <TrendingUp className="w-9 h-9 md:w-11 md:h-11 text-emerald-400 relative z-10" />
              </motion.div>

              <div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-1">
                  <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">GILGALO</span>
                  <span className="text-white ml-2">TRADING</span>
                </h1>
                <p className="text-xs md:text-sm text-emerald-400/80 font-semibold tracking-wider uppercase flex items-center gap-2">
                  <Activity className="w-3 h-3 text-emerald-400" />
                  <span>Professional Signal Intelligence</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <motion.div 
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3, type: "spring", bounce: 0.6 }}
                className="glass-panel px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-3 border border-emerald-400/30 hover:border-emerald-400/50 transition-all duration-300"
              >
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-400 tracking-wide">LIVE</span>
                <div className="relative">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                </div>
              </motion.div>

              <motion.div
                initial={{ scale: 0, rotate: 180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.35, type: "spring", bounce: 0.6 }}
                className="glass-panel px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 border border-primary/30"
              >
                <Calendar className="w-4 h-4 text-cyan-400" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground font-medium">
                    {currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <span className="text-xs font-bold text-cyan-400">
                    {currentDate.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </motion.div>

              <motion.div
                initial={{ scale: 0, rotate: 180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.4, type: "spring", bounce: 0.6 }}
                className="glass-panel px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-3 border border-primary/30"
              >
                <BarChart3 className="w-4 h-4 text-primary" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground font-medium uppercase">Signals</span>
                  <span className="text-base font-bold text-primary">{totalSignals}</span>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Stats Dashboard */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-8"
          >
            <Card className="glass-panel border-emerald-500/30 overflow-hidden group hover:border-emerald-500/60 transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Target className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs text-muted-foreground font-semibold uppercase">Active</span>
                </div>
                <div className="text-2xl font-black text-emerald-400">{activeSignals}</div>
                <div className="text-xs text-muted-foreground mt-1">Running now</div>
              </CardContent>
            </Card>

            <Card className="glass-panel border-emerald-500/30 overflow-hidden group hover:border-emerald-500/60 transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs text-muted-foreground font-semibold uppercase">Won</span>
                </div>
                <div className="text-2xl font-black text-emerald-400">{wonSignals}</div>
                <div className="text-xs text-muted-foreground mt-1">Successful</div>
              </CardContent>
            </Card>

            <Card className="glass-panel border-rose-500/30 overflow-hidden group hover:border-rose-500/60 transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <TrendingDown className="w-5 h-5 text-rose-400" />
                  <span className="text-xs text-muted-foreground font-semibold uppercase">Lost</span>
                </div>
                <div className="text-2xl font-black text-rose-400">{lostSignals}</div>
                <div className="text-xs text-muted-foreground mt-1">Unsuccessful</div>
              </CardContent>
            </Card>

            <Card className="glass-panel border-cyan-500/30 overflow-hidden group hover:border-cyan-500/60 transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Award className="w-5 h-5 text-cyan-400" />
                  <span className="text-xs text-muted-foreground font-semibold uppercase">Win Rate</span>
                </div>
                <div className="text-2xl font-black text-cyan-400">{winRate}%</div>
                <div className="text-xs text-muted-foreground mt-1">Success ratio</div>
              </CardContent>
            </Card>

            <Card className="glass-panel border-blue-500/30 overflow-hidden group hover:border-blue-500/60 transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Zap className="w-5 h-5 text-blue-400" />
                  <span className="text-xs text-muted-foreground font-semibold uppercase">Avg. Conf.</span>
                </div>
                <div className="text-2xl font-black text-blue-400">{avgConfidence}%</div>
                <div className="text-xs text-muted-foreground mt-1">Average</div>
              </CardContent>
            </Card>

            <Card className="glass-panel border-primary/30 overflow-hidden group hover:border-primary/60 transition-all duration-300">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <span className="text-xs text-muted-foreground font-semibold uppercase">Total</span>
                </div>
                <div className="text-2xl font-black text-primary">{totalSignals}</div>
                <div className="text-xs text-muted-foreground mt-1">All signals</div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap gap-3 mt-6"
          >
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSignals([])}
              className="glass-panel border-rose-500/30 hover:border-rose-500/60 text-rose-400 hover:text-rose-300"
            >
              <Activity className="w-4 h-4 mr-2" />
              Clear History
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="glass-panel border-cyan-500/30 hover:border-cyan-500/60 text-cyan-400 hover:text-cyan-300"
            >
              <Clock className="w-4 h-4 mr-2" />
              View Analytics
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="glass-panel border-emerald-500/30 hover:border-emerald-500/60 text-emerald-400 hover:text-emerald-300"
            >
              <Target className="w-4 h-4 mr-2" />
              Export Data
            </Button>
          </motion.div>
        </motion.header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 md:gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-5 xl:col-span-4 space-y-4 sm:space-y-6"
          >
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <SignalGenerator 
                onSignalGenerated={handleSignalGenerated} 
                onPairChange={setActivePair}
              />
            </Suspense>

            <div className="block lg:hidden">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="h-[350px] sm:h-[400px] md:h-[450px]"
              >
                <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                  <TradingChart pair={activePair} />
                </Suspense>
              </motion.div>
            </div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="max-h-[300px] sm:max-h-[350px] lg:max-h-[400px]"
            >
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <RecentSignals signals={signals} />
              </Suspense>
            </motion.div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="hidden lg:block lg:col-span-7 xl:col-span-8"
          >
            <div className="h-[650px] lg:h-[700px] xl:h-[750px] sticky top-4">
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <TradingChart pair={activePair} />
              </Suspense>
            </div>
          </motion.div>
        </div>
      </main>
      <Toaster />
    </div>
  );
}