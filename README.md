# Quantum Trade

AI-powered crypto trading platform for market analysis, signal generation, backtesting, and local strategy execution.

## Overview

Quantum Trade is a local-first trading workspace built to help you analyze markets, monitor positions, test strategies, and automate trading workflows without depending on a hosted platform. The project includes a React frontend, a Node-based backend, JSON-backed local storage, and optional AI integration for analysis and suggestions.

## Features

- Market dashboard and trade monitoring
- Signal generation and AI-assisted insights
- Backtesting and performance review
- Risk settings and execution controls
- Local API server with JSON database storage
- Optional LLM integration for advanced analysis

## Prerequisites

- Node.js LTS
- npm
- A configured local environment file for your AI and exchange integrations

## Run locally on Windows

1. Clone the repository.
2. Open a terminal in the project folder.
3. Install dependencies:

```bash
npm install
```

4. Create a local environment file based on `.env.example` and fill in the required values.
5. Start the app:

```bash
npm run dev
npm run dev:server
```

The frontend runs at http://localhost:5173 and the backend API runs at http://localhost:3001.

## Environment configuration

Copy `.env.example` to `.env` or `.env.local` and adjust the values for your setup.

```env
PORT=3001
DATA_DIR=./server/data
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=
LLM_MODEL=gpt-4o-mini
AI_CRON_MINUTES=0
BINANCE_BASE_URL=https://api.binance.com
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
LOCAL_API_TOKEN=
```

You can also use other compatible OpenAI-style providers such as DeepSeek, Groq, OpenRouter, or a local Ollama instance.

## Project scripts

```bash
npm run dev
npm run build
npm run test
npm run dev:server
npm run restore:local
```

## Notes

- The app includes a local compatibility layer so the frontend can work without a hosted backend.
- The server stores data in JSON files under `server/data` for local development and testing.
- The Windows helper script `start-app.bat` is available for quick startup.

## Support

Use your internal documentation, issue tracker, or deployment workflow for additional help and release notes.
