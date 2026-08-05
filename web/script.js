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

// Sync Status Callback (optional - for UI sync indicators)
window.setSyncStatus = function(status) {
  // status: 'syncing', 'synced', 'error', 'guest'
  console.log(`Sync status: ${status}`);
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
  const num = Number(val);
  const safeVal = (typeof num === 'number' && !isNaN(num) && Number.isFinite(num)) ? num : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(safeVal);
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

// // Custom Glassmorphic Confirm & Alert Modal Helpers
function showConfirm(title, message, isDanger = false) {
  return new Promise((resolve) => {
    try {
      const modal = document.getElementById('confirm-modal');
      const titleEl = document.getElementById('confirm-modal-title');
      const msgEl = document.getElementById('confirm-modal-msg');
      const okBtn = document.getElementById('confirm-modal-ok');
      const cancelBtn = document.getElementById('confirm-modal-cancel');
      const closeBtn = document.getElementById('confirm-modal-close');

      if (!modal || !okBtn) { resolve(window.confirm(message)); return; }

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

      okBtn.onclick = (e) => { if (e) { e.preventDefault(); e.stopPropagation(); } done(true); };
      if (cancelBtn) cancelBtn.onclick = (e) => { if (e) { e.preventDefault(); e.stopPropagation(); } done(false); };
      if (closeBtn) closeBtn.onclick = (e) => { if (e) { e.preventDefault(); e.stopPropagation(); } done(false); };
      modal.onclick = (e) => {
        if (e.target === modal) done(false);
      };
    } catch (err) {
      console.warn('showConfirm modal error, fallback to native confirm:', err);
      resolve(window.confirm(message));
    }
  });
}

function showAlert(title, message) {
  return new Promise((resolve) => {
    try {
      const modal = document.getElementById('alert-modal');
      const titleEl = document.getElementById('alert-modal-title');
      const msgEl = document.getElementById('alert-modal-msg');
      const okBtn = document.getElementById('alert-modal-ok');
      const closeBtn = document.getElementById('alert-modal-close');

      if (!modal || !okBtn) { alert(`${title}\n\n${message}`); resolve(); return; }

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

      okBtn.onclick = (e) => { if (e) { e.preventDefault(); e.stopPropagation(); } done(); };
      if (closeBtn) closeBtn.onclick = (e) => { if (e) { e.preventDefault(); e.stopPropagation(); } done(); };
      modal.onclick = (e) => {
        if (e.target === modal) done();
      };
    } catch (err) {
      console.warn('showAlert modal error, fallback to native alert:', err);
      alert(`${title}\n\n${message}`);
      resolve();
    }
  });
}

// ---------- State Persistence (Supabase + Firestore + localStorage fallback) ----------
let currentUserId = null;
let supabaseChannel = null;

function saveState() {
  // Always save to localStorage as backup
  try {
    localStorage.setItem('expense_cal_web_budget', budget.toString());
    localStorage.setItem('expense_cal_web_expenses', JSON.stringify(expenses));
    localStorage.setItem('expense_cal_web_subscriptions', JSON.stringify(subscriptions));
  } catch (err) {
    console.warn('localStorage save error:', err);
  }

  // Save to Supabase if logged in & Supabase available
  const supaClient = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : null));
  if (currentUserId && typeof isSupabaseConfigured !== 'undefined' && isSupabaseConfigured && supaClient) {
    try {
      if (typeof setSyncStatus === 'function') setSyncStatus('syncing');
      supaClient.from('user_data').upsert({
        user_id: currentUserId,
        budget: budget,
        expenses: expenses,
        subscriptions: subscriptions,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' }).then(({ error }) => {
        if (error) {
          console.warn('⚠️ Supabase Save Notice (Check RLS Policies):', error.message || error);
          if (typeof setSyncStatus === 'function') setSyncStatus('error');
        } else if (typeof setSyncStatus === 'function') {
          setSyncStatus('synced');
        }
      }).catch(e => {
        console.warn('Supabase save notice:', e);
        if (typeof setSyncStatus === 'function') setSyncStatus('error');
      });
    } catch (e) {}
  } else if (typeof setSyncStatus === 'function') {
    setSyncStatus('guest');
  }


}

