import { 
  fetchIncomeSources, 
  fetchIncomes, 
  fetchExpenses, 
  fetchTransfers,
  calculateAccountBalance,
  getSession 
} from "./db.js";
import { toast } from "./ui.js";
import { t } from "./i18n.js";
import { toDisplayDate, toCurrency, monthKeyFromDate } from "./utils.js";

const dom = {
  accountSelect: document.getElementById("account-select"),
  periodSelect: document.getElementById("period-select"),
  dateFromLabel: document.getElementById("date-from-label"),
  dateToLabel: document.getElementById("date-to-label"),
  dateFrom: document.getElementById("date-from"),
  dateTo: document.getElementById("date-to"),
  totalIncome: document.getElementById("total-income"),
  totalExpenses: document.getElementById("total-expenses"),
  currentBalance: document.getElementById("current-balance"),
  incomeList: document.getElementById("income-list"),
  expenseList: document.getElementById("expense-list"),
  transferList: document.getElementById("transfer-list")
};

let state = {
  sources: [],
  incomes: [],
  expenses: [],
  transfers: [],
  selectedAccount: null,
  period: "ALL",
  dateFrom: null,
  dateTo: null
};

const accountHeading = document.createElement("h1");
accountHeading.id = "account-heading";
accountHeading.className = "text-3xl font-serif";
accountHeading.textContent = "Account Details";

init();

async function init() {
  try {
    const session = await getSession();
    if (!session?.user) {
      dom.accountSelect.innerHTML = "<option>Please sign in</option>";
      return;
    }

    const [sources, incomes, expenses, transfers] = await Promise.all([
      fetchIncomeSources(),
      fetchIncomes(),
      fetchExpenses(),
      fetchTransfers()
    ]);

    state.sources = sources;
    state.incomes = incomes;
    state.expenses = expenses;
    state.transfers = transfers;

    populateAccountSelect();
    setupEventListeners();
    
    // Get account from URL parameter
    const params = new URLSearchParams(window.location.search);
    const selectedAccountParam = params.get("account");
    
    if (selectedAccountParam) {
      dom.accountSelect.value = selectedAccountParam;
      selectAccount(selectedAccountParam);
    } else if (sources.length > 0) {
      selectAccount(sources[0].name);
    }
  } catch (error) {
    toast(`Error loading accounts: ${error.message}`);
  }
}

function populateAccountSelect() {
  dom.accountSelect.innerHTML = `<option value="">All Accounts</option>${state.sources.map(source => 
    `<option value="${escapeHtml(source.name)}">${escapeHtml(source.name)}</option>`
  ).join("")}`;
}

function setupEventListeners() {
  dom.accountSelect.addEventListener("change", () => {
    selectAccount(dom.accountSelect.value || null);
  });

  dom.periodSelect.addEventListener("change", () => {
    state.period = dom.periodSelect.value;
    if (state.period === "CUSTOM") {
      dom.dateFromLabel.classList.remove("hidden");
      dom.dateToLabel.classList.remove("hidden");
    } else {
      dom.dateFromLabel.classList.add("hidden");
      dom.dateToLabel.classList.add("hidden");
    }
    updateDisplay();
  });

  dom.dateFrom.addEventListener("change", () => {
    state.dateFrom = dom.dateFrom.value;
    updateDisplay();
  });

  dom.dateTo.addEventListener("change", () => {
    state.dateTo = dom.dateTo.value;
    updateDisplay();
  });
}

async function selectAccount(accountName) {
  state.selectedAccount = accountName;
  
  // Update the heading with selected account name
  const heading = document.querySelector("h1");
  if (accountName) {
    heading.textContent = `Account Details: ${accountName}`;
  } else {
    heading.textContent = "Account Details";
  }
  
  updateDisplay();
}

