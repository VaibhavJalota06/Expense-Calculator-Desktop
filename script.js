// Expense Calculator - Futuristic Dark Glassmorphic Dashboard Logic
// Handles navigation tabs, state persistence, SVG radial budget gauge, month-wise filtering, monthly bar chart trend, category donut analytics, transaction tracking, and subscription reminders.

// ---------- State Variables ----------
let budget = 0;
let expenses = [];
let subscriptions = [];
let activeTimeFilter = 'ALL';
let currentView = 'dashboard';
let selectedMonth = getCurrentYearMonth(); // YYYY-MM or 'ALL'

// Category Color Map
const categoryColors = {
  'Food & Dining': '#3b82f6',
  'Transportation': '#f59e0b',
  'Shopping': '#ec4899',
  'Bills & Utilities': '#10b981',
  'Entertainment': '#8b5cf6',
  'Health & Fitness': '#06b6d4',
  'Services & Subscriptions': '#6366f1',
  'Miscellaneous': '#64748b'
};

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// View Titles & Subtitles
const viewHeadings = {
  dashboard: { title: 'Dashboard Overview', subtitle: 'Real-time financial analytics & budget control' },
  transactions: { title: 'Transactions Log', subtitle: 'Comprehensive history & instant search' },
  bills: { title: 'Recurring Bills & Subscriptions', subtitle: 'Upcoming payment reminders & automation' },
  analytics: { title: 'Category & Monthly Analytics', subtitle: 'Visual breakdown of monthly expenditures & historical trends' }
};

