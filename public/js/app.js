import { CATEGORY_OPTIONS } from "./constants.js";
import {
  addExpense,
  addIncome,
  addIncomeSource,
  deleteExpense,
  deleteIncome,
  deleteIncomeSource,
  fetchExpenses,
  fetchIncomes,
  fetchIncomeSources,
  getSession,
  isIncomeSourceInUse,
  onAuthStateChanged,
  renameIncomeSource,
  replaceIncomeSourceName,
  updateExpense,
  updateIncome
} from "./db.js";
import { buildNetSummary, buildSummary } from "./summary.js";
import {
  applyTheme,
  closeEditDialog,
  closeEditIncomeDialog,
  openEditDialog,
  openEditIncomeDialog,
  populateCategorySelect,
  populateTextSelect,
  renderAuthView,
  renderExpenseList,
  renderIncomeList,
  renderIncomeSources,
  renderIncomeSummary,
  renderNetSummary,
  renderSummary,
  setActiveView,
  toast
} from "./ui.js";
import { t } from "./i18n.js";
import { sortByDateDesc, toCurrency, todayISO } from "./utils.js";

const state = {
  session: null,
  expenses: [],
  incomes: [],
  incomeSources: [],
  quickAction: new URLSearchParams(window.location.search).get("quick") || null,
  selectedExpensePeriod: "THIS_MONTH",
  expenseRangeFrom: "",
  expenseRangeTo: "",
  selectedCategory: "All",
  selectedIncomePeriod: "THIS_MONTH",
  incomeRangeFrom: "",
  incomeRangeTo: "",
  selectedIncomeSource: "All",
  activeView: "expense",
  expenseViewMode: "list",
  expensePageMode: false,
  theme: localStorage.getItem("theme") || "light",
  isBusy: false,
  authSubscription: null
};

const dom = {
  authView: document.getElementById("auth-view"),
  appView: document.getElementById("app-view"),
  mainOverviewBlock: document.getElementById("main-overview-block"),
  themeToggle: document.getElementById("theme-toggle"),
  expenseTab: document.getElementById("expense-tab"),
  incomeTab: document.getElementById("income-tab"),
  expensePeriodFilter: document.getElementById("expense-period-filter"),
  expenseOpenPage: document.getElementById("expense-open-page"),
  expenseViewAll: document.getElementById("expense-view-all"),
  expensePageBack: document.getElementById("expense-page-back"),
  expenseSummaryCard: document.getElementById("expense-summary-card"),
  expenseFormCard: document.getElementById("expense-form-card"),
  expenseHistoryCard: document.getElementById("expense-history-card"),
  expenseRangeControls: document.getElementById("expense-range-controls"),
  expenseFromDate: document.getElementById("expense-from-date"),
  expenseToDate: document.getElementById("expense-to-date"),
  categoryFilter: document.getElementById("category-filter"),
  expenseOverview: document.getElementById("expense-overview"),
  expenseOverviewBack: document.getElementById("expense-overview-back"),
  expenseOverviewTotal: document.getElementById("expense-overview-total"),
  expenseOverviewRange: document.getElementById("expense-overview-range"),
  expensePieChart: document.getElementById("expense-pie-chart"),
  expensePieLegend: document.getElementById("expense-pie-legend"),
  expenseOverviewBreakdown: document.getElementById("expense-overview-breakdown"),
  expenseOverviewList: document.getElementById("expense-overview-list"),
  incomePeriodFilter: document.getElementById("income-period-filter"),
  incomeRangeControls: document.getElementById("income-range-controls"),
  incomeFromDate: document.getElementById("income-from-date"),
  incomeToDate: document.getElementById("income-to-date"),
  incomeSummaryCard: document.getElementById("income-summary-card"),
  incomeSourceCard: document.getElementById("income-source-card"),
  incomeFormCard: document.getElementById("income-form-card"),
  incomeHistoryCard: document.getElementById("income-history-card"),
  incomeSourceFilter: document.getElementById("income-source-filter"),
  expenseForm: document.getElementById("expense-form"),
  incomeForm: document.getElementById("income-form"),
  sourceForm: document.getElementById("source-form"),
  editForm: document.getElementById("edit-form"),
  editIncomeForm: document.getElementById("edit-income-form"),
  editCancel: document.getElementById("edit-cancel"),
  editIncomeCancel: document.getElementById("edit-income-cancel"),
  addDate: document.getElementById("expense-date"),
  incomeDate: document.getElementById("income-date"),
  expenseAmount: document.getElementById("amount"),
  addCategory: document.getElementById("category"),
  expenseSource: document.getElementById("expense-source"),
  incomeSource: document.getElementById("income-source"),
  editCategory: document.getElementById("edit-category"),
  editExpenseSource: document.getElementById("edit-expense-source"),
  editIncomeSource: document.getElementById("edit-income-source")
};

