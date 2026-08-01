// Expense Calculator - Futuristic Dark Glassmorphic Dashboard Logic
// Handles navigation tabs, state persistence, SVG radial budget gauge, month-wise filtering, monthly bar chart trend, category donut analytics, transaction tracking, and subscription reminders.

// ---------- State Variables ----------
let budget = 0;
let expenses = [];
let subscriptions = [];
let activeTimeFilter = 'ALL';
let currentView = 'dashboard';
let selectedMonth = getCurrentYearMonth(); // YYYY-MM or 'ALL'

// Category Color Map (Spec Compliant)
const categoryColors = {
  'Food & Dining': '#34D399',           // Emerald
  'Transportation': '#38BDF8',          // Sky
  'Shopping': '#A78BFA',                // Violet
  'Bills & Utilities': '#FBBF24',       // Amber
  'Entertainment': '#F472B6',           // Pink
  'Health & Fitness': '#FB923C',        // Orange
  'Services & Subscriptions': '#818CF8',// Indigo
  'Miscellaneous': '#94A3B8'            // Slate
};

// Chart.js Instances
let breakdownChartInstance = null;
let fullAnalyticsChartInstance = null;
let trendChartInstance = null;

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
const gaugeLimitLabelEl = document.getElementById('gauge-limit-label');
const statPercentDetailEl = document.getElementById('stat-percent-detail');

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

const subModal = document.getElementById('sub-modal');
const subForm = document.getElementById('sub-form');
const subNameInput = document.getElementById('sub-name');
const subAmountInput = document.getElementById('sub-amount');
const subDueDayInput = document.getElementById('sub-due-day');
const subCategorySelect = document.getElementById('sub-category');
const subModalCloseBtn = document.getElementById('sub-modal-close');
const subModalCancelBtn = document.getElementById('sub-modal-cancel');

// ---------- Helper Functions ----------
function formatCurrency(val) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(val || 0);
}

function getCurrentYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(ymStr) {
  if (!ymStr || ymStr === 'ALL') return 'All Months';
  const parts = ymStr.split('-');
  if (parts.length < 2) return ymStr;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  return `${monthNames[monthIdx] || parts[1]} ${year}`;
}

// Custom Glassmorphic Confirm & Alert Modal Helpers
function showConfirm(title, message, isDanger = false) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-modal-title');
    const msgEl = document.getElementById('confirm-modal-msg');
    const okBtn = document.getElementById('confirm-modal-ok');
    const cancelBtn = document.getElementById('confirm-modal-cancel');
    const closeBtn = document.getElementById('confirm-modal-close');

    if (!modal || !okBtn) { resolve(confirm(message)); return; }

    titleEl.innerHTML = isDanger
      ? `<i class="fa-solid fa-triangle-exclamation text-rose"></i> ${title}`
      : `<i class="fa-solid fa-circle-question text-sky"></i> ${title}`;
    msgEl.textContent = message;

    if (isDanger) {
      okBtn.className = 'btn btn-danger-outline';
      okBtn.textContent = 'Yes, Proceed';
    } else {
      okBtn.className = 'btn btn-primary';
      okBtn.textContent = 'Confirm';
    }

    modal.classList.remove('hidden');

    function done(res) {
      modal.classList.add('hidden');
      okBtn.onclick = null;
      if (cancelBtn) cancelBtn.onclick = null;
      if (closeBtn) closeBtn.onclick = null;
      modal.onclick = null;
      resolve(res);
    }

    okBtn.onclick = () => done(true);
    if (cancelBtn) cancelBtn.onclick = () => done(false);
    if (closeBtn) closeBtn.onclick = () => done(false);
    modal.onclick = (e) => {
      if (e.target === modal) done(false);
    };
  });
}

