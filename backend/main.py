"""
WRLD VSN V4 - ENHANCED BACKEND
Adds: Macro Market Dashboard + Stock Fair Value Analysis
"""

# Add these new endpoints to your existing main.py

# ============================================================================
# NEW: MACRO MARKET OVERVIEW
# ============================================================================

MACRO_INSTRUMENTS = {
    "^GSPC": {"name": "S&P 500", "type": "index"},
    "^IXIC": {"name": "NASDAQ", "type": "index"},
    "^RUT": {"name": "Russell 2000", "type": "index"},
    "DX-Y.NYB": {"name": "DXY", "type": "forex"},
    "^TNX": {"name": "US 10Y", "type": "bond"},
    "CL=F": {"name": "Crude Oil", "type": "commodity"},
    "HG=F": {"name": "Copper", "type": "commodity"},
    "GC=F": {"name": "Gold", "type": "commodity"},
    "^VIX": {"name": "VIX", "type": "volatility"},
    "EEM": {"name": "Emerging Markets", "type": "etf"},
}

# Add to AUTHORITATIVE_STATE
AUTHORITATIVE_STATE["macro_overview"] = None
STATE_VERSIONS["macro_overview"] = 0
STATE_LOCKS["macro_overview"] = asyncio.Lock()
LAST_UPDATES["macro_overview"] = None

async def fetch_macro_instruments_finnhub() -> List[Dict]:
    """
    Fetch macro instruments from Finnhub
    """
    if not FINNHUB_KEY:
        return []
    
    results = []
    
    async with httpx.AsyncClient() as client:
        for symbol, info in MACRO_INSTRUMENTS.items():
            try:
                url = "https://finnhub.io/api/v1/quote"
                params = {"symbol": symbol, "token": FINNHUB_KEY}
                response = await client.get(url, params=params, timeout=10.0)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get('c'):  # Current price exists
                        current = float(data['c'])
                        prev_close = float(data.get('pc', current))
                        change = current - prev_close
                        change_pct = (change / prev_close * 100) if prev_close != 0 else 0
                        
                        results.append({
                            "symbol": symbol,
                            "name": info["name"],
                            "type": info["type"],
                            "value": current,
                            "change": change,
                            "change_percent": change_pct,
                            "timestamp": normalize_timestamp(data.get('t')),
                        })
                        print(f"✅ Macro: {info['name']} = {current}")
                
            except Exception as e:
                print(f"❌ Macro error for {symbol}: {e}")
                continue
    
    return results

async def fetch_macro_instruments_yahoo() -> List[Dict]:
    """
    Backup: Fetch from Yahoo Finance (no key required)
    """
    results = []
    
    async with httpx.AsyncClient() as client:
        for symbol, info in MACRO_INSTRUMENTS.items():
            try:
                # Yahoo Finance alternative endpoint
                url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
                params = {"interval": "1d", "range": "1d"}
                headers = {"User-Agent": "Mozilla/5.0"}
                
                response = await client.get(url, params=params, headers=headers, timeout=5.0)
                
                if response.status_code == 200:
                    data = response.json()
                    chart = data.get('chart', {}).get('result', [{}])[0]
                    meta = chart.get('meta', {})
                    
                    current = meta.get('regularMarketPrice')
                    prev_close = meta.get('previousClose')
                    
                    if current and prev_close:
                        change = current - prev_close
                        change_pct = (change / prev_close * 100) if prev_close != 0 else 0
                        
                        results.append({
                            "symbol": symbol,
                            "name": info["name"],
                            "type": info["type"],
                            "value": float(current),
                            "change": float(change),
                            "change_percent": float(change_pct),
                            "timestamp": get_utc_timestamp(),
                        })
                        
            except Exception as e:
                print(f"❌ Yahoo macro error for {symbol}: {e}")
                continue
    
    return results