function loadStateFromLocal() {
  try {
    ['expense_cal_web_budget', 'expense_cal_web_expenses', 'expense_cal_web_subscriptions'].forEach(k => {
      const v = localStorage.getItem(k);
      if (v && (v.includes('Ã') || v.includes('Â'))) localStorage.removeItem(k);
    });
  } catch (err) {}

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

// Kept for offline mode
function loadState() {
  loadStateFromLocal();
}

function startSupabaseSync(userId) {
  currentUserId = userId;
  const supaClient = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : null));
  if (!supaClient) { loadStateFromLocal(); return; }
  if (typeof setSyncStatus === 'function') setSyncStatus('syncing');

  let localExpenses = [];
  let localSubs = [];
  let localBudget = budget;
  try {
    const savedBudget = localStorage.getItem('expense_cal_web_budget');
    const savedExpenses = localStorage.getItem('expense_cal_web_expenses');
    const savedSubs = localStorage.getItem('expense_cal_web_subscriptions');
    if (savedBudget !== null && !isNaN(parseFloat(savedBudget))) localBudget = parseFloat(savedBudget);
    if (savedExpenses) {
      const parsed = JSON.parse(savedExpenses);
      if (Array.isArray(parsed)) localExpenses = parsed.filter(isValidExpense);
    }
    if (savedSubs) {
      const parsedS = JSON.parse(savedSubs);
      if (Array.isArray(parsedS)) localSubs = parsedS.filter(isValidSubscription);
    }
  } catch (e) {}

  supaClient.from('user_data').select('*').eq('user_id', userId).maybeSingle()
    .then(({ data, error }) => {
      // A failed cloud read is not an empty record. Preserve local data instead
      // of replacing data from another signed-in device with local defaults.
      if (error) {
        console.warn('Supabase load error:', error.message || error);
        loadStateFromLocal();
        if (typeof setSyncStatus === 'function') setSyncStatus('error');
        return;
      }
      if (data) {
        const cloudExpenses = Array.isArray(data.expenses) ? data.expenses.filter(isValidExpense) : [];
        const cloudSubs = Array.isArray(data.subscriptions) ? data.subscriptions.filter(isValidSubscription) : [];

        const cloudExpIds = new Set(cloudExpenses.map(e => e.id));
        const newLocalExps = localExpenses.filter(e => e.id && !cloudExpIds.has(e.id));

        const cloudSubIds = new Set(cloudSubs.map(s => s.id));
        const newLocalSubs = localSubs.filter(s => s.id && !cloudSubIds.has(s.id));

        const cloudBudget = (typeof data.budget === 'number' && Number.isFinite(data.budget)) ? data.budget : 0;
        budget = cloudBudget > 0 ? cloudBudget : localBudget;
        expenses = [...cloudExpenses, ...newLocalExps];
        subscriptions = [...cloudSubs, ...newLocalSubs];

        if (newLocalExps.length > 0 || newLocalSubs.length > 0 || (localBudget > 0 && cloudBudget === 0)) {
          supaClient.from('user_data').upsert({
            user_id: userId,
            budget: budget,
            expenses: expenses,
            subscriptions: subscriptions,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' }).catch(e => {});
        }
      } else {
        // If first cloud sync, preserve existing local state
        loadStateFromLocal();
        supaClient.from('user_data').upsert({
          user_id: userId,
          budget: budget,
          expenses: expenses,
          subscriptions: subscriptions,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' }).catch(e => {});
      }
      try {
        localStorage.setItem('expense_cal_web_budget', budget.toString());
        localStorage.setItem('expense_cal_web_expenses', JSON.stringify(expenses));
        localStorage.setItem('expense_cal_web_subscriptions', JSON.stringify(subscriptions));
      } catch(e) {}
      updateMonthPickerOptions();
      updateUI();
      if (typeof setSyncStatus === 'function') setSyncStatus('synced');
    }).catch(err => {
      console.warn('Supabase load notice:', err);
      loadStateFromLocal();
      if (typeof setSyncStatus === 'function') setSyncStatus('synced');
    });

  try {
    if (supabaseChannel) supaClient.removeChannel(supabaseChannel);
    supabaseChannel = supaClient.channel('user_data_changes_' + userId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_data' }, payload => {
        if (payload.new && String(payload.new.user_id) === String(userId)) {
          const data = payload.new;
          budget = typeof data.budget === 'number' ? data.budget : 0;
          expenses = Array.isArray(data.expenses) ? data.expenses.filter(isValidExpense) : [];
          subscriptions = Array.isArray(data.subscriptions) ? data.subscriptions.filter(isValidSubscription) : [];
          try {
            localStorage.setItem('expense_cal_web_budget', budget.toString());
            localStorage.setItem('expense_cal_web_expenses', JSON.stringify(expenses));
            localStorage.setItem('expense_cal_web_subscriptions', JSON.stringify(subscriptions));
          } catch(e) {}
          updateMonthPickerOptions();
          updateUI();
          if (typeof setSyncStatus === 'function') setSyncStatus('synced');
        }
      }).subscribe();
  } catch (e) {}
}

window.addEventListener('focus', () => {
  if (currentUserId && typeof startSupabaseSync === 'function') {
    startSupabaseSync(currentUserId);
  }
});

function stopSupabaseSync() {
  const supaClient = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : null));
  if (supabaseChannel && supaClient) {
    try { supaClient.removeChannel(supabaseChannel); } catch(e) {}
    supabaseChannel = null;
  }
}

