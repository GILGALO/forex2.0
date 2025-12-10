
import { Ticker } from "react-ts-tradingview-widgets";

export default function MarketTicker() {
  return (
    <div className="w-full glass-panel border-b border-primary/30 overflow-hidden h-[52px] relative z-50 shadow-lg">
      <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-r from-background via-transparent to-background" />
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
      <Ticker 
        colorTheme="dark" 
        symbols={[
          {
            proName: "FOREXCOM:EURUSD",
            title: "EUR/USD"
          },
          {
            proName: "FOREXCOM:GBPUSD",
            title: "GBP/USD"
          },
          {
            proName: "FOREXCOM:USDJPY",
            title: "USD/JPY"
          },
          {
            proName: "FOREXCOM:USDCHF",
            title: "USD/CHF"
          },
          {
            proName: "FOREXCOM:AUDUSD",
            title: "AUD/USD"
          },
          {
            proName: "FOREXCOM:USDCAD",
            title: "USD/CAD"
          }
        ]}
      />
    </div>
  );
}
