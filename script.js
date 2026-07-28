// Expense Calculator - Windows Desktop Application Logic
// Handles budget management, expense tracking, recurring bills, visual analytics, search filtering, and local persistence.

// ---------- State Variables ----------
let budget = 0;
let expenses = [];
let subscriptions = [];

// Category Color Palette Map
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

// ---------- DOM Elements ----------
const statBudgetEl = document.getElementById('stat-budget');
const statSpentEl = document.getElementById('stat-spent');
const statCountEl = document.getElementById('stat-count');
const statRemainingEl = document.getElementById('stat-remaining');
const statPercentEl = document.getElementById('stat-percent');
const cardRemainingEl = document.getElementById('card-remaining');
const statusIconEl = document.getElementById('status-icon');

const statSubsTotalEl = document.getElementById('stat-subs-total');
const statSubsCountEl = document.getElementById('stat-subs-count');
const subReminderBadgeEl = document.getElementById('sub-reminder-badge');
const subsGridContainer = document.getElementById('subs-grid-container');

const progressBarFillEl = document.getElementById('progress-bar-fill');
const progressPercentLabelEl = document.getElementById('progress-percent-label');

const expenseForm = document.getElementById('expense-form');
const expAmountInput = document.getElementById('exp-amount');
const expCategorySelect = document.getElementById('exp-category');
const expDescriptionInput = document.getElementById('exp-description');
const expPaymentSelect = document.getElementById('exp-payment');
const expDateInput = document.getElementById('exp-date');

const breakdownListEl = document.getElementById('category-breakdown-list');
const transactionsTbody = document.getElementById('transactions-tbody');
const emptyTableMsg = document.getElementById('empty-table-msg');

const filterSearchInput = document.getElementById('filter-search');
const filterCategorySelect = document.getElementById('filter-category');

const btnExportCsv = document.getElementById('btn-export-csv');
const btnResetAll = document.getElementById('btn-reset-all');
const btnEditBudget = document.getElementById('btn-edit-budget');
const btnAddSub = document.getElementById('btn-add-sub');

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

  if (savedBudget !== null) {
    budget = parseFloat(savedBudget) || 0;
  } else {
    budget = 50000;
  }

  if (savedExpenses) {
    try { expenses = JSON.parse(savedExpenses); } catch (e) { expenses = []; }
  }

  if (savedSubs) {
    try { subscriptions = JSON.parse(savedSubs); } catch (e) { subscriptions = []; }
  } else {
    // Starter default subscriptions
    subscriptions = [
      { id: 'sub_1', name: 'Netflix Premium', amount: 649, dueDay: 5, category: 'Entertainment', lastPaidMonth: '' },
      { id: 'sub_2', name: 'High-Speed Broadband', amount: 999, dueDay: 10, category: 'Bills & Utilities', lastPaidMonth: '' },
      { id: 'sub_3', name: 'House Rent & Maintenance', amount: 15000, dueDay: 1, category: 'Bills & Utilities', lastPaidMonth: '' }
    ];
  }

  updateUI();
}

function setTodayDateDefault() {
  const today = new Date().toISOString().split('T')[0];
  expDateInput.value = today;
}