async function init() {
  applyTheme(state.theme);
  document.documentElement.lang = localStorage.getItem("language") === "si" ? "si" : "en";
  applyStaticLabels();
  setupThemeToggle();
  setupStaticControls();

  populateCategorySelect(dom.addCategory, false);
  populateCategorySelect(dom.editCategory, false);
  populateCategorySelect(dom.categoryFilter, true);

  dom.addCategory.value = CATEGORY_OPTIONS[0];
  dom.categoryFilter.value = "All";
  dom.addDate.value = todayISO();
  dom.incomeDate.value = todayISO();

  try {
    state.session = await getSession();
  } catch (error) {
    showFatalError(error);
    return;
  }

  state.authSubscription = await onAuthStateChanged(async (session) => {
    state.session = session;
    if (state.session?.user) {
      await refreshAllData();
    } else {
      state.expenses = [];
      state.incomes = [];
      state.incomeSources = [];
      render();
    }
  });

  setupFormHandlers();
  render();

  if (state.session?.user) {
    await refreshAllData();
  }
}

function setupThemeToggle() {
  if (!dom.themeToggle) {
    return;
  }

  dom.themeToggle.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem("theme", state.theme);
    applyTheme(state.theme);
  });
}

function setupStaticControls() {
  dom.expenseTab.addEventListener("click", () => {
    state.activeView = "expense";
    state.expensePageMode = false;
    setActiveView(state.activeView);
    render();
  });

  dom.incomeTab.addEventListener("click", () => {
    state.activeView = "income";
    state.expensePageMode = false;
    setActiveView(state.activeView);
    render();
  });

  if (dom.expenseOpenPage) {
    dom.expenseOpenPage.addEventListener("click", () => {
      state.activeView = "expense";
      state.expensePageMode = true;
      render();
    });
  }

  if (dom.expensePageBack) {
    dom.expensePageBack.addEventListener("click", () => {
      state.expensePageMode = false;
      render();
    });
  }

  dom.expensePeriodFilter.addEventListener("change", () => {
    state.selectedExpensePeriod = dom.expensePeriodFilter.value;
    syncPeriodControls();
    renderExpenseSection();
  });

  if (dom.expenseViewAll) {
    dom.expenseViewAll.addEventListener("click", () => {
      state.expenseViewMode = "overview";
      render();
    });
  }

  if (dom.expenseOverviewBack) {
    dom.expenseOverviewBack.addEventListener("click", () => {
      state.expenseViewMode = "list";
      render();
    });
  }

  dom.expenseFromDate.addEventListener("change", () => {
    state.expenseRangeFrom = dom.expenseFromDate.value;
    renderExpenseSection();
  });

  dom.expenseToDate.addEventListener("change", () => {
    state.expenseRangeTo = dom.expenseToDate.value;
    renderExpenseSection();
  });

  dom.categoryFilter.addEventListener("change", () => {
    state.selectedCategory = dom.categoryFilter.value;
    renderExpenseSection();
  });

  dom.incomePeriodFilter.addEventListener("change", () => {
    state.selectedIncomePeriod = dom.incomePeriodFilter.value;
    syncPeriodControls();
    renderIncomeSection();
  });

  dom.incomeFromDate.addEventListener("change", () => {
    state.incomeRangeFrom = dom.incomeFromDate.value;
    renderIncomeSection();
  });

  dom.incomeToDate.addEventListener("change", () => {
    state.incomeRangeTo = dom.incomeToDate.value;
    renderIncomeSection();
  });

  dom.incomeSourceFilter.addEventListener("change", () => {
    state.selectedIncomeSource = dom.incomeSourceFilter.value;
    renderIncomeSection();
  });

  dom.expenseAmount.addEventListener("input", () => {
    populateExpenseSourceSelect();
  });

  dom.editCancel.addEventListener("click", closeEditDialog);
  dom.editIncomeCancel.addEventListener("click", closeEditIncomeDialog);
}