window.startSupabaseSync = startSupabaseSync;
window.stopSupabaseSync = stopSupabaseSync;



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
window.switchView = function switchView(viewName) {
  if (!viewName) return;
  currentView = viewName;

  document.querySelectorAll('.nav-item').forEach(nav => {
    if (nav.dataset.view === viewName) {
      nav.classList.add('active');
    } else {
      nav.classList.remove('active');
    }
  });

  if (viewHeadings[viewName]) {
    if (viewTitleEl) viewTitleEl.textContent = viewHeadings[viewName].title;
    if (viewSubtitleEl) viewSubtitleEl.textContent = viewHeadings[viewName].subtitle;
  }

  document.querySelectorAll('.view-panel').forEach(panel => {
    panel.classList.remove('active', 'view-exit');
    panel.style.display = 'none';
  });

  const targetPanel = document.getElementById(`view-${viewName}`);
  if (targetPanel) {
    targetPanel.classList.add('active');
    targetPanel.style.display = 'flex';
    targetPanel.style.opacity = '1';
    targetPanel.style.visibility = 'visible';
  }

  updateUI();
};

document.querySelectorAll('.nav-item').forEach(nav => {
  nav.addEventListener('click', (e) => {
    e.preventDefault();
    const view = nav.dataset.view;
    if (view) window.switchView(view);
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
  checkAndSendSubscriptionReminders();
}

// Automated Email Reminder Engine for Subscriptions Due Soon
function checkAndSendSubscriptionReminders() {
  if (!subscriptions || subscriptions.length === 0) return;
  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentDay = now.getDate();

  // Get current user email from Supabase session (Firebase auth was removed in v2.4.0)
  let userEmail = null;
  try {
    const supaClient = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : null);
    if (supaClient && supaClient.auth) {
      supaClient.auth.getSession().then(({ data }) => {
        if (data && data.session && data.session.user) {
          userEmail = data.session.user.email;
        }
      }).catch(() => {});
    }
  } catch(e) {}
  // Also check local admin/user session as fallback
  if (!userEmail) {
    try {
      const adminSession = localStorage.getItem('expense_cal_admin_session');
      if (adminSession) { const u = JSON.parse(adminSession); if (u && u.email) userEmail = u.email; }
    } catch(e) {}
  }
  if (!userEmail) {
    try {
      const userSession = localStorage.getItem('expense_cal_user_session');
      if (userSession) { const u = JSON.parse(userSession); if (u && u.email) userEmail = u.email; }
    } catch(e) {}
  }

  subscriptions.forEach(sub => {
    const isPaidThisMonth = sub.lastPaidMonth === currentYM;
    if (isPaidThisMonth) return;

    const daysLeft = sub.dueDay - currentDay;
    if (daysLeft >= 0 && daysLeft <= 3) {
      const reminderKey = `expense_cal_sub_reminded_${sub.id}_${currentYM}_${daysLeft}d`;
      if (!localStorage.getItem(reminderKey)) {
        localStorage.setItem(reminderKey, 'true');

        // EmailJS Live Email Delivery to Gmail
        if (typeof emailjs !== 'undefined' && emailjsConfig && 
            typeof emailjsConfig.serviceId !== 'undefined' && 
            typeof emailjsConfig.templateId !== 'undefined' && 
            typeof emailjsConfig.publicKey !== 'undefined' && 
            userEmail) {
          try {
            emailjs.send(
              emailjsConfig.serviceId,
              emailjsConfig.templateId,
              {
                to_email: userEmail,
                email: userEmail,
                name: sub.name,
                user_name: sub.name,
                subject: `⏰ Subscription Due Reminder: ${sub.name} is due ${daysLeft === 0 ? 'today' : 'in ' + daysLeft + ' days'}!`,
                message: `Reminder: ${sub.name} (₹${sub.amount.toFixed(2)}) renewal payment is due ${daysLeft === 0 ? 'today' : 'in ' + daysLeft + ' days'}.`,
                web_app_url: 'https://vaibhavjalota06.github.io/Expense-Calculator-Desktop/',
                app_url: 'https://vaibhavjalota06.github.io/Expense-Calculator-Desktop/',
                action_url: 'https://vaibhavjalota06.github.io/Expense-Calculator-Desktop/',
                url: 'https://vaibhavjalota06.github.io/Expense-Calculator-Desktop/',
                link: 'https://vaibhavjalota06.github.io/Expense-Calculator-Desktop/'
              },
              emailjsConfig.publicKey
            );
            console.log('Live EmailJS Subscription Reminder sent to:', userEmail);
          } catch (err) {
            console.warn('EmailJS reminder notice:', err);
          }
        }


      }
    }
  });
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
            <button type="button" class="icon-btn action-btn-del" data-delete-sub="${sub.id}" title="Delete Subscription">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="sub-amount">${formatCurrency(sub.amount)} <span class="per-mo">/ mo</span></div>
          <div class="sub-actions">
            <span class="status-badge ${statusClass}">${statusText}</span>
            ${
              !isPaidThisMonth
                ? `<button type="button" class="btn btn-secondary btn-sm" data-pay-sub="${sub.id}">
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
              : `<button type="button" class="btn btn-secondary btn-xs" data-pay-sub="${sub.id}">Pay</button>`
            }
          </div>
        `;
        dashSubsPreviewContainer.appendChild(item);
      });
    }
  }
}

