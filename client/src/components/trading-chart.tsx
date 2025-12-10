
import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Activity } from "lucide-react";

interface TradingChartProps {
  pair: string;
}

function TradingChart({ pair }: TradingChartProps) {
  const symbol = pair.replace("/", "");

  return (
    <Card className="glass-panel border-primary/40 h-full rounded-2xl shadow-2xl overflow-hidden flex flex-col relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      <CardHeader className="border-b border-primary/30 py-4 bg-gradient-to-r from-primary/10 via-transparent to-accent/10 backdrop-blur-xl z-10 relative">
        <div className="flex justify-between items-center">
          <CardTitle className="font-mono text-sm font-bold flex items-center gap-3 uppercase tracking-widest">
            <div className="flex items-center gap-2 glass-panel px-3 py-2 rounded-xl border border-primary/30">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="gradient-text">LIVE MARKET</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <span className="text-primary font-black">{pair}</span>
            </div>
          </CardTitle>
          <div className="flex gap-1.5">
            {[1,2,3].map(i => (
              <div key={i} className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 relative bg-gradient-to-br from-black via-background to-black">
        <div className="absolute inset-0">
          <AdvancedRealTimeChart 
            theme="dark" 
            autosize
            symbol={`FX:${symbol}`} 
            interval="5" 
            timezone="Etc/UTC" 
            style="1" 
            locale="en" 
            toolbar_bg="#0a0e1a" 
            hide_side_toolbar={false} 
            allow_symbol_change={true} 
            save_image={false} 
            container_id="tradingview_chart"
            hide_top_toolbar={false}
            copyrightStyles={{ parent: { fontSize: '0px' }, link: { display: 'none' }, span: { display: 'none' } }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default TradingChart;