function showAlert(title, message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('alert-modal');
    const titleEl = document.getElementById('alert-modal-title');
    const msgEl = document.getElementById('alert-modal-msg');
    const okBtn = document.getElementById('alert-modal-ok');
    const closeBtn = document.getElementById('alert-modal-close');

    if (!modal || !okBtn) { alert(message); resolve(); return; }

    titleEl.innerHTML = `<i class="fa-solid fa-circle-info text-emerald"></i> ${title}`;
    msgEl.textContent = message;
    modal.classList.remove('hidden');

    function done() {
      modal.classList.add('hidden');
      okBtn.onclick = null;
      if (closeBtn) closeBtn.onclick = null;
      modal.onclick = null;
      resolve();
    }

    okBtn.onclick = () => done();
    if (closeBtn) closeBtn.onclick = () => done();
    modal.onclick = (e) => {
      if (e.target === modal) done();
    };
  });
}

// ---------- State Persistence (Firestore + localStorage fallback) ----------
let currentUserId = null;
let firestoreUnsubscribe = null;
let isSyncingFromFirestore = false;

function saveState() {
  // Always save to localStorage as backup
  localStorage.setItem('expense_cal_web_budget', budget.toString());
  localStorage.setItem('expense_cal_web_expenses', JSON.stringify(expenses));
  localStorage.setItem('expense_cal_web_subscriptions', JSON.stringify(subscriptions));

  // Save to Firestore if logged in
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

// Kept for offline / non-Firebase mode
function loadState() {
  loadStateFromLocal();
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

    // Also cache locally
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
    Number.isFinite(Number(item.amount)) && Number(item.amount) > 0 &&
    typeof item.category === 'string' &&
    typeof item.description === 'string' &&
    typeof item.payment === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(item.date);
}

function isValidSubscription(item) {
  return item && typeof item === 'object' &&
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    Number.isFinite(Number(item.amount)) && Number(item.amount) > 0 &&
    Number.isInteger(Number(item.dueDay)) && Number(item.dueDay) >= 1 && Number(item.dueDay) <= 31 &&
    typeof item.category === 'string';
}

function getLocalDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function setTodayDateDefault() {
  const today = getLocalDateString();
  if (expDateInput) expDateInput.value = today;
}

// ---------- Month-Wise Selection & Navigation ----------
function getAvailableMonths() {
  const monthSet = new Set();
  monthSet.add(getCurrentYearMonth()); // Always include current month

  expenses.forEach(item => {
    if (item.date && item.date.length >= 7) {
      monthSet.add(item.date.substring(0, 7));
    }
  });

  const sorted = Array.from(monthSet).sort().reverse();
  return sorted;
}

function updateMonthPickerOptions() {
  if (!monthPickerSelect) return;
  const months = getAvailableMonths();

  monthPickerSelect.innerHTML = '';
  
  // Option for All Time
  const allOpt = document.createElement('option');
  allOpt.value = 'ALL';
  allOpt.textContent = '📅 All Time';
  if (selectedMonth === 'ALL') allOpt.selected = true;
  monthPickerSelect.appendChild(allOpt);

  months.forEach(ym => {
    const opt = document.createElement('option');
    opt.value = ym;
    opt.textContent = `📅 ${formatMonthLabel(ym)}`;
    if (selectedMonth === ym) opt.selected = true;
    monthPickerSelect.appendChild(opt);
  });
}

if (monthPickerSelect) {
  monthPickerSelect.addEventListener('change', (e) => {
    selectedMonth = e.target.value;
    updateUI();
  });
}

if (btnPrevMonth && btnNextMonth) {
  btnPrevMonth.addEventListener('click', () => {
    const months = getAvailableMonths();
    if (selectedMonth === 'ALL') {
      selectedMonth = months[0] || getCurrentYearMonth();
    } else {
      const idx = months.indexOf(selectedMonth);
      if (idx !== -1 && idx < months.length - 1) {
        selectedMonth = months[idx + 1];
      }
    }
    updateMonthPickerOptions();
    updateUI();
  });

  btnNextMonth.addEventListener('click', () => {
    const months = getAvailableMonths();
    if (selectedMonth === 'ALL') {
      selectedMonth = months[0] || getCurrentYearMonth();
    } else {
      const idx = months.indexOf(selectedMonth);
      if (idx > 0) {
        selectedMonth = months[idx - 1];
      }
    }
    updateMonthPickerOptions();
    updateUI();
  });
}

// ---------- Tab / View Switching ----------
function switchView(viewName) {
  if (currentView === viewName) return;

  const oldPanel = document.getElementById(`view-${currentView}`);
  const targetPanel = document.getElementById(`view-${viewName}`);

  currentView = viewName;

  document.querySelectorAll('.nav-item').forEach(nav => {
    if (nav.dataset.view === viewName) {
      nav.classList.add('active');
    } else {
      nav.classList.remove('active');
    }
  });

  if (viewHeadings[viewName]) {
    viewTitleEl.textContent = viewHeadings[viewName].title;
    viewSubtitleEl.textContent = viewHeadings[viewName].subtitle;
  }

  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (oldPanel && targetPanel && !isReducedMotion) {
    oldPanel.classList.add('view-exit');
    setTimeout(() => {
      oldPanel.classList.remove('active', 'view-exit');
      targetPanel.classList.add('active');
      updateUI();
    }, 150);
  } else {
    document.querySelectorAll('.view-panel').forEach(panel => panel.classList.remove('active', 'view-exit'));
    if (targetPanel) targetPanel.classList.add('active');
    updateUI();
  }
}

document.querySelectorAll('.nav-item').forEach(nav => {
  nav.addEventListener('click', (e) => {
    e.preventDefault();
    const view = nav.dataset.view;
    if (view) switchView(view);
  });
});

document.querySelectorAll('.view-all-link[data-view]').forEach(control => {
  control.addEventListener('click', (e) => {
    e.preventDefault();
    switchView(control.dataset.view);
  });
});

// ---------- UI Render & Update ----------
function updateUI() {
  // Filter Expenses by Selected Month
  const filteredMonthExpenses = expenses.filter(item => {
    if (selectedMonth === 'ALL') return true;
    return item.date && item.date.startsWith(selectedMonth);
  });

  const totalSpent = filteredMonthExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const remaining = budget - totalSpent;
  const spentRatio = budget > 0 ? (totalSpent / budget) * 100 : 0;
  const remainingPercent = Math.max(0, 100 - spentRatio);

  if (activeMonthLabelEl) {
    activeMonthLabelEl.textContent = selectedMonth === 'ALL' ? 'All Time' : formatMonthLabel(selectedMonth);
  }

  // Update Stat Cards & Topbar Budget Edit Button Label
  if (btnEditBudget) {
    btnEditBudget.innerHTML = budget > 0 
      ? '<i class="fa-solid fa-pen-to-square"></i> Edit Budget' 
      : '<i class="fa-solid fa-sliders"></i> Set Budget';
  }

  if (statBudgetEl) statBudgetEl.textContent = formatCurrency(budget);
  if (statSpentEl) statSpentEl.textContent = formatCurrency(totalSpent);
  if (statCountEl) statCountEl.textContent = `${filteredMonthExpenses.length} transaction${filteredMonthExpenses.length === 1 ? '' : 's'}`;

  const sidebarBudgetVal = document.getElementById('sidebar-budget-val');
  if (sidebarBudgetVal) sidebarBudgetVal.textContent = formatCurrency(budget);

  if (budget === 0) {
    if (statRemainingEl) statRemainingEl.textContent = '₹0.00';
    if (statPercentEl) statPercentEl.textContent = 'Budget Not Set (Click to Set ✏️)';
  } else {
    if (statRemainingEl) statRemainingEl.textContent = formatCurrency(remaining);
    if (statPercentEl) statPercentEl.textContent = `${remainingPercent.toFixed(1)}% Left`;
  }

  // Balance Indicator Colors
  if (statRemainingEl && statusIconEl) {
    statRemainingEl.classList.remove('text-rose', 'text-amber', 'text-emerald', 'text-muted');
    statusIconEl.className = 'fa-solid stat-icon';

    if (budget === 0) {
      statRemainingEl.classList.add('text-muted');
      statusIconEl.classList.add('fa-circle-info', 'text-muted');
    } else if (remaining < 0) {
      statRemainingEl.classList.add('text-rose');
      statusIconEl.classList.add('fa-circle-exclamation', 'text-rose');
    } else if (spentRatio >= 80) {
      statRemainingEl.classList.add('text-amber');
      statusIconEl.classList.add('fa-triangle-exclamation', 'text-amber');
    } else {
      statRemainingEl.classList.add('text-emerald');
      statusIconEl.classList.add('fa-shield-halved', 'text-emerald');
    }
  }

  // Progress Bar & Gauge Labels
  const clampPercent = Math.min(100, Math.max(0, spentRatio));
  if (progressBarFillEl) progressBarFillEl.style.width = `${clampPercent}%`;
  if (progressPercentLabelEl) progressPercentLabelEl.textContent = budget > 0 ? `${clampPercent.toFixed(1)}% Used` : '0% Used';
  if (gaugeLimitLabelEl) gaugeLimitLabelEl.textContent = `${formatCurrency(budget)} Limit`;
  if (statPercentDetailEl) statPercentDetailEl.textContent = budget > 0 ? `${clampPercent.toFixed(1)}% Used` : '0% Used';

  if (progressBarFillEl) {
    if (spentRatio > 100) {
      progressBarFillEl.style.background = 'linear-gradient(90deg, #f59e0b, #f43f5e)';
    } else if (spentRatio >= 80) {
      progressBarFillEl.style.background = 'linear-gradient(90deg, #10b981, #f59e0b)';
    } else {
      progressBarFillEl.style.background = 'linear-gradient(90deg, #10b981, #6366f1)';
    }
  }

  renderRadialGauge(spentRatio, totalSpent, budget);
  renderSubscriptions();
  renderCategoryBreakdown(filteredMonthExpenses, totalSpent);
  renderMonthlyTrendChart();
  renderTransactionsTable(filteredMonthExpenses);
}

// Render Radial SVG Budget Gauge Ring
function renderRadialGauge(spentRatio, totalSpent, budgetLimit) {
  if (!radialGaugeContainer) return;

  const size = 190;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampPercent = Math.min(100, Math.max(0, spentRatio));
  const strokeDashoffset = circumference - (clampPercent / 100) * circumference;

  let strokeColor = '#34D399';
  let statusText = 'Normal Spending';
  let badgeClass = 'gauge-success';

  if (budgetLimit === 0) {
    statusText = 'Set Budget Limit';
    strokeColor = '#5F6A80';
    badgeClass = 'gauge-muted';
  } else if (spentRatio > 100) {
    statusText = 'Over Budget Cap!';
    strokeColor = '#FB7185';
    badgeClass = 'gauge-danger';
  } else if (spentRatio >= 80) {
    statusText = 'High Spending Warning';
    strokeColor = '#FBBF24';
    badgeClass = 'gauge-warning';
  } else {
    statusText = 'Budget Healthy';
    strokeColor = '#34D399';
    badgeClass = 'gauge-success';
  }

  radialGaugeContainer.innerHTML = `
    <div class="radial-gauge-wrapper">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="radial-gauge-svg">
        <circle cx="${size / 2}" cy="${size / 2}" r="${radius}"
          fill="transparent"
          stroke="rgba(255, 255, 255, 0.08)"
          stroke-width="${strokeWidth}"
        />
        <circle cx="${size / 2}" cy="${size / 2}" r="${radius}"
          fill="transparent"
          stroke="${strokeColor}"
          stroke-width="${strokeWidth}"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${strokeDashoffset}"
          stroke-linecap="round"
          class="radial-gauge-progress"
          transform="rotate(-90 ${size / 2} ${size / 2})"
        />
      </svg>
      <div class="radial-gauge-center">
        <span class="radial-percent-val">${budgetLimit > 0 ? clampPercent.toFixed(1) + '%' : '0%'}</span>
        <span class="radial-percent-label">Budget Used</span>
        <span class="gauge-status-badge ${badgeClass}">${statusText}</span>
      </div>
    </div>
  `;
}

function renderSubscriptions() {
  const currentYM = getCurrentYearMonth();
  const currentDay = new Date().getDate();

  let totalMonthlySubs = 0;
  let dueSoonCount = 0;

  subscriptions.forEach(sub => {
    totalMonthlySubs += Number(sub.amount);
    const isPaidThisMonth = sub.lastPaidMonth === currentYM;
    if (!isPaidThisMonth && (currentDay > sub.dueDay || sub.dueDay - currentDay <= 7)) {
      dueSoonCount++;
    }
  });

  if (statSubsTotalEl) statSubsTotalEl.textContent = formatCurrency(totalMonthlySubs);
  if (statSubsCountEl) statSubsCountEl.textContent = `${subscriptions.length} active subscription${subscriptions.length === 1 ? '' : 's'}`;

  // Dedicated Bills View Grid
  if (subsGridContainer) {
    subsGridContainer.innerHTML = '';

    if (subscriptions.length === 0) {
      subsGridContainer.classList.add('empty-grid');
      subsGridContainer.innerHTML = `
        <div class="empty-state-card">
          <i class="fa-solid fa-calendar-check empty-state-icon"></i>
          <p class="empty-state-title">No Recurring Bills Added</p>
          <p class="empty-state-sub">Click "+ Add Bill" to manage monthly rent, wifi, or utility reminders.</p>
        </div>
      `;
    } else {
      subsGridContainer.classList.remove('empty-grid');
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

  // Dashboard Overview Bills Preview
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
          <div class="dash-sub-info">
            <span class="dash-sub-name">${escapeHtml(sub.name)}</span>
            <span class="dash-sub-due">Due Day ${sub.dueDay}</span>
          </div>
          <div class="dash-sub-right">
            <span class="dash-sub-amount">${formatCurrency(sub.amount)}</span>
            ${isPaidThisMonth
              ? '<span class="status-badge paid"><i class="fa-solid fa-check"></i> Paid</span>'
              : `<button class="btn btn-secondary btn-xs" data-pay-sub="${sub.id}">Pay</button>`
            }
          </div>
        `;
        dashSubsPreviewContainer.appendChild(item);
      });
    }
  }
}

function markSubAsPaid(subId) {
  const sub = subscriptions.find(s => s.id === subId);
  if (!sub) return;

  const currentYM = getCurrentYearMonth();
  sub.lastPaidMonth = currentYM;

  const today = getLocalDateString();
  const newExpense = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    amount: sub.amount,
    category: sub.category || 'Services & Subscriptions',
    description: `Bill Payment: ${sub.name}`,
    payment: 'Auto-Pay',
    date: today
  };

  expenses.push(newExpense);
  saveState();
  updateMonthPickerOptions();
  updateUI();
}

async function deleteSubscription(subId) {
  const ok = await showConfirm('Delete Recurring Bill', 'Are you sure you want to delete this recurring subscription/bill?', true);
  if (ok) {
    subscriptions = subscriptions.filter(s => s.id !== subId);
    saveState();
    updateUI();
  }
}

// Chart.js Category Donut Breakdown
function renderCategoryBreakdown(filteredList, totalSpent) {
  if (breakdownChartInstance) { breakdownChartInstance.destroy(); breakdownChartInstance = null; }
  if (fullAnalyticsChartInstance) { fullAnalyticsChartInstance.destroy(); fullAnalyticsChartInstance = null; }

  const containers = [
    { chart: breakdownChartContainer, list: breakdownListEl, getInstance: () => breakdownChartInstance, setInstance: (inst) => { breakdownChartInstance = inst; } },
    { chart: fullAnalyticsChartContainer, list: fullAnalyticsListEl, getInstance: () => fullAnalyticsChartInstance, setInstance: (inst) => { fullAnalyticsChartInstance = inst; } }
  ];

  containers.forEach(({ chart, list, setInstance }) => {
    if (list) list.innerHTML = '';
    if (chart) chart.innerHTML = '';

    if (filteredList.length === 0 || totalSpent === 0) {
      if (chart) {
        chart.innerHTML = `
          <div class="empty-state-small">
            <i class="fa-solid fa-chart-pie empty-state-icon"></i>
            <p>No expense data for ${selectedMonth === 'ALL' ? 'All Time' : formatMonthLabel(selectedMonth)}</p>
          </div>
        `;
      }
      if (list) list.innerHTML = `<p class="empty-state-sub text-center">No expenses logged in ${selectedMonth === 'ALL' ? 'all time' : formatMonthLabel(selectedMonth)}.</p>`;
      return;
    }

    const categoryTotals = {};
    filteredList.forEach(item => {
      categoryTotals[item.category] = (categoryTotals[item.category] || 0) + Number(item.amount);
    });

    const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

    // Chart.js Donut Chart
    if (chart) {
      const wrapper = document.createElement('div');
      wrapper.className = 'donut-chart-wrapper';
      const canvas = document.createElement('canvas');
      wrapper.appendChild(canvas);

      const centerText = document.createElement('div');
      centerText.className = 'donut-center-text';
      centerText.innerHTML = `
        <span class="donut-total-title">Total Spent</span>
        <span class="donut-total-val mono">${formatCurrency(totalSpent)}</span>
      `;
      wrapper.appendChild(centerText);
      chart.appendChild(wrapper);

      if (typeof Chart !== 'undefined') {
        const inst = new Chart(canvas, {
          type: 'doughnut',
          data: {
            labels: sortedCategories.map(c => c[0]),
            datasets: [{
              data: sortedCategories.map(c => c[1]),
              backgroundColor: sortedCategories.map(c => categoryColors[c[0]] || '#34D399'),
              borderColor: '#0E131A',
              borderWidth: 2,
              hoverOffset: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { animateScale: true, animateRotate: true },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: 'rgba(14, 19, 26, 0.95)',
                titleColor: '#F2F5FA',
                bodyColor: '#A6B0C3',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                callbacks: {
                  label: function(context) {
                    const val = context.raw || 0;
                    const pct = ((val / totalSpent) * 100).toFixed(1);
                    return `${context.label}: ${formatCurrency(val)} (${pct}%)`;
                  }
                }
              }
            },
            cutout: '74%'
          }
        });
        setInstance(inst);
      }
    }

    // List Breakdown items
    if (list) {
      sortedCategories.forEach(([catName, catAmount]) => {
        const percent = ((catAmount / totalSpent) * 100).toFixed(1);
        const color = categoryColors[catName] || '#34D399';

        const itemEl = document.createElement('div');
        itemEl.className = 'breakdown-item';
        itemEl.innerHTML = `
          <div class="breakdown-info">
            <span class="breakdown-label">
              <span class="cat-dot" style="background: ${color};"></span>
              ${catName} (${percent}%)
            </span>
            <strong class="mono">${formatCurrency(catAmount)}</strong>
          </div>
          <div class="breakdown-bar-bg">
            <div class="breakdown-bar-fill" style="width: ${percent}%; background: ${color};"></div>
          </div>
        `;
        list.appendChild(itemEl);
      });
    }
  });
}

// Chart.js 6-Month Trend Bar Chart
function renderMonthlyTrendChart() {
  if (!monthlyTrendChartContainer) return;
  if (trendChartInstance) { trendChartInstance.destroy(); trendChartInstance = null; }
  monthlyTrendChartContainer.innerHTML = '';

  if (expenses.length === 0) {
    monthlyTrendChartContainer.innerHTML = `
      <div class="empty-state-small">
        <i class="fa-solid fa-chart-column empty-state-icon"></i>
        <p>No historical data recorded yet.</p>
      </div>
    `;
    return;
  }

  const monthlyTotals = {};
  expenses.forEach(item => {
    if (item.date && item.date.length >= 7) {
      const ym = item.date.substring(0, 7);
      monthlyTotals[ym] = (monthlyTotals[ym] || 0) + Number(item.amount);
    }
  });

  const months = Object.keys(monthlyTotals).sort();
  if (months.length === 0) {
    monthlyTrendChartContainer.innerHTML = '<p class="empty-state-sub">No monthly data available.</p>';
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.style.height = '180px';
  monthlyTrendChartContainer.appendChild(canvas);

  if (typeof Chart !== 'undefined') {
    trendChartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: months.map(ym => formatMonthLabel(ym).split(' ')[0]),
        datasets: [{
          data: months.map(ym => monthlyTotals[ym] || 0),
          backgroundColor: months.map(ym => selectedMonth === ym ? '#34D399' : 'rgba(56, 189, 248, 0.35)'),
          hoverBackgroundColor: months.map(ym => selectedMonth === ym ? '#34D399' : 'rgba(56, 189, 248, 0.75)'),
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (e, elements) => {
          if (elements && elements.length > 0) {
            const idx = elements[0].index;
            selectMonthFromChart(months[idx]);
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(14, 19, 26, 0.95)',
            titleColor: '#F2F5FA',
            bodyColor: '#A6B0C3',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            callbacks: {
              label: function(context) {
                return `${formatMonthLabel(months[context.dataIndex])}: ${formatCurrency(context.raw)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#A6B0C3', font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#5F6A80',
              font: { family: 'IBM Plex Mono', size: 10 },
              callback: function(val) { return '₹' + val; }
            }
          }
        }
      }
    });
  }
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
      <td data-label="Date" class="font-medium mono">${item.date}</td>
      <td data-label="Category"><span class="category-badge" style="border-left: 3px solid ${color};">${item.category}</span></td>
      <td data-label="Description" class="description-cell">${escapeHtml(item.description)}</td>
      <td data-label="Payment"><span class="payment-badge"><i class="fa-solid fa-credit-card"></i> ${item.payment}</span></td>
      <td data-label="Amount" class="text-right font-bold text-amount">${formatCurrency(item.amount)}</td>
      <td class="text-center td-action">
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
      showAlert('Invalid Input', 'Please enter a valid expense amount.');
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

