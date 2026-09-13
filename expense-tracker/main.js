import { startRouter } from './modules/router.js';
import { initHomePage } from './modules/tx.js';
import { renderCharts } from './modules/chart.js';

// bootstrap the app: start router and delegate page init to modules
startRouter((page) => {
  if (page === 'home') {
    // delay slightly to ensure DOM elements from the page are parsed
    setTimeout(() => initHomePage(), 100);
  } else if (page === 'chart') {
    setTimeout(() => renderCharts(), 100);
  }
});

