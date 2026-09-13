import { readTxns, formatCurrency } from './tx.js';

export function computeChartSummary() {
  const txns = readTxns();
  const income = txns.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0);
  const expense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0);
  const net = income - expense;
  return { income, expense, net };
}

export function categoryAggregation() {
  // only consider expenses for category aggregation
  const txns = readTxns().filter(t => t.type === 'expense');
  const byCat = {};
  txns.forEach(t => {
    const c = t.category || 'other';
    byCat[c] = (byCat[c] || 0) + Number(t.amount || 0);
  });
  // filter out zero/empty categories
  const entries = Object.entries(byCat).filter(([k, v]) => Number(v) > 0);
  const labels = entries.map(e => e[0]);
  const data = entries.map(e => e[1]);
  return { labels, data };
}

export function timeseriesAggregation() {
  const txns = readTxns();
  // group by ISO date (day)
  const byDate = {};
  txns.forEach(t => {
    const day = (new Date(t.date)).toISOString().slice(0, 10);
    byDate[day] = (byDate[day] || 0) + (t.type === 'expense' ? -Number(t.amount || 0) : Number(t.amount || 0));
  });
  const labels = Object.keys(byDate).sort();
  const data = labels.map(l => byDate[l]);
  return { labels, data };
}

export function weeklyExpensesAggregation() {
  const txns = readTxns().filter(t => t.type === 'expense');
  const byWeek = {};
  txns.forEach(t => {
    const d = new Date(t.date);
    // compute Monday as week start
    const day = d.getDay(); // 0 Sun .. 6 Sat
    const diff = (day + 6) % 7; // days since Monday
    const wkStart = new Date(d);
    wkStart.setDate(d.getDate() - diff);
    wkStart.setHours(0, 0, 0, 0);
    const key = wkStart.toISOString().slice(0, 10);
    byWeek[key] = (byWeek[key] || 0) + Number(t.amount || 0);
  });
  const labels = Object.keys(byWeek).sort();
  const data = labels.map(l => byWeek[l]);
  // format labels as `DD MMM`
  const pretty = labels.map(l => {
    const d = new Date(l + 'T00:00:00');
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
  });
  return { labels: pretty, data };
}

export function weeklyCombinedAggregation() {
  const txns = readTxns();
  const byWeekInc = {};
  const byWeekExp = {};

  txns.forEach(t => {
    const d = new Date(t.date);
    const day = d.getDay();
    const diff = (day + 6) % 7;
    const wkStart = new Date(d);
    wkStart.setDate(d.getDate() - diff);
    wkStart.setHours(0, 0, 0, 0);
    const key = wkStart.toISOString().slice(0, 10);
    if (t.type === 'income') byWeekInc[key] = (byWeekInc[key] || 0) + Number(t.amount || 0);
    if (t.type === 'expense') byWeekExp[key] = (byWeekExp[key] || 0) + Number(t.amount || 0);
  });

  const keys = Array.from(new Set([...Object.keys(byWeekInc), ...Object.keys(byWeekExp)])).sort();
  const pretty = keys.map(k => {
    const d = new Date(k + 'T00:00:00');
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
  });
  const income = keys.map(k => byWeekInc[k] || 0);
  const expenses = keys.map(k => byWeekExp[k] || 0);
  return { labels: pretty, income, expenses };
}

// Render charts into the canvases on the chart page using Chart.js ESM from CDN
export async function renderCharts() {
  // ensure DOM elements exist
  const lineCanvas = document.getElementById('line-chart');
  const barCanvas = document.getElementById('bar-chart');
  if (!lineCanvas || !barCanvas) return;

  // prepare data
  let ts = timeseriesAggregation();
  let cat = categoryAggregation();
  // fallbacks if empty
  if (!ts.labels || !ts.labels.length) {
    ts = { labels: [''], data: [0] };
  }
  if (!cat.labels || !cat.labels.length) {
    cat = { labels: ['None'], data: [0] };
  }
  const summary = computeChartSummary();

  // update top pill values if present
  const incomeEl = document.getElementById('chart-income');
  const expenseEl = document.getElementById('chart-expense');
  const netEl = document.getElementById('chart-net');
  if (incomeEl) incomeEl.textContent = formatCurrency(summary.income).replace('\u00A0', '');
  if (expenseEl) expenseEl.textContent = formatCurrency(summary.expense).replace('\u00A0', '');
  if (netEl) netEl.textContent = formatCurrency(summary.net).replace('\u00A0', '');

  // update most/least spend
  const mostEl = document.getElementById('most-spend');
  const leastEl = document.getElementById('least-spend');
  if (cat.labels && cat.labels.length) {
    const pairs = cat.labels.map((l, i) => [l, cat.data[i]]).filter(p => Number(p[1]) > 0);
    if (pairs.length) {
      pairs.sort((a, b) => b[1] - a[1]);
      if (mostEl) mostEl.textContent = pairs[0][0].charAt(0).toUpperCase() + pairs[0][0].slice(1);
      if (leastEl) leastEl.textContent = pairs[pairs.length - 1][0].charAt(0).toUpperCase() + pairs[pairs.length - 1][0].slice(1);
    } else {
      if (mostEl) mostEl.textContent = '—';
      if (leastEl) leastEl.textContent = '—';
    }
  }

  // Use Chart.js loaded via CDN (global Chart)
  let Chart = window.Chart;
  if (!Chart) {
    console.warn('Chart.js not found on window. Make sure you included the CDN <script> before main.js');
    return;
  }

  // destroy existing charts if present
  if (window._lineChartInstance) try { window._lineChartInstance.destroy(); } catch (e) { }
  if (window._barChartInstance) try { window._barChartInstance.destroy(); } catch (e) { }

  // colors: line -> red (expenses), bar -> green
  const red = '#F2545B';
  const green = '#2EBFA5';

  // Line chart (weekly expenses + income)
  const combined = weeklyCombinedAggregation();
  lineCanvas.width = lineCanvas.clientWidth;
  lineCanvas.height = lineCanvas.clientHeight;
  const ctxLine = lineCanvas.getContext('2d');
  window._lineChartInstance = new Chart(ctxLine, {
    type: 'line',
    data: {
      labels: combined.labels,
      datasets: [
        {
          label: 'Weekly expenses',
          data: combined.expenses,
          borderColor: red,
          backgroundColor: red + '22',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: red,
        },
        {
          label: 'Weekly income',
          data: combined.income,
          borderColor: green,
          backgroundColor: green + '22',
          fill: false,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: green,
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false, position: 'top' } },
      scales: {
        x: { display: true, title: { display: true, text: 'Week' }, ticks: { display: false }, grid: { display: false } },
        y: { display: true, title: { display: true, text: 'Amount (INR)' }, ticks: { display: false } }
      }
    }
  });

  // Bar chart (category)
  barCanvas.width = barCanvas.clientWidth;
  barCanvas.height = barCanvas.clientHeight;
  const ctxBar = barCanvas.getContext('2d');
  window._barChartInstance = new Chart(ctxBar, {
    type: 'bar',
    data: {
      labels: cat.labels,
      datasets: [{
        label: 'Category spend',
        data: cat.data,
        backgroundColor: cat.labels.map(() => green),
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { x: { display: true, title: { display: true, text: 'Category' }, ticks: { display: false } }, y: { display: true, title: { display: true, text: 'Amount (INR)' }, ticks: { display: false } } }
    }
  });

  // re-render on transaction updates
  if (!window._chartTxListener) {
    window._chartTxListener = () => renderCharts().catch(() => { });
    window.addEventListener('tx:update', window._chartTxListener);
  }
}