function applyStaticLabels() {
  const isIncomePage = window.location.pathname.endsWith("income.html");
  document.title = isIncomePage ? t("incomePage") : t("expensePage");

  const textMap = [
    ["#expense-tab", t("expenses")],
    ["#income-tab", t("income")],
    ["#expense-summary-card .summary-heading h2", t("netBalance")],
    ["#expense-section > .card.summary-card .summary-heading h2", t("expenses")],
    ["#expense-view-all", t("viewAll")],
    ["#expense-form-card h2", t("addExpense")],
    ["#expense-history-card h2", t("recentExpenses")],
    ["#expense-overview .overview-header p.eyebrow", t("expenseOverview")],
    ["#expense-overview .overview-header h2", t("allExpensesAtAGlance")],
    ["#expense-overview-back", t("back")],
    ["#expense-overview .overview-chart-card h3", t("categorySplit")],
    ["#expense-overview .overview-list-card h3", t("allExpenseCategories")],
    ["#expense-overview .card:last-of-type h2", t("allExpenses")],
    ["#income-summary-card .summary-heading h2", t("income")],
    ["#income-source-card h2", t("manageIncomeSources")],
    ["#income-form-card h2", t("addIncome")],
    ["#income-history-card h2", t("recentIncome")],
    ["#edit-dialog h3", t("expensePage")],
    ["#edit-income-dialog h3", t("incomePage")],
    ["#edit-cancel", t("cancel")],
    ["#edit-income-cancel", t("cancel")]
  ];

  textMap.forEach(([selector, value]) => {
    document.querySelectorAll(selector).forEach((node) => {
      node.textContent = value;
    });
  });

  setLabelTexts("#expense-form", [t("amountLkr"), t("category"), t("deductFromSource"), t("date"), t("noteOptional")]);
  setLabelTexts("#income-form", [t("amountLkr"), t("source"), t("date"), t("noteOptional")]);
  setLabelTexts("#source-form", [t("source"), t("noteOptional")]);
  setLabelTexts("#edit-form", [t("amountLkr"), t("category"), t("deductFromSource"), t("date"), t("noteOptional")]);
  setLabelTexts("#edit-income-form", [t("amountLkr"), t("source"), t("date"), t("noteOptional")]);

  const buttonMap = [
    ["#expense-form button[type='submit']", t("saveExpense")],
    ["#income-form button[type='submit']", t("saveIncome")],
    ["#source-form button[type='submit']", t("addSource")],
    ["#edit-form button[type='submit']", t("update")],
    ["#edit-income-form button[type='submit']", t("update")],
    ["#expense-overview-back", t("back")],
    ["#expense-view-all", t("viewAll")],
    ["#edit-cancel", t("cancel")],
    ["#edit-income-cancel", t("cancel")]
  ];

  buttonMap.forEach(([selector, value]) => {
    document.querySelectorAll(selector).forEach((node) => {
      node.textContent = value;
    });
  });

  const periodLabels = document.querySelectorAll("#expense-period-filter option, #income-period-filter option");
  periodLabels.forEach((option) => {
    switch (option.value) {
      case "THIS_MONTH":
        option.textContent = t("thisMonth");
        break;
      case "THIS_YEAR":
        option.textContent = t("thisYear");
        break;
      case "CUSTOM_RANGE":
        option.textContent = t("customRange");
        break;
      default:
        option.textContent = t("all");
        break;
    }
  });

  document.querySelectorAll("[aria-label='Tracker sections']").forEach((node) => {
    node.setAttribute("aria-label", t("dashboardNavigation"));
  });

  document.querySelectorAll(".bottom-nav-item[href='./index.html'] .bottom-nav-label").forEach((node) => (node.textContent = t("accounts")));
  document.querySelectorAll(".bottom-nav-item[href='./expense.html'] .bottom-nav-label").forEach((node) => (node.textContent = t("expenses")));
  document.querySelectorAll(".bottom-nav-item[href='./income.html'] .bottom-nav-label").forEach((node) => (node.textContent = t("income")));
  document.querySelectorAll(".bottom-nav-item[href='./notes.html'] .bottom-nav-label").forEach((node) => (node.textContent = t("memoryPage")));
}