function markSubAsPaid(subId) {
  const sub = subscriptions.find(s => String(s.id) === String(subId));
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
  if (!subId) return;
  const ok = await showConfirm('Delete Recurring Bill', 'Are you sure you want to delete this recurring subscription/bill?', true);
  if (ok) {
    subscriptions = subscriptions.filter(s => String(s.id) !== String(subId));
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
              ${escapeHtml(catName)} (${percent}%)
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
            ticks: { color: '#A6B0C3', font: { family: 'Poppins', size: 11, weight: '600' } }
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
      <td data-label="Date" class="font-medium mono">${escapeHtml(item.date)}</td>
      <td data-label="Category"><span class="category-badge" style="border-left: 3px solid ${color};">${escapeHtml(item.category)}</span></td>
      <td data-label="Description" class="description-cell">${escapeHtml(item.description)}</td>
      <td data-label="Payment"><span class="payment-badge"><i class="fa-solid fa-credit-card"></i> ${escapeHtml(item.payment)}</span></td>
      <td data-label="Amount" class="text-right font-bold text-amount">${formatCurrency(item.amount)}</td>
      <td class="text-center td-action">
        <button type="button" class="icon-btn action-btn-del" data-delete-tx="${escapeHtml(item.id)}" title="Delete Transaction">
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

    if (isNaN(amount) || amount <= 0 || amount > 99999999) {
      showAlert('Invalid Input', 'Please enter a valid expense amount (max ₹99,999,999).');
      return;
    }
    if (description.length > 200) {
      showAlert('Invalid Input', 'Description is too long (max 200 characters).');
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
  if (!id) return;
  const ok = await showConfirm('Delete Transaction', 'Are you sure you want to delete this expense transaction record?', true);
  if (ok) {
    expenses = expenses.filter(item => String(item.id) !== String(id));
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
  closeModal(budgetModal);
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
    closeModal(subModal);
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
async function resetAllData(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }

  const ok = await showConfirm(
    'Reset All Financial Data',
    'WARNING: This will permanently reset and delete all logged expenses, budget caps, and subscriptions. Continue?',
    true
  );
  if (!ok) return;

  budget = 0;
  expenses = [];
  subscriptions = [];
  selectedMonth = getCurrentYearMonth();

  // Do not clear all localStorage: auth session tokens are stored here
  localStorage.setItem('expense_cal_web_budget', '0');
  localStorage.setItem('expense_cal_web_expenses', '[]');
  localStorage.setItem('expense_cal_web_subscriptions', '[]');
  updateMonthPickerOptions();
  updateUI();

  if (!currentUserId) {
    await showAlert('Data Reset Complete', 'Your expense records, budget limit, and subscriptions have been reset on this device.');
    return;
  }

  if (typeof setSyncStatus === 'function') setSyncStatus('syncing');

  let cloudSuccess = false;

  // 1. Reset Supabase data if configured & active
  const supaClient = (typeof getSupabaseClient === 'function' ? getSupabaseClient() : (typeof supabase !== 'undefined' ? supabase : null));
  if (typeof isSupabaseConfigured !== 'undefined' && isSupabaseConfigured && supaClient) {
    try {
      const { error } = await supaClient.from('user_data').upsert({
        user_id: currentUserId,
        budget: 0,
        expenses: [],
        subscriptions: [],
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
      if (!error) cloudSuccess = true;
    } catch(err) {
      console.warn('Supabase reset notice:', err);
    }
  }



  if (typeof setSyncStatus === 'function') setSyncStatus('synced');
  if (cloudSuccess) {
    await showAlert('Data Reset Complete', 'All expense records, budget limits, and cloud data have been reset across all devices.');
  } else {
    await showAlert('Data Reset Complete', 'Your expense records, budget limit, and local data have been reset.');
  }
}

if (btnResetAll) btnResetAll.addEventListener('click', resetAllData);
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
    const id = target.dataset.deleteSub || target.getAttribute('data-delete-sub');
    if (id) deleteSubscription(id);
    return;
  }

  const payBtn = e.target.closest('[data-pay-sub]');
  if (payBtn) {
    const id = payBtn.dataset.paySub || payBtn.getAttribute('data-pay-sub');
    if (id) markSubAsPaid(id);
    return;
  }

  const txDel = e.target.closest('[data-delete-tx]');
  if (txDel) {
    const id = txDel.dataset.deleteTx || txDel.getAttribute('data-delete-tx');
    if (id) deleteTransaction(id);
    return;
  }

  const monthBar = e.target.closest('[data-select-month]');
  if (monthBar) {
    const m = monthBar.dataset.selectMonth || monthBar.getAttribute('data-select-month');
    if (m) selectMonthFromChart(m);
    return;
  }
});

// ---------- Sidebar Toggle for Small Screens ----------
function toggleSidebar(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) {
    sidebar.classList.toggle('sidebar-open');
    sidebar.classList.toggle('active');
  }
  if (overlay) {
    overlay.classList.toggle('active');
  }
}

function closeSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) {
    sidebar.classList.remove('sidebar-open', 'active');
  }
  if (overlay) {
    overlay.classList.remove('active');
  }
}

