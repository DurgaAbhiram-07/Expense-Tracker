// ========== GLOBAL VARIABLES ==========
let trendChartInstance = null;
let categoryChartInstance = null;
let monthlyComparisonChartInstance = null;
let reportsCategoryChartInstance = null;
let heatmapChartInstance = null;
let editingExpenseId = null;

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadData();
    setTimeout(() => initializeCharts(), 100);
});

function initializeApp() {
    // Set today's date in expense form
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('expenseDate');
    if (dateInput) {
        dateInput.value = today;
    }
    
    // Set date range defaults
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    if (startDateInput && endDateInput) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        startDateInput.value = thirtyDaysAgo.toISOString().split('T')[0];
        endDateInput.value = today;
    }
    
    // Load theme preference
    const isDarkTheme = localStorage.getItem('darkTheme') === 'true';
    if (isDarkTheme) {
        document.body.classList.add('dark-theme');
        updateThemeToggleIcon(true);
    }
}

function initializeDemoData() {
    const demoExpenses = [
        { id: 1, description: 'Grocery Shopping', amount: 1200, category: 'food', date: new Date(Date.now() - 5*24*60*60*1000).toISOString().split('T')[0], notes: 'Weekly groceries' },
        { id: 2, description: 'Fuel', amount: 800, category: 'transport', date: new Date(Date.now() - 4*24*60*60*1000).toISOString().split('T')[0], notes: 'Car fuel' },
        { id: 3, description: 'Restaurant', amount: 1500, category: 'food', date: new Date(Date.now() - 3*24*60*60*1000).toISOString().split('T')[0], notes: 'Dinner with friends' },
        { id: 4, description: 'Movie Tickets', amount: 600, category: 'entertainment', date: new Date(Date.now() - 2*24*60*60*1000).toISOString().split('T')[0], notes: 'Cinema' },
        { id: 5, description: 'Online Shopping', amount: 2500, category: 'shopping', date: new Date(Date.now() - 1*24*60*60*1000).toISOString().split('T')[0], notes: 'Clothes' },
        { id: 6, description: 'Electricity Bill', amount: 1800, category: 'bills', date: new Date().toISOString().split('T')[0], notes: 'Monthly bill' },
        { id: 7, description: 'Pharmacy', amount: 450, category: 'health', date: new Date().toISOString().split('T')[0], notes: 'Medicines' },
        { id: 8, description: 'Course Fee', amount: 5000, category: 'education', date: new Date(Date.now() - 10*24*60*60*1000).toISOString().split('T')[0], notes: 'Online course' }
    ];
    
    const demoBudgets = [
        { category: 'food', amount: 5000 },
        { category: 'transport', amount: 2000 },
        { category: 'shopping', amount: 4000 },
        { category: 'bills', amount: 5000 },
        { category: 'entertainment', amount: 2000 },
        { category: 'health', amount: 1000 },
        { category: 'education', amount: 3000 },
        { category: 'other', amount: 2000 }
    ];
    
    const demoRecurring = [
        { id: 101, description: 'Netflix Subscription', amount: 499, frequency: 'monthly', createdDate: new Date().toISOString().split('T')[0] },
        { id: 102, description: 'Gym Membership', amount: 1000, frequency: 'monthly', createdDate: new Date().toISOString().split('T')[0] },
        { id: 103, description: 'Internet Bill', amount: 1500, frequency: 'monthly', createdDate: new Date().toISOString().split('T')[0] }
    ];
    
    localStorage.setItem('expenses', JSON.stringify(demoExpenses));
    localStorage.setItem('budgets', JSON.stringify(demoBudgets));
    localStorage.setItem('recurrings', JSON.stringify(demoRecurring));
    localStorage.setItem('totalMonthlyBudget', '30000');
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    // Navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const view = this.getAttribute('data-view');
            switchView(view);
        });
    });
    
    // Modals
    document.getElementById('addExpenseBtn').addEventListener('click', () => {
        editingExpenseId = null;
        document.getElementById('expenseModalTitle').textContent = 'Add Expense';
        document.getElementById('expenseForm').reset();
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('expenseDate').value = today;
        openModal('expenseModal');
    });
    
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('exportBtn').addEventListener('click', toggleExportMenu);
    
    // Forms
    const expenseForm = document.getElementById('expenseForm');
    if (expenseForm) {
        expenseForm.addEventListener('submit', saveExpense);
    }
    
    const budgetForm = document.getElementById('budgetForm');
    if (budgetForm) {
        budgetForm.addEventListener('submit', saveBudgetCategory);
    }
    
    const recurringForm = document.getElementById('recurringForm');
    if (recurringForm) {
        recurringForm.addEventListener('submit', saveRecurring);
    }
    
    // Filters and search
    const searchExpenses = document.getElementById('searchExpenses');
    if (searchExpenses) {
        searchExpenses.addEventListener('input', debounce(filterExpenses, 300));
    }
    
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterExpenses);
    }
    
    const startDate = document.getElementById('startDate');
    if (startDate) {
        startDate.addEventListener('change', filterExpenses);
    }
    
    const endDate = document.getElementById('endDate');
    if (endDate) {
        endDate.addEventListener('change', filterExpenses);
    }
    
    // Chart filters
    const trendPeriod = document.getElementById('trendPeriod');
    if (trendPeriod) {
        trendPeriod.addEventListener('change', () => renderTrendChart());
    }
    
    // Close modal on overlay click
    const overlays = document.querySelectorAll('.modal-overlay');
    overlays.forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ========== VIEW MANAGEMENT ==========
