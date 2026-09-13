// Transactions module
const STORAGE_KEY = 'txns';

export function readTxns() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

export function writeTxns(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  try { window.dispatchEvent(new CustomEvent('tx:update')); } catch (e) { }
}

export function formatCurrency(n) {
  return Number(n).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
}

export function formatDateISO(iso) {
  try {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, '0');
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    const yr = d.getFullYear();
    return `${day}.${mon}.${yr}`;
  } catch (e) {
    return '';
  }
}

export function renderTransactions() {
  const container = document.getElementById('transaction-items');
  if (!container) return;
  const txns = readTxns();
  container.innerHTML = '';
  if (!txns.length) {
    container.innerHTML = '<div class="text-sm text-gray-500">No transactions yet</div>';
    return;
  }

  txns.slice().reverse().forEach(tx => {
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between bg-white rounded-xl p-3 shadow-sm';

    // left side: circular icon + text
    const left = document.createElement('div');
    left.className = 'flex items-center gap-3';

    const circle = document.createElement('div');
    circle.className = 'w-10 h-10 rounded-full flex items-center justify-center';
    if (tx.type === 'income') {
      circle.style.background = 'linear-gradient(180deg,#E6F9EE 0%,#DFF3E9 100%)';
      circle.innerHTML = `<span style="color:#059669;font-weight:700;font-size:18px;line-height:0">↓</span>`;
    } else {
      circle.style.background = 'linear-gradient(180deg,#FFEAF0 0%,#FFDCE6 100%)';
      circle.innerHTML = `<span style="color:#EF4444;font-weight:700;font-size:18px;line-height:0">↑</span>`;
    }

    const texts = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'text-sm font-medium text-gray-800';
    title.textContent = tx.description || (tx.category ? tx.category.charAt(0).toUpperCase() + tx.category.slice(1) : 'Transaction');

    const cat = document.createElement('div');
    cat.className = 'text-xs text-gray-500';
    cat.textContent = tx.category ? tx.category.charAt(0).toUpperCase() + tx.category.slice(1) : '';

    texts.appendChild(title);
    texts.appendChild(cat);

    left.appendChild(circle);
    left.appendChild(texts);

    // right side: amount and date
    const right = document.createElement('div');
    right.className = 'text-right';

    const amountEl = document.createElement('div');
    amountEl.className = `text-sm font-semibold ${tx.type === 'expense' ? 'text-red-500' : 'text-green-600'}`;
    const sign = tx.type === 'expense' ? '-' : '+';
    amountEl.textContent = `${sign}${formatCurrency(tx.amount).replace('\u00A0', '')}`;

    const dateEl = document.createElement('div');
    dateEl.className = 'text-xs text-gray-500';
    dateEl.textContent = formatDateISO(tx.date);

    right.appendChild(amountEl);
    right.appendChild(dateEl);

    // delete button
    const delBtn = document.createElement('button');
    delBtn.className = 'mt-2 text-xs text-red-500 hover:underline focus:outline-none hover:cursor-pointer';
    delBtn.type = 'button';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // confirm before delete
      if (!confirm('Delete this transaction?')) return;
      const all = readTxns();
      const filtered = all.filter(t => t.id !== tx.id);
      writeTxns(filtered);
      // re-render UI
      renderTransactions();
      renderSummary();
      renderDetailedSummary();
    });

    right.appendChild(delBtn);

    row.appendChild(left);
    row.appendChild(right);

    container.appendChild(row);
  });
}

export function renderSummary() {
  const incomeEl = document.getElementById('summary-income');
  const expenseEl = document.getElementById('summary-expense');
  const netEl = document.getElementById('summary-net');
  if (!incomeEl || !expenseEl || !netEl) return;

  const txns = readTxns();
  const income = txns.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0);
  const expense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0);
  const net = income - expense;

  incomeEl.textContent = formatCurrency(income).replace('\u00A0', '');
  expenseEl.textContent = formatCurrency(expense).replace('\u00A0', '');
  // show negative net with - sign and red if negative
  netEl.textContent = `${net < 0 ? '-' : ''}${formatCurrency(Math.abs(net)).replace('\u00A0', '')}`;
  if (net < 0) netEl.classList.add('text-red-500'); else netEl.classList.remove('text-red-500');
}