async def update_macro_overview_worker():
    """
    Background worker for macro market overview
    Updates every 30 seconds
    """
    print("🚀 Macro overview worker started")
    await asyncio.sleep(3)
    
    while True:
        async with STATE_LOCKS["macro_overview"]:
            try:
                print("\n📊 Updating macro overview...")
                
                # Try Finnhub first, fall back to Yahoo
                instruments = await fetch_macro_instruments_finnhub()
                
                if not instruments:
                    print("⚠️ Finnhub failed, trying Yahoo Finance...")
                    instruments = await fetch_macro_instruments_yahoo()
                
                if instruments:
                    new_version = STATE_VERSIONS["macro_overview"] + 1
                    snapshot = {
                        "instruments": instruments,
                        "server_timestamp": get_utc_timestamp(),
                        "data_version": new_version,
                        "count": len(instruments),
                    }
                    
                    AUTHORITATIVE_STATE["macro_overview"] = snapshot
                    STATE_VERSIONS["macro_overview"] = new_version
                    LAST_UPDATES["macro_overview"] = get_utc_timestamp()
                    
                    print(f"✅ Macro overview updated: v{new_version} ({len(instruments)} instruments)")
                
            except Exception as e:
                print(f"❌ Macro overview worker error: {e}")
        
        await asyncio.sleep(30)  # 30 seconds

@app.get("/api/v1/snapshot/macro-overview")
async def get_macro_overview_snapshot(response: Response):
    """
    Returns complete macro market overview
    """
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    
    if AUTHORITATIVE_STATE["macro_overview"] is None:
        return {
            "status": "initializing",
            "retry_after_seconds": 5,
            "server_timestamp": get_utc_timestamp(),
        }
    
    return AUTHORITATIVE_STATE["macro_overview"]


# ============================================================================
# NEW: STOCK FAIR VALUE ANALYSIS
# ============================================================================

STOCK_ANALYSIS_CACHE = {}

async def fetch_stock_financials_fmp(ticker: str) -> Dict:
    """
    Fetch stock financials from Financial Modeling Prep
    Free tier: 250 requests/day
    """
    FMP_KEY = os.getenv("FMP_KEY")
    if not FMP_KEY:
        raise Exception("FMP_KEY not configured")
    
    async with httpx.AsyncClient() as client:
        # Get income statement (annual)
        income_url = f"https://financialmodelingprep.com/api/v3/income-statement/{ticker}"
        income_params = {"apikey": FMP_KEY, "limit": 5}
        income_resp = await client.get(income_url, params=income_params, timeout=10.0)
        
        # Get balance sheet
        balance_url = f"https://financialmodelingprep.com/api/v3/balance-sheet-statement/{ticker}"
        balance_params = {"apikey": FMP_KEY, "limit": 1}
        balance_resp = await client.get(balance_url, params=balance_params, timeout=10.0)
        
        # Get cash flow
        cashflow_url = f"https://financialmodelingprep.com/api/v3/cash-flow-statement/{ticker}"
        cashflow_params = {"apikey": FMP_KEY, "limit": 1}
        cashflow_resp = await client.get(cashflow_url, params=cashflow_params, timeout=10.0)
        
        # Get current quote
        quote_url = f"https://financialmodelingprep.com/api/v3/quote/{ticker}"
        quote_params = {"apikey": FMP_KEY}
        quote_resp = await client.get(quote_url, params=quote_params, timeout=10.0)
        
        income_data = income_resp.json() if income_resp.status_code == 200 else []
        balance_data = balance_resp.json() if balance_resp.status_code == 200 else []
        cashflow_data = cashflow_resp.json() if cashflow_resp.status_code == 200 else []
        quote_data = quote_resp.json() if quote_resp.status_code == 200 else []
        
        if not income_data or not quote_data:
            raise Exception("Failed to fetch financial data")
        
        latest_income = income_data[0]
        latest_balance = balance_data[0] if balance_data else {}
        latest_cashflow = cashflow_data[0] if cashflow_data else {}
        quote = quote_data[0] if isinstance(quote_data, list) else quote_data
        
        # Calculate historical revenue growth
        revenue_growth_rates = []
        for i in range(len(income_data) - 1):
            current_rev = income_data[i].get('revenue', 0)
            prev_rev = income_data[i + 1].get('revenue', 0)
            if prev_rev > 0:
                growth = ((current_rev - prev_rev) / prev_rev) * 100
                revenue_growth_rates.append(growth)
        
        avg_growth = sum(revenue_growth_rates) / len(revenue_growth_rates) if revenue_growth_rates else 0
        
        return {
            "ticker": ticker.upper(),
            "company_name": quote.get('name', ticker),
            "current_price": float(quote.get('price', 0)),
            "market_cap": float(quote.get('marketCap', 0)),
            "shares_outstanding": float(quote.get('sharesOutstanding', 0)),
            "revenue_ttm": float(latest_income.get('revenue', 0)),
            "net_income_ttm": float(latest_income.get('netIncome', 0)),
            "free_cash_flow_ttm": float(latest_cashflow.get('freeCashFlow', 0)),
            "total_debt": float(latest_balance.get('totalDebt', 0)),
            "cash": float(latest_balance.get('cashAndCashEquivalents', 0)),
            "historical_growth": round(avg_growth, 2),
            "net_margin": round((float(latest_income.get('netIncome', 0)) / float(latest_income.get('revenue', 1))) * 100, 2),
            "pe_ratio": float(quote.get('pe', 0)),
            "fetched_at": get_utc_timestamp(),
        }

