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

// ---------- DOM Elements ----------
const viewTitleEl = document.getElementById('view-title');
const viewSubtitleEl = document.getElementById('view-subtitle');

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

const radialGaugeContainer = document.getElementById('radial-gauge-container');

// Month Picker Elements
const monthPickerSelect = document.getElementById('month-picker');
const btnPrevMonth = document.getElementById('btn-prev-month');
const btnNextMonth = document.getElementById('btn-next-month');

// Forms & Inputs
const expenseForm = document.getElementById('expense-form');
const expAmountInput = document.getElementById('exp-amount');
const expCategorySelect = document.getElementById('exp-category');
const expDescriptionInput = document.getElementById('exp-description');
const expPaymentSelect = document.getElementById('exp-payment');
const expDateInput = document.getElementById('exp-date');

// Lists & Tables
const subsGridContainer = document.getElementById('subs-grid-container');
const dashSubsPreviewContainer = document.getElementById('dash-subs-preview');
const breakdownChartContainer = document.getElementById('breakdown-chart-container');
const breakdownListEl = document.getElementById('category-breakdown-list');
const fullAnalyticsChartContainer = document.getElementById('full-analytics-chart-container');
const fullAnalyticsListEl = document.getElementById('full-analytics-list');
const monthlyTrendChartContainer = document.getElementById('monthly-trend-chart-container');

const transactionsTbody = document.getElementById('transactions-tbody');
const emptyTableMsg = document.getElementById('empty-table-msg');

// Filters & Controls
const filterSearchInput = document.getElementById('filter-search');
const filterCategorySelect = document.getElementById('filter-category');

// Action Buttons
const btnExportCsv = document.getElementById('btn-export-csv');
const btnResetAll = document.getElementById('btn-reset-all');
const btnEditBudget = document.getElementById('btn-edit-budget');
const btnSidebarBudgetEdit = document.getElementById('btn-sidebar-budget-edit');
const btnAddSub = document.getElementById('btn-add-sub');
const btnAddSubInline = document.getElementById('btn-add-sub-inline');

