/**
 * ALPHA-PREDICT AI: 100% REAL-TIME LIVE US Stock & Forecast Engine
 * Fetches 100% LIVE Real-Time Quotes & Intraday/Daily Prices directly from Yahoo Finance API
 */

document.addEventListener('DOMContentLoaded', () => {
  const STOCK_DICT = [
    { ticker: 'NVDA', name: '엔비디아 (NVIDIA)', market: 'NASDAQ' },
    { ticker: 'TSLA', name: '테슬라 (Tesla)', market: 'NASDAQ' },
    { ticker: 'AAPL', name: '애플 (Apple)', market: 'NASDAQ' },
    { ticker: 'MSFT', name: '마이크로소프트 (Microsoft)', market: 'NASDAQ' },
    { ticker: 'PLTR', name: '팔란티어 (Palantir)', market: 'NYSE' },
    { ticker: 'AMZN', name: '아마존 (Amazon)', market: 'NASDAQ' },
    { ticker: 'GOOGL', name: '구글 / 알파벳 (Alphabet)', market: 'NASDAQ' },
    { ticker: 'META', name: '메타 / 페이스북 (Meta)', market: 'NASDAQ' },
    { ticker: 'AMD', name: 'AMD', market: 'NASDAQ' },
    { ticker: 'TSM', name: 'TSMC', market: 'NYSE' },
    { ticker: 'AVGO', name: '브로드컴 (Broadcom)', market: 'NASDAQ' },
    { ticker: 'NFLX', name: '넷플릭스 (Netflix)', market: 'NASDAQ' },
    { ticker: 'COIN', name: '코인베이스 (Coinbase)', market: 'NASDAQ' },
    { ticker: 'SMCI', name: '슈퍼마이크로컴퓨터 (SMCI)', market: 'NASDAQ' },
    { ticker: 'IONQ', name: '아이온큐 (IonQ)', market: 'NYSE' },
    { ticker: 'RKLB', name: '로켓랩 (Rocket Lab)', market: 'NASDAQ' },
    { ticker: 'SOUN', name: '사운드하운드 AI (SoundHound)', market: 'NASDAQ' },
    { ticker: 'ARM', name: 'ARM 홀딩스', market: 'NASDAQ' },
    { ticker: 'QCOM', name: '퀄컴 (Qualcomm)', market: 'NASDAQ' },
    { ticker: 'INTC', name: '인텔 (Intel)', market: 'NASDAQ' },
    { ticker: 'RIVN', name: '리비안 (Rivian)', market: 'NASDAQ' },
    { ticker: 'LCID', name: '루시드 (Lucid)', market: 'NASDAQ' },
    { ticker: 'SOXL', name: '반도체 3배 레버리지 (SOXL)', market: 'NYSE' },
    { ticker: 'TQQQ', name: '나스닥 3배 레버리지 (TQQQ)', market: 'NASDAQ' },
    { ticker: 'SQQQ', name: '나스닥 인버스 3배 (SQQQ)', market: 'NASDAQ' },
    { ticker: 'QQQ', name: '나스닥100 ETF (Invesco QQQ)', market: 'NASDAQ' },
    { ticker: 'SPY', name: 'S&P 500 ETF (SPDR)', market: 'NYSE' },
    { ticker: 'DIS', name: '디즈니 (Walt Disney)', market: 'NYSE' },
    { ticker: 'SBUX', name: '스타벅스 (Starbucks)', market: 'NASDAQ' },
    { ticker: 'KO', name: '코카콜라 (Coca-Cola)', market: 'NYSE' },
    { ticker: 'U', name: '유니티 (Unity Software)', market: 'NYSE' },
    { ticker: 'BABA', name: '알리바바 (Alibaba)', market: 'NYSE' }
  ];

  const App = {
    currentTicker: 'AAPL',
    currentCurrency: 'USD',
    fxRate: 1415.20, // 1 USD = 1415.20 KRW (실시간 기본값)
    currentStockData: null,
    chartEngine: null,
    refreshTimer: null,

    async init() {
      this.initElements();
      this.initChart();
      this.bindEvents();
      await this.fetchRealExchangeRate(); // 실시간 환율 즉시 갱신
      await this.loadStock('AAPL');
      this.startAutoRefresh();
    },

    initElements() {
      this.el = {
        curBtnUsd: document.getElementById('curBtnUsd'),
        curBtnKrw: document.getElementById('curBtnKrw'),
        fxRateNote: document.getElementById('fxRateNote'),

        searchForm: document.getElementById('searchForm'),
        searchInput: document.getElementById('searchInput'),
        searchDropdown: document.getElementById('searchDropdown'),
        popularChips: document.querySelectorAll('.p-chip'),
        loadingOverlay: document.getElementById('loadingOverlay'),

        tickerName: document.getElementById('tickerName'),
        companyName: document.getElementById('companyName'),
        marketTag: document.getElementById('marketTag'),
        currentPrice: document.getElementById('currentPrice'),
        priceChangePill: document.getElementById('priceChangePill'),

        probUpText: document.getElementById('probUpText'),
        probDownText: document.getElementById('probDownText'),
        probBarUp: document.getElementById('probBarUp'),
        probBarDown: document.getElementById('probBarDown'),

        pred1dPrice: document.getElementById('pred1dPrice'),
        pred1dPct: document.getElementById('pred1dPct'),
        pred7dPrice: document.getElementById('pred7dPrice'),
        pred7dPct: document.getElementById('pred7dPct'),
        pred15dPrice: document.getElementById('pred15dPrice'),
        pred15dPct: document.getElementById('pred15dPct'),
        pred30dPrice: document.getElementById('pred30dPrice'),
        pred30dPct: document.getElementById('pred30dPct'),
      };
    },

    initChart() {
      this.chartEngine = new StockChartEngine('mainChartCanvas', 'whiteTooltip');
      this.chartEngine.setCurrency(this.currentCurrency, this.fxRate);
    },

    bindEvents() {
      this.el.curBtnUsd.addEventListener('click', () => this.setCurrency('USD'));
      this.el.curBtnKrw.addEventListener('click', () => this.setCurrency('KRW'));

      this.el.searchInput.addEventListener('input', (e) => {
        this.handleSearchInput(e.target.value.trim());
      });

      this.el.searchInput.addEventListener('focus', () => {
        if (this.el.searchInput.value.trim().length > 0) {
          this.el.searchDropdown.style.display = 'block';
        }
      });

      document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
          this.el.searchDropdown.style.display = 'none';
        }
      });

      this.el.searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.el.searchDropdown.style.display = 'none';
        const rawInput = this.el.searchInput.value.trim();
        const resolvedTicker = this.resolveTicker(rawInput);
        if (resolvedTicker) {
          this.loadStock(resolvedTicker);
        }
      });

      this.el.popularChips.forEach(chip => {
        chip.addEventListener('click', (e) => {
          this.el.popularChips.forEach(c => c.classList.remove('active'));
          e.currentTarget.classList.add('active');
          const ticker = e.currentTarget.dataset.ticker;
          this.el.searchInput.value = ticker;
          this.el.searchDropdown.style.display = 'none';
          this.loadStock(ticker);
        });
      });

      document.querySelectorAll('.r-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          document.querySelectorAll('.r-btn').forEach(b => b.classList.remove('active'));
          e.currentTarget.classList.add('active');
          this.chartEngine.setTimeRange(e.currentTarget.dataset.range);
        });
      });

      document.getElementById('btnToggleType').addEventListener('click', (e) => {
        const isLine = e.currentTarget.classList.toggle('active');
        e.currentTarget.textContent = isLine ? '라인' : '캔들';
        this.chartEngine.setChartType(isLine ? 'line' : 'candle');
      });

      document.getElementById('btnToggleForecast').addEventListener('click', (e) => {
        const isActive = e.currentTarget.classList.toggle('active');
        this.chartEngine.toggleOption('showForecast', isActive);
      });
    },

    setCurrency(curr) {
      this.currentCurrency = curr;
      this.el.curBtnUsd.classList.toggle('active', curr === 'USD');
      this.el.curBtnKrw.classList.toggle('active', curr === 'KRW');
      
      this.chartEngine.setCurrency(curr, this.fxRate);
      if (this.currentStockData) {
        this.renderStock(this.currentStockData);
      }
    },

    formatPrice(usdVal) {
      if (usdVal == null || isNaN(usdVal)) return '-';
      if (this.currentCurrency === 'KRW') {
        const krw = Math.round(usdVal * this.fxRate);
        return `₩${krw.toLocaleString()}`;
      } else {
        return `$${Number(usdVal).toFixed(2)}`;
      }
    },

    formatDiff(diffUsd, changePct) {
      const isUp = diffUsd >= 0;
      const formattedDiff = this.formatPrice(Math.abs(diffUsd));
      const sign = isUp ? '▲ +' : '▼ -';
      return `${sign}${formattedDiff} (${isUp ? '+' : ''}${changePct.toFixed(2)}%)`;
    },

    async fetchRealExchangeRate() {
      try {
        // 1. Primary: 100% CORS-free Real-time Global Exchange Rate API
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        if (res.ok) {
          const json = await res.json();
          if (json && json.rates && json.rates.KRW) {
            this.fxRate = Math.round(json.rates.KRW * 100) / 100;
            if (this.el.fxRateNote) {
              this.el.fxRateNote.textContent = `(실시간 환율: $1 = ₩${this.fxRate.toLocaleString()})`;
            }
            if (this.chartEngine) {
              this.chartEngine.setCurrency(this.currentCurrency, this.fxRate);
            }
            return;
          }
        }
      } catch (e) {
        // Fallback: Yahoo Finance KRW=X
        try {
          const yRes = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://query1.finance.yahoo.com/v8/finance/chart/KRW=X?interval=1d&range=1d'));
          if (yRes.ok) {
            const yJson = await yRes.json();
            const rate = yJson.chart.result[0].meta.regularMarketPrice;
            if (rate && rate > 1000) {
              this.fxRate = Math.round(rate * 100) / 100;
              if (this.el.fxRateNote) {
                this.el.fxRateNote.textContent = `(실시간 환율: $1 = ₩${this.fxRate.toLocaleString()})`;
              }
            }
          }
        } catch (err) {
          // Keep 1415.20
        }
      }
    },

    startAutoRefresh() {
      if (this.refreshTimer) clearInterval(this.refreshTimer);
      // Auto refresh live price every 30 seconds
      this.refreshTimer = setInterval(() => {
        if (this.currentTicker) {
          this.loadStock(this.currentTicker, false); // silent refresh
        }
      }, 30000);
    },

    handleSearchInput(query) {
      const dropdown = this.el.searchDropdown;
      if (!query) {
        dropdown.style.display = 'none';
        return;
      }

      const q = query.toLowerCase();
      const matches = STOCK_DICT.filter(item => 
        item.ticker.toLowerCase().includes(q) || 
        item.name.toLowerCase().includes(q)
      );

      if (matches.length === 0) {
        dropdown.innerHTML = `
          <div class="dropdown-item" style="cursor:default; color:var(--text-dim);">
            <span>'${query.toUpperCase()}' 실시간 시세 조회 (엔터)</span>
          </div>
        `;
        dropdown.style.display = 'block';
        return;
      }

      dropdown.innerHTML = '';
      matches.slice(0, 6).forEach(item => {
        const div = document.createElement('div');
        div.className = 'dropdown-item';
        div.innerHTML = `
          <span class="item-ticker">${item.ticker}</span>
          <span class="item-name">${item.name}</span>
        `;
        div.addEventListener('click', () => {
          this.el.searchInput.value = item.ticker;
          dropdown.style.display = 'none';
          this.loadStock(item.ticker);
        });
        dropdown.appendChild(div);
      });
      dropdown.style.display = 'block';
    },

    resolveTicker(input) {
      if (!input) return null;
      const clean = input.trim();
      const match = STOCK_DICT.find(s => 
        s.ticker.toLowerCase() === clean.toLowerCase() || 
        s.name.toLowerCase().includes(clean.toLowerCase())
      );
      if (match) return match.ticker;
      return clean.toUpperCase().replace(/[^A-Z0-9.\-=]/g, '');
    },

    showLoading(show = true) {
      if (this.el.loadingOverlay) {
        this.el.loadingOverlay.style.display = show ? 'flex' : 'none';
      }
    },

    async loadStock(ticker, showSpinner = true) {
      if (showSpinner) this.showLoading(true);
      ticker = ticker.toUpperCase();
      this.currentTicker = ticker;

      this.el.popularChips.forEach(c => {
        c.classList.toggle('active', c.dataset.ticker === ticker);
      });

      try {
        // ALWAYS Fetch 100% REAL-TIME LIVE data from Yahoo Finance API
        const data = await this.fetchLiveStockData(ticker);

        if (data) {
          this.currentStockData = data;
          this.renderStock(data);
        } else {
          alert(`[${ticker}] 종목의 실시간 데이터를 가져오지 못했습니다. 티커명을 확인해주세요.`);
        }
      } catch (err) {
        console.error('실시간 데이터 수집 실패:', err);
        // Fallback to pre-built cache only if real-time network totally fails
        try {
          const res = await fetch(`data/predictions/${ticker}.json?t=` + Date.now());
          if (res.ok) {
            const cached = await res.json();
            this.currentStockData = cached;
            this.renderStock(cached);
          }
        } catch (e) {
          alert(`[${ticker}] 실시간 주가를 불러오지 못했습니다. 티커(예: AAPL, TSLA, NVDA)를 확인해주세요.`);
        }
      } finally {
        if (showSpinner) this.showLoading(false);
      }
    },

    async fetchLiveStockData(ticker) {
      const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1y`;
      
      // High-performance CORS proxy list
      const proxyList = [
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
        targetUrl
      ];

      let json = null;
      for (const url of proxyList) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4500);
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (res.ok) {
            const parsed = await res.json();
            if (parsed && parsed.chart && parsed.chart.result && parsed.chart.result[0]) {
              json = parsed;
              break;
            }
          }
        } catch (e) {
          // Try next
        }
      }

      if (!json) throw new Error('Live API connection failed');

      const result = json.chart.result[0];
      const meta = result.meta;
      const timestamps = result.timestamp || [];
      const quotes = result.indicators.quote[0] || {};

      // 1. Extract EXACT Real-Time Live Current Price
      const liveCurrentPrice = meta.regularMarketPrice || quotes.close[quotes.close.length - 1];
      const prevClose = meta.chartPreviousClose || meta.previousClose || quotes.close[quotes.close.length - 2] || liveCurrentPrice;
      const diff = liveCurrentPrice - prevClose;
      const changePct = (diff / prevClose) * 100;

      const candles = [];
      for (let i = 0; i < timestamps.length; i++) {
        const o = quotes.open[i];
        const h = quotes.high[i];
        const l = quotes.low[i];
        const c = quotes.close[i];
        const v = quotes.volume[i] || 0;

        if (o != null && h != null && l != null && c != null) {
          const dateStr = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
          candles.push({
            date: dateStr,
            open: Math.round(o * 100) / 100,
            high: Math.round(h * 100) / 100,
            low: Math.round(l * 100) / 100,
            close: Math.round(c * 100) / 100,
            volume: v,
            sma20: null
          });
        }
      }

      // Update the very last candle close to live regularMarketPrice
      if (candles.length > 0) {
        candles[candles.length - 1].close = Math.round(liveCurrentPrice * 100) / 100;
        candles[candles.length - 1].high = Math.max(candles[candles.length - 1].high, liveCurrentPrice);
        candles[candles.length - 1].low = Math.min(candles[candles.length - 1].low, liveCurrentPrice);
      }

      // Compute SMA 20
      for (let i = 0; i < candles.length; i++) {
        if (i >= 19) {
          const sum = candles.slice(i - 19, i + 1).reduce((acc, cur) => acc + cur.close, 0);
          candles[i].sma20 = Math.round((sum / 20) * 100) / 100;
        }
      }

      // Real-time AI Forecast computation from live price
      const forecast = this.computePrediction(candles, liveCurrentPrice);

      const dictItem = STOCK_DICT.find(s => s.ticker === ticker);
      const companyDisplayName = dictItem ? dictItem.name : (meta.shortName || meta.symbol || ticker);

      return {
        meta: {
          code: ticker,
          ticker: ticker,
          name: companyDisplayName,
          market: meta.exchangeName || 'NASDAQ',
          currency: 'USD',
          regularMarketTime: meta.regularMarketTime
        },
        price_summary: {
          current_price: Math.round(liveCurrentPrice * 100) / 100,
          diff: Math.round(diff * 100) / 100,
          change_pct: Math.round(changePct * 100) / 100,
          volume: meta.regularMarketVolume || (candles.length > 0 ? candles[candles.length - 1].volume : 0)
        },
        future_forecast: forecast.future_forecast,
        probability: forecast.probability,
        predictions_4period: forecast.predictions_4period,
        chart_data: candles
      };
    },

    computePrediction(candles, liveClose) {
      const n = candles.length;
      const lastClose = liveClose || candles[n - 1].close;
      const lastDateStr = candles[n - 1].date;

      const sma20 = candles[n - 1].sma20 || lastClose;
      const return5d = (lastClose - candles[Math.max(0, n - 5)].close) / (candles[Math.max(0, n - 5)].close || 1);
      const return20d = (lastClose - candles[Math.max(0, n - 20)].close) / (candles[Math.max(0, n - 20)].close || 1);

      let sumVol = 0;
      const lookback = Math.min(14, n);
      for (let i = n - lookback; i < n; i++) {
        sumVol += (candles[i].high - candles[i].low);
      }
      const dailyVol = Math.max(sumVol / lookback, lastClose * 0.012);

      // Up/Down Probability based on live momentum & MA position
      let bullScore = 50;
      if (lastClose > sma20) bullScore += 15;
      else bullScore -= 15;

      if (return5d > 0) bullScore += 10;
      else bullScore -= 10;

      if (return20d > 0) bullScore += 8;
      else bullScore -= 8;

      const upProb = Math.min(90, Math.max(12, Math.round(bullScore)));
      const downProb = 100 - upProb;

      // Generate 30 Business Days Forecast based on LIVE price
      const futureDates = [];
      const expectedArr = [];
      const upperArr = [];
      const lowerArr = [];

      let curr = new Date(lastDateStr);
      const trendSlope = (return20d * 0.35) / 20;

      for (let i = 1; i <= 30; i++) {
        curr.setDate(curr.getDate() + 1);
        if (curr.getDay() === 0 || curr.getDay() === 6) {
          i--;
          continue;
        }
        futureDates.push(curr.toISOString().split('T')[0]);

        const drift = trendSlope * i;
        const pred = lastClose * (1 + drift);
        const spread = dailyVol * Math.sqrt(i) * 1.35;

        expectedArr.push(Math.round(pred * 100) / 100);
        upperArr.push(Math.round((pred + spread) * 100) / 100);
        lowerArr.push(Math.round(Math.max(pred - spread, pred * 0.5) * 100) / 100);
      }

      const getPeriodPred = (idx) => {
        const p = expectedArr[idx] || lastClose;
        const pct = ((p - lastClose) / lastClose) * 100;
        return { price: p, pct: Math.round(pct * 100) / 100 };
      };

      return {
        future_forecast: {
          dates: futureDates,
          expected: expectedArr,
          upper: upperArr,
          lower: lowerArr
        },
        probability: { up: upProb, down: downProb },
        predictions_4period: {
          p1d: getPeriodPred(0),
          p7d: getPeriodPred(6),
          p15d: getPeriodPred(14),
          p30d: getPeriodPred(Math.min(29, expectedArr.length - 1))
        }
      };
    },

    renderStock(data) {
      const meta = data.meta;
      const price = data.price_summary;
      const forecast = data.future_forecast;
      const curPrice = price.current_price;

      // 1. Stock Title & LIVE Price
      this.el.tickerName.textContent = meta.code;
      this.el.companyName.textContent = meta.name ? `· ${meta.name}` : '';
      this.el.marketTag.textContent = meta.market;
      this.el.currentPrice.textContent = this.formatPrice(curPrice);

      const isUp = price.diff >= 0;
      this.el.priceChangePill.className = `price-change-pill ${isUp ? 'bullish' : 'bearish'}`;
      this.el.priceChangePill.innerHTML = this.formatDiff(price.diff, price.change_pct);

      // 2. Up/Down Probability Bar
      let upProb = (data.probability && data.probability.up) ? data.probability.up : 65;
      let downProb = 100 - upProb;
      this.el.probUpText.textContent = `상승 확률 ${upProb}%`;
      this.el.probDownText.textContent = `하락 확률 ${downProb}%`;
      this.el.probBarUp.style.width = `${upProb}%`;
      this.el.probBarDown.style.width = `${downProb}%`;

      // 3. 4 AI Predictions from LIVE Price
      if (data.predictions_4period) {
        this.renderPredCard(this.el.pred1dPrice, this.el.pred1dPct, data.predictions_4period.p1d);
        this.renderPredCard(this.el.pred7dPrice, this.el.pred7dPct, data.predictions_4period.p7d);
        this.renderPredCard(this.el.pred15dPrice, this.el.pred15dPct, data.predictions_4period.p15d);
        this.renderPredCard(this.el.pred30dPrice, this.el.pred30dPct, data.predictions_4period.p30d);
      }

      // 4. Update Chart
      this.chartEngine.setData(data.chart_data, forecast);
    },

    renderPredCard(priceEl, pctEl, pData) {
      if (!pData) return;
      priceEl.textContent = this.formatPrice(pData.price);
      const isUp = pData.pct >= 0;
      pctEl.className = `pred-pct-val ${isUp ? 'bullish' : 'bearish'}`;
      pctEl.textContent = `${isUp ? '▲ +' : '▼ '}${pData.pct.toFixed(2)}%`;
    }
  };

  App.init();
});
