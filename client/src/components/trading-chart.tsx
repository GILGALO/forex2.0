import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TradingChartProps {
  pair: string;
}

export function TradingChart({ pair }: TradingChartProps) {
  // Convert pair format "EUR/USD" -> "EURUSD" for TradingView
  const symbol = pair.replace("/", "");

  return (
    <Card className="border-primary/30 bg-card/80 glass-panel h-full rounded-none shadow-[0_0_30px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col">
      <CardHeader className="border-b border-white/5 py-3 bg-black/40 backdrop-blur-md z-10">
        <div className="flex justify-between items-center">
          <CardTitle className="font-mono text-sm text-primary flex items-center gap-2 uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" />
            LIVE MARKET FEED: {pair}
          </CardTitle>
          <div className="flex gap-1">
            {[1,2,3].map(i => (
              <div key={i} className="w-1 h-1 bg-primary/30" />
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 relative bg-black">
        <div className="absolute inset-0">
          <AdvancedRealTimeChart 
            theme="dark" 
            autosize
            symbol={`FX:${symbol}`} 
            interval="5" 
            timezone="Etc/UTC" 
            style="1" 
            locale="en" 
            toolbar_bg="#f1f3f6" 
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
