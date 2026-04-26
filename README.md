# Olive Dashboard Weekly Report

A professional, boardroom-ready dashboard for tracking weekly operational and financial KPIs.

## Project Structure

- `frontend/`: Next.js application for the dashboard UI.
- `backend/`: Python-based data processing and KPI calculations.

## Getting Started

### Prerequisites

- Node.js (v18+)
- Python (v3.9+)

### Installation

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Backend

Place the CFO weekly workbook **`Weekly update - 27.04.2024 v2.xlsx`** at the repository root (or set `OLIVE_WEEKLY_EXCEL_PATH` / `EXCEL_PATH` to its absolute path).

```bash
cd backend
python main.py
```

## Features

- **Business Health**: Summary of key performance indicators.
- **Signings**: Detailed tracking of new signings with trend analysis.
- **Openings**: Operational KPI tracking for go-lives and WIP.
- **Collections**: Financial KPI tracking for account balances and dues.