// Modals
const budgetModal = document.getElementById('budget-modal');
const budgetForm = document.getElementById('budget-form');
const modalBudgetInput = document.getElementById('modal-budget-input');
const modalSaveBtn = document.getElementById('modal-save-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalTitleText = document.getElementById('modal-title-text');
const statBudgetCard = document.getElementById('stat-budget-card');
const btnCardBudgetEdit = document.getElementById('btn-card-budget-edit');

const subModal = document.getElementById('sub-modal');
const subForm = document.getElementById('sub-form');
const subNameInput = document.getElementById('sub-name');
const subAmountInput = document.getElementById('sub-amount');
const subDueDayInput = document.getElementById('sub-due-day');
const subCategorySelect = document.getElementById('sub-category');
const subModalCloseBtn = document.getElementById('sub-modal-close');
const subModalCancelBtn = document.getElementById('sub-modal-cancel');

// ---------- Helper Functions ----------
function getCurrentYearMonth() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getLocalDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function setTodayDateDefault() {
  if (expDateInput && !expDateInput.value) {
    expDateInput.value = getLocalDateString();
  }
}

function formatCurrency(val) {
  const num = Number(val) || 0;
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMonthLabel(ym) {
  if (!ym || ym === 'ALL') return 'All Time';
  const parts = ym.split('-');
  if (parts.length !== 2) return ym;
  const monthIdx = parseInt(parts[1], 10) - 1;
  const mName = monthNames[monthIdx] || parts[1];
  return `${mName} ${parts[0]}`;
}

// ---------- State Management (Cloud Firestore + Local Fallback) ----------
let currentUserId = null;
let firestoreUnsubscribe = null;
let isSyncingFromFirestore = false;

function saveState() {
  localStorage.setItem('expense_cal_desktop_budget', budget.toString());
  localStorage.setItem('expense_cal_desktop_expenses', JSON.stringify(expenses));
  localStorage.setItem('expense_cal_desktop_subscriptions', JSON.stringify(subscriptions));
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
  const savedBudget = localStorage.getItem('expense_cal_desktop_budget') || localStorage.getItem('expense_cal_web_budget');
  const savedExpenses = localStorage.getItem('expense_cal_desktop_expenses') || localStorage.getItem('expense_cal_web_expenses');
  const savedSubs = localStorage.getItem('expense_cal_desktop_subscriptions') || localStorage.getItem('expense_cal_web_subscriptions');

  budget = savedBudget ? parseFloat(savedBudget) : 0;
  expenses = savedExpenses ? JSON.parse(savedExpenses) : [];
  subscriptions = savedSubs ? JSON.parse(savedSubs) : [];

  updateMonthPickerOptions();
  updateUI();
}

function startFirestoreSync(userId) {
  currentUserId = userId;
  if (!db) {
    loadStateFromLocal();
    return;
  }

  if (typeof setSyncStatus === 'function') setSyncStatus('syncing');

  const userDocRef = db.collection('users').doc(userId);

  firestoreUnsubscribe = userDocRef.onSnapshot((doc) => {
    isSyncingFromFirestore = true;
    if (doc.exists) {
      const data = doc.data();
      budget = typeof data.budget === 'number' ? data.budget : 0;
      expenses = Array.isArray(data.expenses) ? data.expenses : [];
      subscriptions = Array.isArray(data.subscriptions) ? data.subscriptions : [];
    } else {
      budget = 0;
      expenses = [];
      subscriptions = [];
      userDocRef.set({ budget: 0, expenses: [], subscriptions: [] });
    }

    localStorage.setItem('expense_cal_desktop_budget', budget.toString());
    localStorage.setItem('expense_cal_desktop_expenses', JSON.stringify(expenses));
    localStorage.setItem('expense_cal_desktop_subscriptions', JSON.stringify(subscriptions));

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

// ---------- Month Selection Logic ----------
function getAllAvailableMonths() {
  const monthSet = new Set();
  const currentYM = getCurrentYearMonth();
  monthSet.add(currentYM);

  expenses.forEach(item => {
    if (item.date && item.date.length >= 7) {
      monthSet.add(item.date.substring(0, 7));
    }
  });

  const sortedMonths = Array.from(monthSet).sort().reverse();
  return sortedMonths;
}

function updateMonthPickerOptions() {
  if (!monthPickerSelect) return;

  const months = getAllAvailableMonths();
  const currentYM = getCurrentYearMonth();
  monthPickerSelect.innerHTML = '';

  const optAll = document.createElement('option');
  optAll.value = 'ALL';
  optAll.textContent = 'All Time History';
  monthPickerSelect.appendChild(optAll);

  months.forEach(ym => {
    const opt = document.createElement('option');
    opt.value = ym;
    opt.textContent = formatMonthLabel(ym) + (ym === currentYM ? ' (Current)' : '');
    monthPickerSelect.appendChild(opt);
  });

  if (selectedMonth !== 'ALL' && !months.includes(selectedMonth)) {
    selectedMonth = currentYM;
  }
  monthPickerSelect.value = selectedMonth;
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

// ---------- Navigation / Tab Switching ----------
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

  if (viewTitleEl) viewTitleEl.textContent = viewHeadings[viewName].title;
  if (viewSubtitleEl) viewSubtitleEl.textContent = viewHeadings[viewName].subtitle;
}

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

// ---------- UI Rendering Core ----------
function updateUI() {
  // 1. Filter expenses based on selected month
  const monthFilteredExpenses = expenses.filter(item => {
    if (selectedMonth === 'ALL') return true;
    return item.date && item.date.startsWith(selectedMonth);
  });

  // Calculate stats for filtered view
  const totalSpent = monthFilteredExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const remaining = budget - totalSpent;
  const percentUsed = budget > 0 ? (totalSpent / budget) * 100 : 0;
  const clampedPercent = Math.min(Math.max(0, percentUsed), 100);

  // 2. Header Stat Cards
  if (statBudgetEl) statBudgetEl.textContent = formatCurrency(budget);
  const sidebarBudgetVal = document.getElementById('sidebar-budget-val');
  if (sidebarBudgetVal) sidebarBudgetVal.textContent = formatCurrency(budget);

  if (statSpentEl) statSpentEl.textContent = formatCurrency(totalSpent);
  if (statCountEl) statCountEl.textContent = `${monthFilteredExpenses.length} transaction${monthFilteredExpenses.length === 1 ? '' : 's'}`;

  if (statRemainingEl) {
    statRemainingEl.textContent = formatCurrency(remaining);
    statRemainingEl.className = `stat-value ${remaining < 0 ? 'text-rose' : 'text-emerald'}`;
  }

  if (activeMonthLabelEl) {
    activeMonthLabelEl.textContent = formatMonthLabel(selectedMonth);
  }

  if (statPercentEl) {
    if (budget === 0) {
      statPercentEl.innerHTML = 'Budget Not Set <span class="edit-hint">(Click to Set ✏️)</span>';
      statPercentEl.className = 'stat-subtext text-muted';
    } else if (remaining < 0) {
      statPercentEl.innerHTML = `Over budget by ${formatCurrency(Math.abs(remaining))}`;
      statPercentEl.className = 'stat-subtext text-rose font-bold';
    } else {
      statPercentEl.innerHTML = `${percentUsed.toFixed(1)}% of monthly target spent`;
      statPercentEl.className = 'stat-subtext text-muted';
    }
  }

  if (statusIconEl) {
    statusIconEl.className = remaining < 0 ? 'fa-solid fa-circle-exclamation text-rose' : 'fa-solid fa-shield-halved text-emerald';
  }

  // 3. Subscriptions Header Stat
  const totalSubsAmount = subscriptions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  if (statSubsTotalEl) statSubsTotalEl.textContent = formatCurrency(totalSubsAmount);
  if (statSubsCountEl) statSubsCountEl.textContent = `${subscriptions.length} active subscription${subscriptions.length === 1 ? '' : 's'}`;

  // 4. Linear Progress Bar Fill
  if (progressBarFillEl) {
    progressBarFillEl.style.width = `${clampedPercent}%`;
    if (budget === 0) {
      progressBarFillEl.style.background = 'var(--primary-indigo)';
    } else if (remaining < 0) {
      progressBarFillEl.style.background = 'linear-gradient(90deg, #f59e0b, #f43f5e)';
    } else if (percentUsed >= 85) {
      progressBarFillEl.style.background = 'linear-gradient(90deg, #10b981, #f59e0b)';
    } else {
      progressBarFillEl.style.background = 'linear-gradient(90deg, #10b981, #6366f1)';
    }
  }

  if (progressPercentLabelEl) {
    progressPercentLabelEl.textContent = budget > 0 ? `${percentUsed.toFixed(1)}% Used` : '0% Used';
  }

  // 5. SVG Radial Gauge Render
  renderRadialGauge(budget, totalSpent, percentUsed);

  // 6. Category Breakdown Render (Dashboard & Full Analytics View)
  renderCategoryBreakdown(monthFilteredExpenses, totalSpent);

  // 7. Render Subscriptions Preview (Dashboard) & Subscriptions Grid View
  renderSubscriptions();

  // 8. Render Transactions Table Log
  renderTransactionsTable(monthFilteredExpenses);

  // 9. Render Monthly Trend Chart (Analytics View)
  renderMonthlyTrendChart();
}

// ---------- SVG Radial Budget Gauge ----------
function renderRadialGauge(budgetVal, totalSpentVal, percentVal) {
  if (!radialGaugeContainer) return;

  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.min(Math.max(0, percentVal), 100);
  const strokeDashoffset = circumference - (clampedPct / 100) * circumference;

  let gaugeColor = '#6366f1';
  let badgeText = 'Healthy';
  let badgeClass = 'gauge-success';

  if (budgetVal === 0) {
    gaugeColor = 'rgba(255, 255, 255, 0.15)';
    badgeText = 'No Target Set';
    badgeClass = 'gauge-muted';
  } else if (percentVal > 100) {
    gaugeColor = '#f43f5e';
    badgeText = 'Over Limit!';
    badgeClass = 'gauge-danger';
  } else if (percentVal >= 85) {
    gaugeColor = '#f59e0b';
    badgeText = 'Near Limit';
    badgeClass = 'gauge-warning';
  }

  radialGaugeContainer.innerHTML = `
    <div class="radial-gauge-wrapper">
      <svg width="170" height="170" viewBox="0 0 170 170" class="radial-gauge-svg">
        <circle cx="85" cy="85" r="${radius}" fill="none" stroke="rgba(255, 255, 255, 0.08)" stroke-width="12" />
        <circle cx="85" cy="85" r="${radius}" fill="none" stroke="${gaugeColor}" stroke-width="12"
          stroke-dasharray="${circumference}" stroke-dashoffset="${strokeDashoffset}" stroke-linecap="round"
          class="radial-gauge-progress" transform="rotate(-90 85 85)" />
      </svg>
      <div class="radial-gauge-center">
        <span class="radial-percent-val">${budgetVal > 0 ? Math.round(percentVal) + '%' : '0%'}</span>
        <span class="radial-percent-label">${budgetVal > 0 ? 'BUDGET USED' : 'SET BUDGET'}</span>
        <button type="button" class="gauge-status-badge ${badgeClass}" id="btn-gauge-badge-action">${badgeText}</button>
      </div>
    </div>
  `;

  const btnAction = document.getElementById('btn-gauge-badge-action');
  if (btnAction) {
    btnAction.addEventListener('click', openBudgetModal);
  }
}

// ---------- Category Breakdown (SVG Donut Chart + List) ----------
function renderCategoryBreakdown(monthFilteredExpenses, totalSpent) {
  // Aggregate category spending totals
  const categoryTotals = {};
  monthFilteredExpenses.forEach(exp => {
    const cat = exp.category || 'Miscellaneous';
    const amt = Number(exp.amount) || 0;
    categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
  });

  const sortedCategories = Object.keys(categoryTotals).sort((a, b) => categoryTotals[b] - categoryTotals[a]);

  // Dashboard Donut Chart
  if (breakdownChartContainer) {
    if (totalSpent === 0) {
      breakdownChartContainer.innerHTML = `
        <div class="empty-state-small">
          <i class="fa-solid fa-chart-pie empty-state-icon"></i>
          <p>No expense data for ${formatMonthLabel(selectedMonth)}</p>
        </div>
      `;
    } else {
      const radius = 54;
      const circumference = 2 * Math.PI * radius;
      let accumulatedPercent = 0;
      let slicesSVG = '';

      sortedCategories.forEach(cat => {
        const catSpent = categoryTotals[cat];
        const pct = catSpent / totalSpent;
        const dashArray = `${pct * circumference} ${circumference}`;
        const strokeOffset = -accumulatedPercent * circumference;
        const color = categoryColors[cat] || '#64748b';

        slicesSVG += `
          <circle cx="70" cy="70" r="${radius}" fill="none" stroke="${color}" stroke-width="18"
            stroke-dasharray="${dashArray}" stroke-dashoffset="${strokeOffset}" class="donut-slice" />
        `;
        accumulatedPercent += pct;
      });

      breakdownChartContainer.innerHTML = `
        <div class="donut-chart-wrapper">
          <svg width="140" height="140" viewBox="0 0 140 140" class="donut-svg">
            ${slicesSVG}
          </svg>
          <div class="donut-center-text">
            <span class="donut-total-title">Total Spent</span>
            <span class="donut-total-val">${formatCurrency(totalSpent)}</span>
          </div>
        </div>
      `;
    }
  }

  // Dashboard Category Progress List
  if (breakdownListEl) {
    breakdownListEl.innerHTML = '';

    if (sortedCategories.length === 0) {
      breakdownListEl.innerHTML = '<p class="empty-state-sub">No expenses logged in ' + formatMonthLabel(selectedMonth) + '.</p>';
    } else {
      sortedCategories.forEach(cat => {
        const amt = categoryTotals[cat];
        const pct = totalSpent > 0 ? ((amt / totalSpent) * 100).toFixed(1) : 0;
        const color = categoryColors[cat] || '#3b82f6';

        const itemEl = document.createElement('div');
        itemEl.className = 'breakdown-item';
        itemEl.innerHTML = `
          <div class="breakdown-info">
            <span class="breakdown-label"><span class="cat-dot" style="background: ${color};"></span> ${cat}</span>
            <span class="font-bold">${formatCurrency(amt)} (${pct}%)</span>
          </div>
          <div class="breakdown-bar-bg">
            <div class="breakdown-bar-fill" style="width: ${pct}%; background: ${color};"></div>
          </div>
        `;
        breakdownListEl.appendChild(itemEl);
      });
    }
  }

  // Full Analytics View Donut & List
  if (fullAnalyticsChartContainer && fullAnalyticsListEl) {
    if (totalSpent === 0) {
      fullAnalyticsChartContainer.innerHTML = `<div class="empty-state-small"><i class="fa-solid fa-chart-pie empty-state-icon"></i><p>No analytics data available</p></div>`;
      fullAnalyticsListEl.innerHTML = '<p class="empty-state-sub">Log transactions to populate category analytics.</p>';
    } else {
      const radius = 64;
      const circumference = 2 * Math.PI * radius;
      let accumulatedPercent = 0;
      let slicesSVG = '';

      sortedCategories.forEach(cat => {
        const catSpent = categoryTotals[cat];
        const pct = catSpent / totalSpent;
        const dashArray = `${pct * circumference} ${circumference}`;
        const strokeOffset = -accumulatedPercent * circumference;
        const color = categoryColors[cat] || '#64748b';

        slicesSVG += `
          <circle cx="80" cy="80" r="${radius}" fill="none" stroke="${color}" stroke-width="22"
            stroke-dasharray="${dashArray}" stroke-dashoffset="${strokeOffset}" class="donut-slice" />
        `;
        accumulatedPercent += pct;
      });

      fullAnalyticsChartContainer.innerHTML = `
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

      fullAnalyticsListEl.innerHTML = '';
      sortedCategories.forEach(cat => {
        const amt = categoryTotals[cat];
        const pct = totalSpent > 0 ? ((amt / totalSpent) * 100).toFixed(1) : 0;
        const color = categoryColors[cat] || '#3b82f6';

        const itemEl = document.createElement('div');
        itemEl.className = 'breakdown-item';
        itemEl.innerHTML = `
          <div class="breakdown-info">
            <span class="breakdown-label"><span class="cat-dot" style="background: ${color};"></span> ${cat}</span>
            <span class="font-bold">${formatCurrency(amt)} (${pct}%)</span>
          </div>
          <div class="breakdown-bar-bg">
            <div class="breakdown-bar-fill" style="width: ${pct}%; background: ${color};"></div>
          </div>
        `;
        fullAnalyticsListEl.appendChild(itemEl);
      });
    }
  }
}

// ---------- Subscriptions & Monthly Bills ----------
function renderSubscriptions() {
  const currentYM = getCurrentYearMonth();
  const currentDay = new Date().getDate();

  // Dashboard Preview
  if (dashSubsPreviewContainer) {
    dashSubsPreviewContainer.innerHTML = '';

    if (subscriptions.length === 0) {
      dashSubsPreviewContainer.innerHTML = '<p class="empty-state-sub">No active recurring bills.</p>';
    } else {
      const topSubs = subscriptions.slice(0, 3);
      topSubs.forEach(sub => {
        const isPaidThisMonth = sub.lastPaidMonth === currentYM;
        const item = document.createElement('div');
        item.className = 'dash-sub-item';
        item.innerHTML = `
          <div>
            <div class="dash-sub-name">${escapeHtml(sub.name)}</div>
            <div class="dash-sub-due">Due on Day ${sub.dueDay} of month</div>
          </div>
          <div class="dash-sub-right">
            <div class="dash-sub-amount">${formatCurrency(sub.amount)}</div>
          </div>
        `;
        dashSubsPreviewContainer.appendChild(item);
      });
    }
  }

  // Dedicated Bills View Grid
  if (subsGridContainer) {
    subsGridContainer.innerHTML = '';

    if (subscriptions.length === 0) {
      subsGridContainer.innerHTML = `
        <div class="empty-state-card">
          <i class="fa-solid fa-calendar-check empty-state-icon"></i>
          <p class="empty-state-title">No Recurring Bills Added</p>
          <p class="empty-state-sub">Click "+ Add Bill" to manage monthly rent, wifi, or utility reminders.</p>
        </div>
      `;
    } else {
      subscriptions.forEach(sub => {
        const isPaidThisMonth = sub.lastPaidMonth === currentYM;
        let statusClass = 'due';
        let statusText = `Due Day ${sub.dueDay}`;

        if (isPaidThisMonth) {
          statusClass = 'paid';
          statusText = 'Paid This Month';
        } else if (currentDay > sub.dueDay) {
          statusClass = 'overdue';
          statusText = `Overdue (Day ${sub.dueDay})`;
        } else if (sub.dueDay - currentDay <= 7) {
          statusClass = 'due';
          statusText = `Due in ${sub.dueDay - currentDay} days`;
        }

        const card = document.createElement('div');
        card.className = 'sub-card-item';
        card.innerHTML = `
          <div class="sub-card-header">
            <div>
              <div class="sub-title">${escapeHtml(sub.name)}</div>
              <div class="sub-due">${escapeHtml(sub.category)}</div>
            </div>
            <button class="icon-btn action-btn-del" data-delete-sub="${sub.id}" title="Delete Subscription">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="sub-amount">${formatCurrency(sub.amount)} <span class="per-mo">/ mo</span></div>
          <div class="sub-actions">
            <span class="status-badge ${statusClass}">${statusText}</span>
            ${
              !isPaidThisMonth
                ? `<button class="btn btn-secondary btn-sm" data-pay-sub="${sub.id}">
                    <i class="fa-solid fa-check"></i> Mark Paid
                   </button>`
                : `<span class="paid-check-badge"><i class="fa-solid fa-circle-check"></i> Paid</span>`
            }
          </div>
        `;
        subsGridContainer.appendChild(card);
      });
    }
  }
}

function markSubAsPaid(id) {
  const currentYM = getCurrentYearMonth();
  subscriptions = subscriptions.map(sub => {
    if (sub.id === id) {
      return { ...sub, lastPaidMonth: currentYM };
    }
    return sub;
  });
  saveState();
  updateUI();
}

function deleteSubscription(id) {
  if (confirm('Are you sure you want to remove this recurring bill subscription?')) {
    subscriptions = subscriptions.filter(sub => sub.id !== id);
    saveState();
    updateUI();
  }
}

// ---------- Monthly Spending Trend Bar Chart ----------
function renderMonthlyTrendChart() {
  if (!monthlyTrendChartContainer) return;

  const monthlyTotals = {};
  expenses.forEach(exp => {
    if (exp.date && exp.date.length >= 7) {
      const ym = exp.date.substring(0, 7);
      monthlyTotals[ym] = (monthlyTotals[ym] || 0) + (Number(exp.amount) || 0);
    }
  });

  const months = Object.keys(monthlyTotals).sort().slice(-6);

  if (months.length === 0) {
    monthlyTrendChartContainer.innerHTML = `<div class="empty-state-small"><i class="fa-solid fa-chart-column empty-state-icon"></i><p>No historical monthly data recorded</p></div>`;
    return;
  }

  const maxSpent = Math.max(...months.map(ym => monthlyTotals[ym]), 1);
  const chartHeight = 160;

  const barElements = months.map(ym => {
    const amount = monthlyTotals[ym] || 0;
    const heightPercent = Math.min(100, Math.max(8, (amount / maxSpent) * 100));
    const isSelected = selectedMonth === ym;
    const barColor = isSelected ? 'linear-gradient(180deg, #818cf8, #6366f1)' : 'linear-gradient(180deg, rgba(99, 102, 241, 0.6), rgba(99, 102, 241, 0.2))';

    return `
      <div class="trend-bar-column ${isSelected ? 'selected' : ''}" data-select-month="${ym}" title="${formatMonthLabel(ym)}: ${formatCurrency(amount)}">
        <div class="trend-bar-val">${formatCurrency(amount)}</div>
        <div class="trend-bar-track">
          <div class="trend-bar-fill" style="height: ${heightPercent}%; background: ${barColor};"></div>
        </div>
        <div class="trend-bar-label">${formatMonthLabel(ym).split(' ')[0]}</div>
      </div>
    `;
  });

  monthlyTrendChartContainer.innerHTML = `
    <div class="trend-chart-flex">
      ${barElements.join('')}
    </div>
  `;
}

function selectMonthFromChart(ym) {
  selectedMonth = ym;
  updateMonthPickerOptions();
  updateUI();
}

function renderTransactionsTable(monthFilteredExpenses) {
  if (!transactionsTbody) return;

  const searchTerm = filterSearchInput ? filterSearchInput.value.toLowerCase().trim() : '';
  const selectedCat = filterCategorySelect ? filterCategorySelect.value : 'ALL';
  const todayStr = getLocalDateString();

  const filtered = monthFilteredExpenses.filter(item => {
    const matchesSearch = item.description.toLowerCase().includes(searchTerm) ||
                          item.category.toLowerCase().includes(searchTerm) ||
                          item.payment.toLowerCase().includes(searchTerm);
    const matchesCat = selectedCat === 'ALL' || item.category === selectedCat;

    let matchesTime = true;
    if (activeTimeFilter === 'TODAY') {
      matchesTime = item.date === todayStr;
    }

    return matchesSearch && matchesCat && matchesTime;
  });

  transactionsTbody.innerHTML = '';

  if (filtered.length === 0) {
    if (emptyTableMsg) emptyTableMsg.classList.remove('hidden');
    return;
  }

  if (emptyTableMsg) emptyTableMsg.classList.add('hidden');
  const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

  sorted.forEach(item => {
    const tr = document.createElement('tr');
    const color = categoryColors[item.category] || '#3b82f6';

    tr.innerHTML = `
      <td class="font-medium">${item.date}</td>
      <td><span class="category-badge" style="border-left: 3px solid ${color};">${item.category}</span></td>
      <td class="description-cell">${escapeHtml(item.description)}</td>
      <td><span class="payment-badge"><i class="fa-solid fa-credit-card"></i> ${item.payment}</span></td>
      <td class="text-right font-bold text-amount">${formatCurrency(item.amount)}</td>
      <td class="text-center">
        <button class="icon-btn action-btn-del" data-delete-tx="${item.id}" title="Delete Transaction">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </td>
    `;
    transactionsTbody.appendChild(tr);
  });
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}

// ---------- Event Handlers ----------
if (expenseForm) {
  expenseForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const amount = parseFloat(expAmountInput.value);
    const category = expCategorySelect.value;
    const description = expDescriptionInput.value.trim();
    const payment = expPaymentSelect.value;
    const date = expDateInput.value;

    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    const newExpense = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      amount,
      category,
      description,
      payment,
      date
    };

    expenses.push(newExpense);
    saveState();
    
    // Automatically switch month to the added expense month if different
    if (date && date.length >= 7) {
      selectedMonth = date.substring(0, 7);
    }

    updateMonthPickerOptions();
    updateUI();

    expAmountInput.value = '';
    expDescriptionInput.value = '';
    setTodayDateDefault();
    expAmountInput.focus();
  });
}

function deleteTransaction(id) {
  if (confirm('Are you sure you want to delete this transaction?')) {
    expenses = expenses.filter(item => item.id !== id);
    saveState();
    updateMonthPickerOptions();
    updateUI();
  }
}

if (filterSearchInput) filterSearchInput.addEventListener('input', updateUI);
if (filterCategorySelect) filterCategorySelect.addEventListener('change', updateUI);

document.querySelectorAll('.filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeTimeFilter = chip.dataset.filter || 'ALL';
    updateUI();
  });
});

// Budget Modal Handlers
function openBudgetModal() {
  if (!modalBudgetInput || !budgetModal) return;
  if (modalTitleText) {
    modalTitleText.textContent = budget > 0 ? 'Edit Monthly Budget Cap' : 'Set Monthly Budget Cap';
  }
  modalBudgetInput.value = budget > 0 ? budget : '';
  budgetModal.classList.remove('hidden');
  setTimeout(() => {
    try {
      modalBudgetInput.focus();
      if (typeof modalBudgetInput.select === 'function') {
        modalBudgetInput.select();
      }
    } catch (err) {
      // Ignore selection errors on unsupported platforms
    }
  }, 50);
}

if (btnEditBudget) btnEditBudget.addEventListener('click', openBudgetModal);
if (btnSidebarBudgetEdit) btnSidebarBudgetEdit.addEventListener('click', openBudgetModal);
if (btnCardBudgetEdit) btnCardBudgetEdit.addEventListener('click', (e) => { e.stopPropagation(); openBudgetModal(); });
if (statBudgetCard) statBudgetCard.addEventListener('click', openBudgetModal);

function closeModal(targetModal) {
  if (targetModal) {
    targetModal.classList.add('hidden');
  } else {
    // Close all modals if no specific target
    if (budgetModal) budgetModal.classList.add('hidden');
    if (subModal) subModal.classList.add('hidden');
  }
}

if (modalCancelBtn) modalCancelBtn.addEventListener('click', () => closeModal(budgetModal));
if (modalCloseBtn) modalCloseBtn.addEventListener('click', () => closeModal(budgetModal));
if (subModalCloseBtn) subModalCloseBtn.addEventListener('click', () => closeModal(subModal));
if (subModalCancelBtn) subModalCancelBtn.addEventListener('click', () => closeModal(subModal));

// Backdrop Click to Dismiss Modals
if (budgetModal) {
  budgetModal.addEventListener('click', (e) => {
    if (e.target === budgetModal) closeModal(budgetModal);
  });
}
if (subModal) {
  subModal.addEventListener('click', (e) => {
    if (e.target === subModal) closeModal(subModal);
  });
}

function handleSaveBudget(e) {
  if (e) e.preventDefault();
  const raw = modalBudgetInput ? modalBudgetInput.value : '';
  // Clean commas, currency symbols, spaces, keeping digits and decimal point
  const cleaned = raw.toString().replace(/[^0-9.]/g, '').trim();
  const newBudget = parseFloat(cleaned);

  if (cleaned === '' || isNaN(newBudget) || newBudget <= 0) {
    alert('Please enter a valid budget amount.');
    return;
  }

  budget = newBudget;
  saveState();
  updateUI();
  closeModal();
}

if (modalBudgetInput) {
  modalBudgetInput.addEventListener('input', (e) => {
    // Restrict input to digits and an optional single decimal point only
    let val = e.target.value.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('');
    }
    e.target.value = val;
  });
}

if (budgetForm) {
  budgetForm.addEventListener('submit', handleSaveBudget);
} else if (modalSaveBtn) {
  modalSaveBtn.addEventListener('click', handleSaveBudget);
}

// Add Subscription Modal
function openSubscriptionModal() {
  if (!subNameInput || !subAmountInput || !subDueDayInput || !subModal) return;
  subNameInput.value = '';
  subAmountInput.value = '';
  subDueDayInput.value = '';
  subModal.classList.remove('hidden');
  subNameInput.focus();
}

if (btnAddSub) btnAddSub.addEventListener('click', openSubscriptionModal);
if (btnAddSubInline) btnAddSubInline.addEventListener('click', openSubscriptionModal);

if (subForm) {
  subForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = subNameInput.value.trim();
    const amount = parseFloat(subAmountInput.value);
    const dueDay = parseInt(subDueDayInput.value, 10);
    const category = subCategorySelect.value;

    if (!name || isNaN(amount) || amount <= 0 || isNaN(dueDay) || dueDay < 1 || dueDay > 31) {
      alert('Please enter valid subscription details.');
      return;
    }

    const newSub = {
      id: 'sub_' + Date.now().toString(36),
      name,
      amount,
      dueDay,
      category,
      lastPaidMonth: ''
    };

    subscriptions.push(newSub);
    saveState();
    updateUI();
    closeModal();
  });
}

// Export CSV
if (btnExportCsv) {
  btnExportCsv.addEventListener('click', () => {
    const exportList = expenses.filter(item => selectedMonth === 'ALL' || (item.date && item.date.startsWith(selectedMonth)));
    if (exportList.length === 0) {
      alert('No transactions available to export for selected month.');
      return;
    }

    let csvContent = 'Date,Category,Description,Payment Method,Amount (INR)\n';
    exportList.forEach(item => {
      const safeDesc = (item.description || '').replace(/"/g, '""').replace(/[\r\n]+/g, ' ');
      const safeCat = (item.category || '').replace(/"/g, '""');
      const safePay = (item.payment || '').replace(/"/g, '""');
      const row = `"${item.date}","${safeCat}","${safeDesc}","${safePay}",${item.amount}`;
      csvContent += row + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Expense_Report_${selectedMonth}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
}

// Reset All Data
if (btnResetAll) {
  btnResetAll.addEventListener('click', () => {
    if (confirm('⚠️ WARNING: This will permanently reset and delete ALL logged expenses, budget caps, and subscriptions! Continue?')) {
      budget = 0;
      expenses = [];
      subscriptions = [];
      selectedMonth = getCurrentYearMonth();
      localStorage.clear();
      saveState();
      updateMonthPickerOptions();
      updateUI();
      alert('All expense records, budget limits, and cloud data have been completely reset.');
    }
  });
}

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    if (expAmountInput) expAmountInput.focus();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault();
    if (filterSearchInput) filterSearchInput.focus();
  }
  if (e.key === 'Escape') {
    closeModal();
  }
});

// ---------- Delegated Event Listeners ----------
// Handle clicks on dynamically-rendered elements via data-* attributes
document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-delete-sub]');
  if (target) {
    deleteSubscription(target.dataset.deleteSub);
    return;
  }

  const payBtn = e.target.closest('[data-pay-sub]');
  if (payBtn) {
    markSubAsPaid(payBtn.dataset.paySub);
    return;
  }

  const txDel = e.target.closest('[data-delete-tx]');
  if (txDel) {
    deleteTransaction(txDel.dataset.deleteTx);
    return;
  }

  const monthBar = e.target.closest('[data-select-month]');
  if (monthBar) {
    selectMonthFromChart(monthBar.dataset.selectMonth);
    return;
  }
});

// ---------- Sidebar Toggle for Small Screens ----------
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

// Auto-close sidebar when a nav item is clicked on small screens
document.querySelectorAll('.nav-item').forEach(nav => {
  nav.addEventListener('click', () => {
    if (window.innerWidth <= 900) closeSidebar();
  });
});

// Close sidebar when clicking outside on mobile (on the main workspace)
document.querySelector('.main-workspace')?.addEventListener('click', (e) => {
  if (window.innerWidth <= 900 && sidebarEl?.classList.contains('sidebar-open')) {
    if (!e.target.closest('.sidebar-toggle-btn')) {
      closeSidebar();
    }
  }
});

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  setTodayDateDefault();
  // If Firebase is not configured, load from localStorage directly
  if (!isFirebaseConfigured) {
    loadStateFromLocal();
  }
  // If Firebase IS configured, auth.js onAuthStateChanged will trigger data loading
});
