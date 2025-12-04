import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Signal } from "@/lib/constants";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle, Timer } from "lucide-react";

interface RecentSignalsProps {
  signals: Signal[];
}

export function RecentSignals({ signals }: RecentSignalsProps) {
  const getStatusIcon = (status: Signal["status"]) => {
    switch (status) {
      case "won":
        return <CheckCircle2 className="w-3 h-3 text-emerald-500" />;
      case "lost":
        return <XCircle className="w-3 h-3 text-rose-500" />;
      default:
        return <Timer className="w-3 h-3 text-primary animate-pulse" />;
    }
  };

  return (
    <Card className="h-full border-border/30 bg-card/95 backdrop-blur-sm overflow-hidden flex flex-col shadow-lg">
      <CardHeader className="py-4 px-5 border-b border-border/30 shrink-0 bg-background/20">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" />
          Recent Signals
          {signals.length > 0 && (
            <span className="ml-auto text-primary font-mono">{signals.length}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-y-auto">
        {signals.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">
            <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-muted/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-muted-foreground/50" />
            </div>
            No signals generated yet
          </div>
        ) : (
          <div className="divide-y divide-border/20">
            {signals.map((signal) => (
              <div 
                key={signal.id} 
                className="flex items-center gap-3 p-4 hover:bg-muted/20 transition-all duration-200 rounded-lg mx-2 my-1"
              >
                <div className={`shrink-0 p-2.5 rounded-xl ${signal.type === "CALL" ? "bg-emerald-500/15 border border-emerald-500/20" : "bg-rose-500/15 border border-rose-500/20"} shadow-sm`}>
                  {signal.type === "CALL" ? (
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-rose-500" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{signal.pair}</span>
                    <span className={`text-xs font-semibold ${signal.type === "CALL" ? "text-emerald-500" : "text-rose-500"}`}>
                      {signal.type}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <span>{format(signal.timestamp, "HH:mm")}</span>
                    <span className="text-border">•</span>
                    <span>{signal.startTime}-{signal.endTime}</span>
                    {signal.martingale && (
                      <>
                        <span className="text-border">•</span>
                        <span className="text-primary font-semibold">
                          M{signal.martingale.entryNumber}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="shrink-0 text-right flex items-center gap-2">
                  <div>
                    <div className="text-sm font-bold">{signal.confidence}%</div>
                    <div className="text-[10px] text-muted-foreground">{signal.timeframe}</div>
                  </div>
                  {getStatusIcon(signal.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