function setLabelTexts(formSelector, texts) {
  const labels = document.querySelectorAll(`${formSelector} label`);
  labels.forEach((label, index) => {
    const textNode = [...label.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
    if (textNode && texts[index]) {
      textNode.textContent = `${texts[index]}\n            `;
    }
  });
}

function setupFormHandlers() {
  dom.expenseForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.session?.user || state.isBusy) {
      return;
    }

    const formData = new FormData(dom.expenseForm);
    const payload = {
      amount: Number(formData.get("amount")),
      category: String(formData.get("category")),
      expense_source: String(formData.get("expense_source")),
      note: String(formData.get("note") ?? "").trim() || null,
      expense_date: String(formData.get("date"))
    };

    if (!validateAmount(payload.amount)) {
      toast("Amount must be greater than zero.");
      return;
    }

    if (!payload.expense_source) {
      toast("Please create an income source first.");
      return;
    }

    const currentBalances = getIncomeSourceBalances();
    const available = currentBalances[payload.expense_source] ?? 0;
    if (payload.amount > available) {
      toast(`Insufficient balance in ${payload.expense_source}. Available: ${available.toFixed(2)}`);
      return;
    }

    state.isBusy = true;
    try {
      const created = await addExpense(payload);
      state.expenses = sortByDateDesc([created, ...state.expenses]);
      dom.expenseForm.reset();
      dom.addDate.value = todayISO();
      dom.addCategory.value = CATEGORY_OPTIONS[0];
      syncIncomeSourceSelects();
      renderExpenseSection();
      renderNetSection();
      toast("Expense saved.");
    } catch (error) {
      toast(normalizeError(error));
    } finally {
      state.isBusy = false;
    }
  });

  dom.editForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.session?.user || state.isBusy) {
      return;
    }

    const formData = new FormData(dom.editForm);
    const id = String(formData.get("id"));
    const payload = {
      amount: Number(formData.get("amount")),
      category: String(formData.get("category")),
      expense_source: String(formData.get("expense_source")),
      note: String(formData.get("note") ?? "").trim() || null,
      expense_date: String(formData.get("date"))
    };

    if (!validateAmount(payload.amount)) {
      toast("Amount must be greater than zero.");
      return;
    }

    if (!payload.expense_source) {
      toast("Please select an income source.");
      return;
    }

    const existingExpense = state.expenses.find((item) => item.id === id);
    if (!existingExpense) {
      toast("Expense not found.");
      return;
    }

    const projectedBalances = getIncomeSourceBalances();
    if (existingExpense.expense_source) {
      projectedBalances[existingExpense.expense_source] =
        (projectedBalances[existingExpense.expense_source] ?? 0) + Number(existingExpense.amount);
    }

    const available = projectedBalances[payload.expense_source] ?? 0;
    if (payload.amount > available) {
      toast(`Insufficient balance in ${payload.expense_source}. Available: ${available.toFixed(2)}`);
      return;
    }

    state.isBusy = true;
    try {
      const updated = await updateExpense(id, payload);
      state.expenses = state.expenses.map((item) => (item.id === id ? updated : item));
      state.expenses = sortByDateDesc(state.expenses, "expense_date");
      closeEditDialog();
      renderExpenseSection();
      renderNetSection();
      toast("Expense updated.");
    } catch (error) {
      toast(normalizeError(error));
    } finally {
      state.isBusy = false;
    }
  });

  dom.incomeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.session?.user || state.isBusy) {
      return;
    }

    const formData = new FormData(dom.incomeForm);
    const payload = {
      amount: Number(formData.get("amount")),
      source: String(formData.get("source")),
      note: String(formData.get("note") ?? "").trim() || null,
      income_date: String(formData.get("date"))
    };

    if (!validateAmount(payload.amount)) {
      toast("Amount must be greater than zero.");
      return;
    }

    if (!payload.source) {
      toast("Please create an income source first.");
      return;
    }

    state.isBusy = true;
    try {
      const created = await addIncome(payload);
      state.incomes = sortByDateDesc([created, ...state.incomes], "income_date");
      dom.incomeForm.reset();
      dom.incomeDate.value = todayISO();
      syncIncomeSourceSelects();
      renderIncomeSection();
      renderNetSection();
      toast("Income saved.");
    } catch (error) {
      toast(normalizeError(error));
    } finally {
      state.isBusy = false;
    }
  });

  dom.editIncomeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.session?.user || state.isBusy) {
      return;
    }

    const formData = new FormData(dom.editIncomeForm);
    const id = String(formData.get("id"));
    const payload = {
      amount: Number(formData.get("amount")),
      source: String(formData.get("source")),
      note: String(formData.get("note") ?? "").trim() || null,
      income_date: String(formData.get("date"))
    };

    if (!validateAmount(payload.amount)) {
      toast("Amount must be greater than zero.");
      return;
    }

    if (!payload.source) {
      toast("Please select an income source.");
      return;
    }

    state.isBusy = true;
    try {
      const updated = await updateIncome(id, payload);
      state.incomes = state.incomes.map((item) => (item.id === id ? updated : item));
      state.incomes = sortByDateDesc(state.incomes, "income_date");
      closeEditIncomeDialog();
      renderIncomeSection();
      renderNetSection();
      toast("Income updated.");
    } catch (error) {
      toast(normalizeError(error));
    } finally {
      state.isBusy = false;
    }
  });

  dom.sourceForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.session?.user || state.isBusy) {
      return;
    }

    const formData = new FormData(dom.sourceForm);
    const name = String(formData.get("source_name") ?? "").trim();
    const details = String(formData.get("source_details") ?? "").trim() || null;
    if (!name) {
      toast("Income source is required.");
      return;
    }

    if (state.incomeSources.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      toast("Source already exists.");
      return;
    }

    state.isBusy = true;
    try {
      const created = await addIncomeSource(name, details);
      state.incomeSources = [...state.incomeSources, created].sort((a, b) => a.name.localeCompare(b.name));
      dom.sourceForm.reset();
      syncIncomeSourceSelects();
      renderIncomeSection();
      toast("Income source added.");
    } catch (error) {
      toast(normalizeError(error));
    } finally {
      state.isBusy = false;
    }
  });
}