// ---------- Helper Functions ----------
function getCurrentYearMonth() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getTodayISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${day}`;
}

function formatCurrency(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatMonthLabel(yearMonthStr) {
  if (yearMonthStr === 'ALL') return 'All Time';
  const parts = yearMonthStr.split('-');
  if (parts.length !== 2) return yearMonthStr;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  return `${monthNames[monthIdx] || parts[1]} ${year}`;
}

function escapeHTML(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getOrdinalSuffix(i) {
  const j = i % 10, k = i % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}

// ---------- State Persistence (Firestore + localStorage fallback) ----------
let currentUserId = null;
let firestoreUnsubscribe = null;
let isSyncingFromFirestore = false;

function saveState() {
  localStorage.setItem('expense_cal_web_budget', budget.toString());
  localStorage.setItem('expense_cal_web_expenses', JSON.stringify(expenses));
  localStorage.setItem('expense_cal_web_subscriptions', JSON.stringify(subscriptions));

  if (currentUserId && db && !isSyncingFromFirestore) {
    if (typeof setSyncStatus === 'function') setSyncStatus('syncing');
    db.collection('users').doc(currentUserId).set({
      budget,
      expenses,
      subscriptions,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).then(() => {
      if (typeof setSyncStatus === 'function') setSyncStatus('synced');
    }).catch((error) => {
      console.error('Firestore save error:', error);
      if (typeof setSyncStatus === 'function') setSyncStatus('error');
    });
  }
}

function loadStateFromLocal() {
  const savedBudget = localStorage.getItem('expense_cal_web_budget');
  const savedExpenses = localStorage.getItem('expense_cal_web_expenses');
  const savedSubs = localStorage.getItem('expense_cal_web_subscriptions');

  const parsedBudget = savedBudget !== null ? parseFloat(savedBudget) : 0;
  budget = Number.isFinite(parsedBudget) && parsedBudget >= 0 ? parsedBudget : 0;
  if (savedExpenses) {
    try {
      const parsedExpenses = JSON.parse(savedExpenses);
      expenses = Array.isArray(parsedExpenses) ? parsedExpenses.filter(isValidExpense) : [];
    } catch (e) { expenses = []; }
  } else {
    expenses = [];
  }
  if (savedSubs) {
    try {
      const parsedSubscriptions = JSON.parse(savedSubs);
      subscriptions = Array.isArray(parsedSubscriptions) ? parsedSubscriptions.filter(isValidSubscription) : [];
    } catch (e) { subscriptions = []; }
  } else {
    subscriptions = [];
  }

  updateMonthPickerOptions();
  updateUI();
}

function startFirestoreSync(userId) {
  currentUserId = userId;
  if (!db) { loadStateFromLocal(); return; }

  if (typeof setSyncStatus === 'function') setSyncStatus('syncing');

  const userDocRef = db.collection('users').doc(userId);

  firestoreUnsubscribe = userDocRef.onSnapshot((doc) => {
    isSyncingFromFirestore = true;
    if (doc.exists) {
      const data = doc.data();
      budget = typeof data.budget === 'number' ? data.budget : 0;
      expenses = Array.isArray(data.expenses) ? data.expenses.filter(isValidExpense) : [];
      subscriptions = Array.isArray(data.subscriptions) ? data.subscriptions.filter(isValidSubscription) : [];
    } else {
      budget = 0;
      expenses = [];
      subscriptions = [];
      userDocRef.set({ budget: 0, expenses: [], subscriptions: [] });
    }

    localStorage.setItem('expense_cal_web_budget', budget.toString());
    localStorage.setItem('expense_cal_web_expenses', JSON.stringify(expenses));
    localStorage.setItem('expense_cal_web_subscriptions', JSON.stringify(subscriptions));

    updateMonthPickerOptions();
    updateUI();
    isSyncingFromFirestore = false;
    if (typeof setSyncStatus === 'function') setSyncStatus('synced');
  }, (error) => {
    console.error('Firestore listener error:', error);
    if (typeof setSyncStatus === 'function') setSyncStatus('error');
    loadStateFromLocal();
  });
}

function stopFirestoreSync() {
  if (firestoreUnsubscribe) {
    firestoreUnsubscribe();
    firestoreUnsubscribe = null;
  }
  currentUserId = null;
}

function isValidExpense(item) {
  return item && typeof item === 'object' &&
    typeof item.id === 'string' &&
    Number.isFinite(Number(item.amount)) && Number(item.amount) >= 0 &&
    typeof item.category === 'string' &&
    typeof item.description === 'string' &&
    typeof item.payment === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(item.date);
}

function isValidSubscription(item) {
  return item && typeof item === 'object' &&
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    Number.isFinite(Number(item.amount)) && Number(item.amount) >= 0 &&
    Number.isInteger(Number(item.dueDay)) && Number(item.dueDay) >= 1 && Number(item.dueDay) <= 31;
}

// ---------- Month Picker Logic ----------
function getAllAvailableMonths() {
  const monthSet = new Set();
  monthSet.add(getCurrentYearMonth());
  expenses.forEach(e => {
    if (e.date && e.date.length >= 7) {
      monthSet.add(e.date.slice(0, 7));
    }
  });
  return Array.from(monthSet).sort().reverse();
}

function updateMonthPickerOptions() {
  const monthPickerSelect = document.getElementById('month-picker');
  if (!monthPickerSelect) return;
  const months = getAllAvailableMonths();
  monthPickerSelect.innerHTML = '';

  const optAll = document.createElement('option');
  optAll.value = 'ALL';
  optAll.textContent = 'All Months History';
  monthPickerSelect.appendChild(optAll);

  months.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = formatMonthLabel(m);
    if (m === getCurrentYearMonth()) {
      opt.textContent += ' (Current)';
    }
    monthPickerSelect.appendChild(opt);
  });

  if (selectedMonth !== 'ALL' && !months.includes(selectedMonth)) {
    selectedMonth = getCurrentYearMonth();
  }
  monthPickerSelect.value = selectedMonth;
}

// ---------- Expense Data Filtering ----------
function getFilteredExpenses() {
  const filterCategorySelect = document.getElementById('filter-category');
  const filterSearchInput = document.getElementById('filter-search');

  return expenses.filter(exp => {
    if (selectedMonth !== 'ALL') {
      if (!exp.date.startsWith(selectedMonth)) return false;
    }
    if (activeTimeFilter === 'TODAY') {
      if (exp.date !== getTodayISO()) return false;
    }
    const catFilter = filterCategorySelect ? filterCategorySelect.value : 'ALL';
    if (catFilter !== 'ALL' && exp.category !== catFilter) return false;

    const query = filterSearchInput ? filterSearchInput.value.trim().toLowerCase() : '';
    if (query && !exp.description.toLowerCase().includes(query)) return false;

    return true;
  });
}

function getFilteredExpensesForMonth(monthStr) {
  if (monthStr === 'ALL') return expenses;
  return expenses.filter(exp => exp.date.startsWith(monthStr));
}

// ---------- UI Renderers ----------
function updateUI() {
  renderHeaderStats();
  renderRadialGauge();
  renderBreakdownChartAndList();
  renderSubscriptionsPreview();
  renderTransactionsTable();
  renderSubscriptionsGrid();
  renderMonthlyTrendChart();
  renderFullAnalytics();
}

function renderHeaderStats() {
  const statBudgetEl = document.getElementById('stat-budget');
  const statSpentEl = document.getElementById('stat-spent');
  const statCountEl = document.getElementById('stat-count');
  const statRemainingEl = document.getElementById('stat-remaining');
  const statPercentEl = document.getElementById('stat-percent');
  const statusIconEl = document.getElementById('status-icon');
  const activeMonthLabelEl = document.getElementById('active-month-label');
  const statSubsTotalEl = document.getElementById('stat-subs-total');
  const statSubsCountEl = document.getElementById('stat-subs-count');
  const progressBarFillEl = document.getElementById('progress-bar-fill');
  const progressPercentLabelEl = document.getElementById('progress-percent-label');
  const sidebarBudgetsValEl = document.getElementById('sidebar-budget-val');

  const currentMonthExpenses = getFilteredExpensesForMonth(selectedMonth);
  const totalSpent = currentMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const remaining = budget - totalSpent;
  const percentUsed = budget > 0 ? (totalSpent / budget) * 100 : 0;

  if (statBudgetEl) statBudgetEl.textContent = formatCurrency(budget);
  if (sidebarBudgetsValEl) sidebarBudgetsValEl.textContent = formatCurrency(budget);
  if (statSpentEl) statSpentEl.textContent = formatCurrency(totalSpent);
  if (statCountEl) statCountEl.textContent = `${currentMonthExpenses.length} transaction${currentMonthExpenses.length === 1 ? '' : 's'}`;

  if (statRemainingEl) {
    statRemainingEl.textContent = formatCurrency(remaining);
    statRemainingEl.className = `stat-value ${remaining < 0 ? 'text-rose' : 'text-emerald'}`;
  }

  if (statPercentEl) {
    if (budget === 0) {
      statPercentEl.innerHTML = 'No budget limit set <span class="edit-hint">(Edit)</span>';
      statPercentEl.className = 'stat-subtext text-muted';
    } else if (remaining < 0) {
      statPercentEl.innerHTML = `Over budget by ${formatCurrency(Math.abs(remaining))} <span class="edit-hint">(Edit)</span>`;
      statPercentEl.className = 'stat-subtext text-rose font-bold';
    } else {
      statPercentEl.innerHTML = `${percentUsed.toFixed(1)}% of limit used <span class="edit-hint">(Edit)</span>`;
      statPercentEl.className = 'stat-subtext text-muted';
    }
  }

  if (statusIconEl) {
    statusIconEl.className = `fa-solid stat-icon ${remaining < 0 ? 'fa-triangle-exclamation text-rose' : 'fa-shield-halved text-emerald'}`;
  }

  if (activeMonthLabelEl) {
    activeMonthLabelEl.textContent = formatMonthLabel(selectedMonth);
  }

  const totalSubsCost = subscriptions.reduce((sum, s) => sum + Number(s.amount), 0);
  if (statSubsTotalEl) statSubsTotalEl.textContent = formatCurrency(totalSubsCost);
  if (statSubsCountEl) statSubsCountEl.textContent = `${subscriptions.length} active bill${subscriptions.length === 1 ? '' : 's'}`;

  if (progressBarFillEl) {
    const cappedPercent = Math.min(percentUsed, 100);
    progressBarFillEl.style.width = `${cappedPercent}%`;

    if (budget === 0) {
      progressBarFillEl.style.background = 'var(--primary-indigo)';
    } else if (percentUsed > 100) {
      progressBarFillEl.style.background = 'linear-gradient(90deg, #f59e0b, #f43f5e)';
    } else if (percentUsed > 80) {
      progressBarFillEl.style.background = 'linear-gradient(90deg, #10b981, #f59e0b)';
    } else {
      progressBarFillEl.style.background = 'linear-gradient(90deg, #10b981, #6366f1)';
    }
  }

  if (progressPercentLabelEl) {
    progressPercentLabelEl.textContent = budget > 0 ? `${percentUsed.toFixed(1)}% Used` : '0% Used';
  }
}

// SVG Radial Budget Gauge
function renderRadialGauge() {
  const radialGaugeContainerEl = document.getElementById('radial-gauge-container');
  if (!radialGaugeContainerEl) return;

  const currentMonthExpenses = getFilteredExpensesForMonth(selectedMonth);
  const totalSpent = currentMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const percentUsed = budget > 0 ? (totalSpent / budget) * 100 : 0;
  const displayPercent = Math.min(Math.round(percentUsed), 999);

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const cappedPercent = Math.min(percentUsed, 100);
  const offset = circumference - (cappedPercent / 100) * circumference;

  let strokeColor = '#6366f1';
  let badgeClass = 'gauge-muted';
  let badgeText = 'No Limit Set';

  if (budget > 0) {
    if (percentUsed > 100) {
      strokeColor = '#f43f5e'; badgeClass = 'gauge-danger'; badgeText = 'Over Limit!';
    } else if (percentUsed > 85) {
      strokeColor = '#f59e0b'; badgeClass = 'gauge-warning'; badgeText = 'Near Limit';
    } else {
      strokeColor = '#10b981'; badgeClass = 'gauge-success'; badgeText = 'Healthy';
    }
  }

  radialGaugeContainerEl.innerHTML = `
    <div class="radial-gauge-wrapper">
      <svg width="170" height="170" viewBox="0 0 170 170" class="radial-gauge-svg">
        <circle cx="85" cy="85" r="${radius}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="14" />
        <circle cx="85" cy="85" r="${radius}" fill="none" stroke="${strokeColor}" stroke-width="14"
          stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
          stroke-linecap="round" class="radial-gauge-progress"
          transform="rotate(-90 85 85)" />
      </svg>
      <div class="radial-gauge-center">
        <span class="radial-percent-val">${budget > 0 ? displayPercent + '%' : '₹0'}</span>
        <span class="radial-percent-label">${budget > 0 ? 'Spent' : 'No Limit'}</span>
        <span class="gauge-status-badge ${badgeClass}">${badgeText}</span>
      </div>
    </div>
  `;
}

// Category Distribution SVG Donut Chart
function renderBreakdownChartAndList() {
  const breakdownChartContainerEl = document.getElementById('breakdown-chart-container');
  const categoryBreakdownListEl = document.getElementById('category-breakdown-list');

  const currentMonthExpenses = getFilteredExpensesForMonth(selectedMonth);
  const totals = {};
  let totalSpent = 0;

  currentMonthExpenses.forEach(exp => {
    const amt = Number(exp.amount);
    totals[exp.category] = (totals[exp.category] || 0) + amt;
    totalSpent += amt;
  });

  const categories = Object.keys(totals).sort((a, b) => totals[b] - totals[a]);

  if (breakdownChartContainerEl) {
    if (totalSpent === 0) {
      breakdownChartContainerEl.innerHTML = `
        <div class="empty-state-small">
          <i class="fa-solid fa-chart-pie empty-state-icon"></i>
          <p>No expense records for ${formatMonthLabel(selectedMonth)}</p>
        </div>
      `;
    } else {
      const radius = 54;
      const circumference = 2 * Math.PI * radius;
      let accumulatedPercent = 0;
      let slicesSVG = '';

      categories.forEach(cat => {
        const catSpent = totals[cat];
        const percent = catSpent / totalSpent;
        const dashArray = `${percent * circumference} ${circumference}`;
        const strokeOffset = -accumulatedPercent * circumference;
        const color = categoryColors[cat] || '#64748b';

        slicesSVG += `
          <circle cx="70" cy="70" r="${radius}" fill="none" stroke="${color}" stroke-width="18"
            stroke-dasharray="${dashArray}" stroke-dashoffset="${strokeOffset}" class="donut-slice" />
        `;
        accumulatedPercent += percent;
      });

      breakdownChartContainerEl.innerHTML = `
        <div class="donut-chart-wrapper">
          <svg width="140" height="140" viewBox="0 0 140 140" class="donut-svg">
            ${slicesSVG}
          </svg>
          <div class="donut-center-text">
            <span class="donut-total-title">Total</span>
            <span class="donut-total-val">${formatCurrency(totalSpent)}</span>
          </div>
        </div>
      `;
    }
  }

  if (categoryBreakdownListEl) {
    if (categories.length === 0) {
      categoryBreakdownListEl.innerHTML = '<p class="empty-state-sub">Log expenses to view category breakdown.</p>';
    } else {
      categoryBreakdownListEl.innerHTML = categories.map(cat => {
        const amt = totals[cat];
        const pct = totalSpent > 0 ? ((amt / totalSpent) * 100).toFixed(1) : 0;
        const color = categoryColors[cat] || '#64748b';
        return `
          <div class="breakdown-item">
            <div class="breakdown-info">
              <span class="breakdown-label"><span class="cat-dot" style="background: ${color}"></span>${cat}</span>
              <span class="font-bold">${formatCurrency(amt)} (${pct}%)</span>
            </div>
            <div class="breakdown-bar-bg">
              <div class="breakdown-bar-fill" style="width: ${pct}%; background: ${color}"></div>
            </div>
          </div>
        `;
      }).join('');
    }
  }
}

// Subscriptions / Bills Dashboard Preview
function renderSubscriptionsPreview() {
  const dashSubsPreviewEl = document.getElementById('dash-subs-preview');
  if (!dashSubsPreviewEl) return;
  if (subscriptions.length === 0) {
    dashSubsPreviewEl.innerHTML = '<p class="empty-state-sub">No recurring bills added yet.</p>';
    return;
  }

  const today = new Date();
  const currentDay = today.getDate();

  const sortedSubs = [...subscriptions].sort((a, b) => {
    const diffA = Number(a.dueDay) >= currentDay ? Number(a.dueDay) - currentDay : Number(a.dueDay) + 31 - currentDay;
    const diffB = Number(b.dueDay) >= currentDay ? Number(b.dueDay) - currentDay : Number(b.dueDay) + 31 - currentDay;
    return diffA - diffB;
  }).slice(0, 4);

  dashSubsPreviewEl.innerHTML = sortedSubs.map(sub => {
    const dueDay = Number(sub.dueDay);
    let dueText = `Due on ${dueDay}${getOrdinalSuffix(dueDay)} of month`;
    let isDueSoon = false;
    if (dueDay === currentDay) {
      dueText = '🔥 Due Today!';
      isDueSoon = true;
    } else if (dueDay > currentDay && dueDay <= currentDay + 3) {
      dueText = `Due in ${dueDay - currentDay} days`;
      isDueSoon = true;
    }

    return `
      <div class="dash-sub-item">
        <div>
          <span class="dash-sub-name">${escapeHTML(sub.name)}</span>
          <span class="dash-sub-due ${isDueSoon ? 'text-amber font-bold' : ''}">${dueText}</span>
        </div>
        <div class="dash-sub-right">
          <span class="dash-sub-amount">${formatCurrency(sub.amount)}</span>
        </div>
      </div>
    `;
  }).join('');
}

// Transactions Table Log Renderer
function renderTransactionsTable() {
  const transactionsTbody = document.getElementById('transactions-tbody');
  const emptyTableMsg = document.getElementById('empty-table-msg');
  if (!transactionsTbody) return;

  const filtered = getFilteredExpenses();

  if (filtered.length === 0) {
    transactionsTbody.innerHTML = '';
    if (emptyTableMsg) emptyTableMsg.classList.remove('hidden');
    return;
  }

  if (emptyTableMsg) emptyTableMsg.classList.add('hidden');

  const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

  transactionsTbody.innerHTML = sorted.map(exp => `
    <tr>
      <td>${exp.date}</td>
      <td><span class="category-badge">${escapeHTML(exp.category)}</span></td>
      <td class="description-cell" title="${escapeHTML(exp.description)}">${escapeHTML(exp.description)}</td>
      <td><span class="payment-badge">${escapeHTML(exp.payment)}</span></td>
      <td class="text-right font-bold text-amount">${formatCurrency(exp.amount)}</td>
      <td class="text-center">
        <button class="icon-btn action-btn-del" data-delete-tx="${exp.id}" title="Delete Transaction">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