async function updateDisplay() {
  const filteredIncomes = filterTransactions(state.incomes, "income_date", "source");
  const filteredExpenses = filterTransactions(state.expenses, "expense_date", "expense_source");
  const filteredTransfers = state.transfers.filter(t => {
    if (!state.selectedAccount) return true;
    return t.from_account === state.selectedAccount || t.to_account === state.selectedAccount;
  }).filter(t => isInPeriod(t.transfer_date));

  const totalIncome = filteredIncomes.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalExpenses = filteredExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const balance = state.selectedAccount ? await calculateAccountBalance(state.selectedAccount) : totalIncome - totalExpenses;

  dom.totalIncome.textContent = toCurrency(totalIncome);
  dom.totalExpenses.textContent = toCurrency(totalExpenses);
  dom.currentBalance.textContent = toCurrency(balance);

  renderIncomeList(filteredIncomes);
  renderExpenseList(filteredExpenses);
  renderTransferList(filteredTransfers);
}

function filterTransactions(transactions, dateField, sourceField) {
  return transactions.filter(t => {
    if (state.selectedAccount && t[sourceField] !== state.selectedAccount) {
      return false;
    }
    return isInPeriod(t[dateField]);
  });
}

function isInPeriod(date) {
  if (state.period === "ALL") return true;
  
  const checkDate = new Date(date);
  const now = new Date();
  
  if (state.period === "THIS_MONTH") {
    return monthKeyFromDate(checkDate) === monthKeyFromDate(now);
  }
  
  if (state.period === "THIS_YEAR") {
    return checkDate.getFullYear() === now.getFullYear();
  }
  
  if (state.period === "CUSTOM") {
    if (state.dateFrom && checkDate < new Date(state.dateFrom)) return false;
    if (state.dateTo && checkDate > new Date(state.dateTo)) return false;
    return true;
  }
  
  return true;
}

function renderIncomeList(incomes) {
  if (incomes.length === 0) {
    dom.incomeList.innerHTML = "<li class='text-slate-500'>No income transactions</li>";
    return;
  }

  dom.incomeList.innerHTML = incomes.map(income => `
    <li class="card p-4 flex justify-between items-center">
      <div>
        <p class="font-medium">${escapeHtml(income.source)}</p>
        <p class="text-sm text-slate-500">${toDisplayDate(income.income_date)}</p>
        ${income.note ? `<p class="text-sm text-slate-600 mt-1">${escapeHtml(income.note)}</p>` : ''}
      </div>
      <p class="font-semibold text-green-600">+${toCurrency(income.amount)}</p>
    </li>
  `).join("");
}

function renderExpenseList(expenses) {
  if (expenses.length === 0) {
    dom.expenseList.innerHTML = "<li class='text-slate-500'>No expense transactions</li>";
    return;
  }

  dom.expenseList.innerHTML = expenses.map(expense => `
    <li class="card p-4 flex justify-between items-center">
      <div>
        <p class="font-medium">${escapeHtml(expense.category)}</p>
        <p class="text-sm text-slate-500">${toDisplayDate(expense.expense_date)} • From ${escapeHtml(expense.expense_source)}</p>
        ${expense.note ? `<p class="text-sm text-slate-600 mt-1">${escapeHtml(expense.note)}</p>` : ''}
      </div>
      <p class="font-semibold text-red-600">-${toCurrency(expense.amount)}</p>
    </li>
  `).join("");
}

function renderTransferList(transfers) {
  if (transfers.length === 0) {
    dom.transferList.innerHTML = "<li class='text-slate-500'>No transfers</li>";
    return;
  }

  dom.transferList.innerHTML = transfers.map(transfer => {
    const isOutgoing = transfer.from_account === state.selectedAccount;
    return `
      <li class="card p-4 flex justify-between items-center">
        <div>
          <p class="font-medium">${escapeHtml(transfer.from_account)} → ${escapeHtml(transfer.to_account)}</p>
          <p class="text-sm text-slate-500">${toDisplayDate(transfer.transfer_date)}</p>
          ${transfer.note ? `<p class="text-sm text-slate-600 mt-1">${escapeHtml(transfer.note)}</p>` : ''}
        </div>
        <p class="font-semibold ${isOutgoing ? 'text-red-600' : 'text-green-600'}">${isOutgoing ? '-' : '+'}${toCurrency(transfer.amount)}</p>
      </li>
    `;
  }).join("");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}