// ---------- UI Render & Update ----------
function updateUI() {
  const totalSpent = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const remaining = budget - totalSpent;
  const spentRatio = budget > 0 ? (totalSpent / budget) * 100 : 0;
  const remainingPercent = Math.max(0, 100 - spentRatio);

  // Stats
  statBudgetEl.textContent = formatCurrency(budget);
  statSpentEl.textContent = formatCurrency(totalSpent);
  statCountEl.textContent = `${expenses.length} transaction${expenses.length === 1 ? '' : 's'}`;
  statRemainingEl.textContent = formatCurrency(remaining);
  statPercentEl.textContent = budget > 0 ? `${remainingPercent.toFixed(1)}% remaining` : 'No budget set';

  // Balance Indicator Colors
  statRemainingEl.classList.remove('text-rose', 'text-amber', 'text-emerald');
  statusIconEl.className = 'fa-solid stat-icon';

  if (remaining < 0) {
    statRemainingEl.classList.add('text-rose');
    statusIconEl.classList.add('fa-circle-exclamation', 'text-rose');
  } else if (spentRatio >= 80) {
    statRemainingEl.classList.add('text-amber');
    statusIconEl.classList.add('fa-triangle-exclamation', 'text-amber');
  } else {
    statRemainingEl.classList.add('text-emerald');
    statusIconEl.classList.add('fa-shield-halved', 'text-emerald');
  }

  // Progress Bar
  const clampPercent = Math.min(100, Math.max(0, spentRatio));
  progressBarFillEl.style.width = `${clampPercent}%`;
  progressPercentLabelEl.textContent = `${clampPercent.toFixed(1)}% Used`;

  if (spentRatio > 100) {
    progressBarFillEl.style.background = 'linear-gradient(90deg, #f59e0b, #f43f5e)';
  } else if (spentRatio >= 80) {
    progressBarFillEl.style.background = 'linear-gradient(90deg, #10b981, #f59e0b)';
  } else {
    progressBarFillEl.style.background = 'linear-gradient(90deg, #10b981, #3b82f6)';
  }

  renderSubscriptions();
  renderCategoryBreakdown(totalSpent);
  renderTransactionsTable();
}