export function renderDetailedSummary() {
  const bullets = document.getElementById('summary-bullets');
  const mostCatEl = document.getElementById('most-category');
  const topTxnEl = document.getElementById('top-transaction');
  if (!bullets || !mostCatEl || !topTxnEl) return;

  const txns = readTxns();
  if (!txns.length) {
    mostCatEl.textContent = '—';
    topTxnEl.textContent = '—';
    return;
  }

  // compute spend per category (only expenses)
  const byCat = {};
  txns.filter(t => t.type === 'expense').forEach(t => {
    byCat[t.category] = (byCat[t.category] || 0) + Number(t.amount || 0);
  });
  let mostCat = '—';
  if (Object.keys(byCat).length) {
    mostCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0][0];
    mostCat = `${mostCat.charAt(0).toUpperCase() + mostCat.slice(1)} you spent a total of ${formatCurrency(byCat[mostCat]).replace('\u00A0', '')} till now`;
  }

  // top single transaction amount and description
  const topTxn = txns.slice().filter(t => t.type === 'expense').sort((a, b) => Number(b.amount) - Number(a.amount))[0] || null;
  const topText = topTxn ? `${formatCurrency(topTxn.amount).replace('\u00A0', '')} on ${topTxn.description || (topTxn.category || '')}` : '—';

  mostCatEl.textContent = mostCat;
  topTxnEl.textContent = topText;

  // wire download button
  const btn = document.getElementById('summary-download');
  if (btn) {
    btn.addEventListener('click', () => {
      const rows = [['id', 'type', 'category', 'amount', 'description', 'date']];
      txns.forEach(t => rows.push([t.id, t.type, t.category, t.amount, (t.description || '').replace(/\n/g, ' '), t.date]));
      const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'transactions.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }
}

export function initHomePage() {
  const category = document.getElementById('category');
  const amount = document.getElementById('amount');
  const type = document.getElementById('type');
  const description = document.getElementById('description');
  const txnDate = document.getElementById('txn-date');
  const addBtn = document.getElementById('add-transaction-btn');

  const dateDisplay = document.getElementById('date-display');
  if (dateDisplay) {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    const yr = d.getFullYear();
    dateDisplay.textContent = `Date ${day}.${mon}.${yr}`;
  }

  // set txn-date default to today
  if (txnDate) {
    const today = new Date();
    const isoDate = today.toISOString().slice(0, 10); // YYYY-MM-DD
    txnDate.value = isoDate;
    // when date changes update the small display
    txnDate.addEventListener('change', () => {
      const d = new Date(txnDate.value + 'T00:00:00');
      const day = String(d.getDate()).padStart(2, '0');
      const mon = String(d.getMonth() + 1).padStart(2, '0');
      const yr = d.getFullYear();
      if (dateDisplay) dateDisplay.textContent = `Date ${day}.${mon}.${yr}`;
    });
  }

  renderTransactions();
  renderSummary();
  renderDetailedSummary();

  if (!addBtn) return;

  addBtn.addEventListener('click', () => {
    const amt = Number(amount.value || 0);
    if (!amt) {
      amount.focus();
      return;
    }
    const txns = readTxns();
    const txn = {
      id: Date.now().toString(36),
      category: category.value || 'other',
      type: type.value || 'income',
      amount: amt,
      description: description.value || '',
      // use selected date if present, else now
      date: txnDate && txnDate.value ? new Date(txnDate.value + 'T00:00:00').toISOString() : new Date().toISOString()
    };
    txns.push(txn);
    writeTxns(txns);
    amount.value = '';
    description.value = '';
    renderTransactions();
    renderSummary();
    renderDetailedSummary();
  });
}
