# KMarket Pro (Frontend)

KMarket is a front-end demo for a prediction trading UI. It includes Home, Markets,
Terminal, and Dashboard pages with mock data and limited live data for ETH.

## Tech Stack
- Vite + React + TypeScript
- Tailwind (via CDN in `index.html`)
- Recharts (sparklines/visuals)

## Quick Start
**Prerequisites:** Node.js 18+

```bash
npm install
npm run dev
```

Open the local dev server URL printed in the terminal (usually `http://localhost:5173`).

### Build / Preview
```bash
npm run build
npm run preview
```

## Data Behavior
- **ETH**: uses live 1m candles from Binance WebSocket when ETH is selected and
  network access is available.
- **Other symbols**: use mock candle generation.
- If live data is blocked/unavailable, ETH automatically falls back to mock data.

## Project Structure
- `pages/` — page-level views (Home / Markets / Terminal / Dashboard)
- `components/` — shared UI components
- `components/terminal/` — Terminal-only UI
- `components/prediction/` — prediction grid subcomponents
- `hooks/` — data + grid logic (mock data, Binance stream, resolution)
- `data/` — demo datasets
- `translations.ts` — CN/EN copy
- `index.css` / `index.html` — global styling + Tailwind config

## Notes
- `.env.local` exists but is not required for the current frontend demo.