function switchView(viewName) {
    // Hide all views
    document.getElementById('dashboardView').style.display = 'none';
    document.getElementById('expensesView').style.display = 'none';
    document.getElementById('budgetView').style.display = 'none';
    document.getElementById('recurringView').style.display = 'none';
    document.getElementById('reportsView').style.display = 'none';
    
    // Show selected view
    const viewId = viewName + 'View';
    const view = document.getElementById(viewId);
    if (view) {
        view.style.display = 'block';
    }
    
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-view="${viewName}"]`).classList.add('active');
    
    // Update header title
    const titles = {
        dashboard: 'Dashboard',
        expenses: 'All Expenses',
        budget: 'Budget Management',
        recurring: 'Recurring Expenses',
        reports: 'Reports & Analytics'
    };
    
    const headerTitle = document.querySelector('.header-title h1');
    if (headerTitle) {
        headerTitle.textContent = titles[viewName] || 'Dashboard';
    }
    
    // Refresh charts if needed
    if (viewName === 'reports') {
        setTimeout(() => renderReportsCharts(), 100);
    } else if (viewName === 'dashboard') {
        setTimeout(() => {
            renderTrendChart();
            renderCategoryChart();
        }, 100);
    }
}

// ========== MODAL MANAGEMENT ==========
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
        editingExpenseId = null;
    }
}

// ========== THEME MANAGEMENT ==========
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('darkTheme', isDark);
    updateThemeToggleIcon(isDark);
    showNotification(isDark ? 'Dark mode enabled' : 'Light mode enabled', 'success');
}

function updateThemeToggleIcon(isDark) {
    const icon = document.querySelector('.theme-toggle i');
    if (icon) {
        icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// ========== EXPENSE MANAGEMENT ==========
function saveExpense(e) {
    e.preventDefault();
    
    const expense = {
        id: editingExpenseId || Date.now(),
        description: document.getElementById('expenseDescription').value,
        amount: parseFloat(document.getElementById('expenseAmount').value),
        category: document.getElementById('expenseCategory').value,
        date: document.getElementById('expenseDate').value,
        notes: document.getElementById('expenseNotes').value || ''
    };
    
    let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
    
    if (editingExpenseId) {
        const index = expenses.findIndex(e => e.id === editingExpenseId);
        if (index >= 0) {
            expenses[index] = expense;
        }
        showNotification('Expense updated successfully', 'success');
    } else {
        expenses.push(expense);
        showNotification('Expense added successfully', 'success');
    }
    
    localStorage.setItem('expenses', JSON.stringify(expenses));
    closeModal('expenseModal');
    loadData();
}

function editExpense(id) {
    const expenses = JSON.parse(localStorage.getItem('expenses')) || [];
    const expense = expenses.find(exp => exp.id === id);
    
    if (!expense) return;
    
    editingExpenseId = id;
    document.getElementById('expenseDescription').value = expense.description;
    document.getElementById('expenseAmount').value = expense.amount;
    document.getElementById('expenseCategory').value = expense.category;
    document.getElementById('expenseDate').value = expense.date;
    document.getElementById('expenseNotes').value = expense.notes || '';
    
    document.getElementById('expenseModalTitle').textContent = 'Edit Expense';
    openModal('expenseModal');
}

function deleteExpense(id) {
    if (confirm('Are you sure you want to delete this expense?')) {
        let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
        expenses = expenses.filter(exp => exp.id !== id);
        localStorage.setItem('expenses', JSON.stringify(expenses));
        showNotification('Expense deleted', 'success');
        loadData();
    }
}

// ========== BUDGET MANAGEMENT ==========
function saveBudgetCategory(e) {
    e.preventDefault();
    
    const budget = {
        category: document.getElementById('budgetCategory').value,
        amount: parseFloat(document.getElementById('budgetAmount').value)
    };
    
    let budgets = JSON.parse(localStorage.getItem('budgets')) || [];
    const existing = budgets.findIndex(b => b.category === budget.category);
    
    if (existing >= 0) {
        budgets[existing] = budget;
    } else {
        budgets.push(budget);
    }
    
    localStorage.setItem('budgets', JSON.stringify(budgets));
    closeModal('budgetModal');
    showNotification('Budget updated successfully', 'success');
    loadData();
}

function openBudgetModal() {
    document.getElementById('budgetCategory').value = '';
    document.getElementById('budgetAmount').value = '';
    openModal('budgetModal');
}

function saveBudget() {
    const totalBudget = document.getElementById('monthlyBudgetInput').value;
    if (totalBudget) {
        localStorage.setItem('totalMonthlyBudget', totalBudget);
        showNotification('Total budget updated', 'success');
        loadData();
    }
}

// ========== RECURRING EXPENSES ==========
function openRecurringModal() {
    document.getElementById('recurringForm').reset();
    openModal('recurringModal');
}

function saveRecurring(e) {
    e.preventDefault();
    
    const recurring = {
        id: Date.now(),
        description: document.getElementById('recurringDescription').value,
        amount: parseFloat(document.getElementById('recurringAmount').value),
        frequency: document.getElementById('recurringFrequency').value,
        createdDate: new Date().toISOString().split('T')[0]
    };
    
    let recurrings = JSON.parse(localStorage.getItem('recurrings')) || [];
    recurrings.push(recurring);
    localStorage.setItem('recurrings', JSON.stringify(recurrings));
    
    closeModal('recurringModal');
    showNotification('Recurring expense added', 'success');
    loadData();
}

function deleteRecurring(id) {
    if (confirm('Are you sure you want to delete this recurring expense?')) {
        let recurrings = JSON.parse(localStorage.getItem('recurrings')) || [];
        recurrings = recurrings.filter(rec => rec.id !== id);
        localStorage.setItem('recurrings', JSON.stringify(recurrings));
        showNotification('Recurring expense deleted', 'success');
        loadData();
    }
}

// ========== DATA LOADING ==========
function loadData() {
    updateDashboard();
    loadExpenses();
    loadBudgetProgress();
    loadRecurring();
    renderTrendChart();
    renderCategoryChart();
}

function initializeCharts() {
    renderTrendChart();
    renderCategoryChart();
}

function updateDashboard() {
    const expenses = JSON.parse(localStorage.getItem('expenses')) || [];
    const recurrings = JSON.parse(localStorage.getItem('recurrings')) || [];
    const totalBudget = parseFloat(localStorage.getItem('totalMonthlyBudget')) || 0;
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    let totalExpenses = 0;
    let monthlyExpenses = 0;
    
    expenses.forEach(exp => {
        const expDate = new Date(exp.date);
        totalExpenses += exp.amount;
        
        if (expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear) {
            monthlyExpenses += exp.amount;
        }
    });
    
    const monthlyRecurring = recurrings.reduce((sum, rec) => {
        if (rec.frequency === 'monthly') return sum + rec.amount;
        if (rec.frequency === 'daily') return sum + (rec.amount * 30);
        if (rec.frequency === 'weekly') return sum + (rec.amount * 4.3);
        return sum;
    }, 0);
    
    const availableBalance = totalBudget - monthlyExpenses - monthlyRecurring;
    
    document.getElementById('totalExpenses').textContent = formatCurrency(totalExpenses);
    document.getElementById('monthlyBudget').textContent = formatCurrency(totalBudget);
    document.getElementById('balance').textContent = formatCurrency(Math.max(availableBalance, 0));
    
    loadRecentTransactions();
    loadRecurringSummary();
}

function loadRecentTransactions() {
    const expenses = JSON.parse(localStorage.getItem('expenses')) || [];
    const container = document.getElementById('recentTransactions');
    
    if (!container) return;
    
    const recent = expenses.slice(-5).reverse();
    
    if (recent.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><h3>No transactions yet</h3><p>Start by adding your first expense</p></div>';
        return;
    }
    
    container.innerHTML = recent.map(exp => `
        <div class="transaction-item">
            <div class="transaction-left">
                <div class="transaction-icon ${getCategoryClass(exp.category)}">
                    <i class="${getCategoryIcon(exp.category)}"></i>
                </div>
                <div class="transaction-details">
                    <h4>${exp.description}</h4>
                    <p>${exp.category.charAt(0).toUpperCase() + exp.category.slice(1)}</p>
                </div>
            </div>
            <div class="transaction-right">
                <div class="transaction-amount">-${formatCurrency(exp.amount)}</div>
                <div class="transaction-date">${formatDate(exp.date)}</div>
            </div>
        </div>
    `).join('');
}

function loadExpenses() {
    const expenses = JSON.parse(localStorage.getItem('expenses')) || [];
    const container = document.getElementById('allExpenses');
    
    if (!container) return;
    
    if (expenses.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><h3>No expenses recorded</h3><p>Add your first expense to get started</p></div>';
        return;
    }
    
    container.innerHTML = expenses.reverse().map(exp => `
        <div class="transaction-item">
            <div class="transaction-left">
                <div class="transaction-icon ${getCategoryClass(exp.category)}">
                    <i class="${getCategoryIcon(exp.category)}"></i>
                </div>
                <div class="transaction-details">
                    <h4>${exp.description}</h4>
                    <p>${exp.category.charAt(0).toUpperCase() + exp.category.slice(1)}</p>
                </div>
            </div>
            <div class="transaction-right">
                <div class="transaction-amount">-${formatCurrency(exp.amount)}</div>
                <div class="transaction-date">${formatDate(exp.date)}</div>
                <div class="action-btns" style="margin-top: 8px; gap: 4px;">
                    <button class="action-btn edit" onclick="editExpense(${exp.id})" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" onclick="deleteExpense(${exp.id})" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>
    `).join('');
}

function loadBudgetProgress() {
    const expenses = JSON.parse(localStorage.getItem('expenses')) || [];
    const container = document.getElementById('budgetProgress');
    
    if (!container) return;
    
    const categories = ['food', 'transport', 'shopping', 'bills', 'entertainment', 'health', 'education', 'other'];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const categoryTotals = {};
    categories.forEach(cat => categoryTotals[cat] = 0);
    
    expenses.forEach(exp => {
        const expDate = new Date(exp.date);
        if (expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear) {
            if (categoryTotals.hasOwnProperty(exp.category)) {
                categoryTotals[exp.category] += exp.amount;
            }
        }
    });
    
    const budgets = JSON.parse(localStorage.getItem('budgets')) || [];
    
    container.innerHTML = categories.map(cat => {
        const spent = categoryTotals[cat] || 0;
        const budget = budgets.find(b => b.category === cat);
        const budgetAmount = budget ? budget.amount : 0;
        const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
        
        let status = 'normal';
        if (percentage > 100) status = 'danger';
        else if (percentage > 75) status = 'warning';
        
        return `
            <div class="budget-item">
                <div class="budget-item-header">
                    <span class="budget-category">${cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                    <span class="budget-values">${formatCurrency(spent)} / ${formatCurrency(budgetAmount)}</span>
                </div>
                <div class="budget-bar">
                    <div class="budget-fill ${status}" style="width: ${Math.min(percentage, 100)}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

function loadRecurring() {
    const recurrings = JSON.parse(localStorage.getItem('recurrings')) || [];
    const container = document.getElementById('allRecurring');
    
    if (!container) return;
    
    if (recurrings.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-clock"></i><h3>No recurring expenses</h3><p>Add your first recurring expense</p></div>';
        return;
    }
    
    container.innerHTML = recurrings.map(rec => `
        <div class="recurring-item" style="background: var(--lighter); color: var(--dark); padding: 16px; border-radius: 12px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
            <div class="recurring-info">
                <h4 style="margin-bottom: 4px;">${rec.description}</h4>
                <p style="font-size: 12px; color: var(--gray);">${rec.frequency.charAt(0).toUpperCase() + rec.frequency.slice(1)}</p>
            </div>
            <div style="text-align: right;">
                <div style="color: var(--danger); font-weight: 700; margin-bottom: 6px;">${formatCurrency(rec.amount)}</div>
                <button class="action-btn delete" onclick="deleteRecurring(${rec.id})" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function loadRecurringSummary() {
    const recurrings = JSON.parse(localStorage.getItem('recurrings')) || [];
    const container = document.getElementById('recurringSummary');
    
    if (!container || recurrings.length === 0) return;
    
    container.innerHTML = recurrings.slice(0, 3).map(rec => `
        <div class="recurring-item">
            <div class="recurring-info">
                <h4>${rec.description}</h4>
                <p>${rec.frequency.charAt(0).toUpperCase() + rec.frequency.slice(1)}</p>
            </div>
            <div class="recurring-amount">${formatCurrency(rec.amount)}</div>
        </div>
    `).join('');
}

// ========== FILTERING & SEARCH ==========
function filterExpenses() {
    const searchTerm = document.getElementById('searchExpenses')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('categoryFilter')?.value || '';
    const startDate = document.getElementById('startDate')?.value || '';
    const endDate = document.getElementById('endDate')?.value || '';
    
    let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
    
    expenses = expenses.filter(exp => {
        const matchSearch = exp.description.toLowerCase().includes(searchTerm);
        const matchCategory = !categoryFilter || exp.category === categoryFilter;
        const matchStart = !startDate || exp.date >= startDate;
        const matchEnd = !endDate || exp.date <= endDate;
        
        return matchSearch && matchCategory && matchStart && matchEnd;
    });
    
    const container = document.getElementById('allExpenses');
    if (!container) return;
    
    if (expenses.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><h3>No expenses found</h3><p>Try adjusting your filters</p></div>';
        return;
    }
    
    container.innerHTML = expenses.reverse().map(exp => `
        <div class="transaction-item">
            <div class="transaction-left">
                <div class="transaction-icon ${getCategoryClass(exp.category)}">
                    <i class="${getCategoryIcon(exp.category)}"></i>
                </div>
                <div class="transaction-details">
                    <h4>${exp.description}</h4>
                    <p>${exp.category.charAt(0).toUpperCase() + exp.category.slice(1)}</p>
                </div>
            </div>
            <div class="transaction-right">
                <div class="transaction-amount">-${formatCurrency(exp.amount)}</div>
                <div class="transaction-date">${formatDate(exp.date)}</div>
                <div class="action-btns" style="margin-top: 8px; gap: 4px;">
                    <button class="action-btn edit" onclick="editExpense(${exp.id})" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete" onclick="deleteExpense(${exp.id})" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>
    `).join('');
}

// ========== CHART RENDERING ==========
function renderTrendChart() {
    const canvas = document.getElementById('trendChart');
    if (!canvas) return;
    
    const expenses = JSON.parse(localStorage.getItem('expenses')) || [];
    const trendPeriod = parseInt(document.getElementById('trendPeriod')?.value || '30');
    
    const today = new Date();
    const startDate = new Date(today.getTime() - trendPeriod * 24 * 60 * 60 * 1000);
    
    const dailyData = {};
    
    expenses.forEach(exp => {
        const expDate = new Date(exp.date);
        if (expDate >= startDate && expDate <= today) {
            const dateKey = exp.date;
            dailyData[dateKey] = (dailyData[dateKey] || 0) + exp.amount;
        }
    });
    
    const sortedDates = Object.keys(dailyData).sort();
    const values = sortedDates.map(date => dailyData[date]);
    const labels = sortedDates.map(date => {
        const d = new Date(date);
        return `${d.getMonth() + 1}/${d.getDate()}`;
    });
    
    if (trendChartInstance) {
        trendChartInstance.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.length > 0 ? labels : ['No Data'],
            datasets: [{
                label: 'Daily Expenses',
                data: values.length > 0 ? values : [0],
                borderColor: '#7c3aed',
                backgroundColor: 'rgba(124, 58, 237, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: '#7c3aed',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + value;
                        }
                    }
                }
            }
        }
    });
}

function renderCategoryChart() {
    const canvas = document.getElementById('categoryChart');
    if (!canvas) return;
    
    const expenses = JSON.parse(localStorage.getItem('expenses')) || [];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const categoryTotals = {};
    const categories = ['food', 'transport', 'shopping', 'bills', 'entertainment', 'health', 'education', 'other'];
    categories.forEach(cat => categoryTotals[cat] = 0);
    
    expenses.forEach(exp => {
        const expDate = new Date(exp.date);
        if (expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear) {
            if (categoryTotals.hasOwnProperty(exp.category)) {
                categoryTotals[exp.category] += exp.amount;
            }
        }
    });
    
    const labels = Object.keys(categoryTotals).map(cat => cat.charAt(0).toUpperCase() + cat.slice(1));
    const values = Object.values(categoryTotals);
    const colors = ['#f97316', '#0ea5e9', '#ec4899', '#f43f5e', '#a855f7', '#10b981', '#06b6d4', '#7c3aed'];
    
    if (categoryChartInstance) {
        categoryChartInstance.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    categoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.length > 0 ? labels : ['No Data'],
            datasets: [{
                data: values.length > 0 ? values : [1],
                backgroundColor: colors,
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: { size: 12 }
                    }
                }
            }
        }
    });
}

function renderReportsCharts() {
    renderMonthlyComparisonChart();
    renderReportCategoryChart();
    renderHeatmapChart();
}

function renderMonthlyComparisonChart() {
    const canvas = document.getElementById('monthlyComparisonChart');
    if (!canvas) return;
    
    const expenses = JSON.parse(localStorage.getItem('expenses')) || [];
    const currentYear = new Date().getFullYear();
    
    const monthlyTotals = Array(12).fill(0);
    
    expenses.forEach(exp => {
        const expDate = new Date(exp.date);
        if (expDate.getFullYear() === currentYear) {
            monthlyTotals[expDate.getMonth()] += exp.amount;
        }
    });
    
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    if (monthlyComparisonChartInstance) {
        monthlyComparisonChartInstance.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    monthlyComparisonChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: monthLabels,
            datasets: [{
                label: 'Monthly Expenses',
                data: monthlyTotals,
                backgroundColor: '#0ea5e9',
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + (value / 1000).toFixed(0) + 'K';
                        }
                    }
                }
            }
        }
    });
}

function renderReportCategoryChart() {
    const canvas = document.getElementById('reportsCategoryChart');
    if (!canvas) return;
    
    const expenses = JSON.parse(localStorage.getItem('expenses')) || [];
    
    const categoryTotals = {};
    expenses.forEach(exp => {
        categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    });
    
    const labels = Object.keys(categoryTotals).map(cat => cat.charAt(0).toUpperCase() + cat.slice(1));
    const values = Object.values(categoryTotals);
    const colors = ['#f97316', '#0ea5e9', '#ec4899', '#f43f5e', '#a855f7', '#10b981', '#06b6d4', '#7c3aed'];
    
    if (reportsCategoryChartInstance) {
        reportsCategoryChartInstance.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    reportsCategoryChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels.length > 0 ? labels : ['No Data'],
            datasets: [{
                data: values.length > 0 ? values : [1],
                backgroundColor: colors,
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: { size: 12 }
                    }
                }
            }
        }
    });
}

function renderHeatmapChart() {
    const canvas = document.getElementById('heatmapChart');
    if (!canvas) return;
    
    const expenses = JSON.parse(localStorage.getItem('expenses')) || [];
    
    const dayTotals = Array(7).fill(0);
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    expenses.forEach(exp => {
        const expDate = new Date(exp.date);
        dayTotals[expDate.getDay()] += exp.amount;
    });
    
    if (heatmapChartInstance) {
        heatmapChartInstance.destroy();
    }
    
    const ctx = canvas.getContext('2d');
    heatmapChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dayLabels,
            datasets: [{
                label: 'Day of Week Spending',
                data: dayTotals,
                backgroundColor: [
                    '#f43f5e',
                    '#f97316',
                    '#eab308',
                    '#0ea5e9',
                    '#10b981',
                    '#a855f7',
                    '#ec4899'
                ],
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + value;
                        }
                    }
                }
            }
        }
    });
}

// ========== UTILITY FUNCTIONS ==========
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
    }).format(amount);
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getCategoryClass(category) {
    return `category-${category}`;
}

function getCategoryIcon(category) {
    const icons = {
        food: 'fas fa-utensils',
        transport: 'fas fa-car',
        shopping: 'fas fa-shopping-bag',
        bills: 'fas fa-file-invoice-dollar',
        entertainment: 'fas fa-film',
        health: 'fas fa-heart',
        education: 'fas fa-book',
        other: 'fas fa-ellipsis-h'
    };
    return icons[category] || 'fas fa-tag';
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    const icon = notification.querySelector('i') || document.createElement('i');
    const iconClass = type === 'success' ? 'fas fa-check-circle' : 
                     type === 'error' ? 'fas fa-exclamation-circle' : 
                     'fas fa-info-circle';
    icon.className = iconClass;
    
    if (!notification.querySelector('i')) {
        notification.insertBefore(icon, notification.firstChild);
    }
    
    const textElement = notification.querySelector('span') || document.createElement('span');
    textElement.textContent = message;
    
    if (!notification.querySelector('span')) {
        notification.appendChild(textElement);
    }
    
    notification.className = `notification show ${type}`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// ========== EXPORT FUNCTIONALITY ==========
function exportToCSV() {
    const expenses = JSON.parse(localStorage.getItem('expenses')) || [];
    
    if (expenses.length === 0) {
        showNotification('No data to export', 'warning');
        return;
    }
    
    let csv = 'Description,Amount,Category,Date,Notes\n';
    expenses.forEach(exp => {
        csv += `"${exp.description}",${exp.amount},"${exp.category}","${exp.date}","${exp.notes}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    toggleExportMenu();
    showNotification('Data exported successfully', 'success');
}

function toggleExportMenu() {
    const dropdown = document.getElementById('exportDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
    
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.export-menu')) {
            dropdown?.classList.remove('show');
        }
    }, { once: true });
}

function clearAllData() {
    const confirmed = confirm('⚠️ WARNING: Are you sure you want to DELETE ALL DATA?\n\nThis action cannot be undone.\nAll expenses, budgets, and settings will be permanently deleted.');
    
    if (confirmed) {
        try {
            // Clear all localStorage data
            localStorage.clear();
            
            // Close dropdown
            const dropdown = document.getElementById('exportDropdown');
            if (dropdown) {
                dropdown.classList.remove('show');
            }
            
            // Update UI immediately
            loadData();
            updateDashboard();
            
            showNotification('All data cleared', 'success');
        } catch (error) {
            console.error('Error clearing data:', error);
            showNotification('Error clearing data', 'error');
        }
    }
}