document.addEventListener('click', (e) => {
  const toggleBtn = e.target.closest('#btn-sidebar-toggle');
  if (toggleBtn) {
    toggleSidebar(e);
    return;
  }
  const overlay = e.target.closest('#sidebar-overlay');
  if (overlay) {
    closeSidebar();
    return;
  }
  if (e.target.closest('.nav-item') && window.innerWidth <= 992) {
    closeSidebar();
  }
});

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  setTodayDateDefault();
  // Load state from localStorage immediately on startup so expenses render without waiting
  loadStateFromLocal();

  // Guarantee loader removal on DOMContentLoaded
  setTimeout(() => {
    const loader = document.getElementById('app-loader');
    if (loader) {
      loader.classList.add('hidden');
      loader.style.cssText = 'display: none !important; pointer-events: none !important; z-index: -99999 !important; opacity: 0 !important; visibility: hidden !important;';
      if (loader.parentNode) loader.parentNode.removeChild(loader);
    }
  }, 200);
});

// ---------- Interactive Onboarding & Feature Tour ----------
const tourSteps = [
  {
    view: 'dashboard',
    target: '#stat-budget-card',
    title: '🎯 Step 1: Set & Edit Monthly Budget Cap',
    msg: 'Stay on top of your financial goals! Click here or use the "Budget" button in the header anytime to set or re-edit your target monthly spending limit.'
  },
  {
    view: 'dashboard',
    target: '#expense-form',
    title: '💸 Step 2: Log Daily Expenses',
    msg: 'Quickly log daily purchases, groceries, and shopping items here with instant categorization and automatic calculations.'
  },
  {
    view: 'transactions',
    target: '[data-view="transactions"]',
    title: '📜 Step 3: Transactions Log & Filters',
    msg: 'Switch to the Transactions Log tab to view, search, filter by category or time period, and delete any logged expense item.'
  },
  {
    view: 'bills',
    target: '[data-view="bills"]',
    title: '🔄 Step 4: Recurring Bills & Subscriptions',
    msg: 'Never miss a due date! Add monthly subscriptions (like Netflix, Spotify, utilities) and click "Paid" to mark them completed each month.'
  },
  {
    view: 'analytics',
    target: '[data-view="analytics"]',
    title: '📈 Step 5: Category Analytics & Charts',
    msg: 'Explore Category Analytics to view interactive spending charts and visual breakdowns of where your money goes each month.'
  },
  {
    view: 'dashboard',
    target: '#month-picker',
    title: '📅 Step 6: Month Selector & Export CSV',
    msg: 'Use the month picker in the header to jump between months, or click "Export CSV" in the sidebar to download your spreadsheet records.'
  },
  {
    view: 'dashboard',
    target: '#btn-reset-all',
    title: '⚠️ Step 7: Reset All Data Anytime',
    msg: 'Need a fresh start? Click "Reset Data" in the sidebar anytime to safely clear all expense records and reset your budget back to zero.'
  }
];

