import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Signal } from "@/lib/constants";
import { format } from "date-fns";
import { ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";

interface RecentSignalsProps {
  signals: Signal[];
}

export function RecentSignals({ signals }: RecentSignalsProps) {
  return (
    <Card className="h-full border-border/50 bg-card/50 glass-panel">
      <CardHeader>
        <CardTitle className="text-sm font-mono text-muted-foreground">RECENT SIGNALS</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/50">
          {signals.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm font-mono">
              No signals generated yet.
            </div>
          ) : (
            signals.map((signal) => (
              <div key={signal.id} className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${signal.type === "CALL" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                    {signal.type === "CALL" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="font-bold font-mono text-sm">{signal.pair}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{format(signal.timestamp, "HH:mm")}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {signal.startTime} - {signal.endTime}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold font-mono text-sm ${signal.type === "CALL" ? "text-emerald-400" : "text-rose-400"}`}>
                    {signal.type}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {signal.confidence}% Prob.
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
