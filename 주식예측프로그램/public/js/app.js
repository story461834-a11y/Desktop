/**
 * ALPHA-PREDICT AI: Mobile App Controller (US Stocks Only)
 */

document.addEventListener('DOMContentLoaded', () => {
  const MobileApp = {
    stocks: [],
    selectedCode: 'NVDA',
    favorites: JSON.parse(localStorage.getItem('alpha_us_favs') || '["NVDA", "TSLA", "AAPL"]'),
    chartEngine: null,
    searchKeyword: '',

    async init() {
      this.initElements();
      this.initChart();
      this.bindEvents();
      await this.loadData();
    },

    initElements() {
      this.el = {
        lastUpdatedTime: document.getElementById('lastUpdatedTime'),
        stockChipsContainer: document.getElementById('stockChipsContainer'),
        searchInput: document.getElementById('searchInput'),

        // Hero Card
        heroStockName: document.getElementById('heroStockName'),
        heroTickerTag: document.getElementById('heroTickerTag'),
        heroCategoryLabel: document.getElementById('heroCategoryLabel'),
        favToggleBtn: document.getElementById('favToggleBtn'),
        currentPriceVal: document.getElementById('currentPriceVal'),
        priceDiffBadge: document.getElementById('priceDiffBadge'),

        // Compact Gauge
        gaugeValCircle: document.getElementById('gaugeValCircle'),
        gaugeScoreText: document.getElementById('gaugeScoreText'),
        gaugeSignalText: document.getElementById('gaugeSignalText'),

        // Forecast Grid
        forecast7dPrice: document.getElementById('forecast7dPrice'),
        forecast7dPct: document.getElementById('forecast7dPct'),
        forecast30dPrice: document.getElementById('forecast30dPrice'),
        forecast30dPct: document.getElementById('forecast30dPct'),

        // Segmented Tabs
        segBtns: document.querySelectorAll('.seg-btn'),
        tabPanels: document.querySelectorAll('.tab-panel'),
        bottomNavBtns: document.querySelectorAll('.nav-tab-item'),

        // Deep Analysis Bars
        scoreTrendBar: document.getElementById('scoreTrendBar'),
        scoreTrendVal: document.getElementById('scoreTrendVal'),
        scoreMomentumBar: document.getElementById('scoreMomentumBar'),
        scoreMomentumVal: document.getElementById('scoreMomentumVal'),
        scoreSupportBar: document.getElementById('scoreSupportBar'),
        scoreSupportVal: document.getElementById('scoreSupportVal'),
        scoreVolumeBar: document.getElementById('scoreVolumeBar'),
        scoreVolumeVal: document.getElementById('scoreVolumeVal'),
        aiTakeawaysList: document.getElementById('aiTakeawaysList'),

        // Indicators Table
        indRsiVal: document.getElementById('indRsiVal'),
        indRsiBadge: document.getElementById('indRsiBadge'),
        indMacdVal: document.getElementById('indMacdVal'),
        indMacdBadge: document.getElementById('indMacdBadge'),
        indSmaVal: document.getElementById('indSmaVal'),
        indSmaBadge: document.getElementById('indSmaBadge'),
        indBbVal: document.getElementById('indBbVal'),
        indBbBadge: document.getElementById('indBbBadge'),

        // All Stocks List Panel
        allStocksListContainer: document.getElementById('allStocksListContainer'),
        backtestAccuracy: document.getElementById('backtestAccuracy'),
      };
    },

    initChart() {
      this.chartEngine = new StockChartEngine('mainChartCanvas', 'touchTooltip');
    },

    bindEvents() {
      // Search
      this.el.searchInput.addEventListener('input', (e) => {
        this.searchKeyword = e.target.value.trim().toLowerCase();
        this.renderChips();
        this.renderAllStocksList();
      });

      // Favorite Toggle in Hero
      this.el.favToggleBtn.addEventListener('click', () => {
        this.toggleFavorite(this.selectedCode);
      });

      // Chart Range Chips
      document.querySelectorAll('.r-chip').forEach(btn => {
        btn.addEventListener('click', (e) => {
          document.querySelectorAll('.r-chip').forEach(b => b.classList.remove('active'));
          e.currentTarget.classList.add('active');
          this.chartEngine.setTimeRange(e.currentTarget.dataset.range);
        });
      });

      // Chart Type Toggles
      document.getElementById('toggleForecast').addEventListener('click', (e) => {
        const isActive = e.currentTarget.classList.toggle('active');
        this.chartEngine.toggleOption('showForecast', isActive);
      });
      document.getElementById('toggleType').addEventListener('click', (e) => {
        const isLine = e.currentTarget.classList.toggle('active');
        e.currentTarget.textContent = isLine ? '라인' : '캔들';
        this.chartEngine.setChartType(isLine ? 'line' : 'candle');
      });

      // Segmented Tabs
      this.el.segBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          this.switchTab(e.currentTarget.dataset.tab);
        });
      });

      // Bottom Navigation Tabs
      this.el.bottomNavBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const item = e.target.closest('.nav-tab-item');
          if (!item) return;
          const tabKey = item.dataset.target;
          this.switchTab(tabKey);
        });
      });
    },

    switchTab(tabKey) {
      this.el.segBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tabKey));
      this.el.tabPanels.forEach(p => p.classList.toggle('active', p.id === `tab-${tabKey}`));
      this.el.bottomNavBtns.forEach(b => b.classList.toggle('active', b.dataset.target === tabKey));
      
      if (tabKey === 'chart') {
        setTimeout(() => this.chartEngine.handleResize(), 50);
      }
    },

    async loadData() {
      try {
        const res = await fetch('data/latest_summary.json?t=' + Date.now());
        if (!res.ok) throw new Error('데이터 로드 실패');
        const data = await res.json();

        this.stocks = data.stocks || [];
        if (data.updated_at) {
          this.el.lastUpdatedTime.textContent = data.updated_at.split(' ')[0];
        }

        this.renderChips();
        this.renderAllStocksList();

        // Select first stock
        if (this.stocks.length > 0) {
          const initialCode = this.stocks[0].code;
          this.selectStock(initialCode);
        }
      } catch (err) {
        console.error('데이터 로드 중 오류:', err);
      }
    },

    renderChips() {
      const container = this.el.stockChipsContainer;
      container.innerHTML = '';

      const filtered = this.stocks.filter(s => {
        if (!this.searchKeyword) return true;
        return s.name.toLowerCase().includes(this.searchKeyword) ||
               s.code.toLowerCase().includes(this.searchKeyword) ||
               s.category.toLowerCase().includes(this.searchKeyword);
      });

      filtered.forEach(s => {
        const isSelected = s.code === this.selectedCode;
        const isUp = s.diff >= 0;

        const chip = document.createElement('div');
        chip.className = `stock-chip ${isSelected ? 'active' : ''}`;
        chip.dataset.code = s.code;

        chip.innerHTML = `
          <span class="chip-ticker">${s.code}</span>
          <span class="chip-change ${isUp ? 'bullish' : 'bearish'}">
            ${isUp ? '+' : ''}${s.change_pct.toFixed(1)}%
          </span>
        `;

        chip.addEventListener('click', () => {
          this.selectStock(s.code);
        });

        container.appendChild(chip);
      });
    },

    renderAllStocksList() {
      const container = this.el.allStocksListContainer;
      container.innerHTML = '';

      this.stocks.forEach(s => {
        const isSelected = s.code === this.selectedCode;
        const isUp = s.diff >= 0;
        const scoreClass = s.ai_score >= 65 ? 'bullish' : (s.ai_score >= 45 ? 'neutral' : 'bearish');

        const card = document.createElement('div');
        card.className = `stock-list-card ${isSelected ? 'active' : ''}`;
        card.innerHTML = `
          <div>
            <strong style="font-size:0.85rem;">${s.code}</strong>
            <div style="font-size:0.7rem; color:var(--text-sub);">${s.name}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:700; font-size:0.85rem;">$${s.current_price.toFixed(2)}</div>
            <span style="font-size:0.7rem;" class="${isUp ? 'bullish' : 'bearish'}">
              ${isUp ? '▲ +' : '▼ '}${s.change_pct.toFixed(2)}%
            </span>
          </div>
          <div>
            <span class="badge-status ${scoreClass}">AI ${s.ai_score}점</span>
          </div>
        `;

        card.addEventListener('click', () => {
          this.selectStock(s.code);
          this.switchTab('chart');
        });

        container.appendChild(card);
      });
    },

    toggleFavorite(code) {
      if (this.favorites.includes(code)) {
        this.favorites = this.favorites.filter(c => c !== code);
      } else {
        this.favorites.push(code);
      }
      localStorage.setItem('alpha_us_favs', JSON.stringify(this.favorites));
      this.el.favToggleBtn.classList.toggle('active', this.favorites.includes(code));
    },

    async selectStock(code) {
      this.selectedCode = code;
      this.renderChips();

      // Scroll chip into view smoothly
      const activeChip = this.el.stockChipsContainer.querySelector(`.stock-chip[data-code="${code}"]`);
      if (activeChip) {
        activeChip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }

      try {
        const res = await fetch(`data/predictions/${code}.json?t=` + Date.now());
        if (!res.ok) throw new Error('종목 데이터 로드 실패');
        const detail = await res.json();
        this.renderStockDetail(detail);
      } catch (err) {
        console.error('종목 로드 에러:', err);
      }
    },

    renderStockDetail(detail) {
      const meta = detail.meta;
      const price = detail.price_summary;
      const ai = detail.ai_analysis;
      const future = detail.future_forecast;
      const backtest = detail.backtest;

      // 1. Hero Info
      this.el.heroStockName.textContent = meta.name.split('(')[0].trim();
      this.el.heroTickerTag.textContent = meta.ticker;
      this.el.heroCategoryLabel.textContent = meta.category;
      this.el.favToggleBtn.classList.toggle('active', this.favorites.includes(meta.code));

      this.el.currentPriceVal.textContent = `$${price.current_price.toFixed(2)}`;
      const isUp = price.diff >= 0;
      this.el.priceDiffBadge.className = `price-diff-badge ${isUp ? 'bullish' : 'bearish'}`;
      this.el.priceDiffBadge.innerHTML = `${isUp ? '▲ +' : '▼ '}$${Math.abs(price.diff).toFixed(2)} (${isUp ? '+' : ''}${price.change_pct.toFixed(2)}%)`;

      // 2. Compact AI Gauge
      this.el.gaugeScoreText.textContent = ai.score;
      const maxDash = 126;
      const offset = maxDash - (maxDash * (ai.score / 100));
      this.el.gaugeValCircle.style.strokeDashoffset = offset;

      let scoreColor = '#10B981';
      let signalClass = 'bullish';
      if (ai.score < 45) {
        scoreColor = '#EF4444';
        signalClass = 'bearish';
      } else if (ai.score < 65) {
        scoreColor = '#F59E0B';
        signalClass = 'neutral';
      }
      this.el.gaugeValCircle.style.stroke = scoreColor;
      this.el.gaugeSignalText.className = `gauge-signal ${signalClass}`;
      this.el.gaugeSignalText.textContent = ai.signal_ko;

      // 3. Quick Forecast Grid
      this.el.forecast7dPrice.textContent = `$${price.pred_7d_price.toFixed(2)}`;
      const is7Up = price.pred_7d_pct >= 0;
      this.el.forecast7dPct.className = `mini-card-pct ${is7Up ? 'bullish' : 'bearish'}`;
      this.el.forecast7dPct.textContent = `${is7Up ? '▲ +' : '▼ '}${price.pred_7d_pct.toFixed(2)}%`;

      this.el.forecast30dPrice.textContent = `$${price.pred_30d_price.toFixed(2)}`;
      const is30Up = price.pred_30d_pct >= 0;
      this.el.forecast30dPct.className = `mini-card-pct ${is30Up ? 'bullish' : 'bearish'}`;
      this.el.forecast30dPct.textContent = `${is30Up ? '▲ +' : '▼ '}${price.pred_30d_pct.toFixed(2)}%`;

      // 4. 4-Pillar Score Bars
      const bd = ai.breakdown || {};
      this.updateBar(this.el.scoreTrendBar, this.el.scoreTrendVal, bd.trend || 0, 25, '#6366F1');
      this.updateBar(this.el.scoreMomentumBar, this.el.scoreMomentumVal, bd.momentum || 0, 25, '#06B6D4');
      this.updateBar(this.el.scoreSupportBar, this.el.scoreSupportVal, bd.support || 0, 25, '#8B5CF6');
      this.updateBar(this.el.scoreVolumeBar, this.el.scoreVolumeVal, bd.volume || 0, 25, '#10B981');

      // AI Takeaways
      this.el.aiTakeawaysList.innerHTML = '';
      if (ai.key_takeaways && ai.key_takeaways.length > 0) {
        ai.key_takeaways.forEach(r => {
          const li = document.createElement('li');
          li.textContent = r;
          this.el.aiTakeawaysList.appendChild(li);
        });
      }

      // 5. Indicators Table
      const lastCandle = detail.chart_data ? detail.chart_data[detail.chart_data.length - 1] : {};
      if (lastCandle.rsi) {
        this.el.indRsiVal.textContent = `${lastCandle.rsi}p`;
        this.setBadge(this.el.indRsiBadge, lastCandle.rsi >= 70 ? '과열' : (lastCandle.rsi <= 35 ? '과매도' : '적정'), lastCandle.rsi >= 70 ? 'bearish' : (lastCandle.rsi <= 35 ? 'bullish' : 'neutral'));
      }
      if (lastCandle.macd != null) {
        const isMacdBull = lastCandle.macd >= lastCandle.macd_signal;
        this.el.indMacdVal.textContent = `${lastCandle.macd.toFixed(1)}`;
        this.setBadge(this.el.indMacdBadge, isMacdBull ? '골든크로스' : '데드크로스', isMacdBull ? 'bullish' : 'bearish');
      }
      if (lastCandle.sma20) {
        const isSmaBull = price.current_price >= lastCandle.sma20;
        this.el.indSmaVal.textContent = `$${lastCandle.sma20.toFixed(1)}`;
        this.setBadge(this.el.indSmaBadge, isSmaBull ? '20선 상회' : '20선 하회', isSmaBull ? 'bullish' : 'bearish');
      }
      if (lastCandle.bb_upper && lastCandle.bb_lower) {
        this.el.indBbVal.textContent = `$${lastCandle.bb_lower.toFixed(0)}~$${lastCandle.bb_upper.toFixed(0)}`;
        this.setBadge(this.el.indBbBadge, '순항', 'neutral');
      }

      // 6. Backtest
      if (backtest && this.el.backtestAccuracy) {
        this.el.backtestAccuracy.textContent = `${backtest.accuracy_pct}%`;
      }

      // 7. Render Chart
      this.chartEngine.setData(detail);
    },

    updateBar(barEl, valEl, val, max, color) {
      const pct = (val / max) * 100;
      barEl.style.width = `${pct}%`;
      barEl.style.backgroundColor = color;
      valEl.textContent = `${val}/${max}점`;
    },

    setBadge(badgeEl, text, type) {
      badgeEl.className = `badge-status ${type}`;
      badgeEl.textContent = text;
    }
  };

  MobileApp.init();
});