async function deleteTransaction(id) {
  const ok = await showConfirm('Delete Transaction', 'Are you sure you want to delete this expense transaction record?', true);
  if (ok) {
    expenses = expenses.filter(item => item.id !== id);
    saveState();
    updateMonthPickerOptions();
    updateUI();
  }
}

// Event Delegation for Table Delete Buttons
if (transactionsTbody) {
  transactionsTbody.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-delete-tx]');
    if (btn) {
      const id = btn.getAttribute('data-delete-tx');
      if (id) deleteTransaction(id);
    }
  });
}

// Event Delegation for Subscription Delete & Pay Buttons
if (subsGridContainer) {
  subsGridContainer.addEventListener('click', (e) => {
    const delBtn = e.target.closest('[data-delete-sub]');
    if (delBtn) {
      const id = delBtn.getAttribute('data-delete-sub');
      if (id) deleteSubscription(id);
      return;
    }
    const payBtn = e.target.closest('[data-pay-sub]');
    if (payBtn) {
      const id = payBtn.getAttribute('data-pay-sub');
      if (id) markSubAsPaid(id);
      return;
    }
  });
}

if (dashSubsPreviewContainer) {
  dashSubsPreviewContainer.addEventListener('click', (e) => {
    const payBtn = e.target.closest('[data-pay-sub]');
    if (payBtn) {
      const id = payBtn.getAttribute('data-pay-sub');
      if (id) markSubAsPaid(id);
    }
  });
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
if (statBudgetCard) statBudgetCard.addEventListener('click', openBudgetModal);

function closeModal(targetModal) {
  if (targetModal) {
    targetModal.classList.add('hidden');
  } else {
    // Close all modals if no specific target
    if (budgetModal) budgetModal.classList.add('hidden');
    if (subModal) subModal.classList.add('hidden');
    const confirmModal = document.getElementById('confirm-modal');
    const alertModal = document.getElementById('alert-modal');
    if (confirmModal) confirmModal.classList.add('hidden');
    if (alertModal) alertModal.classList.add('hidden');
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
    showAlert('Invalid Budget', 'Please enter a valid budget amount.');
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
      showAlert('Invalid Details', 'Please enter valid subscription details.');
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
    const exportList = selectedMonth === 'ALL'
      ? expenses
      : expenses.filter(item => item.date && item.date.startsWith(selectedMonth));

    if (exportList.length === 0) {
      showAlert('No Data to Export', 'No expense records found for ' + (selectedMonth === 'ALL' ? 'All Time' : formatMonthLabel(selectedMonth)) + '.');
      return;
    }

    let csvContent = '\uFEFFDate,Category,Description,Payment Method,Amount (INR)\n';
    exportList.forEach(item => {
      const safeDate = (item.date || '').replace(/"/g, '""');
      const safeCat = (item.category || '').replace(/"/g, '""');
      const safeDesc = (item.description || '').replace(/"/g, '""').replace(/[\r\n]+/g, ' ');
      const safePay = (item.payment || '').replace(/"/g, '""');
      const row = `"${safeDate}","${safeCat}","${safeDesc}","${safePay}",${item.amount}`;
      csvContent += row + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const monthLabel = selectedMonth === 'ALL' ? 'AllTime' : selectedMonth;
    link.download = `Expense_Report_${monthLabel}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  });
}

// Reset All Data
if (btnResetAll) {
  btnResetAll.addEventListener('click', async () => {
    const ok = await showConfirm(
      'Reset All Financial Data',
      '⚠️ WARNING: This will permanently reset and delete ALL logged expenses, budget caps, and subscriptions! Continue?',
      true
    );

    if (ok) {
      budget = 0;
      expenses = [];
      subscriptions = [];
      selectedMonth = getCurrentYearMonth();
      // Clear local storage
      localStorage.clear();
      // Guard against the Firestore onSnapshot re-firing stale data during reset
      isSyncingFromFirestore = true;
      // Push reset to Firestore (if logged in)
      if (currentUserId && db) {
        if (typeof setSyncStatus === 'function') setSyncStatus('syncing');
        try {
          await db.collection('users').doc(currentUserId).set({
            budget: 0,
            expenses: [],
            subscriptions: [],
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
          });
          if (typeof setSyncStatus === 'function') setSyncStatus('synced');
        } catch (err) {
          console.error('Reset Firestore error:', err);
          if (typeof setSyncStatus === 'function') setSyncStatus('error');
        }
      }
      isSyncingFromFirestore = false;
      updateMonthPickerOptions();
      updateUI();
      await showAlert('Data Reset Complete', 'All expense records, budget limits, and cloud data have been completely reset.');
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
const sidebarOverlayEl = document.getElementById('sidebar-overlay');

function toggleSidebar() {
  if (sidebarEl) sidebarEl.classList.toggle('sidebar-open');
  if (sidebarOverlayEl) sidebarOverlayEl.classList.toggle('active');
}

function closeSidebar() {
  if (sidebarEl) sidebarEl.classList.remove('sidebar-open');
  if (sidebarOverlayEl) sidebarOverlayEl.classList.remove('active');
}

if (sidebarToggleBtn) {
  sidebarToggleBtn.addEventListener('click', toggleSidebar);
}

// Overlay tap closes sidebar cleanly without swallowing the underlying click
if (sidebarOverlayEl) {
  sidebarOverlayEl.addEventListener('click', closeSidebar);
}

// Auto-close sidebar when a nav item is clicked on small screens
document.querySelectorAll('.nav-item').forEach(nav => {
  nav.addEventListener('click', () => {
    if (window.innerWidth <= 900) closeSidebar();
  });
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
