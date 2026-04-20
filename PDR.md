📘 PRODUCT REQUIREMENT DOCUMENT (PRD)
🏢 Project:Olive - CFO Financial Intelligence Dashboard
🎯 Audience: CFO, CEO, Leadership Team
🧠 1. PRODUCT VISION
🎯 Objective

Build a boardroom-grade financial intelligence dashboard that:

Converts weekly Excel updates into real-time decision insights
Tracks end-to-end business pipeline
Enables CFO to make decisions in < 10 seconds
💡 Core Philosophy (from CFO theme)

“From touchless accounting → board-ready insights”

This system must:

Be fully automated
Require zero manual reporting
Provide instant variance + risk alerts
Be visually premium and minimal
🧩 2. SYSTEM OVERVIEW
🔄 Data Flow
Excel (Weekly Update by CFO)
        ↓
FastAPI (KPI Engine + Validation)
        ↓
KPI Layer (8 KPI Modules)
        ↓
Next.js Dashboard (UI)
📦 Data Source
Single Excel file (multi-sheet): `Weekly update - 20.04.2026 v6.xlsx`
Updated weekly by CFO
Must follow strict schema
📊 3. KPI FRAMEWORK (CORE OF SYSTEM)
🔴 KPI 1: SIGNINGS (Demand Engine)
Purpose:

Track deal closures vs targets

Metrics:
Monthly Target
Monthly Achieved
Achievement %
Cumulative Achievement
Visuals:
Line chart:
Target (dashed)
Achieved (solid)
Monthly snapshot table (brand-wise)
Insights:
Shortfall alerts
Trend deviation
Forecast vs actual gap
🔵 KPI 2: OPENINGS (Execution Engine)
Purpose:

Track conversion of signings → live inventory

Metrics:
Target Keys
Opened Keys
Opening %
Delay (keys)
Visuals:
Multi-line chart (Olive, Spark, Open)
Monthly breakdown table
Insights:
Execution delays
Property-level bottlenecks
🟣 KPI 3: BD PERFORMANCE (People Engine)
Purpose:

Evaluate BD productivity

Metrics:
Target vs Achieved (per BD)
Achievement %
Brand contribution
Visuals:
Leaderboard
Stacked bar (brand mix)
Contribution pie
Insights:
Top performers
Underperformers
Segment dependency
🟡 KPI 4: SALES (Revenue Engine)
Purpose:

Track actual revenue generation

Metrics:
Monthly revenue
Growth %
Brand contribution %
Run rate
Visuals:
Stacked bar chart (monthly)
Growth indicators
Insights:
Growth trend
Revenue concentration risk
🟢 KPI 5: CASHFLOW (Liquidity Engine)
Purpose:

Track financial survival

Metrics:
Inflow (TA + Mgmt Fees)
Outflow
Net Position
Cash Balance
Visuals:
KPI cards
Inflow vs Outflow chart
Insights:
Cash surplus/deficit
Liquidity risk
🔶 KPI 6: INFLOW DETAIL (Collection Engine)
Purpose:

Track collections at property level

Metrics:
Target vs Received vs Expected
Outstanding
Collection %
Visuals:
Property table
Aging buckets chart
Insights:
Delayed payments
High-risk accounts
🔴 KPI 7: OUTFLOW (Payables Engine)
Purpose:

Track obligations

Metrics:
Total payables
Upcoming dues
Overdue payments
Visuals:
Payables table
Timeline chart
Insights:
Payment pressure
Cash mismatch risk
🟣 KPI 8: BUSINESS HEALTH (Decision Engine)
Purpose:

Integrate all KPIs

Metrics:
Funnel conversion rates
Risk score
Efficiency score
Visuals:
Funnel diagram
Executive summary strip
Insights:
What’s broken
What to do
Forecast impact
🎨 4. UI/UX REQUIREMENTS (CRITICAL)
🎯 Design Principles
Minimalist
Executive-grade
High readability
No clutter
🎨 Theme Style
Background: White / Light
Typography: Clean sans-serif
Colors:
Green → Positive
Red → Negative
Grey → Neutral
🧩 Layout Structure
🔝 Top Section (Executive Summary)
KPI cards:
Signings %
Openings %
Revenue Growth
Cash Balance
🔽 Middle Section (Core KPIs)
Signings + Openings (left)
Sales + BD (right)
🔽 Bottom Section
Cashflow
Inflow detail
Outflow
🔻 Final Section
Funnel view
Risk insights
Recommendations
✨ UI Behavior
Smooth transitions (Framer Motion)
Hover insights
Drill-down capability
⚙️ 5. TECHNICAL ARCHITECTURE
🧠 Backend
FastAPI
Pandas for processing
🎨 Frontend
Next.js
Tailwind CSS
shadcn/ui
📊 Charts
Recharts / Tremor
💾 Data Handling
Excel → read via pandas
Cached in memory
🔄 Auto Refresh
Poll every 60 seconds
Detect file changes
🛡️ 6. DATA VALIDATION
Rules:
Fixed sheet names
Required columns enforced
Null handling
Error Handling:
Show UI warning if data invalid
Do not crash dashboard
🚀 7. INTELLIGENCE LAYER (GAME CHANGER)
Auto Insights Engine

System should generate:

“Signings below target for 3 months”
“Cash deficit expected next cycle”
“High outstanding in Gurgaon”
Recommendation Engine
“Push BD for Spark deals”
“Follow up on 60+ receivables”
“Delay non-critical payments”
📈 8. PERFORMANCE REQUIREMENTS
Load time < 2 seconds
Smooth UI
No lag on refresh
🔐 9. DEPLOYMENT
Hosted locally on CFO machine
Runs automatically
No manual intervention
🏁 10. SUCCESS METRICS
CFO Satisfaction:
Can understand business in < 10 sec
Efficiency:
Manual reporting reduced to 0
Accuracy:
Matches Excel 100%
🔥 FINAL STATEMENT

This is not a dashboard.

This is:

“A Financial Operating System for the Company”