function render() {
  const isAuthenticated = Boolean(state.session?.user);
  dom.authView.classList.toggle("hidden", isAuthenticated);
  dom.appView.classList.toggle("hidden", !isAuthenticated);

  if (!isAuthenticated) {
    renderAuthView({
      isBusy: state.isBusy
    });
    return;
  }

  setActiveView(state.activeView);
  const isQuickAddExpense = state.quickAction === "add-expense";
  const isQuickAddIncome = state.quickAction === "add-income";
  const forceExpenseOverview = !dom.expenseViewAll;
  if (forceExpenseOverview && !isQuickAddExpense) {
    state.expenseViewMode = "overview";
  }
  if (forceExpenseOverview && isQuickAddExpense) {
    state.expenseViewMode = "list";
  }
  if (isQuickAddExpense || isQuickAddIncome) {
    state.expensePageMode = true;
    const urlParams = new URLSearchParams(window.location.search);
    const preAmount = urlParams.get("amount");
    if (preAmount && dom.expenseAmount) {
      dom.expenseAmount.value = preAmount;
      dom.expenseAmount.dispatchEvent(new Event("input"));
    }
  }
  dom.appView.classList.toggle("expense-page-mode", state.expensePageMode);
  if (dom.mainOverviewBlock) {
    dom.mainOverviewBlock.classList.toggle("hidden", state.expensePageMode);
  }
  if (dom.expenseOpenPage) {
    dom.expenseOpenPage.classList.toggle("hidden", state.expensePageMode);
  }
  if (dom.expensePageBack) {
    dom.expensePageBack.classList.toggle("hidden", !state.expensePageMode);
  }
  const showExpenseOverview = state.activeView === "expense" && state.expenseViewMode === "overview";
  if (dom.expenseViewAll) {
    dom.expenseViewAll.classList.toggle("hidden", state.activeView !== "expense" || state.expenseViewMode === "overview");
  }
  dom.expenseOverview.classList.toggle("hidden", !showExpenseOverview);
  if (dom.expenseSummaryCard) {
    dom.expenseSummaryCard.classList.toggle("hidden", isQuickAddExpense);
  }
  if (dom.expenseHistoryCard) {
    dom.expenseHistoryCard.classList.toggle("hidden", isQuickAddExpense);
  }
  if (dom.expenseFormCard) {
    dom.expenseFormCard.classList.toggle("hidden", !isQuickAddExpense);
  }
  if (dom.incomeSummaryCard) {
    dom.incomeSummaryCard.classList.toggle("hidden", isQuickAddIncome);
  }
  if (dom.incomeSourceCard) {
    dom.incomeSourceCard.classList.toggle("hidden", !isQuickAddIncome);
  }
  if (dom.incomeHistoryCard) {
    dom.incomeHistoryCard.classList.toggle("hidden", isQuickAddIncome);
  }
  if (dom.incomeFormCard) {
    dom.incomeFormCard.classList.toggle("hidden", !isQuickAddIncome);
  }
  dom.expensePeriodFilter.value = state.selectedExpensePeriod;
  dom.incomePeriodFilter.value = state.selectedIncomePeriod;
  dom.expenseFromDate.value = state.expenseRangeFrom;
  dom.expenseToDate.value = state.expenseRangeTo;
  dom.incomeFromDate.value = state.incomeRangeFrom;
  dom.incomeToDate.value = state.incomeRangeTo;
  syncPeriodControls();
  syncIncomeSourceSelects();
  renderExpenseSection();
  renderIncomeSection();
  renderNetSection();
}

function renderExpenseSection() {
  if (!state.session?.user) {
    return;
  }

  const periodFiltered = filterItemsByPeriod(
    state.expenses,
    "expense_date",
    state.selectedExpensePeriod,
    state.expenseRangeFrom,
    state.expenseRangeTo
  );
  const filtered = periodFiltered.filter(
    (item) => state.selectedCategory === "All" || item.category === state.selectedCategory
  );
  const summary = buildSummary(filtered);
  renderSummary(summary);

  if (state.expenseViewMode === "overview") {
    renderExpenseOverview(state.expenses);
    return;
  }

  renderExpenseList(filtered, {
    onEdit: (id) => {
      const expense = state.expenses.find((item) => item.id === id);
      if (!expense) {
        return;
      }

      openEditDialog(expense);
    },
    onDelete: async (id) => {
      if (state.isBusy) {
        return;
      }

      const expense = state.expenses.find((item) => item.id === id);
      if (!expense) {
        return;
      }

      const ok = window.confirm(`Delete ${expense.category} expense of ${Number(expense.amount).toFixed(2)}?`);
      if (!ok) {
        return;
      }

      state.isBusy = true;
      try {
        await deleteExpense(id);
        state.expenses = state.expenses.filter((item) => item.id !== id);
        renderExpenseSection();
        renderNetSection();
        toast("Expense deleted.");
      } catch (error) {
        toast(normalizeError(error));
      } finally {
        state.isBusy = false;
      }
    }
  });
}

