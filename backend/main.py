"""
FastAPI Main App — Olive CFO Financial Intelligence Dashboard
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from kpis.signings import get_signings
from kpis.openings import get_openings
from kpis.bd_performance import get_bd_performance
from kpis.sales import get_sales
from kpis.cashflow import get_cashflow
from kpis.inflow_detail import get_inflow_detail
from kpis.outflow import get_outflow
from kpis.business_health import get_business_health
from kpis.sales_mix import get_sales_mix
from kpis.sales_yoy import get_sales_yoy
from kpis.revenue_stream import get_revenue_stream
from kpis.revenue_composition import get_revenue_composition
from kpis.inflow_breakdown import get_inflow_breakdown
from kpis.collections import get_collections

app = FastAPI(
    title="Olive CFO Intelligence API",
    description="KPI Engine for Olive Financial Intelligence Dashboard",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _respond(data: dict):
    return JSONResponse(content=data)


@app.get("/")
def root():
    return {"status": "ok", "message": "Olive CFO Intelligence API running"}


@app.get("/api/kpi/signings")
def kpi_signings():
    return _respond(get_signings())


@app.get("/api/kpi/openings")
def kpi_openings():
    return _respond(get_openings())


@app.get("/api/kpi/bd-performance")
def kpi_bd_performance():
    return _respond(get_bd_performance())


@app.get("/api/kpi/sales")
def kpi_sales():
    return _respond(get_sales())


@app.get("/api/kpi/cashflow")
def kpi_cashflow():
    return _respond(get_cashflow())


@app.get("/api/kpi/inflow-detail")
def kpi_inflow_detail():
    return _respond(get_inflow_detail())


@app.get("/api/kpi/outflow")
def kpi_outflow():
    return _respond(get_outflow())


@app.get("/api/kpi/business-health")
def kpi_business_health():
    return _respond(get_business_health())


@app.get("/api/kpi/all")
def kpi_all():
    """Returns all KPIs in one call for the executive summary."""
    return _respond({
        "signings": get_signings(),
        "openings": get_openings(),
        "bd_performance": get_bd_performance(),
        "sales": get_sales(),
        "cashflow": get_cashflow(),
        "inflow_detail": get_inflow_detail(),
        "outflow": get_outflow(),
        "business_health": get_business_health()
    })

@app.get("/api/kpi/revenue_composition")
def kpi_revenue_composition():
    return _respond(get_revenue_composition())


@app.get("/api/kpi/sales_mix")
def kpi_sales_mix():
    return _respond(get_sales_mix())

@app.get("/api/kpi/sales_yoy")
def kpi_sales_yoy():
    return _respond(get_sales_yoy())

@app.get("/api/kpi/revenue_stream")
def kpi_revenue_stream():
    return _respond(get_revenue_stream())

@app.get("/api/kpi/inflow_breakdown")
def kpi_inflow_breakdown():
    return _respond(get_inflow_breakdown())

@app.get("/api/kpi/collections")
def kpi_collections():
    return _respond(get_collections())