async def fetch_stock_financials_alphavantage(ticker: str) -> Dict:
    """
    Backup: Alpha Vantage
    """
    if not ALPHA_VANTAGE_KEY:
        raise Exception("ALPHA_VANTAGE_KEY not configured")
    
    async with httpx.AsyncClient() as client:
        # Get overview
        overview_url = "https://www.alphavantage.co/query"
        overview_params = {
            "function": "OVERVIEW",
            "symbol": ticker,
            "apikey": ALPHA_VANTAGE_KEY
        }
        overview_resp = await client.get(overview_url, params=overview_params, timeout=10.0)
        overview_data = overview_resp.json()
        
        # Get quote
        quote_url = "https://www.alphavantage.co/query"
        quote_params = {
            "function": "GLOBAL_QUOTE",
            "symbol": ticker,
            "apikey": ALPHA_VANTAGE_KEY
        }
        quote_resp = await client.get(quote_url, params=quote_params, timeout=10.0)
        quote_data = quote_resp.json().get('Global Quote', {})
        
        return {
            "ticker": ticker.upper(),
            "company_name": overview_data.get('Name', ticker),
            "current_price": float(quote_data.get('05. price', 0)),
            "market_cap": float(overview_data.get('MarketCapitalization', 0)),
            "shares_outstanding": float(overview_data.get('SharesOutstanding', 0)),
            "revenue_ttm": float(overview_data.get('RevenueTTM', 0)),
            "net_income_ttm": float(overview_data.get('ProfitMargin', 0)) * float(overview_data.get('RevenueTTM', 0)),
            "pe_ratio": float(overview_data.get('PERatio', 0)),
            "fetched_at": get_utc_timestamp(),
        }

