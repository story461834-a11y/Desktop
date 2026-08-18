/**
 * ALPHA-PREDICT AI: UNLIMITED REAL-TIME US STOCK SEARCH & FORECAST ENGINE
 * Supports EVERY NASDAQ / NYSE / AMEX US Stock (e.g. 펩시 PEP, 맥도날드 MCD, 코스트코 COST, 테슬라, 애플 등)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Comprehensive Korean-English Common US Stock Mapping Dictionary (150+ Top Equities)
  const KOREAN_STOCK_MAP = {
    // 음식료 / 소비재
    '펩시': 'PEP', '펩시코': 'PEP', 'pepsi': 'PEP',
    '맥도날드': 'MCD', 'mcdonalds': 'MCD', 'mcd': 'MCD',
    '코카콜라': 'KO', 'coke': 'KO',
    '스타벅스': 'SBUX', '스벅': 'SBUX',
    '코스트코': 'COST', 'costco': 'COST',
    '월마트': 'WMT', 'walmart': 'WMT',
    '나이키': 'NKE', 'nike': 'NKE',
    '타겟': 'TGT',
    '치폴레': 'CMG',

    // 빅테크 / AI / 반도체
    '엔비디아': 'NVDA', 'nvidia': 'NVDA',
    '테슬라': 'TSLA', 'tesla': 'TSLA',
    '애플': 'AAPL', 'apple': 'AAPL',
    '마이크로소프트': 'MSFT', '마소': 'MSFT', 'microsoft': 'MSFT',
    '아마존': 'AMZN', 'amazon': 'AMZN',
    '구글': 'GOOGL', '알파벳': 'GOOGL', 'google': 'GOOGL',
    '메타': 'META', '페이스북': 'META', 'meta': 'META',
    '팔란티어': 'PLTR', 'palantir': 'PLTR',
    '브로드컴': 'AVGO', 'broadcom': 'AVGO',
    'tsmc': 'TSM', '대만반도체': 'TSM',
    'amd': 'AMD',
    '인텔': 'INTC', 'intel': 'INTC',
    '퀄컴': 'QCOM', 'qualcomm': 'QCOM',
    '슈퍼마이크로컴퓨터': 'SMCI', 'smci': 'SMCI',
    '아이온큐': 'IONQ', 'ionq': 'IONQ',
    '사운드하운드': 'SOUN', 'soundhound': 'SOUN',
    'arm': 'ARM', '암': 'ARM',
    '마이크론': 'MU', 'micron': 'MU',
    '어플라이드머티어리얼즈': 'AMAT',
    'asml': 'ASML',

    // 엔터 / 플랫폼 / 핀테크 / 모빌리티
    '넷플릭스': 'NFLX', 'netflix': 'NFLX',
    '디즈니': 'DIS', 'disney': 'DIS',
    '코인베이스': 'COIN', 'coinbase': 'COIN',
    '우버': 'UBER', 'uber': 'UBER',
    '에어비앤비': 'ABNB', 'airbnb': 'ABNB',
    '로블록스': 'RBLX', 'roblox': 'RBLX',
    '유니티': 'U', 'unity': 'U',
    '스포티파이': 'SPOT',
    '로켓랩': 'RKLB', 'rocketlab': 'RKLB',
    '리비안': 'RIVN', 'rivian': 'RIVN',
    '루시드': 'LCID', 'lucid': 'LCID',
    '보잉': 'BA', 'boeing': 'BA',

    // 제약 / 바이오 / 헬스케어
    '일라이릴리': 'LLY', 'lilly': 'LLY',
    '노보노디스크': 'NVO', 'novo': 'NVO',
    '화이자': 'PFE', 'pfizer': 'PFE',
    '모더나': 'MRNA', 'moderna': 'MRNA',
    '존슨앤존슨': 'JNJ', 'jnj': 'JNJ',
    '애브비': 'ABBV',

    // 금융 / 에너지 / 대표 ETF
    '버크셔': 'BRK-B', '버크셔해서웨이': 'BRK-B', '워렌버핏': 'BRK-B',
    'jp모건': 'JPM', 'jpmorgan': 'JPM',
    '비자': 'V', 'visa': 'V',
    '마스터카드': 'MA', 'mastercard': 'MA',
    '엑슨모빌': 'XOM', 'exxon': 'XOM',
    '쉐브론': 'CVX', 'chevron': 'CVX',
    'qqq': 'QQQ', '나스닥': 'QQQ', '나스닥100': 'QQQ',
    'spy': 'SPY', 's&p500': 'SPY',
    'soxl': 'SOXL', 'tqqq': 'TQQQ', 'sqqq': 'SQQQ', 'schd': 'SCHD'
  };

  const App = {
    currentTicker: 'AAPL',
    currentCurrency: 'USD',
    fxRate: 1415.20,
    currentStockData: null,
    chartEngine: null,
    refreshTimer: null,
    searchDebounce: null,

    async init() {
      this.initElements();
      this.initChart();
      this.bindEvents();
      this.fetchRealExchangeRate();
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
      // Currency Switch
      this.el.curBtnUsd.addEventListener('click', () => this.setCurrency('USD'));
      this.el.curBtnKrw.addEventListener('click', () => this.setCurrency('KRW'));

      // Realtime Dynamic Search with Debounce
      this.el.searchInput.addEventListener('input', (e) => {
        clearTimeout(this.searchDebounce);
        const val = e.target.value.trim();
        this.searchDebounce = setTimeout(() => {
          this.handleLiveSearch(val);
        }, 200);
      });

      this.el.searchInput.addEventListener('focus', () => {
        if (this.el.searchInput.value.trim().length > 0) {
          this.handleLiveSearch(this.el.searchInput.value.trim());
        }
      });

      document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
          this.el.searchDropdown.style.display = 'none';
        }
      });

      // Submit Form
      this.el.searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.el.searchDropdown.style.display = 'none';
        const rawInput = this.el.searchInput.value.trim();
        const resolvedTicker = this.resolveTicker(rawInput);
        if (resolvedTicker) {
          this.loadStock(resolvedTicker);
        }
      });

      // Popular Quick Chips
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

      // Range Buttons
      document.querySelectorAll('.r-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          document.querySelectorAll('.r-btn').forEach(b => b.classList.remove('active'));
          e.currentTarget.classList.add('active');
          this.chartEngine.setTimeRange(e.currentTarget.dataset.range);
        });
      });

      // Type Toggle
      document.getElementById('btnToggleType').addEventListener('click', (e) => {
        const isLine = e.currentTarget.classList.toggle('active');
        e.currentTarget.textContent = isLine ? '라인' : '캔들';
        this.chartEngine.setChartType(isLine ? 'line' : 'candle');
      });

      // Forecast Toggle
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
          }
        }
      } catch (e) {
        // Fallback: 1415.20
      }
    },

    startAutoRefresh() {
      if (this.refreshTimer) clearInterval(this.refreshTimer);
      this.refreshTimer = setInterval(() => {
        if (this.currentTicker) {
          this.loadStock(this.currentTicker, false);
        }
      }, 30000);
    },

    async handleLiveSearch(query) {
      const dropdown = this.el.searchDropdown;
      if (!query) {
        dropdown.style.display = 'none';
        return;
      }

      const qLower = query.toLowerCase();
      const results = [];

      // 1. Check Korean dictionary
      for (const [kName, ticker] of Object.entries(KOREAN_STOCK_MAP)) {
        if (kName.includes(qLower) || ticker.toLowerCase().startsWith(qLower)) {
          if (!results.some(r => r.symbol === ticker)) {
            results.push({ symbol: ticker, name: `${kName.toUpperCase()} (${ticker})` });
          }
        }
      }

      // 2. Fetch live global Yahoo Search API in background
      try {
        const searchApiUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=6&newsCount=0`;
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(searchApiUrl)}`;
        
        const res = await fetch(proxyUrl);
        if (res.ok) {
          const sJson = await res.json();
          if (sJson.quotes && sJson.quotes.length > 0) {
            sJson.quotes.forEach(q => {
              // Only US / Major equities
              if (q.symbol && !q.symbol.includes('.') && !results.some(r => r.symbol === q.symbol)) {
                results.push({ symbol: q.symbol, name: q.shortname || q.longname || q.symbol });
              }
            });
          }
        }
      } catch (e) {
        // use local dict results
      }

      // Add direct search item if empty
      if (results.length === 0) {
        const directTicker = query.toUpperCase();
        results.push({ symbol: directTicker, name: `'${directTicker}' 실시간 시세 검색` });
      }

      // Render Dropdown
      dropdown.innerHTML = '';
      results.slice(0, 7).forEach(item => {
        const div = document.createElement('div');
        div.className = 'dropdown-item';
        div.innerHTML = `
          <span class="item-ticker">${item.symbol}</span>
          <span class="item-name">${item.name}</span>
        `;
        div.addEventListener('click', () => {
          this.el.searchInput.value = item.symbol;
          dropdown.style.display = 'none';
          this.loadStock(item.symbol);
        });
        dropdown.appendChild(div);
      });
      dropdown.style.display = 'block';
    },

    resolveTicker(input) {
      if (!input) return null;
      const clean = input.trim().toLowerCase();
      if (KOREAN_STOCK_MAP[clean]) {
        return KOREAN_STOCK_MAP[clean];
      }
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
        // ALWAYS Fetch 100% REAL-TIME LIVE data from Yahoo Finance API for ANY TICKER
        const data = await this.fetchLiveStockData(ticker);

        if (data) {
          this.currentStockData = data;
          this.renderStock(data);
        } else {
          alert(`[${ticker}] 종목을 찾을 수 없습니다. 티커명을 확인해주세요.`);
        }
      } catch (err) {
        console.error('실시간 데이터 수집 실패:', err);
        alert(`[${ticker}] 실시간 주가를 불러오지 못했습니다. 티커(예: PEP, MCD, COST, TSLA, AAPL)를 확인해주세요.`);
      } finally {
        if (showSpinner) this.showLoading(false);
      }
    },

    async fetchLiveStockData(ticker) {
      const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1y`;
      
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
          // Try next proxy
        }
      }

      if (!json) throw new Error('Live API connection failed');

      const result = json.chart.result[0];
      const meta = result.meta;
      const timestamps = result.timestamp || [];
      const quotes = result.indicators.quote[0] || {};

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

      if (candles.length === 0) throw new Error('캔들 데이터가 없습니다');

      // Update last candle close to live price
      candles[candles.length - 1].close = Math.round(liveCurrentPrice * 100) / 100;
      candles[candles.length - 1].high = Math.max(candles[candles.length - 1].high, liveCurrentPrice);
      candles[candles.length - 1].low = Math.min(candles[candles.length - 1].low, liveCurrentPrice);

      // Compute SMA 20
      for (let i = 0; i < candles.length; i++) {
        if (i >= 19) {
          const sum = candles.slice(i - 19, i + 1).reduce((acc, cur) => acc + cur.close, 0);
          candles[i].sma20 = Math.round((sum / 20) * 100) / 100;
        }
      }

      // Compute 1d, 7d, 15d, 30d Predictions
      const forecast = this.computePrediction(candles, liveCurrentPrice);

      // Resolve Company Name (Korean or English)
      let companyDisplayName = meta.shortName || meta.symbol || ticker;
      for (const [kName, tVal] of Object.entries(KOREAN_STOCK_MAP)) {
        if (tVal === ticker) {
          companyDisplayName = `${kName.toUpperCase()}`;
          break;
        }
      }

      return {
        meta: {
          code: ticker,
          ticker: ticker,
          name: companyDisplayName,
          market: meta.exchangeName || 'US Equities',
          currency: 'USD',
          regularMarketTime: meta.regularMarketTime
        },
        price_summary: {
          current_price: Math.round(liveCurrentPrice * 100) / 100,
          diff: Math.round(diff * 100) / 100,
          change_pct: Math.round(changePct * 100) / 100,
          volume: meta.regularMarketVolume || candles[candles.length - 1].volume
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

      let bullScore = 50;
      if (lastClose > sma20) bullScore += 15;
      else bullScore -= 15;

      if (return5d > 0) bullScore += 10;
      else bullScore -= 10;

      if (return20d > 0) bullScore += 8;
      else bullScore -= 8;

      const upProb = Math.min(90, Math.max(12, Math.round(bullScore)));
      const downProb = 100 - upProb;

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

      this.el.tickerName.textContent = meta.code;
      this.el.companyName.textContent = meta.name ? `· ${meta.name}` : '';
      this.el.marketTag.textContent = meta.market;
      this.el.currentPrice.textContent = this.formatPrice(curPrice);

      const isUp = price.diff >= 0;
      this.el.priceChangePill.className = `price-change-pill ${isUp ? 'bullish' : 'bearish'}`;
      this.el.priceChangePill.innerHTML = this.formatDiff(price.diff, price.change_pct);

      let upProb = (data.probability && data.probability.up) ? data.probability.up : 65;
      let downProb = 100 - upProb;
      this.el.probUpText.textContent = `상승 확률 ${upProb}%`;
      this.el.probDownText.textContent = `하락 확률 ${downProb}%`;
      this.el.probBarUp.style.width = `${upProb}%`;
      this.el.probBarDown.style.width = `${downProb}%`;

      if (data.predictions_4period) {
        this.renderPredCard(this.el.pred1dPrice, this.el.pred1dPct, data.predictions_4period.p1d);
        this.renderPredCard(this.el.pred7dPrice, this.el.pred7dPct, data.predictions_4period.p7d);
        this.renderPredCard(this.el.pred15dPrice, this.el.pred15dPct, data.predictions_4period.p15d);
        this.renderPredCard(this.el.pred30dPrice, this.el.pred30dPct, data.predictions_4period.p30d);
      }

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
