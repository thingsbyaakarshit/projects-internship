export async function renderAgePie(canvasId = 'agePieChart', jsonPath = './data/age_wise_depression.json') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  try {
    const res = await fetch(jsonPath);
    if (!res.ok) throw new Error('Failed to load age data');
    const json = await res.json();
    const groups = json.depression_statistics.age_groups || [];

    const labels = groups.map(g => g.age_range);
    const data = groups.map(g => g.percentage_affected);

    const ctx = canvas.getContext('2d');
    if (canvas._pieInstance) {
      try { canvas._pieInstance.destroy(); } catch (e) { /* ignore */ }
    }

    // Vibrant palette for clearer visual contrast
    const colors = ['#FFB020', '#FF6B6B', '#6C5CE7', '#10B981', '#06B6D4', '#FF8A65'];
    const total = data.reduce((s, v) => s + v, 0);

    // center text plugin
    const centerTextPlugin = {
      id: 'centerText',
      afterDraw(chart) {
        const { ctx, chartArea: { left, right, top, bottom, width, height } } = chart;
        ctx.save();
        const centerX = left + width / 2;
        const centerY = top + height / 2;
        ctx.fillStyle = '#374151';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '600 14px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';
        ctx.fillText('Total', centerX, centerY - 8);
        ctx.font = '700 18px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial';
        ctx.fillText(total.toFixed(1) + '%', centerX, centerY + 12);
        ctx.restore();
      }
    };

    canvas._pieInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: '#ffffff',
          borderWidth: 2,
          // small offset per slice for subtle separation (supported as number)
          offset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        rotation: -90,
        plugins: {
          legend: {
            position: 'right',
            align: 'center',
            labels: {
              color: '#374151',
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 10,
              padding: 12,
              generateLabels(chart) {
                const ds = chart.data.datasets[0];
                return chart.data.labels.map((label, i) => {
                  const value = ds.data[i];
                  return {
                    text: `${label} — ${value}%`,
                    fillStyle: ds.backgroundColor[i],
                    hidden: false,
                    index: i
                  };
                });
              }
            }
          },
          tooltip: {
            enabled: true,
            callbacks: {
              label(context) {
                const v = context.parsed;
                const pct = total ? (v / total * 100) : 0;
                return `${context.label}: ${v}% (${pct.toFixed(1)}%)`;
              }
            }
          }
        }
      },
      plugins: [centerTextPlugin]
    });

    // Render a friendly textual summary under the pie chart
    try {
      const summaryEl = document.getElementById('ageSummary');
      if (summaryEl) {
        const maxVal = Math.max(...data);
        const minVal = Math.min(...data);
        const maxIdx = data.indexOf(maxVal);
        const minIdx = data.indexOf(minVal);
        const maxLabel = labels[maxIdx];
        const minLabel = labels[minIdx];
        const avg = (data.reduce((s, v) => s + v, 0) / data.length).toFixed(1);
        // try to pick a source if available
        const source = (groups[0] && groups[0].source) ? groups[0].source : '';

        const sentence1 = `Depression prevalence is highest among ${maxLabel} (${maxVal}%) and lowest among ${minLabel} (${minVal}%).`;
        const sentence2 = `On average across the groups the prevalence is about ${avg}%. ${source ? 'Source: ' + source + '.' : ''}`;

        summaryEl.innerHTML = `
          <div class="space-y-1">
            <div>${sentence1}</div>
            <div class="text-sm text-gray-600">${sentence2}</div>
          </div>
        `;
      }
    } catch (err) {
      console.warn('age summary render error', err);
    }
  } catch (err) {
    console.error('renderAgePie error', err);
  }
}