// Subscriptions Full Grid Renderer
function renderSubscriptionsGrid() {
  const subsGridContainerEl = document.getElementById('subs-grid-container');
  if (!subsGridContainerEl) return;

  if (subscriptions.length === 0) {
    subsGridContainerEl.innerHTML = `
      <div class="empty-state-card">
        <i class="fa-solid fa-arrows-rotate empty-state-icon"></i>
        <h4 class="empty-state-title">No Recurring Bills or Subscriptions</h4>
        <p class="empty-state-sub">Add your monthly bills (e.g. Wifi, Rent, Netflix) to track upcoming due dates.</p>
        <button class="btn btn-primary btn-sm" id="btn-add-first-sub" style="margin-top: 1rem;">
          <i class="fa-solid fa-plus"></i> Add First Bill
        </button>
      </div>
    `;
    const btnFirst = document.getElementById('btn-add-first-sub');
    if (btnFirst) btnFirst.addEventListener('click', openSubModal);
    return;
  }

  const today = new Date();
  const currentDay = today.getDate();

  subsGridContainerEl.innerHTML = subscriptions.map(sub => {
    const dueDay = Number(sub.dueDay);
    let statusClass = 'due';
    let statusLabel = `Due Day ${dueDay}`;

    if (dueDay === currentDay) {
      statusClass = 'overdue';
      statusLabel = 'DUE TODAY!';
    } else if (dueDay < currentDay) {
      statusClass = 'paid';
      statusLabel = `Passed (${dueDay}${getOrdinalSuffix(dueDay)})`;
    } else if (dueDay <= currentDay + 5) {
      statusClass = 'due';
      statusLabel = `Due in ${dueDay - currentDay} days`;
    }

    return `
      <div class="sub-card-item">
        <div class="sub-card-header">
          <div>
            <span class="sub-title">${escapeHTML(sub.name)}</span>
            <div class="sub-due">${escapeHTML(sub.category || 'Subscription')}</div>
          </div>
          <span class="status-badge ${statusClass}">${statusLabel}</span>
        </div>
        <div>
          <span class="sub-amount">${formatCurrency(sub.amount)}</span>
          <span class="per-mo">/ month</span>
        </div>
        <div class="sub-actions">
          <span class="paid-check-badge"><i class="fa-solid fa-calendar-check"></i> Day ${dueDay} of month</span>
          <button class="icon-btn action-btn-del" data-delete-sub="${sub.id}" title="Delete Subscription">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Monthly Spending Trend Bar Chart
function renderMonthlyTrendChart() {
  const monthlyTrendChartContainerEl = document.getElementById('monthly-trend-chart-container');
  if (!monthlyTrendChartContainerEl) return;

  const monthMap = {};
  expenses.forEach(e => {
    if (e.date && e.date.length >= 7) {
      const m = e.date.slice(0, 7);
      monthMap[m] = (monthMap[m] || 0) + Number(e.amount);
    }
  });

  const availableMonths = Object.keys(monthMap).sort();
  if (availableMonths.length === 0) {
    monthlyTrendChartContainerEl.innerHTML = `
      <div class="empty-state-small">
        <i class="fa-solid fa-chart-column empty-state-icon"></i>
        <p>No monthly data available yet</p>
      </div>
    `;
    return;
  }

  const recentMonths = availableMonths.slice(-6);
  const maxSpent = Math.max(...recentMonths.map(m => monthMap[m]), 1);

  monthlyTrendChartContainerEl.innerHTML = `
    <div class="trend-chart-flex">
      ${recentMonths.map(m => {
        const spent = monthMap[m];
        const heightPct = Math.max((spent / maxSpent) * 100, 6);
        const isSelected = m === selectedMonth;

        return `
          <div class="trend-bar-column ${isSelected ? 'selected' : ''}" data-select-month="${m}">
            <span class="trend-bar-val">₹${Math.round(spent)}</span>
            <div class="trend-bar-track">
              <div class="trend-bar-fill" style="height: ${heightPct}%; background: ${isSelected ? 'linear-gradient(180deg, #818cf8, #4f46e5)' : 'linear-gradient(180deg, #6366f1, #312e81)'}"></div>
            </div>
            <span class="trend-bar-label">${formatMonthLabel(m).split(' ')[0]}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Full Category Analytics Renderer
function renderFullAnalytics() {
  const fullAnalyticsChartContainerEl = document.getElementById('full-analytics-chart-container');
  const fullAnalyticsListEl = document.getElementById('full-analytics-list');
  if (!fullAnalyticsChartContainerEl || !fullAnalyticsListEl) return;

  const currentMonthExpenses = getFilteredExpensesForMonth(selectedMonth);
  const totals = {};
  let totalSpent = 0;

  currentMonthExpenses.forEach(exp => {
    const amt = Number(exp.amount);
    totals[exp.category] = (totals[exp.category] || 0) + amt;
    totalSpent += amt;
  });

  const categories = Object.keys(totals).sort((a, b) => totals[b] - totals[a]);

  if (totalSpent === 0) {
    fullAnalyticsChartContainerEl.innerHTML = `
      <div class="empty-state-small">
        <i class="fa-solid fa-chart-pie empty-state-icon"></i>
        <p>No analytics data for ${formatMonthLabel(selectedMonth)}</p>
      </div>
    `;
    fullAnalyticsListEl.innerHTML = '<p class="empty-state-sub">Log expenses to view category breakdown.</p>';
    return;
  }

  const radius = 65;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;
  let slicesSVG = '';

  categories.forEach(cat => {
    const catSpent = totals[cat];
    const percent = catSpent / totalSpent;
    const dashArray = `${percent * circumference} ${circumference}`;
    const strokeOffset = -accumulatedPercent * circumference;
    const color = categoryColors[cat] || '#64748b';

    slicesSVG += `
      <circle cx="80" cy="80" r="${radius}" fill="none" stroke="${color}" stroke-width="22"
        stroke-dasharray="${dashArray}" stroke-dashoffset="${strokeOffset}" class="donut-slice" />
    `;
    accumulatedPercent += percent;
  });

  fullAnalyticsChartContainerEl.innerHTML = `
    <div class="donut-chart-wrapper">
      <svg width="160" height="160" viewBox="0 0 160 160" class="donut-svg">
        ${slicesSVG}
      </svg>
      <div class="donut-center-text">
        <span class="donut-total-title">Total</span>
        <span class="donut-total-val">${formatCurrency(totalSpent)}</span>
      </div>
    </div>
  `;

  fullAnalyticsListEl.innerHTML = categories.map(cat => {
    const amt = totals[cat];
    const pct = ((amt / totalSpent) * 100).toFixed(1);
    const color = categoryColors[cat] || '#64748b';

    return `
      <div class="breakdown-item">
        <div class="breakdown-info">
          <span class="breakdown-label"><span class="cat-dot" style="background: ${color}"></span>${cat}</span>
          <span class="font-bold">${formatCurrency(amt)} (${pct}%)</span>
        </div>
        <div class="breakdown-bar-bg">
          <div class="breakdown-bar-fill" style="width: ${pct}%; background: ${color}"></div>
        </div>
      </div>
    `;
  }).join('');
}

// ---------- Actions & Event Handlers ----------
function switchView(viewName) {
  if (!viewHeadings[viewName]) return;
  currentView = viewName;

  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.dataset.view === viewName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  document.querySelectorAll('.view-panel').forEach(panel => {
    if (panel.id === `view-${viewName}`) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });

  const viewTitleEl = document.getElementById('view-title');
  const viewSubtitleEl = document.getElementById('view-subtitle');
  if (viewTitleEl) viewTitleEl.textContent = viewHeadings[viewName].title;
  if (viewSubtitleEl) viewSubtitleEl.textContent = viewHeadings[viewName].subtitle;

  const sidebarEl = document.querySelector('.sidebar');
  if (sidebarEl && sidebarEl.classList.contains('sidebar-open')) {
    sidebarEl.classList.remove('sidebar-open');
  }
}

function selectMonthFromChart(monthStr) {
  selectedMonth = monthStr;
  const monthPickerSelect = document.getElementById('month-picker');
  if (monthPickerSelect) monthPickerSelect.value = monthStr;
  updateUI();
}

function deleteExpense(id) {
  if (confirm('Are you sure you want to delete this expense record?')) {
    expenses = expenses.filter(e => e.id !== id);
    saveState();
    updateMonthPickerOptions();
    updateUI();
  }
}

function deleteSubscription(id) {
  if (confirm('Are you sure you want to delete this recurring bill?')) {
    subscriptions = subscriptions.filter(s => s.id !== id);
    saveState();
    updateUI();
  }
}

function openBudgetModal() {
  const budgetModal = document.getElementById('budget-modal');
  const modalBudgetInput = document.getElementById('modal-budget-input');
  if (budgetModal) {
    if (modalBudgetInput) modalBudgetInput.value = budget > 0 ? budget : '';
    budgetModal.classList.remove('hidden');
    if (modalBudgetInput) modalBudgetInput.focus();
  }
}

function closeBudgetModal() {
  const budgetModal = document.getElementById('budget-modal');
  if (budgetModal) budgetModal.classList.add('hidden');
}

function openSubModal() {
  const subModal = document.getElementById('sub-modal');
  const subForm = document.getElementById('sub-form');
  const subNameInput = document.getElementById('sub-name');
  if (subModal) {
    if (subForm) subForm.reset();
    subModal.classList.remove('hidden');
    if (subNameInput) subNameInput.focus();
  }
}

function closeSubModal() {
  const subModal = document.getElementById('sub-modal');
  if (subModal) subModal.classList.add('hidden');
}

function setTodayDateDefault() {
  const expDateInput = document.getElementById('exp-date');
  if (expDateInput && !expDateInput.value) {
    expDateInput.value = getTodayISO();
  }
}

function exportToCSV() {
  if (expenses.length === 0) {
    alert('No expenses recorded to export.');
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,ID,Date,Category,Description,Payment Method,Amount (INR)\n";
  expenses.forEach(e => {
    const row = [
      `"${e.id}"`,
      `"${e.date}"`,
      `"${e.category}"`,
      `"${e.description.replace(/"/g, '""')}"`,
      `"${e.payment}"`,
      `"${e.amount}"`
    ].join(",");
    csvContent += row + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Expense_OS_Log_${getTodayISO()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function resetAllData() {
  if (confirm('⚠️ WARNING: This will permanently delete ALL logged expenses, budget caps, and subscriptions! Proceed?')) {
    budget = 0;
    expenses = [];
    subscriptions = [];
    saveState();
    updateMonthPickerOptions();
    updateUI();
    alert('All expense records have been reset.');
  }
}

// ---------- Event Listeners Setup ----------
document.addEventListener('DOMContentLoaded', () => {
  setTodayDateDefault();

  const expenseForm = document.getElementById('expense-form');
  const expAmountInput = document.getElementById('exp-amount');
  const expCategorySelect = document.getElementById('exp-category');
  const expDescriptionInput = document.getElementById('exp-description');
  const expPaymentSelect = document.getElementById('exp-payment');
  const expDateInput = document.getElementById('exp-date');
  const monthPickerSelect = document.getElementById('month-picker');
  const btnPrevMonth = document.getElementById('btn-prev-month');
  const btnNextMonth = document.getElementById('btn-next-month');
  const filterSearchInput = document.getElementById('filter-search');
  const filterCategorySelect = document.getElementById('filter-category');

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      switchView(item.dataset.view);
    });
  });

  document.querySelectorAll('.view-all-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchView(link.dataset.view);
    });
  });

  if (expenseForm) {
    expenseForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = parseFloat(expAmountInput.value);
      const category = expCategorySelect.value;
      const description = expDescriptionInput.value.trim();
      const payment = expPaymentSelect.value;
      const date = expDateInput.value || getTodayISO();

      if (isNaN(amount) || amount <= 0) { alert('Please enter a valid expense amount.'); return; }
      if (!description) { alert('Please enter a description.'); return; }

      const newExpense = {
        id: 'exp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        amount, category, description, payment, date
      };

      expenses.push(newExpense);
      saveState();

      expAmountInput.value = '';
      expDescriptionInput.value = '';

      updateMonthPickerOptions();
      updateUI();
    });
  }

  const btnEditBudget = document.getElementById('btn-edit-budget');
  const btnSidebarBudgetEdit = document.getElementById('btn-sidebar-budget-edit');
  const statBudgetCard = document.getElementById('stat-budget-card');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const budgetForm = document.getElementById('budget-form');
  const modalBudgetInput = document.getElementById('modal-budget-input');

  if (btnEditBudget) btnEditBudget.addEventListener('click', openBudgetModal);
  if (btnSidebarBudgetEdit) btnSidebarBudgetEdit.addEventListener('click', openBudgetModal);
  if (statBudgetCard) statBudgetCard.addEventListener('click', openBudgetModal);
  if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeBudgetModal);
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeBudgetModal);

  if (budgetForm) {
    budgetForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = parseFloat(modalBudgetInput.value);
      if (!isNaN(val) && val > 0) {
        budget = val;
        saveState();
        closeBudgetModal();
        updateUI();
      } else {
        alert('Please enter a valid monthly budget target.');
      }
    });
  }

  const btnAddSub = document.getElementById('btn-add-sub');
  const btnAddSubInline = document.getElementById('btn-add-sub-inline');
  const subModalCancelBtn = document.getElementById('sub-modal-cancel');
  const subModalCloseBtn = document.getElementById('sub-modal-close');
  const subForm = document.getElementById('sub-form');
  const subNameInput = document.getElementById('sub-name');
  const subAmountInput = document.getElementById('sub-amount');
  const subDueDayInput = document.getElementById('sub-due-day');
  const subCategorySelect = document.getElementById('sub-category');

  if (btnAddSub) btnAddSub.addEventListener('click', openSubModal);
  if (btnAddSubInline) btnAddSubInline.addEventListener('click', openSubModal);
  if (subModalCancelBtn) subModalCancelBtn.addEventListener('click', closeSubModal);
  if (subModalCloseBtn) subModalCloseBtn.addEventListener('click', closeSubModal);

  if (subForm) {
    subForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = subNameInput.value.trim();
      const amount = parseFloat(subAmountInput.value);
      const dueDay = parseInt(subDueDayInput.value, 10);
      const category = subCategorySelect.value;

      if (!name) { alert('Please enter bill name.'); return; }
      if (isNaN(amount) || amount <= 0) { alert('Please enter valid amount.'); return; }
      if (isNaN(dueDay) || dueDay < 1 || dueDay > 31) { alert('Please enter due day between 1 and 31.'); return; }

      const newSub = {
        id: 'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        name, amount, dueDay, category
      };

      subscriptions.push(newSub);
      saveState();
      closeSubModal();
      updateUI();
    });
  }

  if (monthPickerSelect) {
    monthPickerSelect.addEventListener('change', (e) => {
      selectedMonth = e.target.value;
      updateUI();
    });
  }

  if (btnPrevMonth) {
    btnPrevMonth.addEventListener('click', () => {
      const months = getAllAvailableMonths();
      const idx = months.indexOf(selectedMonth);
      if (idx !== -1 && idx < months.length - 1) {
        selectedMonth = months[idx + 1];
        monthPickerSelect.value = selectedMonth;
        updateUI();
      }
    });
  }

  if (btnNextMonth) {
    btnNextMonth.addEventListener('click', () => {
      const months = getAllAvailableMonths();
      const idx = months.indexOf(selectedMonth);
      if (idx > 0) {
        selectedMonth = months[idx - 1];
        monthPickerSelect.value = selectedMonth;
        updateUI();
      }
    });
  }

  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeTimeFilter = chip.dataset.filter;
      renderTransactionsTable();
    });
  });

  if (filterSearchInput) filterSearchInput.addEventListener('input', renderTransactionsTable);
  if (filterCategorySelect) filterCategorySelect.addEventListener('change', renderTransactionsTable);

  const btnExport = document.getElementById('btn-export-csv');
  const btnReset = document.getElementById('btn-reset-all');
  if (btnExport) btnExport.addEventListener('click', exportToCSV);
  if (btnReset) btnReset.addEventListener('click', resetAllData);
});