def calculate_fair_value(financials: Dict, assumptions: Dict) -> Dict:
    """
    Calculate fair value using DCF-like approach
    
    assumptions:
    - revenue_growth: % annual growth (e.g., 15)
    - net_margin: % profit margin (e.g., 20)
    - terminal_multiple: P/E or P/S multiple (e.g., 20)
    - discount_rate: Required return % (e.g., 10)
    """
    revenue = financials["revenue_ttm"]
    growth_rate = assumptions.get("revenue_growth", 10) / 100
    margin = assumptions.get("net_margin", 20) / 100
    terminal_multiple = assumptions.get("terminal_multiple", 20)
    discount_rate = assumptions.get("discount_rate", 10) / 100
    shares = financials["shares_outstanding"]
    
    if shares == 0 or revenue == 0:
        return {"error": "Invalid financial data"}
    
    # Project 5 years
    projected_revenues = []
    projected_earnings = []
    
    for year in range(1, 6):
        future_revenue = revenue * ((1 + growth_rate) ** year)
        future_earnings = future_revenue * margin
        projected_revenues.append(future_revenue)
        projected_earnings.append(future_earnings)
    
    # Terminal value (Year 5 earnings * multiple)
    terminal_value = projected_earnings[-1] * terminal_multiple
    
    # Discount back to present
    present_values = []
    for year, earnings in enumerate(projected_earnings, 1):
        pv = earnings / ((1 + discount_rate) ** year)
        present_values.append(pv)
    
    # Terminal value discounted
    terminal_pv = terminal_value / ((1 + discount_rate) ** 5)
    
    # Total present value
    total_pv = sum(present_values) + terminal_pv
    
    # Fair value per share
    fair_value_per_share = total_pv / shares
    
    current_price = financials["current_price"]
    upside = ((fair_value_per_share - current_price) / current_price) * 100 if current_price > 0 else 0
    
    return {
        "fair_value": round(fair_value_per_share, 2),
        "current_price": round(current_price, 2),
        "upside_percent": round(upside, 2),
        "projected_revenues": [round(r, 0) for r in projected_revenues],
        "projected_earnings": [round(e, 0) for r in projected_earnings],
        "terminal_value": round(terminal_value, 0),
        "assumptions_used": assumptions,
    }

@app.get("/api/v1/stock/financials/{ticker}")
async def get_stock_financials(ticker: str, response: Response):
    """
    Get stock financial data
    Cached for 24 hours (financials don't change daily)
    """
    response.headers["Cache-Control"] = "public, max-age=86400"  # 24 hours
    
    ticker = ticker.upper()
    cache_key = f"stock_financials_{ticker}"
    
    # Check cache
    if cache_key in STOCK_ANALYSIS_CACHE:
        cached = STOCK_ANALYSIS_CACHE[cache_key]
        cached_time = datetime.fromisoformat(cached["fetched_at"])
        age_hours = (datetime.now(timezone.utc) - cached_time).total_seconds() / 3600
        
        if age_hours < 24:
            print(f"✅ Using cached financials for {ticker}")
            return cached
    
    # Fetch fresh data
    try:
        print(f"📊 Fetching financials for {ticker}...")
        financials = await fetch_stock_financials_fmp(ticker)
        STOCK_ANALYSIS_CACHE[cache_key] = financials
        return financials
        
    except Exception as e:
        print(f"❌ FMP failed for {ticker}, trying Alpha Vantage: {e}")
        try:
            financials = await fetch_stock_financials_alphavantage(ticker)
            STOCK_ANALYSIS_CACHE[cache_key] = financials
            return financials
        except Exception as e2:
            print(f"❌ Alpha Vantage also failed: {e2}")
            return {"error": f"Failed to fetch financials for {ticker}"}

@app.post("/api/v1/stock/fair-value/{ticker}")
async def calculate_stock_fair_value(ticker: str, assumptions: Dict, response: Response):
    """
    Calculate fair value with custom assumptions
    
    Body:
    {
      "revenue_growth": 15,
      "net_margin": 20,
      "terminal_multiple": 20,
      "discount_rate": 10
    }
    """
    response.headers["Cache-Control"] = "no-cache"
    
    ticker = ticker.upper()
    
    # Get financials (uses cache if available)
    financials_response = await get_stock_financials(ticker, response)
    
    if "error" in financials_response:
        return financials_response
    
    # Calculate fair value
    valuation = calculate_fair_value(financials_response, assumptions)
    
    return {
        "ticker": ticker,
        "financials": financials_response,
        "valuation": valuation,
        "server_timestamp": get_utc_timestamp(),
    }


# ============================================================================
# UPDATE STARTUP TO INCLUDE NEW WORKER
# ============================================================================

# Add to startup_event():
# asyncio.create_task(update_macro_overview_worker())
