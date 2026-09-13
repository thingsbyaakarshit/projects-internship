export async function renderHomeChart(canvasId = 'homeChart', jsonPath = './data/mental_health_vs_screen_use.json') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  try {
    const res = await fetch(jsonPath);
    if (!res.ok) throw new Error('Failed to load chart data');
    const json = await res.json();
    const data = json.mental_health_vs_screen_use || [];

    const labels = data.map(d => d.year);
    const screen = data.map(d => d.average_screen_time_hours_per_day);
    const mental = data.map(d => d.mental_health_index);

    const ctx = canvas.getContext('2d');
    // destroy existing chart instance if present
    if (canvas._chartInstance) {
      try { canvas._chartInstance.destroy(); } catch (e) { /* ignore */ }
    }

    canvas._chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Screen time (hrs/day)',
            data: screen,
            borderColor: '#ef4444', // red-500
            backgroundColor: 'rgba(239,68,68,0.06)',
            yAxisID: 'y1',
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 5,
            fill: false
          },
          {
            label: 'Mental health index',
            data: mental,
            borderColor: '#2563eb', // blue-600
            backgroundColor: 'rgba(37,99,235,0.04)',
            yAxisID: 'y',
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 5,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        animation: { duration: 250 },
        elements: {
          point: { radius: 3 },
          line: { borderWidth: 2 }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(255,255,255,0.98)',
            titleColor: '#111827',
            bodyColor: '#374151',
            borderColor: 'rgba(0,0,0,0.06)',
            borderWidth: 1,
            displayColors: false,
            padding: 8
          }
        },
        scales: {
          x: {
            grid: { display: false, drawBorder: false },
            ticks: { color: '#6b7280' },
            title: { display: true, text: 'Year', color: '#6b7280' }
          },
          // Left Y axis: mental health index -> show qualitative labels instead of raw numbers
          y: {
            type: 'linear',
            position: 'left',
            grid: { color: 'rgba(15,23,42,0.06)', drawBorder: false },
            ticks: {
              color: '#6b7280',
              maxTicksLimit: 5,
              callback: function (value) {
                // Map numeric mental health index to qualitative labels
                if (value >= 75) return 'Excellent';
                if (value >= 70) return 'Good';
                if (value >= 65) return 'Fair';
                return 'Poor';
              }
            }
          },
          // Right Y axis: screen time -> categorical labels
          y1: {
            type: 'linear',
            position: 'right',
            grid: { display: false, drawBorder: false },
            ticks: {
              color: '#6b7280',
              maxTicksLimit: 5,
              callback: function (value) {
                // Map screen time hours to Low/Medium/High
                if (value > 6) return 'High';
                if (value > 4) return 'Medium';
                return 'Low';
              }
            }
          }
        }
      }
    });

    // Build summary: trends and highs/lows
    try {
      const summaryEl = document.getElementById('homeSummary');
      if (summaryEl) {
        const years = data.map(d => d.year);
        // screen time trend: compare first vs last
        const screenStart = screen[0];
        const screenEnd = screen[screen.length - 1];
        const screenTrend = screenEnd > screenStart ? 'increasing' : (screenEnd < screenStart ? 'decreasing' : 'stable');

        // mental health trend
        const mentalStart = mental[0];
        const mentalEnd = mental[mental.length - 1];
        const mentalTrend = mentalEnd > mentalStart ? 'improving' : (mentalEnd < mentalStart ? 'declining' : 'stable');

        // highest and lowest
        const maxScreen = Math.max(...screen);
        const minScreen = Math.min(...screen);
        const maxScreenYear = data[screen.indexOf(maxScreen)].year;
        const minScreenYear = data[screen.indexOf(minScreen)].year;

        const maxMental = Math.max(...mental);
        const minMental = Math.min(...mental);
        const maxMentalYear = data[mental.indexOf(maxMental)].year;
        const minMentalYear = data[mental.indexOf(minMental)].year;

        // Friendly natural-language summary
        const screenDiff = (screenEnd - screenStart).toFixed(1);
        const screenPct = (screenStart ? ((screenEnd - screenStart) / screenStart * 100) : 0).toFixed(0);
        const mentalDiff = (mentalEnd - mentalStart).toFixed(1);

        const screenSentence = `Average daily screen time has ${screenTrend} from ${screenStart}h in ${data[0].year} to ${screenEnd}h in ${data[data.length - 1].year} (${screenDiff}h, ~${screenPct}% change). It was highest in ${maxScreenYear} (${maxScreen}h) and lowest in ${minScreenYear} (${minScreen}h).`;
        const mentalSentence = `The mental health index has been ${mentalTrend}, moving from ${mentalStart} in ${data[0].year} to ${mentalEnd} in ${data[data.length - 1].year} (${mentalDiff} points). Highest index: ${maxMental} in ${maxMentalYear}; lowest: ${minMental} in ${minMentalYear}.`;

        summaryEl.innerHTML = `
          <div class="space-y-2">
            <div>${screenSentence}</div>
            <div>${mentalSentence}</div>
          </div>
        `;
      }
    } catch (err) {
      console.warn('summary render error', err);
    }
  } catch (err) {
    console.error('renderHomeChart error', err);
  }
}