function renderExpenseOverview(expenses) {
  const summary = buildSummary(expenses);
  const sortedBreakdown = [...summary.byCategory].sort((a, b) => b.value - a.value);
  const total = summary.total;
  const slices = buildPieSlices(sortedBreakdown, total);

  dom.expenseOverviewTotal.textContent = toCurrency(total);
  dom.expenseOverviewRange.textContent = expenses.length ? `${expenses.length} ${t("transactionsAcrossAllTime")}` : t("noExpenseRecordsYet");

  renderPieChart(dom.expensePieChart, slices);
  dom.expensePieLegend.innerHTML = slices.length
    ? slices
        .map(
          (slice) => `
            <div class="pie-legend-item">
              <span class="pie-legend-swatch" style="background:${slice.color}"></span>
              <div>
                <strong>${escapeHtml(String(slice.label))}</strong>
                <div class="expense-meta">${toCurrency(slice.value)} • ${Math.round(slice.share)}%</div>
              </div>
            </div>
          `
        )
        .join("")
    : `<div class="empty-state">${t("noExpenseDataToChart")}</div>`;

  dom.expenseOverviewBreakdown.innerHTML = sortedBreakdown.length
    ? sortedBreakdown
        .map(
          (item, index) => `
            <div class="overview-breakdown-row">
              <strong>${escapeHtml(String(item.category))}</strong>
              <span>${toCurrency(item.value)}</span>
            </div>
          `
        )
        .join("")
    : `<div class="empty-state">${t("noCategoriesYet")}</div>`;

  renderExpenseList(expenses, {
    onEdit: (id) => {
      const expense = state.expenses.find((item) => item.id === id);
      if (expense) {
        openEditDialog(expense);
      }
    },
    onDelete: async (id) => {
      if (state.isBusy) {
        return;
      }

      const expense = state.expenses.find((item) => item.id === id);
      if (!expense) {
        return;
      }

      const ok = window.confirm(`Delete ${expense.category} expense of ${Number(expense.amount).toFixed(2)}?`);
      if (!ok) {
        return;
      }

      state.isBusy = true;
      try {
        await deleteExpense(id);
        state.expenses = state.expenses.filter((item) => item.id !== id);
        render();
        toast("Expense deleted.");
      } catch (error) {
        toast(normalizeError(error));
      } finally {
        state.isBusy = false;
      }
    }
  }, "expense-overview-list");
}

