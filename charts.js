/* charts.js
   Render charts inside chat messages (Bar / Line)
*/

window.ChartHelper = (function () {

  const measureColors = {
    sales: "#4ade80",
    revenue: "#60a5fa",
    profit: "#f59e0b",
    quantity: "#c084fc",
    trips: "#34d399",
    default: "#38bdf8"
  };

  function getColor(measure = "") {
    const key = (measure || "").toLowerCase();
    return measureColors[key] || measureColors.default;
  }

  function createCanvas() {
    const msgEls = document.querySelectorAll(".msg.bot");
    const last = msgEls[msgEls.length - 1];
    if (!last) return null;
    const canvas = document.createElement("canvas");
    canvas.style.marginTop = "8px";
    canvas.style.width = "100%";
    canvas.height = 200;
    last.appendChild(canvas);
    return canvas;
  }

  function drawBarChart(labels, values, measure) {
    const canvas = createCanvas();
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    // adapt canvas width for high-DPI
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.height;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.scale(dpr, dpr);

    const color = getColor(measure);
    const max = Math.max(...values) || 1;
    ctx.clearRect(0,0,w,h);
    ctx.font = "12px Inter";
    ctx.fillStyle = "#cbd5e1";

    const paddingLeft = 20;
    const paddingBottom = 30;
    const availableW = w - paddingLeft - 20;
    const barW = availableW / labels.length;

    labels.forEach((label, i) => {
      const val = values[i];
      const barH = (val / max) * (h - 60);
      const x = paddingLeft + i * barW + (barW * 0.1);
      const y = h - paddingBottom - barH;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, barW * 0.8, barH);

      ctx.fillStyle = "#dbe6f7";
      const lbl = String(label).substring(0, 12);
      ctx.fillText(lbl, x, h - 10);
    });
  }

  function drawLineChart(labels, values, measure) {
    const canvas = createCanvas();
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.height;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.scale(dpr, dpr);

    const color = getColor(measure);
    const max = Math.max(...values) || 1;
    ctx.clearRect(0,0,w,h);
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    values.forEach((val, i) => {
      const x = (w / (values.length - 1)) * i;
      const y = h - 40 - (val / max) * (h - 80);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  return {
    drawBarChart,
    drawLineChart
  };

})();
