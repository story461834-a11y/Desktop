/**
 * ALPHA-PREDICT AI: High-Performance Interactive Financial Canvas Chart Engine
 * Pure Vanilla JS & Canvas 2D API (No heavy external dependencies, 0 cost)
 */

class StockChartEngine {
  constructor(canvasId, tooltipId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.tooltip = document.getElementById(tooltipId);

    this.chartData = [];      // Historical candles
    this.forecastData = null; // Future prediction payload
    this.currency = 'KRW';

    // View Options
    this.chartType = 'candle'; // 'candle' | 'line'
    this.showForecast = true;
    this.showSMA = true;
    this.showBollinger = true;
    this.showVolume = true;
    this.timeRange = '6mo';    // '1mo' | '3mo' | '6mo' | 'all'

    // Mouse Interaction
    this.mouseX = -1;
    this.mouseY = -1;
    this.hoverIndex = -1;
    this.isHovering = false;

    this.initEvents();
    this.handleResize();
  }

  initEvents() {
    window.addEventListener('resize', () => this.handleResize());

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
      this.isHovering = true;
      this.render();
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isHovering = false;
      this.mouseX = -1;
      this.mouseY = -1;
      this.hoverIndex = -1;
      if (this.tooltip) this.tooltip.style.display = 'none';
      this.render();
    });
  }

  handleResize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    this.width = rect.width;
    this.height = rect.height || 480;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.scale(dpr, dpr);
    this.render();
  }

  setData(stockDetail) {
    this.rawCandles = stockDetail.chart_data || [];
    this.forecastData = stockDetail.future_forecast || null;
    this.currency = stockDetail.meta ? stockDetail.meta.currency : 'KRW';
    this.applyTimeFilter();
    this.render();
  }

  setTimeRange(range) {
    this.timeRange = range;
    this.applyTimeFilter();
    this.render();
  }

  applyTimeFilter() {
    if (!this.rawCandles) return;
    const countMap = {
      '1mo': 22,
      '3mo': 65,
      '6mo': 120,
      'all': this.rawCandles.length
    };
    const count = countMap[this.timeRange] || 120;
    this.chartData = this.rawCandles.slice(-count);
  }

  setChartType(type) {
    this.chartType = type;
    this.render();
  }

  toggleOption(key, value) {
    this[key] = value;
    this.render();
  }

  render() {
    if (!this.ctx || !this.chartData || this.chartData.length === 0) return;

    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Clear Canvas
    ctx.clearRect(0, 0, w, h);

    // Padding & Layout Geometry
    const padding = { top: 25, right: 65, bottom: 35, left: 15 };
    const mainHeight = h * 0.72 - padding.top;
    const volHeight = h * 0.28 - padding.bottom;
    const volTop = padding.top + mainHeight + 15;

    // Combine Historical & Forecast Data for unified bounds
    const histLen = this.chartData.length;
    const forecastLen = (this.showForecast && this.forecastData && this.forecastData.expected) 
      ? this.forecastData.expected.length 
      : 0;
    const totalPoints = histLen + forecastLen;

    if (totalPoints === 0) return;

    // Min/Max Price Calculation
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    this.chartData.forEach(c => {
      minPrice = Math.min(minPrice, c.low);
      maxPrice = Math.max(maxPrice, c.high);
      if (this.showBollinger) {
        if (c.bb_lower) minPrice = Math.min(minPrice, c.bb_lower);
        if (c.bb_upper) maxPrice = Math.max(maxPrice, c.bb_upper);
      }
    });

    if (this.showForecast && forecastLen > 0) {
      this.forecastData.lower.forEach(p => minPrice = Math.min(minPrice, p));
      this.forecastData.upper.forEach(p => maxPrice = Math.max(maxPrice, p));
    }

    const priceRange = maxPrice - minPrice || 1;
    minPrice -= priceRange * 0.05;
    maxPrice += priceRange * 0.05;

    // Volume Max
    let maxVol = 0;
    this.chartData.forEach(c => maxVol = Math.max(maxVol, c.volume));
    maxVol = maxVol * 1.15 || 1;

    // Coordinate Helpers
    const chartWidth = w - padding.left - padding.right;
    const stepX = chartWidth / (totalPoints - 1 || 1);

    const getX = (index) => padding.left + index * stepX;
    const getY = (price) => padding.top + mainHeight - ((price - minPrice) / (maxPrice - minPrice)) * mainHeight;
    const getVolY = (vol) => volTop + volHeight - (vol / maxVol) * volHeight;

    // 1. Draw Grid Lines & Price Labels
    this.drawGrid(padding, mainHeight, minPrice, maxPrice, w, h);

    // 2. Draw Bollinger Bands
    if (this.showBollinger) {
      this.drawBollingerBands(getX, getY, histLen);
    }

    // 3. Draw Moving Averages (SMA 5, 20, 60, 120)
    if (this.showSMA) {
      this.drawSMA(getX, getY, histLen);
    }

    // 4. Draw Historical Price (Candles or Line)
    if (this.chartType === 'candle') {
      this.drawCandles(getX, getY, getVolY, volTop, volHeight, stepX);
    } else {
      this.drawLineChart(getX, getY, histLen);
      this.drawVolumeBars(getX, getVolY, volTop, volHeight, stepX);
    }

    // 5. Draw AI Future Prediction Cloud & Curve
    if (this.showForecast && forecastLen > 0) {
      this.drawForecast(getX, getY, histLen, forecastLen);
    }

    // 6. Draw Crosshair & Tooltip
    if (this.isHovering && this.mouseX >= padding.left && this.mouseX <= w - padding.right) {
      this.drawCrosshair(getX, getY, padding, w, h, mainHeight, minPrice, maxPrice, histLen, forecastLen);
    }
  }

  drawGrid(pad, mainH, minP, maxP, w, h) {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = '#6B7280';
    ctx.textAlign = 'left';

    // Horizontal Price Lines (5 levels)
    const levels = 5;
    for (let i = 0; i <= levels; i++) {
      const y = pad.top + (mainH / levels) * i;
      const price = maxP - ((maxP - minP) / levels) * i;

      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();

      const priceText = this.formatPrice(price);
      ctx.fillText(priceText, w - pad.right + 8, y + 3);
    }
  }

  drawCandles(getX, getY, getVolY, volTop, volH, stepX) {
    const ctx = this.ctx;
    const candleWidth = Math.max(2, Math.min(14, stepX * 0.7));

    this.chartData.forEach((c, i) => {
      const x = getX(i);
      const isUp = c.close >= c.open;
      const color = isUp ? '#10B981' : '#EF4444';

      // 1. Volume Bar
      const volY = getVolY(c.volume);
      ctx.fillStyle = isUp ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)';
      ctx.fillRect(x - candleWidth / 2, volY, candleWidth, volTop + volH - volY);

      // 2. Candle Wick (High - Low)
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, getY(c.high));
      ctx.lineTo(x, getY(c.low));
      ctx.stroke();

      // 3. Candle Body (Open - Close)
      const openY = getY(c.open);
      const closeY = getY(c.close);
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(1.5, Math.abs(openY - closeY));

      ctx.fillStyle = color;
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    });
  }

  drawLineChart(getX, getY, len) {
    const ctx = this.ctx;
    ctx.strokeStyle = '#6366F1';
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    for (let i = 0; i < len; i++) {
      const x = getX(i);
      const y = getY(this.chartData[i].close);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Subtle Area Gradient
    const lastX = getX(len - 1);
    const firstX = getX(0);
    const grad = ctx.createLinearGradient(0, 0, 0, this.height * 0.7);
    grad.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
    grad.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

    ctx.lineTo(lastX, this.height * 0.72);
    ctx.lineTo(firstX, this.height * 0.72);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  drawVolumeBars(getX, getVolY, volTop, volH, stepX) {
    const ctx = this.ctx;
    const barWidth = Math.max(2, Math.min(14, stepX * 0.7));

    this.chartData.forEach((c, i) => {
      const x = getX(i);
      const isUp = c.close >= c.open;
      const volY = getVolY(c.volume);
      ctx.fillStyle = isUp ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)';
      ctx.fillRect(x - barWidth / 2, volY, barWidth, volTop + volH - volY);
    });
  }

  drawSMA(getX, getY, len) {
    const ctx = this.ctx;
    const lines = [
      { key: 'sma5', color: '#F59E0B', width: 1 },
      { key: 'sma20', color: '#06B6D4', width: 1.5 },
      { key: 'sma60', color: '#EC4899', width: 1.2 },
      { key: 'sma120', color: '#8B5CF6', width: 1 }
    ];

    lines.forEach(({ key, color, width }) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      let started = false;

      for (let i = 0; i < len; i++) {
        const val = this.chartData[i][key];
        if (val != null) {
          const x = getX(i);
          const y = getY(val);
          if (!started) { ctx.moveTo(x, y); started = true; }
          else { ctx.lineTo(x, y); }
        }
      }
      ctx.stroke();
    });
  }

  drawBollingerBands(getX, getY, len) {
    const ctx = this.ctx;
    // Upper & Lower lines
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    // Upper
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < len; i++) {
      const val = this.chartData[i].bb_upper;
      if (val != null) {
        const x = getX(i);
        const y = getY(val);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else { ctx.lineTo(x, y); }
      }
    }
    ctx.stroke();

    // Lower
    ctx.beginPath();
    started = false;
    for (let i = 0; i < len; i++) {
      const val = this.chartData[i].bb_lower;
      if (val != null) {
        const x = getX(i);
        const y = getY(val);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else { ctx.lineTo(x, y); }
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawForecast(getX, getY, histLen, forecastLen) {
    const ctx = this.ctx;
    const lastHist = this.chartData[histLen - 1];
    const startX = getX(histLen - 1);
    const startY = getY(lastHist.close);

    // 1. Forecast Shaded Cloud (Upper ~ Lower Band)
    ctx.beginPath();
    ctx.moveTo(startX, startY);

    for (let i = 0; i < forecastLen; i++) {
      const x = getX(histLen + i);
      const y = getY(this.forecastData.upper[i]);
      ctx.lineTo(x, y);
    }

    for (let i = forecastLen - 1; i >= 0; i--) {
      const x = getX(histLen + i);
      const y = getY(this.forecastData.lower[i]);
      ctx.lineTo(x, y);
    }
    ctx.closePath();

    const cloudGrad = ctx.createLinearGradient(startX, 0, getX(histLen + forecastLen - 1), 0);
    cloudGrad.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
    cloudGrad.addColorStop(1, 'rgba(139, 92, 246, 0.1)');
    ctx.fillStyle = cloudGrad;
    ctx.fill();

    // 2. Upper & Lower Boundary Dashed Lines
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    for (let i = 0; i < forecastLen; i++) {
      ctx.lineTo(getX(histLen + i), getY(this.forecastData.upper[i]));
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    for (let i = 0; i < forecastLen; i++) {
      ctx.lineTo(getX(histLen + i), getY(this.forecastData.lower[i]));
    }
    ctx.stroke();

    // 3. Expected Prediction Main Path Line
    ctx.setLineDash([5, 3]);
    ctx.strokeStyle = '#06B6D4';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(startX, startY);

    for (let i = 0; i < forecastLen; i++) {
      const x = getX(histLen + i);
      const y = getY(this.forecastData.expected[i]);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Vertical Divider Line (Today / Future)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(startX, 20);
    ctx.lineTo(startX, this.height - 35);
    ctx.stroke();
    ctx.setLineDash([]);

    // "AI Forecast Area" Label
    ctx.font = 'bold 10px Outfit, sans-serif';
    ctx.fillStyle = '#06B6D4';
    ctx.textAlign = 'left';
    ctx.fillText('⚡ AI PREDICTION (미래 30일)', startX + 8, 20);
  }

  drawCrosshair(getX, getY, pad, w, h, mainH, minP, maxP, histLen, forecastLen) {
    const ctx = this.ctx;
    const totalPoints = histLen + forecastLen;
    const chartWidth = w - pad.left - pad.right;
    const stepX = chartWidth / (totalPoints - 1 || 1);

    const rawIdx = Math.round((this.mouseX - pad.left) / stepX);
    const idx = Math.max(0, Math.min(totalPoints - 1, rawIdx));
    const targetX = getX(idx);

    // Crosshair Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    // Vertical Line
    ctx.beginPath();
    ctx.moveTo(targetX, pad.top);
    ctx.lineTo(targetX, h - pad.bottom);
    ctx.stroke();

    // Horizontal Line
    if (this.mouseY >= pad.top && this.mouseY <= pad.top + mainH) {
      ctx.beginPath();
      ctx.moveTo(pad.left, this.mouseY);
      ctx.lineTo(w - pad.right, this.mouseY);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Update Tooltip Content
    if (!this.tooltip) return;

    if (idx < histLen) {
      // Historical Candle Tooltip
      const c = this.chartData[idx];
      const isUp = c.close >= c.open;
      const colorClass = isUp ? 'bullish' : 'bearish';

      this.tooltip.innerHTML = `
        <span>날짜: <strong>${c.date}</strong></span>
        <span>시가: <strong>${this.formatPrice(c.open)}</strong></span>
        <span>고가: <strong>${this.formatPrice(c.high)}</strong></span>
        <span>저가: <strong>${this.formatPrice(c.low)}</strong></span>
        <span>종가: <strong class="${colorClass}">${this.formatPrice(c.close)}</strong></span>
        <span>거래량: <strong>${c.volume.toLocaleString()}</strong></span>
        ${c.sma20 ? `<span>20선: <strong>${this.formatPrice(c.sma20)}</strong></span>` : ''}
        ${c.rsi ? `<span>RSI: <strong>${c.rsi}</strong></span>` : ''}
      `;
    } else {
      // Future Forecast Tooltip
      const fIdx = idx - histLen;
      const fDate = (this.forecastData && this.forecastData.dates) ? this.forecastData.dates[fIdx] : '미래';
      const expected = this.forecastData.expected[fIdx];
      const upper = this.forecastData.upper[fIdx];
      const lower = this.forecastData.lower[fIdx];

      this.tooltip.innerHTML = `
        <span style="color: var(--accent-cyan); font-weight:700;">🔮 AI 예측일: <strong>${fDate}</strong></span>
        <span>예상 주가: <strong style="color: #06B6D4;">${this.formatPrice(expected)}</strong></span>
        <span>예상 상한(90%): <strong>${this.formatPrice(upper)}</strong></span>
        <span>예상 하한(10%): <strong>${this.formatPrice(lower)}</strong></span>
      `;
    }
    this.tooltip.style.display = 'flex';
  }

  formatPrice(val) {
    if (val == null || isNaN(val)) return '-';
    if (this.currency === 'KRW') {
      return `${Math.round(val).toLocaleString()}원`;
    } else {
      return `$${Number(val).toFixed(2)}`;
    }
  }
}

window.StockChartEngine = StockChartEngine;