let currentTourStep = 0;

function renderTourStep(stepIdx) {
  if (stepIdx < 0 || stepIdx >= tourSteps.length) {
    endGuidedTour();
    return;
  }

  currentTourStep = stepIdx;
  const step = tourSteps[stepIdx];

  // Auto-switch to target tab/view if specified
  if (step.view && typeof switchView === 'function') {
    switchView(step.view);
  }

  document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));

  const tourOverlay = document.getElementById('tour-overlay');
  const tourCard = document.getElementById('tour-card');
  const stepBadge = document.getElementById('tour-step-badge');
  const titleEl = document.getElementById('tour-title');
  const msgEl = document.getElementById('tour-msg');
  const prevBtn = document.getElementById('btn-tour-prev');
  const nextBtn = document.getElementById('btn-tour-next');

  if (!tourOverlay || !tourCard) return;

  tourOverlay.classList.remove('hidden');
  if (stepBadge) stepBadge.textContent = `Step ${stepIdx + 1} of ${tourSteps.length}`;
  if (titleEl) titleEl.textContent = step.title;
  if (msgEl) msgEl.textContent = step.msg;

  if (prevBtn) prevBtn.style.display = stepIdx === 0 ? 'none' : 'inline-flex';
  if (nextBtn) nextBtn.innerHTML = stepIdx === tourSteps.length - 1 ? 'Finish 🎉' : 'Next <i class="fa-solid fa-arrow-right"></i>';

  setTimeout(() => {
    const targetEl = document.querySelector(step.target);
    if (targetEl) {
      targetEl.classList.add('tour-highlight');
      try { targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch(e) {}

      const rect = targetEl.getBoundingClientRect();
      const cardWidth = Math.min(340, window.innerWidth - 32);
      const cardHeight = tourCard.offsetHeight || 220;
      const vpWidth = window.innerWidth;
      const vpHeight = window.innerHeight;

      let top = 0;
      let left = 0;

      // 1. Prefer placing card below target
      if (rect.bottom + cardHeight + 16 <= vpHeight) {
        top = rect.bottom + 12;
        left = rect.left + (rect.width / 2) - (cardWidth / 2);
      }
      // 2. Otherwise place card above target
      else if (rect.top - cardHeight - 16 >= 0) {
        top = rect.top - cardHeight - 12;
        left = rect.left + (rect.width / 2) - (cardWidth / 2);
      }
      // 3. Otherwise place card to the right of target
      else if (rect.right + cardWidth + 16 <= vpWidth) {
        top = rect.top + (rect.height / 2) - (cardHeight / 2);
        left = rect.right + 12;
      }
      // 4. Otherwise place card to the left of target
      else if (rect.left - cardWidth - 16 >= 0) {
        top = rect.top + (rect.height / 2) - (cardHeight / 2);
        left = rect.left - cardWidth - 12;
      }
      // 5. Fallback: Position with safe margin
      else {
        top = rect.top > vpHeight / 2 ? Math.max(16, rect.top - cardHeight - 12) : rect.bottom + 12;
        left = rect.left + (rect.width / 2) - (cardWidth / 2);
      }

      // Clamp within viewport boundaries
      left = Math.max(16, Math.min(vpWidth - cardWidth - 16, left));
      top = Math.max(16, Math.min(vpHeight - cardHeight - 16, top));

      tourCard.style.top = `${top}px`;
      tourCard.style.left = `${left}px`;
    } else {
      tourCard.style.top = '30%';
      tourCard.style.left = '50%';
    }
  }, 60);
}

function startGuidedTour() {
  const welcomeModal = document.getElementById('welcome-modal');
  if (welcomeModal) welcomeModal.classList.add('hidden');
  renderTourStep(0);
}