document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-delete-sub]');
  if (target) {
    deleteSubscription(target.dataset.deleteSub);
    return;
  }

  const txDel = e.target.closest('[data-delete-tx]');
  if (txDel) {
    deleteExpense(txDel.dataset.deleteTx);
    return;
  }

  const monthBar = e.target.closest('[data-select-month]');
  if (monthBar) {
    selectMonthFromChart(monthBar.dataset.selectMonth);
    return;
  }
});

const sidebarToggleBtn = document.getElementById('btn-sidebar-toggle');
const sidebarEl = document.querySelector('.sidebar');

function toggleSidebar() {
  if (sidebarEl) sidebarEl.classList.toggle('sidebar-open');
}

function closeSidebar() {
  if (sidebarEl) sidebarEl.classList.remove('sidebar-open');
}

if (sidebarToggleBtn) {
  sidebarToggleBtn.addEventListener('click', toggleSidebar);
}

document.querySelectorAll('.nav-item').forEach(nav => {
  nav.addEventListener('click', () => {
    if (window.innerWidth <= 900) closeSidebar();
  });
});

document.querySelector('.main-workspace')?.addEventListener('click', (e) => {
  if (window.innerWidth <= 900 && sidebarEl?.classList.contains('sidebar-open')) {
    if (!e.target.closest('.sidebar-toggle-btn')) {
      closeSidebar();
    }
  }
});
