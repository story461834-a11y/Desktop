/**
 * ALPHA-PREDICT AI: Minimal White Theme Controller
 * Features:
 * 1. Currency Switch ($ USD / ₩ KRW)
 * 2. Powerful Search Engine (Any US/NASDAQ Ticker + Korean Name Auto-mapping + Suggestions Dropdown + CORS Fallbacks)
 * 3. 4 Forecast Cards (1d, 7d, 15d, 30d) + Up/Down Probability
 */

document.addEventListener('DOMContentLoaded', () => {
  // Common US Stocks Dictionary for Korean / English search mapping
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
    currentTicker: 'NVDA',
    currentCurrency: 'USD', // 'USD' | 'KRW'
    fxRate: 1385,            // 1 USD = 1385 KRW (Default)
    currentStockData: null,
    chartEngine: null,

    async init() {
      this.initElements();
      this.initChart();
      this.bindEvents();
      this.fetchRealExchangeRate(); // Non-blocking in background
      await this.loadStock('NVDA');
    },

    initElements() {
      this.el = {
        // Currency Switch
        curBtnUsd: document.getElementById('curBtnUsd'),
        curBtnKrw: document.getElementById('curBtnKrw'),
        fxRateNote: document.getElementById('fxRateNote'),

        // Search Form & Dropdown
        searchForm: document.getElementById('searchForm'),
        searchInput: document.getElementById('searchInput'),
        searchDropdown: document.getElementById('searchDropdown'),
        popularChips: document.querySelectorAll('.p-chip'),
        loadingOverlay: document.getElementById('loadingOverlay'),

        // Stock Header Card
        tickerName: document.getElementById('tickerName'),
        companyName: document.getElementById('companyName'),
        marketTag: document.getElementById('marketTag'),
        currentPrice: document.getElementById('currentPrice'),
        priceChangePill: document.getElementById('priceChangePill'),

        // Up/Down Probability
        probUpText: document.getElementById('probUpText'),
        probDownText: document.getElementById('probDownText'),
        probBarUp: document.getElementById('probBarUp'),
        probBarDown: document.getElementById('probBarDown'),

        // 4 Predictions
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
      // Currency Switch Buttons
      this.el.curBtnUsd.addEventListener('click', () => this.setCurrency('USD'));
      this.el.curBtnKrw.addEventListener('click', () => this.setCurrency('KRW'));

      // Search Input Autocomplete / Filter
      this.el.searchInput.addEventListener('input', (e) => {
        this.handleSearchInput(e.target.value.trim());
      });

      this.el.searchInput.addEventListener('focus', () => {
        if (this.el.searchInput.value.trim().length > 0) {
          this.el.searchDropdown.style.display = 'block';
        }
      });

      // Close dropdown on outside click
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
          this.el.searchDropdown.style.display = 'none';
        }
      });

      // Search Form Submit
      this.el.searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.el.searchDropdown.style.display = 'none';
        const rawInput = this.el.searchInput.value.trim();
        const resolvedTicker = this.resolveTicker(rawInput);
        if (resolvedTicker) {
          this.loadStock(resolvedTicker);
        }
      });

      // Popular Ticker Chips
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

      // Chart Range Buttons (1M, 3M, 6M, ALL)
      document.querySelectorAll('.r-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          document.querySelectorAll('.r-btn').forEach(b => b.classList.remove('active'));
          e.currentTarget.classList.add('active');
          this.chartEngine.setTimeRange(e.currentTarget.dataset.range);
        });
      });

      // Chart Type Buttons (Candle / Line)
      document.getElementById('btnToggleType').addEventListener('click', (e) => {
        const isLine = e.currentTarget.classList.toggle('active');
        e.currentTarget.textContent = isLine ? '라인' : '캔들';
        this.chartEngine.setChartType(isLine ? 'line' : 'candle');
      });

      // Forecast Overlay Toggle
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
        const res = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://query1.finance.yahoo.com/v8/finance/chart/USDKRW=X?interval=1d&range=5d'));
        if (res.ok) {
          const json = await res.json();
          const rate = json.chart.result[0].meta.regularMarketPrice;
          if (rate && rate > 1000) {
            this.fxRate = Math.round(rate);
            if (this.el.fxRateNote) {
              this.el.fxRateNote.textContent = `(기준 환율: $1 = ₩${this.fxRate.toLocaleString()})`;
            }
          }
        }
      } catch (e) {
        // Fallback default fxRate 1385
      }
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
            <span>'${query.toUpperCase()}' 직접 검색 (엔터)</span>
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
      // Check Dictionary
      const match = STOCK_DICT.find(s => 
        s.ticker.toLowerCase() === clean.toLowerCase() || 
        s.name.toLowerCase().includes(clean.toLowerCase())
      );
      if (match) return match.ticker;
      // Default: clean alphanumeric ticker
      return clean.toUpperCase().replace(/[^A-Z0-9.\-=]/g, '');
    },

    showLoading(show = true) {
      if (this.el.loadingOverlay) {
        this.el.loadingOverlay.style.display = show ? 'flex' : 'none';
      }
    },

    async loadStock(ticker) {
      this.showLoading(true);
      ticker = ticker.toUpperCase();
      this.currentTicker = ticker;

      // Update popular chip highlight
      this.el.popularChips.forEach(c => {
        c.classList.toggle('active', c.dataset.ticker === ticker);
      });

      try {
        let data = null;

        // 1. Try local pre-generated JSON first
        try {
          const res = await fetch(`data/predictions/${ticker}.json?t=` + Date.now());
          if (res.ok) {
            data = await res.json();
          }
        } catch (e) {
          // ignore
        }

        // 2. If not local, fetch real-time from Yahoo Finance with CORS Proxies
        if (!data) {
          data = await this.fetchLiveStockData(ticker);
        }

        if (data) {
          this.currentStockData = data;
          this.renderStock(data);
        } else {
          alert(`[${ticker}] 종목 데이터를 가져올 수 없습니다. 올바른 미국 티커를 입력해주세요.`);
        }
      } catch (err) {
        console.error('종목 로드 에러:', err);
        alert(`[${ticker}] 데이터를 불러오지 못했습니다. 티커(예: TSLA, AAPL, NVDA)를 확인해주세요.`);
      } finally {
        this.showLoading(false);
      }
    },

    async fetchLiveStockData(ticker) {
      const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1y`;
      
      // Multi-proxy CORS fallback chain
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
          const timeoutId = setTimeout(() => controller.abort(), 4000);
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
          // Try next proxy
        }
      }

      if (!json) throw new Error('CORS 프록시 연결 실패');

      const result = json.chart.result[0];
      const meta = result.meta;
      const timestamps = result.timestamp || [];
      const quotes = result.indicators.quote[0] || {};

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

      if (candles.length === 0) throw new Error('캔들 데이터가 없습니다');

      // Calculate SMA 20
      for (let i = 0; i < candles.length; i++) {
        if (i >= 19) {
          const sum = candles.slice(i - 19, i + 1).reduce((acc, cur) => acc + cur.close, 0);
          candles[i].sma20 = Math.round((sum / 20) * 100) / 100;
        }
      }

      const forecast = this.computePrediction(candles);
      const latest = candles[candles.length - 1];
      const prev = candles[candles.length - 2] || latest;
      const diff = latest.close - prev.close;
      const changePct = (diff / prev.close) * 100;

      // Find company name in dictionary if available
      const dictItem = STOCK_DICT.find(s => s.ticker === ticker);
      const companyDisplayName = dictItem ? dictItem.name : (meta.shortName || meta.symbol || ticker);

      return {
        meta: {
          code: ticker,
          ticker: ticker,
          name: companyDisplayName,
          market: meta.exchangeName || 'NASDAQ',
          currency: 'USD'
        },
        price_summary: {
          current_price: latest.close,
          diff: diff,
          change_pct: changePct,
          volume: latest.volume
        },
        future_forecast: forecast.future_forecast,
        probability: forecast.probability,
        predictions_4period: forecast.predictions_4period,
        chart_data: candles
      };
    },

    computePrediction(candles) {
      const lastClose = candles[candles.length - 1].close;
      const lastDateStr = candles[candles.length - 1].date;
      const n = candles.length;

      const sma20 = candles[n - 1].sma20 || lastClose;
      const return5d = (lastClose - candles[Math.max(0, n - 5)].close) / (candles[Math.max(0, n - 5)].close || 1);
      const return20d = (lastClose - candles[Math.max(0, n - 20)].close) / (candles[Math.max(0, n - 20)].close || 1);

      let sumVol = 0;
      const lookback = Math.min(14, n);
      for (let i = n - lookback; i < n; i++) {
        sumVol += (candles[i].high - candles[i].low);
      }
      const dailyVol = Math.max(sumVol / lookback, lastClose * 0.015);

      // Up/Down Probability
      let bullScore = 50;
      if (lastClose > sma20) bullScore += 14;
      else bullScore -= 14;

      if (return5d > 0) bullScore += 8;
      else bullScore -= 8;

      if (return20d > 0) bullScore += 6;
      else bullScore -= 6;

      const upProb = Math.min(88, Math.max(15, Math.round(bullScore)));
      const downProb = 100 - upProb;

      // 30 Days Forecast Generation
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
        const spread = dailyVol * Math.sqrt(i) * 1.4;

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

      // 1. Stock Title & Current Price (Formatted by Currency)
      this.el.tickerName.textContent = meta.code;
      this.el.companyName.textContent = meta.name ? `· ${meta.name}` : '';
      this.el.marketTag.textContent = meta.market;
      this.el.currentPrice.textContent = this.formatPrice(curPrice);

      const isUp = price.diff >= 0;
      this.el.priceChangePill.className = `price-change-pill ${isUp ? 'bullish' : 'bearish'}`;
      this.el.priceChangePill.innerHTML = this.formatDiff(price.diff, price.change_pct);

      // 2. Up/Down Probability Bar
      let upProb = 65;
      let downProb = 35;
      if (data.probability) {
        upProb = data.probability.up;
        downProb = data.probability.down;
      } else if (data.ai_analysis) {
        upProb = data.ai_analysis.score;
        downProb = 100 - upProb;
      }
      this.el.probUpText.textContent = `상승 확률 ${upProb}%`;
      this.el.probDownText.textContent = `하락 확률 ${downProb}%`;
      this.el.probBarUp.style.width = `${upProb}%`;
      this.el.probBarDown.style.width = `${downProb}%`;

      // 3. 4 AI Predictions (1일, 7일, 15일, 30일)
      if (data.predictions_4period) {
        this.renderPredCard(this.el.pred1dPrice, this.el.pred1dPct, data.predictions_4period.p1d);
        this.renderPredCard(this.el.pred7dPrice, this.el.pred7dPct, data.predictions_4period.p7d);
        this.renderPredCard(this.el.pred15dPrice, this.el.pred15dPct, data.predictions_4period.p15d);
        this.renderPredCard(this.el.pred30dPrice, this.el.pred30dPct, data.predictions_4period.p30d);
      } else if (forecast && forecast.expected && forecast.expected.length > 0) {
        const getP = (idx) => {
          const p = forecast.expected[idx] || curPrice;
          const pct = ((p - curPrice) / curPrice) * 100;
          return { price: p, pct: Math.round(pct * 100) / 100 };
        };
        this.renderPredCard(this.el.pred1dPrice, this.el.pred1dPct, getP(0));
        this.renderPredCard(this.el.pred7dPrice, this.el.pred7dPct, getP(6));
        this.renderPredCard(this.el.pred15dPrice, this.el.pred15dPct, getP(14));
        this.renderPredCard(this.el.pred30dPrice, this.el.pred30dPct, getP(Math.min(29, forecast.expected.length - 1)));
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
