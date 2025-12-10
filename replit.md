# PocketTradeMaster - Forex Signal Generator

## Overview
A real-time forex signal generator that analyzes live market data and generates trading signals with technical analysis. The system uses Alpha Vantage API for market data and implements RSI, MACD, and Moving Average indicators for signal generation.

## Current State
- **Status**: Operational with live market analysis
- **Last Updated**: December 2024
- **Version**: 2.0 - Real Market Integration

## Architecture

### Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **Styling**: Tailwind CSS 4
- **Charts**: TradingView Widgets + Recharts
- **UI Components**: Radix UI + shadcn/ui

### Project Structure
```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   │   ├── signal-generator.tsx  # Main signal generation UI
│   │   │   ├── market-ticker.tsx     # Live price ticker
│   │   │   ├── trading-chart.tsx     # TradingView chart
│   │   │   └── recent-signals.tsx    # Signal history
│   │   ├── pages/          # Page components
│   │   ├── lib/            # Utilities and constants
│   │   └── hooks/          # React hooks
│   └── index.html
├── server/                 # Express backend
│   ├── index.ts            # Server entry point
│   ├── routes.ts           # API routes
│   ├── forexService.ts     # Forex data & analysis service
│   └── storage.ts          # Data storage interface
└── shared/                 # Shared types/schemas
```

### API Endpoints
- `GET /api/forex/quote/:pair` - Get real-time quote for a currency pair
- `GET /api/forex/quotes` - Get quotes for all major pairs
- `GET /api/forex/candles/:pair` - Get OHLC candle data
- `GET /api/forex/analysis/:pair` - Get technical analysis
- `POST /api/forex/signal` - Generate signal for specific pair
- `POST /api/forex/scan` - Scan all pairs and return best signal

### Technical Analysis Indicators
- **RSI (Relative Strength Index)**: 14-period, identifies overbought/oversold
- **MACD**: 12/26/9 periods with histogram
- **SMA**: 20 and 50 period Simple Moving Averages
- **EMA**: 12 and 26 period Exponential Moving Averages
- **ATR**: Average True Range for stop loss/take profit calculation

## Features
1. Real-time forex market data integration
2. Technical analysis with multiple indicators
3. Automated signal generation with confidence scoring
4. Auto-trade mode with pair scanning
5. Telegram notifications for signals
6. TradingView charts integration
7. Signal history tracking

## Environment Variables
- `ALPHA_VANTAGE_API_KEY` - (Optional) API key for real-time data from Alpha Vantage
- `TELEGRAM_BOT_TOKEN` - (Optional) Telegram bot token for signal notifications
- `TELEGRAM_CHAT_ID` - (Optional) Telegram chat/channel ID for broadcasting signals

## Running the Application
```bash
npm install
npm run dev
```

The application runs on port 5000.

## Supported Currency Pairs
- EUR/USD, GBP/USD, USD/JPY, USD/CHF
- AUD/USD, USD/CAD, NZD/USD, EUR/GBP
- EUR/JPY, GBP/JPY, AUD/JPY, EUR/AUD

## Recent Changes
- December 2024: Signal accuracy improvements - confluence-based confidence capping
  - Score difference tiers: <20 caps at 56%, 20-40 at 70%, 40-60 at 85%, >60 at 98%
  - Positive modifiers only apply when scoreDiff >= 40
  - Strict mode for afternoon sessions on MEDIUM/LOW accuracy pairs
  - Strict mode reduces confidence by 20 points and caps at 55%
- December 2024: Added Supertrend indicator and candlestick pattern detection
- December 2024: Implemented pair accuracy categorization (HIGH/MEDIUM/LOW)
- December 2024: Complete UI/UX redesign - cleaner, more organized dashboard
- December 2024: Added mobile responsiveness with breakpoint-specific layouts
- December 2024: Simplified futuristic styling with muted backgrounds
- December 2024: Fixed ScrollArea React hook issue in Recent Signals
- December 2024: Added real market data integration
- December 2024: Implemented technical analysis engine (RSI, MACD, SMA, EMA)
- December 2024: Added backend API for signal generation
- December 2024: Updated frontend to use live market analysis