function endGuidedTour() {
  document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
  const tourOverlay = document.getElementById('tour-overlay');
  if (tourOverlay) tourOverlay.classList.add('hidden');
  localStorage.setItem('expense_cal_seen_welcome_global', 'true');
  if (typeof switchView === 'function') switchView('dashboard');
}

const isElectronApp = /Electron/i.test(navigator.userAgent) || Boolean(window.process && window.process.type) || Boolean(window.electronAPI && window.electronAPI.isElectron);

function applyEnvironmentAdjustments() {
  const skipTourBtn = document.getElementById('btn-skip-tour');
  if (skipTourBtn) {
    if (!isElectronApp) {
      skipTourBtn.style.display = 'none';
    } else {
      skipTourBtn.style.display = 'block';
    }
  }
}

// Event Listeners for Welcome Modal & Guided Tour
document.addEventListener('click', (e) => {
  if (e.target.closest('#btn-start-tour')) {
    startGuidedTour();
    return;
  }
  if (e.target.closest('#btn-skip-tour')) {
    const welcomeModal = document.getElementById('welcome-modal');
    if (welcomeModal) welcomeModal.classList.add('hidden');
    return;
  }
  if (e.target.closest('#btn-sidebar-tour')) {
    startGuidedTour();
    return;
  }
  if (e.target.closest('#btn-tour-next')) {
    renderTourStep(currentTourStep + 1);
    return;
  }
  if (e.target.closest('#btn-tour-prev')) {
    renderTourStep(currentTourStep - 1);
    return;
  }
  if (e.target.closest('#btn-tour-skip, #btn-tour-close')) {
    endGuidedTour();
    return;
  }
});

document.addEventListener('DOMContentLoaded', applyEnvironmentAdjustments);

// ---------- Live Update Manager & GitHub Checker ----------
const CURRENT_APP_VERSION = 'v2.7.1';

window.showUpdateToast = function(title, message, showActions = false) {
  const toast = document.getElementById('update-notification');
  const titleEl = document.getElementById('update-toast-title');
  const msgEl = document.getElementById('update-toast-msg');
  const actionsEl = document.getElementById('update-toast-actions');

  if (!toast) return;

  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = message;

  if (actionsEl) {
    if (showActions) actionsEl.classList.remove('hidden');
    else actionsEl.classList.add('hidden');
  }

  toast.classList.remove('hidden');
  toast.style.cssText = 'display: block !important; position: fixed !important; bottom: 24px !important; right: 24px !important; z-index: 9999999 !important; width: 340px !important; max-width: calc(100vw - 32px) !important;';
};

window.hideUpdateToast = function() {
  const toast = document.getElementById('update-notification');
  if (toast) {
    toast.classList.add('hidden');
    toast.style.cssText = 'display: none !important;';
  }
};

window.checkAppUpdates = async function checkAppUpdates(manual = false) {
  window.lastManualCheck = manual;
  const dropdown = document.getElementById('user-dropdown-menu');
  if (dropdown) dropdown.classList.add('hidden');

  const isElectron = !!(window.electronAPI && window.electronAPI.isElectron);
  if (!isElectron) {
    if (manual) {
      window.showUpdateToast('✓ Web Version', 'You are using the Expense OS Web App.', false);
      setTimeout(() => { window.hideUpdateToast(); }, 3500);
    } else {
      window.hideUpdateToast();
    }
    return;
  }

  if (window.electronAPI && typeof window.electronAPI.checkForUpdates === 'function') {
    if (manual) {
      window.showUpdateToast('Checking for Updates...', 'Connecting to release server...', false);
    }
    window.electronAPI.checkForUpdates();
    return;
  }

  if (manual) {
    window.showUpdateToast('Checking for Updates...', 'Connecting to release server...', false);
  } else {
    window.hideUpdateToast();
  }

  try {
    let latestTag = '';
    const res = await fetch('https://api.github.com/repos/VaibhavJalota06/Expense-Calculator-Desktop/releases/latest');
    if (res.ok) {
      const data = await res.json();
      latestTag = (data.tag_name || '').trim();
    } else {
      const tagsRes = await fetch('https://api.github.com/repos/VaibhavJalota06/Expense-Calculator-Desktop/tags');
      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        if (Array.isArray(tagsData) && tagsData.length > 0) {
          latestTag = (tagsData[0].name || '').trim();
        }
      }
    }

    function isNewerVersion(latest, current) {
      if (!latest || !current) return false;
      const clean = v => v.replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
      const l = clean(latest);
      const c = clean(current);
      for (let i = 0; i < Math.max(l.length, c.length); i++) {
        const numL = l[i] || 0;
        const numC = c[i] || 0;
        if (numL > numC) return true;
        if (numL < numC) return false;
      }
      return false;
    }

    if (latestTag && isNewerVersion(latestTag, CURRENT_APP_VERSION)) {
      window.showUpdateToast('🎉 Update Available (' + latestTag + ')', `A new version (${latestTag}) of Expense OS is available!`, true);
    } else if (manual) {
      window.showUpdateToast('✓ Up to Date', `Expense OS ${CURRENT_APP_VERSION} is currently up to date.`, false);
      setTimeout(() => {
        window.hideUpdateToast();
      }, 4500);
    } else {
      window.hideUpdateToast();
    }
  } catch (err) {
    console.warn('Update check notice:', err);
    if (manual) {
      window.showUpdateToast('✓ Up to Date', `Expense OS ${CURRENT_APP_VERSION} is currently up to date.`, false);
      setTimeout(() => {
        window.hideUpdateToast();
      }, 4500);
    } else {
      window.hideUpdateToast();
    }
  }
};

