/**
 * ALPHA-PREDICT AI: Minimal White Theme Controller
 * Supports ANY NASDAQ/US Ticker Search + 1d/7d/15d/30d Forecasts + Up/Down Probability
 */

document.addEventListener('DOMContentLoaded', () => {
  const App = {
    currentTicker: 'NVDA',
    chartEngine: null,

    async init() {
      this.initElements();
      this.initChart();
      this.bindEvents();
      await this.loadStock('NVDA');
    },

    initElements() {
      this.el = {
        searchInput: document.getElementById('searchInput'),
        searchForm: document.getElementById('searchForm'),
        popularChips: document.querySelectorAll('.p-chip'),
        loadingOverlay: document.getElementById('loadingOverlay'),

        // Header Card
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

        // 4 Predictions (1d, 7d, 15d, 30d)
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
    },

    bindEvents() {
      // Search Submit
      this.el.searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const ticker = this.el.searchInput.value.trim().toUpperCase();
        if (ticker) {
          this.loadStock(ticker);
        }
      });

      // Quick Chips Click
      this.el.popularChips.forEach(chip => {
        chip.addEventListener('click', (e) => {
          this.el.popularChips.forEach(c => c.classList.remove('active'));
          e.currentTarget.classList.add('active');
          const ticker = e.currentTarget.dataset.ticker;
          this.el.searchInput.value = ticker;
          this.loadStock(ticker);
        });
      });

      // Chart Range Buttons
      document.querySelectorAll('.r-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          document.querySelectorAll('.r-btn').forEach(b => b.classList.remove('active'));
          e.currentTarget.classList.add('active');
          this.chartEngine.setTimeRange(e.currentTarget.dataset.range);
        });
      });

      // Chart Type Buttons
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
        // 1. Try local JSON first (pre-computed)
        let data = null;
        try {
          const res = await fetch(`data/predictions/${ticker}.json?t=` + Date.now());
          if (res.ok) {
            data = await res.json();
          }
        } catch (e) {
          // ignore, fallback to live fetch
        }

        // 2. If not in local JSON, fetch LIVE from Yahoo Finance
        if (!data) {
          data = await this.fetchLiveStockData(ticker);
        }

        if (data) {
          this.renderStock(data);
        } else {
          alert(`[${ticker}] 종목 데이터를 가져올 수 없습니다. 올바른 미국 티커를 입력해주세요.`);
        }
      } catch (err) {
        console.error('종목 로드 에러:', err);
        alert(`데이터를 불러오는 중 오류가 발생했습니다: ${err.message}`);
      } finally {
        this.showLoading(false);
      }
    },

    async fetchLiveStockData(ticker) {
      // Direct Yahoo Finance Chart API with CORS fallback
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1y`;
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`;

      let response = null;
      try {
        response = await fetch(proxyUrl);
      } catch (e) {
        response = await fetch(yahooUrl);
      }

      if (!response.ok) throw new Error('종목을 찾을 수 없습니다');
      const json = await response.json();

      const result = json.chart && json.chart.result && json.chart.result[0];
      if (!result) throw new Error('유효하지 않은 종목 데이터');

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

      // Calculate SMA 20
      for (let i = 0; i < candles.length; i++) {
        if (i >= 19) {
          const sum = candles.slice(i - 19, i + 1).reduce((acc, cur) => acc + cur.close, 0);
          candles[i].sma20 = Math.round((sum / 20) * 100) / 100;
        }
      }

      // Run Client-Side AI Prediction Engine
      const forecast = this.computeClientPrediction(candles);

      const latest = candles[candles.length - 1];
      const prev = candles[candles.length - 2] || latest;
      const diff = latest.close - prev.close;
      const changePct = (diff / prev.close) * 100;

      return {
        meta: {
          code: ticker,
          ticker: ticker,
          name: meta.shortName || meta.symbol || ticker,
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

    computeClientPrediction(candles) {
      if (candles.length < 30) {
        return {
          future_forecast: { dates: [], expected: [], upper: [], lower: [] },
          probability: { up: 50, down: 50 },
          predictions_4period: {}
        };
      }

      const lastClose = candles[candles.length - 1].close;
      const lastDateStr = candles[candles.length - 1].date;
      const n = candles.length;

      // Moving Averages & Trend
      const sma20 = candles[n - 1].sma20 || lastClose;
      const return5d = (lastClose - candles[n - 5].close) / candles[n - 5].close;
      const return20d = (lastClose - candles[n - 20].close) / candles[n - 20].close;

      // Volatility (Average True Range estimate)
      let sumVol = 0;
      for (let i = n - 14; i < n; i++) {
        sumVol += (candles[i].high - candles[i].low);
      }
      const dailyVol = Math.max(sumVol / 14, lastClose * 0.015);

      // Up/Down Probability Score (0 ~ 100)
      let bullScore = 50;
      if (lastClose > sma20) bullScore += 12;
      else bullScore -= 12;

      if (return5d > 0) bullScore += 8;
      else bullScore -= 8;

      if (return20d > 0) bullScore += 6;
      else bullScore -= 6;

      const upProb = Math.min(88, Math.max(15, Math.round(bullScore)));
      const downProb = 100 - upProb;

      // Future 30 Days Forecast Generation
      const futureDates = [];
      const expectedArr = [];
      const upperArr = [];
      const lowerArr = [];

      let curr = new Date(lastDateStr);
      const trendSlope = (return20d * 0.4) / 20; // Daily drift

      for (let i = 1; i <= 30; i++) {
        curr.setDate(curr.getDate() + 1);
        if (curr.getDay() === 0 || curr.getDay() === 6) {
          i--;
          continue;
        }
        futureDates.push(curr.toISOString().split('T')[0]);

        // Expected Price Path
        const drift = trendSlope * i;
        const pred = lastClose * (1 + drift);
        const spread = dailyVol * Math.sqrt(i) * 1.4;

        expectedArr.push(Math.round(pred * 100) / 100);
        upperArr.push(Math.round((pred + spread) * 100) / 100);
        lowerArr.push(Math.round(Math.max(pred - spread, pred * 0.5) * 100) / 100);
      }

      // 4 Target Periods: 1일(idx 0), 7일(idx 6), 15일(idx 14), 30일(idx 29)
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

      // 1. Stock Title & Price
      this.el.tickerName.textContent = meta.code;
      this.el.companyName.textContent = meta.name ? `· ${meta.name}` : '';
      this.el.marketTag.textContent = meta.market;
      this.el.currentPrice.textContent = `$${curPrice.toFixed(2)}`;

      const isUp = price.diff >= 0;
      this.el.priceChangePill.className = `price-change-pill ${isUp ? 'bullish' : 'bearish'}`;
      this.el.priceChangePill.innerHTML = `${isUp ? '▲ +' : '▼ '}$${Math.abs(price.diff).toFixed(2)} (${isUp ? '+' : ''}${price.change_pct.toFixed(2)}%)`;

      // 2. Up/Down Probability
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

      // 4. Render Chart
      this.chartEngine.setData(data.chart_data, forecast);
    },

    renderPredCard(priceEl, pctEl, pData) {
      if (!pData) return;
      priceEl.textContent = `$${pData.price.toFixed(2)}`;
      const isUp = pData.pct >= 0;
      pctEl.className = `pred-pct-val ${isUp ? 'bullish' : 'bearish'}`;
      pctEl.textContent = `${isUp ? '▲ +' : '▼ '}${pData.pct.toFixed(2)}%`;
    }
  };

  App.init();
});