function renderSubscriptions() {
  subsGridContainer.innerHTML = '';
  const currentYM = getCurrentYearMonth();
  const currentDay = new Date().getDate();

  let totalMonthlySubs = 0;
  let dueSoonCount = 0;

  if (subscriptions.length === 0) {
    subsGridContainer.innerHTML = '<p class="empty-state">No recurring bills added yet.</p>';
    statSubsTotalEl.textContent = formatCurrency(0);
    statSubsCountEl.textContent = '0 monthly subscriptions';
    subReminderBadgeEl.textContent = '0 due soon';
    return;
  }

  subscriptions.forEach(sub => {
    totalMonthlySubs += Number(sub.amount);

    const isPaidThisMonth = sub.lastPaidMonth === currentYM;
    let statusClass = 'due';
    let statusText = `Due Day ${sub.dueDay}`;

    if (isPaidThisMonth) {
      statusClass = 'paid';
      statusText = 'Paid This Month';
    } else if (currentDay > sub.dueDay) {
      statusClass = 'overdue';
      statusText = `Overdue (Day ${sub.dueDay})`;
      dueSoonCount++;
    } else if (sub.dueDay - currentDay <= 7) {
      statusClass = 'due';
      statusText = `Due in ${sub.dueDay - currentDay} days`;
      dueSoonCount++;
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
      <div class="sub-amount">${formatCurrency(sub.amount)} / mo</div>
      <div class="sub-actions">
        <span class="status-badge ${statusClass}">${statusText}</span>
        ${
          !isPaidThisMonth
            ? `<button class="btn btn-secondary btn-sm" onclick="markSubAsPaid('${sub.id}')" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;">
                <i class="fa-solid fa-check"></i> Mark Paid
               </button>`
            : `<span style="font-size: 0.75rem; color: #10b981;"><i class="fa-solid fa-circle-check"></i> Completed</span>`
        }
      </div>
    `;
    subsGridContainer.appendChild(card);
  });

  statSubsTotalEl.textContent = formatCurrency(totalMonthlySubs);
  statSubsCountEl.textContent = `${subscriptions.length} active subscription${subscriptions.length === 1 ? '' : 's'}`;
  subReminderBadgeEl.textContent = `${dueSoonCount} due soon`;
}

window.markSubAsPaid = function(subId) {
  const sub = subscriptions.find(s => s.id === subId);
  if (!sub) return;

  const currentYM = getCurrentYearMonth();
  sub.lastPaidMonth = currentYM;

  // Log as new transaction
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

function renderCategoryBreakdown(totalSpent) {
  breakdownListEl.innerHTML = '';

  if (expenses.length === 0 || totalSpent === 0) {
    breakdownListEl.innerHTML = '<p class="empty-state">No transactions recorded yet.</p>';
    return;
  }

  const categoryTotals = {};
  expenses.forEach(item => {
    categoryTotals[item.category] = (categoryTotals[item.category] || 0) + Number(item.amount);
  });

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  sortedCategories.forEach(([catName, catAmount]) => {
    const percent = ((catAmount / totalSpent) * 100).toFixed(1);
    const color = categoryColors[catName] || '#3b82f6';

    const itemEl = document.createElement('div');
    itemEl.className = 'breakdown-item';
    itemEl.innerHTML = `
      <div class="breakdown-info">
        <span>${catName} (${percent}%)</span>
        <strong>${formatCurrency(catAmount)}</strong>
      </div>
      <div class="breakdown-bar-bg">
        <div class="breakdown-bar-fill" style="width: ${percent}%; background: ${color};"></div>
      </div>
    `;
    breakdownListEl.appendChild(itemEl);
  });
}

function renderTransactionsTable() {
  const searchTerm = filterSearchInput.value.toLowerCase().trim();
  const selectedCat = filterCategorySelect.value;

  const filtered = expenses.filter(item => {
    const matchesSearch = item.description.toLowerCase().includes(searchTerm) ||
                          item.category.toLowerCase().includes(searchTerm) ||
                          item.payment.toLowerCase().includes(searchTerm);
    const matchesCat = selectedCat === 'ALL' || item.category === selectedCat;
    return matchesSearch && matchesCat;
  });

  transactionsTbody.innerHTML = '';

  if (filtered.length === 0) {
    emptyTableMsg.classList.remove('hidden');
    return;
  }

  emptyTableMsg.classList.add('hidden');
  const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

  sorted.forEach(item => {
    const tr = document.createElement('tr');
    const color = categoryColors[item.category] || '#3b82f6';

    tr.innerHTML = `
      <td>${item.date}</td>
      <td><span class="category-badge" style="border-left: 3px solid ${color};">${item.category}</span></td>
      <td>${escapeHtml(item.description)}</td>
      <td><span class="payment-badge">${item.payment}</span></td>
      <td class="text-right font-semibold">${formatCurrency(item.amount)}</td>
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

window.deleteTransaction = function(id) {
  if (confirm('Are you sure you want to delete this transaction?')) {
    expenses = expenses.filter(item => item.id !== id);
    saveState();
    updateUI();
  }
};

filterSearchInput.addEventListener('input', renderTransactionsTable);
filterCategorySelect.addEventListener('change', renderTransactionsTable);

// Budget Modal
btnEditBudget.addEventListener('click', () => {
  modalBudgetInput.value = budget;
  budgetModal.classList.remove('hidden');
  modalBudgetInput.focus();
});

function closeModal() {
  budgetModal.classList.add('hidden');
  subModal.classList.add('hidden');
}

modalCancelBtn.addEventListener('click', closeModal);
modalCloseBtn.addEventListener('click', closeModal);
subModalCloseBtn.addEventListener('click', closeModal);
subModalCancelBtn.addEventListener('click', closeModal);

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

// Add Subscription Modal & Form
btnAddSub.addEventListener('click', () => {
  subNameInput.value = '';
  subAmountInput.value = '';
  subDueDayInput.value = '';
  subModal.classList.remove('hidden');
  subNameInput.focus();
});

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

// Export CSV
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

// Reset All Data
btnResetAll.addEventListener('click', () => {
  if (confirm('Warning: This will clear all transactions, reset your budget, and clear subscriptions. Continue?')) {
    budget = 50000;
    expenses = [];
    subscriptions = [];
    saveState();
    updateUI();
  }
});

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    expAmountInput.focus();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault();
    filterSearchInput.focus();
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