function renderIncomeSection() {
  if (!state.session?.user) {
    return;
  }

  const periodFiltered = filterItemsByPeriod(
    state.incomes,
    "income_date",
    state.selectedIncomePeriod,
    state.incomeRangeFrom,
    state.incomeRangeTo
  );
  const filtered = periodFiltered.filter(
    (item) => state.selectedIncomeSource === "All" || item.source === state.selectedIncomeSource
  );
  const summary = buildSummary(filtered);
  renderIncomeSummary(summary);

  renderIncomeList(filtered, {
    onEdit: (id) => {
      const income = state.incomes.find((item) => item.id === id);
      if (!income) {
        return;
      }

      openEditIncomeDialog(income);
    },
    onDelete: async (id) => {
      if (state.isBusy) {
        return;
      }

      const income = state.incomes.find((item) => item.id === id);
      if (!income) {
        return;
      }

      const ok = window.confirm(`Delete ${income.source} income of ${Number(income.amount).toFixed(2)}?`);
      if (!ok) {
        return;
      }

      state.isBusy = true;
      try {
        await deleteIncome(id);
        state.incomes = state.incomes.filter((item) => item.id !== id);
        renderIncomeSection();
        renderNetSection();
        toast("Income deleted.");
      } catch (error) {
        toast(normalizeError(error));
      } finally {
        state.isBusy = false;
      }
    }
  });

  renderIncomeSources(state.incomeSources, getIncomeSourceBalances(), {
    onRename: async (id) => {
      if (state.isBusy) {
        return;
      }

      const source = state.incomeSources.find((item) => item.id === id);
      if (!source) {
        return;
      }

      const nextName = window.prompt("Rename income source", source.name);
      if (!nextName) {
        return;
      }

      const trimmed = nextName.trim();
      if (!trimmed || trimmed.toLowerCase() === source.name.toLowerCase()) {
        return;
      }

      const nextDetails = window.prompt("Update source details (optional)", source.details ?? "");
      if (nextDetails === null) {
        return;
      }

      const trimmedDetails = nextDetails.trim() || null;

      if (state.incomeSources.some((item) => item.id !== id && item.name.toLowerCase() === trimmed.toLowerCase())) {
        toast("Source already exists.");
        return;
      }

      state.isBusy = true;
      try {
        const renamed = await renameIncomeSource(id, trimmed, trimmedDetails);
        await replaceIncomeSourceName(source.name, renamed.name);
        state.incomeSources = state.incomeSources
          .map((item) => (item.id === id ? renamed : item))
          .sort((a, b) => a.name.localeCompare(b.name));
        state.incomes = state.incomes.map((item) => (item.source === source.name ? { ...item, source: renamed.name } : item));
        state.expenses = state.expenses.map((item) =>
          item.expense_source === source.name ? { ...item, expense_source: renamed.name } : item
        );
        syncIncomeSourceSelects();
        renderExpenseSection();
        renderIncomeSection();
        renderNetSection();
        toast("Income source renamed.");
      } catch (error) {
        toast(normalizeError(error));
      } finally {
        state.isBusy = false;
      }
    },
    onDelete: async (id) => {
      if (state.isBusy) {
        return;
      }

      const source = state.incomeSources.find((item) => item.id === id);
      if (!source) {
        return;
      }

      state.isBusy = true;
      try {
        await deleteIncomeSource(id, source.name);
        state.incomeSources = state.incomeSources.filter((item) => item.id !== id);
        if (state.selectedIncomeSource === source.name) {
          state.selectedIncomeSource = "All";
        }
        syncIncomeSourceSelects();
        renderIncomeSection();
        toast("Income source deleted.");
      } catch (error) {
        toast(normalizeError(error));
      } finally {
        state.isBusy = false;
      }
    }
  });
}

function renderNetSection() {
  if (!state.session?.user) {
    return;
  }

  const netExpense = state.expenses;
  const netIncome = state.incomes;
  const expenseSummary = buildSummary(netExpense);
  const incomeSummary = buildSummary(netIncome);
  const netSummary = buildNetSummary(expenseSummary.total, incomeSummary.total);
  const bySource = getNetBySource(netIncome, netExpense);
  renderNetSummary({ ...netSummary, bySource });
}

async function refreshAllData() {
  try {
    const [expenseRows, incomeRows, sourceRows] = await Promise.all([fetchExpenses(), fetchIncomes(), fetchIncomeSources()]);
    state.expenses = sortByDateDesc(expenseRows, "expense_date");
    state.incomes = sortByDateDesc(incomeRows, "income_date");
    state.incomeSources = sourceRows;
    render();
  } catch (error) {
    toast(normalizeError(error));
  }
}

function syncIncomeSourceSelects() {
  const sourceNames = state.incomeSources.map((item) => item.name);
  populateExpenseSourceSelect();
  populateTextSelect(dom.incomeSource, sourceNames, false);
  populateTextSelect(dom.editExpenseSource, sourceNames, false);
  populateTextSelect(dom.editIncomeSource, sourceNames, false);
  populateTextSelect(dom.incomeSourceFilter, sourceNames, true);

  if (!sourceNames.includes(dom.expenseSource.value)) {
    dom.expenseSource.value = sourceNames[0];
  }

  if (!sourceNames.includes(dom.incomeSource.value)) {
    dom.incomeSource.value = sourceNames[0];
  }

  if (!sourceNames.includes(dom.editExpenseSource.value)) {
    dom.editExpenseSource.value = sourceNames[0];
  }

  if (!sourceNames.includes(dom.editIncomeSource.value)) {
    dom.editIncomeSource.value = sourceNames[0];
  }

  if (state.selectedIncomeSource !== "All" && !sourceNames.includes(state.selectedIncomeSource)) {
    state.selectedIncomeSource = "All";
  }

  dom.incomeSourceFilter.value = state.selectedIncomeSource;
}

