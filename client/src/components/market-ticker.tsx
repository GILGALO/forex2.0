import { Ticker } from "react-ts-tradingview-widgets";

export function MarketTicker() {
  return (
    <div className="w-full bg-black border-b border-primary/20 overflow-hidden h-[50px] relative z-50">
      <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-r from-background via-transparent to-background" />
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
