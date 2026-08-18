/**
 * ALPHA-PREDICT AI: Main Application Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const App = {
    stocks: [],
    selectedStockCode: null,
    currentMarketFilter: 'ALL', // 'ALL' | 'KR' | 'US' | 'FAV'
    searchKeyword: '',
    favorites: JSON.parse(localStorage.getItem('alpha_stock_favs') || '[]'),
    chartEngine: null,

    async init() {
      this.initElements();
      this.initChart();
      this.bindEvents();
      await this.loadSummaryData();
    },

    initElements() {
      this.el = {
        totalAnalyzed: document.getElementById('statTotalAnalyzed'),
        bullishCount: document.getElementById('statBullishCount'),
        neutralCount: document.getElementById('statNeutralCount'),
        bearishCount: document.getElementById('statBearishCount'),
        lastUpdatedTime: document.getElementById('lastUpdatedTime'),
        
        searchInput: document.getElementById('stockSearchInput'),
        marketTabs: document.querySelectorAll('.market-tabs .tab-btn'),
        stockListContainer: document.getElementById('stockListContainer'),

        // Hero Header Elements
        heroStockName: document.getElementById('heroStockName'),
        heroTicker: document.getElementById('heroTicker'),
        heroMarketTag: document.getElementById('heroMarketTag'),
        heroCategoryTag: document.getElementById('heroCategoryTag'),
        heroPrice: document.getElementById('heroPrice'),
        heroDiff: document.getElementById('heroDiff'),
        heroVol: document.getElementById('heroVol'),
        hero52wHigh: document.getElementById('hero52wHigh'),
        hero52wLow: document.getElementById('hero52wLow'),
        
        // AI Gauge
        aiScoreNumber: document.getElementById('aiScoreNumber'),
        aiScoreCircleVal: document.getElementById('aiScoreCircleVal'),
        aiSignalBadge: document.getElementById('aiSignalBadge'),
        aiConfidenceText: document.getElementById('aiConfidenceText'),

        // Forecast Cards
        forecast7dPrice: document.getElementById('forecast7dPrice'),
        forecast7dPct: document.getElementById('forecast7dPct'),
        forecast7dRange: document.getElementById('forecast7dRange'),
        forecast30dPrice: document.getElementById('forecast30dPrice'),
        forecast30dPct: document.getElementById('forecast30dPct'),
        forecast30dRange: document.getElementById('forecast30dRange'),

        // Deep Analysis
        scoreTrendBar: document.getElementById('scoreTrendBar'),
        scoreTrendVal: document.getElementById('scoreTrendVal'),
        scoreMomentumBar: document.getElementById('scoreMomentumBar'),
        scoreMomentumVal: document.getElementById('scoreMomentumVal'),
        scoreSupportBar: document.getElementById('scoreSupportBar'),
        scoreSupportVal: document.getElementById('scoreSupportVal'),
        scoreVolumeBar: document.getElementById('scoreVolumeBar'),
        scoreVolumeVal: document.getElementById('scoreVolumeVal'),
        aiReasonsList: document.getElementById('aiReasonsList'),

        // Indicators Table
        indRsiVal: document.getElementById('indRsiVal'),
        indRsiBadge: document.getElementById('indRsiBadge'),
        indMacdVal: document.getElementById('indMacdVal'),
        indMacdBadge: document.getElementById('indMacdBadge'),
        indSmaVal: document.getElementById('indSmaVal'),
        indSmaBadge: document.getElementById('indSmaBadge'),
        indBbVal: document.getElementById('indBbVal'),
        indBbBadge: document.getElementById('indBbBadge'),

        // Backtest
        backtestAccuracy: document.getElementById('backtestAccuracy'),
        backtestTests: document.getElementById('backtestTests'),
      };
    },

    initChart() {
      this.chartEngine = new StockChartEngine('mainChartCanvas', 'chartTooltip');
    },

    bindEvents() {
      // Search
      this.el.searchInput.addEventListener('input', (e) => {
        this.searchKeyword = e.target.value.trim().toLowerCase();
        this.renderStockList();
      });

      // Market Tabs
      this.el.marketTabs.forEach(btn => {
        btn.addEventListener('click', (e) => {
          this.el.marketTabs.forEach(b => b.classList.remove('active'));
          e.currentTarget.classList.add('active');
          this.currentMarketFilter = e.currentTarget.dataset.filter;
          this.renderStockList();
        });
      });

      // Chart Range Buttons
      document.querySelectorAll('.chart-tool-group .range-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          document.querySelectorAll('.chart-tool-group .range-btn').forEach(b => b.classList.remove('active'));
          e.currentTarget.classList.add('active');
          this.chartEngine.setTimeRange(e.currentTarget.dataset.range);
        });
      });

      // Chart Type Buttons (Candle / Line)
      document.querySelectorAll('.chart-tool-group .type-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          document.querySelectorAll('.chart-tool-group .type-btn').forEach(b => b.classList.remove('active'));
          e.currentTarget.classList.add('active');
          this.chartEngine.setChartType(e.currentTarget.dataset.type);
        });
      });

      // Toggle Chips (AI Forecast, SMA, Bollinger)
      document.getElementById('toggleForecast').addEventListener('change', (e) => {
        this.chartEngine.toggleOption('showForecast', e.target.checked);
        e.target.parentElement.classList.toggle('active', e.target.checked);
      });
      document.getElementById('toggleSMA').addEventListener('change', (e) => {
        this.chartEngine.toggleOption('showSMA', e.target.checked);
        e.target.parentElement.classList.toggle('active', e.target.checked);
      });
      document.getElementById('toggleBollinger').addEventListener('change', (e) => {
        this.chartEngine.toggleOption('showBollinger', e.target.checked);
        e.target.parentElement.classList.toggle('active', e.target.checked);
      });
    },

    async loadSummaryData() {
      try {
        const res = await fetch('data/latest_summary.json?t=' + Date.now());
        if (!res.ok) throw new Error('데이터 로드 실패');
        const data = await res.json();

        this.stocks = data.stocks || [];
        this.updateHeaderStats(data);
        this.renderStockList();

        // Default: Select first stock (e.g. 삼성전자 or NVDA)
        if (this.stocks.length > 0) {
          const initialCode = this.stocks[0].code;
          this.selectStock(initialCode);
        }
      } catch (err) {
        console.error('데이터를 불러오는 중 오류:', err);
      }
    },

    updateHeaderStats(data) {
      if (data.market_stats) {
        this.el.totalAnalyzed.textContent = `${data.market_stats.total_analyzed}개`;
        this.el.bullishCount.textContent = `${data.market_stats.bullish_count}개`;
        this.el.neutralCount.textContent = `${data.market_stats.neutral_count}개`;
        this.el.bearishCount.textContent = `${data.market_stats.bearish_count}개`;
      }
      if (data.updated_at) {
        this.el.lastUpdatedTime.textContent = data.updated_at;
      }
    },

    renderStockList() {
      const container = this.el.stockListContainer;
      container.innerHTML = '';

      const filtered = this.stocks.filter(s => {
        // Market Filter
        if (this.currentMarketFilter === 'KR' && !(s.market === 'KOSPI' || s.market === 'KOSDAQ')) return false;
        if (this.currentMarketFilter === 'US' && !(s.market === 'NASDAQ' || s.market === 'NYSE')) return false;
        if (this.currentMarketFilter === 'FAV' && !this.favorites.includes(s.code)) return false;

        // Search Keyword
        if (this.searchKeyword) {
          const matchName = s.name.toLowerCase().includes(this.searchKeyword);
          const matchCode = s.code.toLowerCase().includes(this.searchKeyword);
          const matchCat = s.category.toLowerCase().includes(this.searchKeyword);
          if (!matchName && !matchCode && !matchCat) return false;
        }
        return true;
      });

      if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 2rem; color: var(--text-muted); font-size: 0.8rem;">검색 결과가 없습니다.</div>`;
        return;
      }

      filtered.forEach(s => {
        const isSelected = s.code === this.selectedStockCode;
        const isFav = this.favorites.includes(s.code);
        const isBullish = s.diff >= 0;
        const scoreClass = s.ai_score >= 65 ? 'bullish' : (s.ai_score >= 45 ? 'neutral' : 'bearish');

        const item = document.createElement('div');
        item.className = `stock-item ${isSelected ? 'active' : ''}`;
        item.dataset.code = s.code;

        item.innerHTML = `
          <div class="stock-info-left">
            <button class="fav-btn ${isFav ? 'active' : ''}" data-fav="${s.code}" title="관심종목">
              ${isFav ? '★' : '☆'}
            </button>
            <div class="stock-titles">
              <span class="stock-name">${s.name}</span>
              <div class="stock-meta-sub">
                <span>${s.market}</span>
                <span>•</span>
                <span>${s.category}</span>
              </div>
            </div>
          </div>
          <div class="stock-info-right">
            <span class="stock-price">${this.formatPrice(s.current_price, s.currency)}</span>
            <span class="stock-change ${isBullish ? 'bullish' : 'bearish'}">
              ${isBullish ? '+' : ''}${s.change_pct.toFixed(2)}%
            </span>
            <span class="ai-score-pill ${scoreClass}">AI ${s.ai_score}점</span>
          </div>
        `;

        // Item Click Event
        item.addEventListener('click', (e) => {
          if (e.target.closest('.fav-btn')) return;
          this.selectStock(s.code);
        });

        // Favorite Toggle Click
        const favBtn = item.querySelector('.fav-btn');
        favBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleFavorite(s.code);
        });

        container.appendChild(item);
      });
    },

    toggleFavorite(code) {
      if (this.favorites.includes(code)) {
        this.favorites = this.favorites.filter(c => c !== code);
      } else {
        this.favorites.push(code);
      }
      localStorage.setItem('alpha_stock_favs', JSON.stringify(this.favorites));
      this.renderStockList();
    },

    async selectStock(code) {
      this.selectedStockCode = code;
      this.renderStockList();

      try {
        const res = await fetch(`data/predictions/${code}.json?t=` + Date.now());
        if (!res.ok) throw new Error('종목 상세 데이터 로드 실패');
        const detail = await res.json();
        this.renderStockDetail(detail);
      } catch (err) {
        console.error('종목 데이터 로드 실패:', err);
      }
    },

    renderStockDetail(detail) {
      const meta = detail.meta;
      const price = detail.price_summary;
      const ai = detail.ai_analysis;
      const future = detail.future_forecast;
      const backtest = detail.backtest;
      const cur = meta.currency;

      // 1. Hero Header
      this.el.heroStockName.textContent = meta.name;
      this.el.heroTicker.textContent = `${meta.ticker} (${meta.code})`;
      this.el.heroMarketTag.textContent = meta.market;
      this.el.heroCategoryTag.textContent = meta.category;
      this.el.heroPrice.textContent = this.formatPrice(price.current_price, cur);

      const isBull = price.diff >= 0;
      this.el.heroDiff.className = `hero-diff-badge ${isBull ? 'bullish' : 'bearish'}`;
      this.el.heroDiff.innerHTML = `${isBull ? '▲' : '▼'} ${Math.abs(price.diff).toLocaleString()} (${isBull ? '+' : ''}${price.change_pct.toFixed(2)}%)`;

      this.el.heroVol.textContent = price.volume.toLocaleString();
      this.el.hero52wHigh.textContent = this.formatPrice(price.high_52w, cur);
      this.el.hero52wLow.textContent = this.formatPrice(price.low_52w, cur);

      // 2. AI Score Gauge & Signals
      this.el.aiScoreNumber.textContent = ai.score;
      const maxOffset = 226;
      const offset = maxOffset - (maxOffset * (ai.score / 100));
      this.el.aiScoreCircleVal.style.strokeDashoffset = offset;

      let scoreColor = '#10B981';
      let signalClass = 'bullish';
      if (ai.score < 45) {
        scoreColor = '#EF4444';
        signalClass = 'bearish';
      } else if (ai.score < 65) {
        scoreColor = '#F59E0B';
        signalClass = 'neutral';
      }
      this.el.aiScoreCircleVal.style.stroke = scoreColor;
      this.el.aiSignalBadge.className = `ai-signal-badge ${signalClass}`;
      this.el.aiSignalBadge.textContent = ai.signal_ko;
      this.el.aiConfidenceText.textContent = `신뢰도 지수: ${ai.confidence}%`;

      // 3. Forecast Cards
      // 7 Days
      const p7Diff = price.pred_7d_pct;
      const is7Up = p7Diff >= 0;
      this.el.forecast7dPrice.textContent = this.formatPrice(price.pred_7d_price, cur);
      this.el.forecast7dPct.className = `forecast-pct ${is7Up ? 'bullish' : 'bearish'}`;
      this.el.forecast7dPct.innerHTML = `${is7Up ? '▲' : '▼'} ${is7Up ? '+' : ''}${p7Diff.toFixed(2)}%`;
      if (future && future.upper && future.upper[6]) {
        this.el.forecast7dRange.textContent = `예상 구간: ${this.formatPrice(future.lower[6], cur)} ~ ${this.formatPrice(future.upper[6], cur)}`;
      }

      // 30 Days
      const p30Diff = price.pred_30d_pct;
      const is30Up = p30Diff >= 0;
      this.el.forecast30dPrice.textContent = this.formatPrice(price.pred_30d_price, cur);
      this.el.forecast30dPct.className = `forecast-pct ${is30Up ? 'bullish' : 'bearish'}`;
      this.el.forecast30dPct.innerHTML = `${is30Up ? '▲' : '▼'} ${is30Up ? '+' : ''}${p30Diff.toFixed(2)}%`;
      if (future && future.upper && future.upper.length > 0) {
        const lastIdx = future.upper.length - 1;
        this.el.forecast30dRange.textContent = `예상 구간: ${this.formatPrice(future.lower[lastIdx], cur)} ~ ${this.formatPrice(future.upper[lastIdx], cur)}`;
      }

      // 4. Deep Analysis Breakdown
      const bd = ai.breakdown || {};
      this.updateBar(this.el.scoreTrendBar, this.el.scoreTrendVal, bd.trend || 0, 25, '#6366F1');
      this.updateBar(this.el.scoreMomentumBar, this.el.scoreMomentumVal, bd.momentum || 0, 25, '#06B6D4');
      this.updateBar(this.el.scoreSupportBar, this.el.scoreSupportVal, bd.support || 0, 25, '#8B5CF6');
      this.updateBar(this.el.scoreVolumeBar, this.el.scoreVolumeVal, bd.volume || 0, 25, '#10B981');

      // AI Reasons List
      this.el.aiReasonsList.innerHTML = '';
      if (ai.key_takeaways && ai.key_takeaways.length > 0) {
        ai.key_takeaways.forEach(reason => {
          const li = document.createElement('li');
          li.textContent = reason;
          this.el.aiReasonsList.appendChild(li);
        });
      } else {
        this.el.aiReasonsList.innerHTML = `<li>기술적 지표가 중립 영역에서 박스권 흐름을 유지하고 있습니다.</li>`;
      }

      // 5. Indicators Table
      const lastCandle = detail.chart_data ? detail.chart_data[detail.chart_data.length - 1] : {};
      
      // RSI
      if (lastCandle.rsi) {
        this.el.indRsiVal.textContent = `${lastCandle.rsi}p`;
        if (lastCandle.rsi >= 70) this.setBadge(this.el.indRsiBadge, '과열 (주의)', 'bearish');
        else if (lastCandle.rsi <= 35) this.setBadge(this.el.indRsiBadge, '과매도 (반등)', 'bullish');
        else this.setBadge(this.el.indRsiBadge, '적정 구간', 'neutral');
      }

      // MACD
      if (lastCandle.macd != null && lastCandle.macd_signal != null) {
        const isMacdBull = lastCandle.macd >= lastCandle.macd_signal;
        this.el.indMacdVal.textContent = `${lastCandle.macd.toFixed(1)} / ${lastCandle.macd_signal.toFixed(1)}`;
        this.setBadge(this.el.indMacdBadge, isMacdBull ? '골든크로스' : '데드크로스', isMacdBull ? 'bullish' : 'bearish');
      }

      // SMA 20
      if (lastCandle.sma20) {
        const isSmaBull = price.current_price >= lastCandle.sma20;
        this.el.indSmaVal.textContent = this.formatPrice(lastCandle.sma20, cur);
        this.setBadge(this.el.indSmaBadge, isSmaBull ? '20일선 상회' : '20일선 하회', isSmaBull ? 'bullish' : 'bearish');
      }

      // Bollinger Bands
      if (lastCandle.bb_upper && lastCandle.bb_lower) {
        this.el.indBbVal.textContent = `${this.formatPrice(lastCandle.bb_lower, cur)} ~ ${this.formatPrice(lastCandle.bb_upper, cur)}`;
        this.setBadge(this.el.indBbBadge, '밴드 내 순항', 'neutral');
      }

      // 6. Backtest
      if (backtest) {
        this.el.backtestAccuracy.textContent = `${backtest.accuracy_pct}%`;
        this.el.backtestTests.textContent = `${backtest.test_points}회`;
      }

      // 7. Update Chart
      this.chartEngine.setData(detail);
    },

    updateBar(barEl, valEl, val, max, color) {
      const pct = (val / max) * 100;
      barEl.style.width = `${pct}%`;
      barEl.style.backgroundColor = color;
      valEl.textContent = `${val}/${max}점`;
    },

    setBadge(badgeEl, text, type) {
      badgeEl.className = `indicator-status-badge ${type}`;
      badgeEl.textContent = text;
    },

    formatPrice(val, currency = 'KRW') {
      if (val == null || isNaN(val)) return '-';
      if (currency === 'KRW') {
        return `${Math.round(val).toLocaleString()}원`;
      } else {
        return `$${Number(val).toFixed(2)}`;
      }
    }
  };

  App.init();
});