function populateExpenseSourceSelect() {
  const sourceNames = state.incomeSources.map((item) => item.name);
  const balances = getIncomeSourceBalances();
  const amount = Number(dom.expenseAmount.value || 0);
  const previousValue = dom.expenseSource.value;

  dom.expenseSource.innerHTML = sourceNames
    .map((name) => {
      const balance = Number(balances[name] ?? 0);
      const disabled = amount > 0 && balance < amount;
      return `<option value="${name}" ${disabled ? "disabled" : ""}>${name} (${toCurrency(balance)})</option>`;
    })
    .join("");

  const hasPreviousEnabled = previousValue && [...dom.expenseSource.options].some((opt) => opt.value === previousValue && !opt.disabled);
  if (hasPreviousEnabled) {
    dom.expenseSource.value = previousValue;
    return;
  }

  const firstEnabled = [...dom.expenseSource.options].find((opt) => !opt.disabled);
  dom.expenseSource.value = firstEnabled?.value ?? "";
}

function getIncomeSourceBalances() {
  const balances = {};

  state.incomeSources.forEach((item) => {
    balances[item.name] = 0;
  });

  state.incomes.forEach((income) => {
    balances[income.source] = (balances[income.source] ?? 0) + Number(income.amount);
  });

  state.expenses.forEach((expense) => {
    if (!expense.expense_source) {
      return;
    }

    balances[expense.expense_source] = (balances[expense.expense_source] ?? 0) - Number(expense.amount);
  });

  return balances;
}

function getNetBySource(filteredIncomes, filteredExpenses) {
  const netBySource = {};

  state.incomeSources.forEach((source) => {
    netBySource[source.name] = 0;
  });

  filteredIncomes.forEach((income) => {
    netBySource[income.source] = (netBySource[income.source] ?? 0) + Number(income.amount);
  });

  filteredExpenses.forEach((expense) => {
    if (!expense.expense_source) {
      return;
    }

    netBySource[expense.expense_source] = (netBySource[expense.expense_source] ?? 0) - Number(expense.amount);
  });

  return Object.entries(netBySource)
    .map(([source, net]) => ({ source, net }))
    .sort((a, b) => b.net - a.net);
}

function syncPeriodControls() {
  dom.expenseRangeControls.classList.toggle("hidden", state.selectedExpensePeriod !== "CUSTOM_RANGE");
  dom.incomeRangeControls.classList.toggle("hidden", state.selectedIncomePeriod !== "CUSTOM_RANGE");
}

function buildPieSlices(items, total) {
  const colors = ["#136f63", "#e67f34", "#6a8ce6", "#d15c8f", "#6bbf59", "#8a63d2", "#d6a336", "#4ea8de"];

  return items
    .filter((item) => item.value > 0)
    .map((item, index) => ({
      label: item.category,
      value: item.value,
      share: total > 0 ? (item.value / total) * 100 : 0,
      color: colors[index % colors.length]
    }));
}

function renderPieChart(target, slices) {
  if (!slices.length) {
    target.innerHTML = `<div class="pie-empty">No data</div>`;
    return;
  }

  const radius = 44;
  const center = 50;
  let angle = -90;

  target.innerHTML = `
    <svg viewBox="0 0 100 100" role="img" aria-label="Expense distribution pie chart">
      ${slices
        .map((slice) => {
          const sweep = (slice.share / 100) * 360;
          const start = polarToCartesian(center, center, radius, angle + sweep);
          const end = polarToCartesian(center, center, radius, angle);
          const largeArc = sweep > 180 ? 1 : 0;
          const path = `M ${center} ${center} L ${end.x} ${end.y} A ${radius} ${radius} 0 ${largeArc} 1 ${start.x} ${start.y} Z`;
          angle += sweep;
          return `<path d="${path}" fill="${slice.color}"></path>`;
        })
        .join("")}
      <circle cx="50" cy="50" r="22" fill="var(--surface-strong)" opacity="0.92"></circle>
    </svg>
  `;
}

function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians)
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function filterItemsByPeriod(items, dateField, period, fromDate, toDate) {
  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth();

  return items.filter((item) => {
    const itemDate = new Date(item[dateField]);

    if (period === "ALL") {
      return true;
    }

    if (period === "CUSTOM_RANGE") {
      const itemTime = itemDate.getTime();
      const fromTime = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
      const toTime = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY;
      return itemTime >= fromTime && itemTime <= toTime;
    }

    if (period === "THIS_YEAR") {
      return itemDate.getFullYear() === nowYear;
    }

    return itemDate.getFullYear() === nowYear && itemDate.getMonth() === nowMonth;
  });
}

function validateAmount(value) {
  return Number.isFinite(value) && value > 0;
}

function normalizeError(error) {
  if (error?.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function showFatalError(error) {
  dom.authView.innerHTML = `
    <h2>Setup needed</h2>
    <p style="margin-top: 0.55rem; line-height: 1.5;">${normalizeError(error)}</p>
    <p style="margin-top: 0.5rem; color: var(--muted);">Then reload this page.</p>
  `;
}

window.addEventListener("beforeunload", () => {
  state.authSubscription?.unsubscribe?.();
});

init();
