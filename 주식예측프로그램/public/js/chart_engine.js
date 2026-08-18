/**
 * ALPHA-PREDICT AI: White Minimal Theme Canvas Chart Engine
 */

class StockChartEngine {
  constructor(canvasId, tooltipId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.tooltip = document.getElementById(tooltipId);

    this.chartData = [];
    this.forecastData = null;

    // View Options
    this.chartType = 'candle'; // 'candle' | 'line'
    this.showForecast = true;
    this.showSMA = true;
    this.timeRange = '3mo';

    // Interaction
    this.mouseX = -1;
    this.mouseY = -1;
    this.isHovering = false;

    this.initEvents();
    this.handleResize();
  }

  initEvents() {
    window.addEventListener('resize', () => this.handleResize());

    // Mouse Events
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
      this.isHovering = true;
      this.render();
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.clearHover();
    });

    // Touch Events for Mobile
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = e.touches[0].clientX - rect.left;
        this.mouseY = e.touches[0].clientY - rect.top;
        this.isHovering = true;
        this.render();
      }
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = e.touches[0].clientX - rect.left;
        this.mouseY = e.touches[0].clientY - rect.top;
        this.isHovering = true;
        this.render();
      }
    }, { passive: true });

    this.canvas.addEventListener('touchend', () => {
      setTimeout(() => this.clearHover(), 2000);
    });
  }

  clearHover() {
    this.isHovering = false;
    this.mouseX = -1;
    this.mouseY = -1;
    if (this.tooltip) this.tooltip.style.display = 'none';
    this.render();
  }

  handleResize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.width = rect.width;
    this.height = rect.height || 330;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.scale(dpr, dpr);
    this.render();
  }

  setData(candles, forecast) {
    this.rawCandles = candles || [];
    this.forecastData = forecast || null;
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
      '3mo': 60,
      '6mo': 120,
      'all': this.rawCandles.length
    };
    const count = countMap[this.timeRange] || 60;
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

    // Clear White Canvas
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    const padding = { top: 20, right: 48, bottom: 25, left: 10 };
    const mainHeight = h * 0.70 - padding.top;
    const volHeight = h * 0.30 - padding.bottom;
    const volTop = padding.top + mainHeight + 10;

    const histLen = this.chartData.length;
    const forecastLen = (this.showForecast && this.forecastData && this.forecastData.expected) 
      ? this.forecastData.expected.length 
      : 0;
    const totalPoints = histLen + forecastLen;

    if (totalPoints === 0) return;

    let minPrice = Infinity;
    let maxPrice = -Infinity;

    this.chartData.forEach(c => {
      minPrice = Math.min(minPrice, c.low);
      maxPrice = Math.max(maxPrice, c.high);
    });

    if (this.showForecast && forecastLen > 0) {
      this.forecastData.lower.forEach(p => minPrice = Math.min(minPrice, p));
      this.forecastData.upper.forEach(p => maxPrice = Math.max(maxPrice, p));
    }

    const priceRange = maxPrice - minPrice || 1;
    minPrice -= priceRange * 0.04;
    maxPrice += priceRange * 0.04;

    let maxVol = 0;
    this.chartData.forEach(c => maxVol = Math.max(maxVol, c.volume));
    maxVol = maxVol * 1.2 || 1;

    const chartWidth = w - padding.left - padding.right;
    const stepX = chartWidth / (totalPoints - 1 || 1);

    const getX = (index) => padding.left + index * stepX;
    const getY = (price) => padding.top + mainHeight - ((price - minPrice) / (maxPrice - minPrice)) * mainHeight;
    const getVolY = (vol) => volTop + volHeight - (vol / maxVol) * volHeight;

    // 1. Grid & Price Labels
    this.drawGrid(padding, mainHeight, minPrice, maxPrice, w);

    // 2. SMA 20 Line
    if (this.showSMA) {
      this.drawSMA(getX, getY, histLen);
    }

    // 3. Historical Candles or Line
    if (this.chartType === 'candle') {
      this.drawCandles(getX, getY, getVolY, volTop, volHeight, stepX);
    } else {
      this.drawLine(getX, getY, histLen);
      this.drawVolume(getX, getVolY, volTop, volHeight, stepX);
    }

    // 4. AI Future Forecast Cloud
    if (this.showForecast && forecastLen > 0) {
      this.drawForecast(getX, getY, histLen, forecastLen);
    }

    // 5. Crosshair & Tooltip
    if (this.isHovering && this.mouseX >= padding.left && this.mouseX <= w - padding.right) {
      this.drawCrosshair(getX, getY, padding, w, h, mainHeight, minPrice, maxPrice, histLen, forecastLen);
    }
  }

  drawGrid(pad, mainH, minP, maxP, w) {
    const ctx = this.ctx;
    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 1;
    ctx.font = '9px Inter, sans-serif';
    ctx.fillStyle = '#94A3B8';
    ctx.textAlign = 'left';

    const levels = 4;
    for (let i = 0; i <= levels; i++) {
      const y = pad.top + (mainH / levels) * i;
      const price = maxP - ((maxP - minP) / levels) * i;

      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();

      ctx.fillText(`$${price.toFixed(1)}`, w - pad.right + 4, y + 3);
    }
  }

  drawCandles(getX, getY, getVolY, volTop, volH, stepX) {
    const ctx = this.ctx;
    const candleWidth = Math.max(2, Math.min(10, stepX * 0.65));

    this.chartData.forEach((c, i) => {
      const x = getX(i);
      const isUp = c.close >= c.open;
      const color = isUp ? '#10B981' : '#EF4444';

      // Volume Bar
      const volY = getVolY(c.volume);
      ctx.fillStyle = isUp ? '#D1FAE5' : '#FEE2E2';
      ctx.fillRect(x - candleWidth / 2, volY, candleWidth, volTop + volH - volY);

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, getY(c.high));
      ctx.lineTo(x, getY(c.low));
      ctx.stroke();

      // Body
      const openY = getY(c.open);
      const closeY = getY(c.close);
      ctx.fillStyle = color;
      ctx.fillRect(x - candleWidth / 2, Math.min(openY, closeY), candleWidth, Math.max(1.5, Math.abs(openY - closeY)));
    });
  }

  drawLine(getX, getY, len) {
    const ctx = this.ctx;
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 2.2;
    ctx.beginPath();

    for (let i = 0; i < len; i++) {
      const x = getX(i);
      const y = getY(this.chartData[i].close);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  drawVolume(getX, getVolY, volTop, volH, stepX) {
    const ctx = this.ctx;
    const barWidth = Math.max(2, Math.min(10, stepX * 0.65));
    this.chartData.forEach((c, i) => {
      const x = getX(i);
      const isUp = c.close >= c.open;
      const volY = getVolY(c.volume);
      ctx.fillStyle = isUp ? '#D1FAE5' : '#FEE2E2';
      ctx.fillRect(x - barWidth / 2, volY, barWidth, volTop + volH - volY);
    });
  }

  drawSMA(getX, getY, len) {
    const ctx = this.ctx;
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    let started = false;

    for (let i = 0; i < len; i++) {
      const val = this.chartData[i].sma20;
      if (val != null) {
        const x = getX(i);
        const y = getY(val);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else { ctx.lineTo(x, y); }
      }
    }
    ctx.stroke();
  }

  drawForecast(getX, getY, histLen, forecastLen) {
    const ctx = this.ctx;
    const lastHist = this.chartData[histLen - 1];
    const startX = getX(histLen - 1);
    const startY = getY(lastHist.close);

    // 1. Shaded Blue Cloud
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    for (let i = 0; i < forecastLen; i++) {
      ctx.lineTo(getX(histLen + i), getY(this.forecastData.upper[i]));
    }
    for (let i = forecastLen - 1; i >= 0; i--) {
      ctx.lineTo(getX(histLen + i), getY(this.forecastData.lower[i]));
    }
    ctx.closePath();

    const cloudGrad = ctx.createLinearGradient(startX, 0, getX(histLen + forecastLen - 1), 0);
    cloudGrad.addColorStop(0, 'rgba(37, 99, 235, 0.18)');
    cloudGrad.addColorStop(1, 'rgba(37, 99, 235, 0.04)');
    ctx.fillStyle = cloudGrad;
    ctx.fill();

    // 2. Expected Path Line
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = '#2563EB';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(startX, startY);

    for (let i = 0; i < forecastLen; i++) {
      ctx.lineTo(getX(histLen + i), getY(this.forecastData.expected[i]));
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Vertical Divider
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(startX, 15);
    ctx.lineTo(startX, this.height - 25);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawCrosshair(getX, getY, pad, w, h, mainH, minP, maxP, histLen, forecastLen) {
    const ctx = this.ctx;
    const totalPoints = histLen + forecastLen;
    const chartWidth = w - pad.left - pad.right;
    const stepX = chartWidth / (totalPoints - 1 || 1);

    const rawIdx = Math.round((this.mouseX - pad.left) / stepX);
    const idx = Math.max(0, Math.min(totalPoints - 1, rawIdx));
    const targetX = getX(idx);

    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    ctx.beginPath();
    ctx.moveTo(targetX, pad.top);
    ctx.lineTo(targetX, h - pad.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    if (!this.tooltip) return;

    if (idx < histLen) {
      const c = this.chartData[idx];
      const isUp = c.close >= c.open;
      this.tooltip.innerHTML = `
        <span>${c.date.slice(5)}</span>
        <span>종가: <strong style="color: ${isUp ? '#10B981' : '#EF4444'};">$${c.close.toFixed(2)}</strong></span>
        <span>거래량: <strong>${(c.volume / 1000000).toFixed(1)}M</strong></span>
      `;
    } else {
      const fIdx = idx - histLen;
      const fDate = this.forecastData.dates[fIdx];
      const expected = this.forecastData.expected[fIdx];
      this.tooltip.innerHTML = `
        <span style="color: #2563EB; font-weight:700;">예측일: ${fDate.slice(5)}</span>
        <span>예상가: <strong style="color: #2563EB;">$${expected.toFixed(2)}</strong></span>
        <span>구간: <strong>$${this.forecastData.lower[fIdx].toFixed(1)}~$${this.forecastData.upper[fIdx].toFixed(1)}</strong></span>
      `;
    }
    this.tooltip.style.display = 'flex';
  }
}

window.StockChartEngine = StockChartEngine;
