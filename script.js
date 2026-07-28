// Expense Calculator - Futuristic Dark Glassmorphic Dashboard Logic
// Handles navigation tabs, state persistence, SVG radial budget gauge, category donut analytics, transaction tracking, and subscription reminders.

// ---------- State Variables ----------
let budget = 0;
let expenses = [];
let subscriptions = [];
let activeTimeFilter = 'ALL';
let currentView = 'dashboard';

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

// View Titles & Subtitles
const viewHeadings = {
  dashboard: { title: 'Dashboard Overview', subtitle: 'Real-time financial analytics & budget control' },
  transactions: { title: 'Transactions Log', subtitle: 'Comprehensive history & instant search' },
  bills: { title: 'Recurring Bills & Subscriptions', subtitle: 'Upcoming payment reminders & automation' },
  analytics: { title: 'Category Analytics', subtitle: 'Visual breakdown of monthly expenditures' }
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

const statSubsTotalEl = document.getElementById('stat-subs-total');
const statSubsCountEl = document.getElementById('stat-subs-count');

const progressBarFillEl = document.getElementById('progress-bar-fill');
const progressPercentLabelEl = document.getElementById('progress-percent-label');

const radialGaugeContainer = document.getElementById('radial-gauge-container');

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
const btnQuickAddExpense = document.getElementById('btn-quick-add-expense');

// Modals
const budgetModal = document.getElementById('budget-modal');
const modalBudgetInput = document.getElementById('modal-budget-input');
const modalSaveBtn = document.getElementById('modal-save-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalCloseBtn = document.getElementById('modal-close-btn');

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

function saveState() {
  localStorage.setItem('expense_cal_desktop_budget', budget.toString());
  localStorage.setItem('expense_cal_desktop_expenses', JSON.stringify(expenses));
  localStorage.setItem('expense_cal_desktop_subscriptions', JSON.stringify(subscriptions));
}

function loadState() {
  const savedBudget = localStorage.getItem('expense_cal_desktop_budget');
  const savedExpenses = localStorage.getItem('expense_cal_desktop_expenses');
  const savedSubs = localStorage.getItem('expense_cal_desktop_subscriptions');

  // CLEAN INITIAL STATE - No pre-populated dummy data
  budget = savedBudget !== null ? (parseFloat(savedBudget) || 0) : 0;
  if (savedExpenses) {
    try { expenses = JSON.parse(savedExpenses); } catch (e) { expenses = []; }
  } else {
    expenses = [];
  }
  if (savedSubs) {
    try { subscriptions = JSON.parse(savedSubs); } catch (e) { subscriptions = []; }
  } else {
    subscriptions = [];
  }

  updateUI();
}

function setTodayDateDefault() {
  const today = new Date().toISOString().split('T')[0];
  if (expDateInput) expDateInput.value = today;
}

// ---------- Tab / View Switching ----------
function switchView(viewName) {
  currentView = viewName;
  document.querySelectorAll('.view-panel').forEach(panel => {
    panel.classList.remove('active');
  });

  const targetPanel = document.getElementById(`view-${viewName}`);
  if (targetPanel) {
    targetPanel.classList.add('active');
  }

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

  updateUI();
}

document.querySelectorAll('.nav-item').forEach(nav => {
  nav.addEventListener('click', (e) => {
    e.preventDefault();
    const view = nav.dataset.view;
    if (view) switchView(view);
  });
});

// ---------- UI Render & Update ----------
function updateUI() {
  const totalSpent = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const remaining = budget - totalSpent;
  const spentRatio = budget > 0 ? (totalSpent / budget) * 100 : 0;
  const remainingPercent = Math.max(0, 100 - spentRatio);

  // Update Stat Cards
  if (statBudgetEl) statBudgetEl.textContent = formatCurrency(budget);
  if (statSpentEl) statSpentEl.textContent = formatCurrency(totalSpent);
  if (statCountEl) statCountEl.textContent = `${expenses.length} transaction${expenses.length === 1 ? '' : 's'}`;

  const sidebarBudgetVal = document.getElementById('sidebar-budget-val');
  if (sidebarBudgetVal) sidebarBudgetVal.textContent = formatCurrency(budget);

  if (budget === 0) {
    if (statRemainingEl) statRemainingEl.textContent = '₹0.00';
    if (statPercentEl) statPercentEl.textContent = 'Budget Not Set (Click ✏️)';
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

  // Progress Bar
  const clampPercent = Math.min(100, Math.max(0, spentRatio));
  if (progressBarFillEl) progressBarFillEl.style.width = `${clampPercent}%`;
  if (progressPercentLabelEl) progressPercentLabelEl.textContent = budget > 0 ? `${clampPercent.toFixed(1)}% Used` : '0% Used';

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
  renderCategoryBreakdown(totalSpent);
  renderTransactionsTable();
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

  let strokeColor = '#6366f1';
  let statusText = 'Normal Spending';
  let badgeClass = 'gauge-normal';

  if (budgetLimit === 0) {
    statusText = 'Set Budget Limit';
    strokeColor = '#64748b';
    badgeClass = 'gauge-muted';
  } else if (spentRatio > 100) {
    statusText = 'Over Budget Cap!';
    strokeColor = '#f43f5e';
    badgeClass = 'gauge-danger';
  } else if (spentRatio >= 80) {
    statusText = 'High Spending Warning';
    strokeColor = '#f59e0b';
    badgeClass = 'gauge-warning';
  } else {
    statusText = 'Budget Healthy';
    strokeColor = '#10b981';
    badgeClass = 'gauge-success';
  }

  radialGaugeContainer.innerHTML = `
    <div class="radial-gauge-wrapper">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="radial-gauge-svg">
        <!-- Background Track -->
        <circle cx="${size / 2}" cy="${size / 2}" r="${radius}"
          fill="transparent"
          stroke="rgba(255, 255, 255, 0.08)"
          stroke-width="${strokeWidth}"
        />
        <!-- Animated Progress Ring -->
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
            <button class="icon-btn action-btn-del" onclick="deleteSubscription('${sub.id}')" title="Delete Subscription">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="sub-amount">${formatCurrency(sub.amount)} <span class="per-mo">/ mo</span></div>
          <div class="sub-actions">
            <span class="status-badge ${statusClass}">${statusText}</span>
            ${
              !isPaidThisMonth
                ? `<button class="btn btn-secondary btn-sm" onclick="markSubAsPaid('${sub.id}')">
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
              : `<button class="btn btn-secondary btn-xs" onclick="markSubAsPaid('${sub.id}')">Pay</button>`
            }
          </div>
        `;
        dashSubsPreviewContainer.appendChild(item);
      });
    }
  }
}

window.markSubAsPaid = function(subId) {
  const sub = subscriptions.find(s => s.id === subId);
  if (!sub) return;

  const currentYM = getCurrentYearMonth();
  sub.lastPaidMonth = currentYM;

  const today = new Date().toISOString().split('T')[0];
  const newExpense = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    amount: sub.amount,
    category: sub.category || 'Services & Subscriptions',
    description: `Bill Payment: ${sub.name}`,
    payment: 'UPI',
    date: today
  };

  expenses.push(newExpense);
  saveState();
  updateUI();
};

window.deleteSubscription = function(subId) {
  if (confirm('Delete this recurring subscription/bill?')) {
    subscriptions = subscriptions.filter(s => s.id !== subId);
    saveState();
    updateUI();
  }
};

// SVG Category Donut & Analytics Breakdown
function renderCategoryBreakdown(totalSpent) {
  const containers = [
    { chart: breakdownChartContainer, list: breakdownListEl },
    { chart: fullAnalyticsChartContainer, list: fullAnalyticsListEl }
  ];

  containers.forEach(({ chart, list }) => {
    if (list) list.innerHTML = '';
    if (chart) chart.innerHTML = '';

    if (expenses.length === 0 || totalSpent === 0) {
      if (chart) {
        chart.innerHTML = `
          <div class="empty-state-small">
            <i class="fa-solid fa-chart-pie empty-state-icon"></i>
            <p>No expense data available</p>
          </div>
        `;
      }
      if (list) list.innerHTML = '<p class="empty-state-sub text-center">Add transactions to generate breakdown analytics.</p>';
      return;
    }

    const categoryTotals = {};
    expenses.forEach(item => {
      categoryTotals[item.category] = (categoryTotals[item.category] || 0) + Number(item.amount);
    });

    const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

    // SVG Donut Chart
    if (chart) {
      let accumulatedAngle = 0;
      const slices = [];
      const size = 170;
      const strokeWidth = 26;
      const radius = (size - strokeWidth) / 2;
      const circumference = 2 * Math.PI * radius;

      sortedCategories.forEach(([catName, catAmount]) => {
        const percentage = catAmount / totalSpent;
        const strokeDasharray = `${percentage * circumference} ${circumference}`;
        const strokeDashoffset = -accumulatedAngle * circumference;
        accumulatedAngle += percentage;
        const color = categoryColors[catName] || '#6366f1';

        slices.push(`
          <circle cx="${size / 2}" cy="${size / 2}" r="${radius}"
            fill="transparent"
            stroke="${color}"
            stroke-width="${strokeWidth}"
            stroke-dasharray="${strokeDasharray}"
            stroke-dashoffset="${strokeDashoffset}"
            class="donut-slice"
          >
            <title>${catName}: ${formatCurrency(catAmount)} (${(percentage * 100).toFixed(1)}%)</title>
          </circle>
        `);
      });

      chart.innerHTML = `
        <div class="donut-chart-wrapper">
          <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="donut-svg">
            ${slices.join('')}
          </svg>
          <div class="donut-center-text">
            <span class="donut-total-title">Total</span>
            <span class="donut-total-val">${formatCurrency(totalSpent)}</span>
          </div>
        </div>
      `;
    }

    // List Breakdown items
    if (list) {
      sortedCategories.forEach(([catName, catAmount]) => {
        const percent = ((catAmount / totalSpent) * 100).toFixed(1);
        const color = categoryColors[catName] || '#3b82f6';

        const itemEl = document.createElement('div');
        itemEl.className = 'breakdown-item';
        itemEl.innerHTML = `
          <div class="breakdown-info">
            <span class="breakdown-label">
              <span class="cat-dot" style="background: ${color};"></span>
              ${catName} (${percent}%)
            </span>
            <strong>${formatCurrency(catAmount)}</strong>
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

function renderTransactionsTable() {
  if (!transactionsTbody) return;

  const searchTerm = filterSearchInput ? filterSearchInput.value.toLowerCase().trim() : '';
  const selectedCat = filterCategorySelect ? filterCategorySelect.value : 'ALL';
  const todayStr = new Date().toISOString().split('T')[0];
  const currentYM = getCurrentYearMonth();

  const filtered = expenses.filter(item => {
    const matchesSearch = item.description.toLowerCase().includes(searchTerm) ||
                          item.category.toLowerCase().includes(searchTerm) ||
                          item.payment.toLowerCase().includes(searchTerm);
    const matchesCat = selectedCat === 'ALL' || item.category === selectedCat;

    let matchesTime = true;
    if (activeTimeFilter === 'TODAY') {
      matchesTime = item.date === todayStr;
    } else if (activeTimeFilter === 'MONTH') {
      matchesTime = item.date && item.date.startsWith(currentYM);
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
        <button class="icon-btn action-btn-del" onclick="deleteTransaction('${item.id}')" title="Delete Transaction">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </td>
    `;
    transactionsTbody.appendChild(tr);
  });
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, function(m) {
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
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      amount,
      category,
      description,
      payment,
      date
    };

    expenses.push(newExpense);
    saveState();
    updateUI();

    expAmountInput.value = '';
    expDescriptionInput.value = '';
    expAmountInput.focus();
  });
}

window.deleteTransaction = function(id) {
  if (confirm('Are you sure you want to delete this transaction?')) {
    expenses = expenses.filter(item => item.id !== id);
    saveState();
    updateUI();
  }
};

if (filterSearchInput) filterSearchInput.addEventListener('input', renderTransactionsTable);
if (filterCategorySelect) filterCategorySelect.addEventListener('change', renderTransactionsTable);

document.querySelectorAll('.filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeTimeFilter = chip.dataset.filter || 'ALL';
    renderTransactionsTable();
  });
});

// Budget Modal Handlers
function openBudgetModal() {
  modalBudgetInput.value = budget > 0 ? budget : '';
  budgetModal.classList.remove('hidden');
  modalBudgetInput.focus();
}

if (btnEditBudget) btnEditBudget.addEventListener('click', openBudgetModal);
if (btnSidebarBudgetEdit) btnSidebarBudgetEdit.addEventListener('click', openBudgetModal);

function closeModal() {
  budgetModal.classList.add('hidden');
  subModal.classList.add('hidden');
}

if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);
if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
if (subModalCloseBtn) subModalCloseBtn.addEventListener('click', closeModal);
if (subModalCancelBtn) subModalCancelBtn.addEventListener('click', closeModal);

if (modalSaveBtn) {
  modalSaveBtn.addEventListener('click', () => {
    const newBudget = parseFloat(modalBudgetInput.value);
    if (isNaN(newBudget) || newBudget < 0) {
      alert('Please enter a valid budget amount.');
      return;
    }
    budget = newBudget;
    saveState();
    updateUI();
    closeModal();
  });
}

// Add Subscription Modal
if (btnAddSub) {
  btnAddSub.addEventListener('click', () => {
    subNameInput.value = '';
    subAmountInput.value = '';
    subDueDayInput.value = '';
    subModal.classList.remove('hidden');
    subNameInput.focus();
  });
}

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
    if (expenses.length === 0) {
      alert('No transactions available to export.');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,Date,Category,Description,Payment Method,Amount (INR)\n';
    expenses.forEach(item => {
      const row = `"${item.date}","${item.category}","${item.description.replace(/"/g, '""')}","${item.payment}",${item.amount}`;
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Expense_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}

// Reset All Data
if (btnResetAll) {
  btnResetAll.addEventListener('click', () => {
    if (confirm('Warning: This will clear all recorded transactions, budget cap, and recurring bills. Continue?')) {
      budget = 0;
      expenses = [];
      subscriptions = [];
      localStorage.removeItem('expense_cal_desktop_budget');
      localStorage.removeItem('expense_cal_desktop_expenses');
      localStorage.removeItem('expense_cal_desktop_subscriptions');
      updateUI();
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

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  setTodayDateDefault();
  loadState();
});
