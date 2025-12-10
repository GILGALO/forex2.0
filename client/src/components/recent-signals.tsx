
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Signal } from "@/lib/constants";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle, Timer, Activity } from "lucide-react";
import { motion } from "framer-motion";

interface RecentSignalsProps {
  signals: Signal[];
}

export function RecentSignals({ signals }: RecentSignalsProps) {
  const getStatusIcon = (status: Signal["status"]) => {
    switch (status) {
      case "won":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "lost":
        return <XCircle className="w-4 h-4 text-rose-500" />;
      default:
        return <Timer className="w-4 h-4 text-primary animate-pulse" />;
    }
  };

  return (
    <Card className="h-full glass-panel border-primary/30 overflow-hidden flex flex-col shadow-2xl">
      <CardHeader className="py-4 px-5 border-b border-primary/30 shrink-0 bg-gradient-to-r from-primary/10 to-transparent">
        <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Recent Signals
          {signals.length > 0 && (
            <span className="ml-auto text-primary font-mono font-black text-sm bg-primary/20 px-2 py-1 rounded-full">
              {signals.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-y-auto">
        {signals.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl glass-panel flex items-center justify-center border border-primary/20">
              <Clock className="w-7 h-7 text-primary/50" />
            </div>
            <p className="text-sm font-semibold">No signals generated yet</p>
            <p className="text-xs mt-1">Your signals will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-border/20 p-2">
            {signals.map((signal, index) => (
              <motion.div
                key={signal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 p-3 hover:bg-primary/5 transition-all duration-300 rounded-xl my-1 glass-panel border border-transparent hover:border-primary/30 group"
              >
                <div className={`shrink-0 p-3 rounded-xl shadow-lg ${signal.type === "CALL" ? "bg-emerald-500/20 border-2 border-emerald-500/30" : "bg-rose-500/20 border-2 border-rose-500/30"} group-hover:scale-110 transition-transform duration-300`}>
                  {signal.type === "CALL" ? (
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-rose-500" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm">{signal.pair}</span>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${signal.type === "CALL" ? "text-emerald-500 bg-emerald-500/20" : "text-rose-500 bg-rose-500/20"}`}>
                      {signal.type}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 font-medium">
                    <span>{format(signal.timestamp, "HH:mm")}</span>
                    <span className="text-border">•</span>
                    <span>{signal.startTime}-{signal.endTime}</span>
                    {signal.martingale && (
                      <>
                        <span className="text-border">•</span>
                        <span className="text-primary font-bold bg-primary/20 px-1.5 py-0.5 rounded">
                          M{signal.martingale.entryNumber}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="shrink-0 text-right flex items-center gap-3">
                  <div className="glass-panel px-3 py-2 rounded-xl border border-primary/20">
                    <div className="text-sm font-black text-primary">{signal.confidence}%</div>
                    <div className="text-xs text-muted-foreground font-semibold">{signal.timeframe}</div>
                  </div>
                  <motion.div whileHover={{ scale: 1.2 }}>
                    {getStatusIcon(signal.status)}
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
