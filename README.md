# InsightAI — AI-Powered Business Intelligence Dashboard

An AI-augmented business intelligence dashboard that lets you upload any CSV dataset and get instant AI-powered insights, smart visualizations, and natural language querying — all powered by Claude.

**Built by Mohd Sultan Siddiqui** — Senior Business Analyst & AI Strategist

![InsightAI Dashboard](screenshot.png)

## Features

- **Instant AI Analysis** — Upload a CSV and get comprehensive insights in seconds
- **Smart Visualizations** — AI recommends the best chart types for your data
- **Natural Language Queries** — Ask questions about your data in plain English
- **KPI Extraction** — Automatically identifies key metrics and trends
- **Column Statistics** — Detailed statistical overview of every column
- **Sortable Data Table** — Browse your data with sorting and pagination
- **Dark Mode UI** — Production-grade interface built with React & Tailwind

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Recharts, Framer Motion, Lucide Icons
- **AI Backend**: Claude API (Anthropic) via Vercel Serverless Functions
- **Data Processing**: PapaParse (CSV parsing), custom statistical utilities
- **Deployment**: Vercel (recommended) or any Node.js hosting

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/ai-bi-dashboard.git
cd ai-bi-dashboard
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root:

```
ANTHROPIC_API_KEY=your_api_key_here
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Deployment to Vercel

### One-Click Deploy

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → Import Project
3. Add environment variable: `ANTHROPIC_API_KEY`
4. Deploy

### CLI Deploy

```bash
npm i -g vercel
vercel --prod
```

## Project Structure

```
ai-bi-dashboard/
├── api/
│   └── analyze.js          # Vercel serverless function (Claude API proxy)
├── src/
│   ├── components/
│   │   ├── Header.jsx       # Top navigation bar
│   │   ├── FileUpload.jsx   # Drag-and-drop CSV upload with demo data
│   │   ├── Dashboard.jsx    # Main analytics orchestrator
│   │   ├── KPICards.jsx     # Key metric cards (AI-generated or auto)
│   │   ├── ChartPanel.jsx   # Dynamic chart rendering (bar, line, pie, scatter, area)
│   │   ├── AIInsights.jsx   # Formatted AI analysis display
│   │   ├── QueryInput.jsx   # Natural language chat interface
│   │   └── DataPreview.jsx  # Sortable table + column statistics
│   ├── utils/
│   │   └── dataProcessor.js # Statistics, parsing, formatting utilities
│   ├── App.jsx              # Root component
│   ├── main.jsx             # Entry point
│   └── index.css            # Global styles + Tailwind
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── vercel.json
└── README.md
```

## How It Works

1. **Upload** — User drops a CSV file or clicks "Try with sample data"
2. **Parse** — PapaParse extracts headers, data types, and values
3. **Compute** — Client-side statistics engine calculates mean, median, range, distributions
4. **Analyze** — Data preview + stats are sent to Claude via serverless API
5. **Render** — AI response is parsed for KPIs, chart recommendations, and narrative insights
6. **Query** — User can ask follow-up questions in natural language

## Sample Queries

- "What are the top 5 trends in this data?"
- "Which region has the highest profit margin?"
- "Are there any outliers or anomalies?"
- "Summarize key takeaways for an executive presentation"

## License

MIT

---

**Portfolio Project** — Demonstrates the intersection of AI capabilities, business intelligence, and modern web development. Built to showcase how generative AI can augment traditional business analysis workflows.