if (window.electronAPI && typeof window.electronAPI.onUpdateStatus === 'function') {
  window.electronAPI.onUpdateStatus((data) => {
    const restartBtn = document.getElementById('btn-restart-update');
    const downloadBtn = document.getElementById('btn-download-update');

    if (data.status === 'checking') {
      window.showUpdateToast('Checking for Updates...', 'Connecting to release server...', false);
    } else if (data.status === 'available') {
      window.showUpdateToast('🎉 Update Available', `New version (v${data.version || ''}) detected. Downloading in background...`, false);
    } else if (data.status === 'downloading') {
      window.showUpdateToast('⏬ Downloading Update...', `Progress: ${data.percent || 0}%`, false);
    } else if (data.status === 'downloaded') {
      if (restartBtn) restartBtn.classList.remove('hidden');
      if (downloadBtn) downloadBtn.classList.add('hidden');
      window.showUpdateToast('✅ Update Ready!', `Expense OS v${data.version || ''} downloaded. Click below to restart & update now.`, true);
    } else if (data.status === 'not-available') {
      if (restartBtn) restartBtn.classList.add('hidden');
      if (downloadBtn) downloadBtn.classList.remove('hidden');
      window.showUpdateToast('✓ Up to Date', `Expense OS ${CURRENT_APP_VERSION} is currently up to date.`, false);
      setTimeout(() => { window.hideUpdateToast(); }, 4500);
    } else if (data.status === 'dev-mode') {
      window.showUpdateToast('✓ Development Mode', `App is running in development mode (${CURRENT_APP_VERSION}).`, false);
      setTimeout(() => { window.hideUpdateToast(); }, 3000);
    } else if (data.status === 'error') {
      if (window.lastManualCheck) {
        window.showUpdateToast('✓ Up to Date', `Expense OS ${CURRENT_APP_VERSION} is currently up to date.`, false);
        setTimeout(() => { window.hideUpdateToast(); }, 4500);
      } else {
        window.hideUpdateToast();
      }
    }
  });
}

window.handleCheckUpdateClick = function(e) {
  if (e) {
    try { e.preventDefault(); e.stopPropagation(); } catch(err){}
  }
  if (typeof window.checkAppUpdates === 'function') {
    window.checkAppUpdates(true);
  }
};

document.addEventListener('click', (e) => {
  const toggleBtn = e.target.closest('.btn-toggle-password');
  if (toggleBtn) {
    e.preventDefault();
    const targetId = toggleBtn.getAttribute('data-target');
    const input = targetId ? document.getElementById(targetId) : null;
    if (input) {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      const icon = toggleBtn.querySelector('i');
      if (icon) {
        icon.className = isPassword ? 'fa-solid fa-eye-slash text-emerald' : 'fa-solid fa-eye';
      }
    }
    return;
  }

  if (e.target.closest('#btn-restart-update')) {
    e.preventDefault();
    if (window.electronAPI && typeof window.electronAPI.restartAndInstall === 'function') {
      window.electronAPI.restartAndInstall();
    }
    return;
  }

  if (e.target.closest('#btn-dropdown-check-update, .btn-check-update-link')) {
    e.preventDefault();
    checkAppUpdates(true);
    return;
  }
  if (e.target.closest('#btn-close-update-toast, #btn-dismiss-update')) {
    const toast = document.getElementById('update-notification');
    if (toast) {
      toast.classList.add('hidden');
      toast.style.setProperty('display', 'none', 'important');
    }
    return;
  }
});


