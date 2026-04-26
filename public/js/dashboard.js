import { fetchExpenses, fetchIncomeSources, fetchIncomes, fetchNotes, getSession } from "./db.js";
import { t } from "./i18n.js";
import { buildSummary } from "./summary.js";
import { monthKeyFromDate, toCurrency } from "./utils.js";

const dom = {
  greetingAvatar: document.getElementById("greeting-avatar"),
  dashboardGreeting: document.getElementById("dashboard-greeting"),
  heroNetBalance: document.getElementById("hero-net-balance"),
  heroIncomeChip: document.getElementById("hero-income-chip"),
  heroExpenseChip: document.getElementById("hero-expense-chip"),
  incomeSourceScroller: document.getElementById("income-source-scroller"),
  incomeSourcePrev: document.getElementById("income-source-prev"),
  incomeSourceNext: document.getElementById("income-source-next"),
  incomeSourceHint: document.getElementById("income-source-hint"),
  savingsRateValue: document.getElementById("savings-rate-value"),
  savingsRateMeta: document.getElementById("savings-rate-meta"),
  topCategoryName: document.getElementById("top-category-name"),
  topCategoryValue: document.getElementById("top-category-value"),
  memoryCollectValue: document.getElementById("memory-collect-value"),
  focusList: document.getElementById("focus-list")
};

async function initDashboard() {
  document.documentElement.lang = localStorage.getItem("language") === "si" ? "si" : "en";
  document.title = t("expenseTracker");
  applyStaticLabels();
  try {
    const session = await getSession();
    syncGreeting(session);
    if (!session?.user) {
      renderSignedOutState();
      return;
    }

    const [expenses, incomes, incomeSources, notes] = await Promise.all([
      fetchExpenses(),
      fetchIncomes(),
      fetchIncomeSources(),
      fetchNotes().catch(() => [])
    ]);
    renderDashboard(expenses, incomes, incomeSources, notes);
  } catch {
    syncGreeting(null);
    renderErrorState();
  }
}

function syncGreeting(session) {
  if (!dom.dashboardGreeting) {
    return;
  }

  const now = new Date();
  const hour = now.getHours();
  const greetingPrefix = hour < 12 ? t("goodMorning") : hour < 18 ? t("goodAfternoon") : t("goodEvening");
  const name = getDisplayName(session);
  dom.dashboardGreeting.textContent = name ? `${greetingPrefix}, ${name}` : greetingPrefix;

  if (dom.greetingAvatar) {
    dom.greetingAvatar.textContent = name ? name.charAt(0).toUpperCase() : "N";
  }
}

function getDisplayName(session) {
  const user = session?.user;
  if (!user) {
    return "";
  }

  const metadataName = user.user_metadata?.full_name || user.user_metadata?.name;
  if (metadataName) {
    return String(metadataName).trim().split(" ")[0];
  }

  if (typeof user.email === "string" && user.email.includes("@")) {
    const localPart = user.email.split("@")[0].replace(/[._-]+/g, " ").trim();
    if (!localPart) {
      return "";
    }

    const firstWord = localPart.split(/\s+/)[0];
    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
  }

  return "";
}

function renderDashboard(expenses, incomes, incomeSources, notes) {
  const nowMonth = monthKeyFromDate(new Date());
  const previousMonthDate = new Date();
  previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
  const previousMonth = monthKeyFromDate(previousMonthDate);

  const monthExpenses = expenses.filter((item) => monthKeyFromDate(item.expense_date) === nowMonth);
  const monthIncomes = incomes.filter((item) => monthKeyFromDate(item.income_date) === nowMonth);

  const previousMonthExpenses = expenses.filter((item) => monthKeyFromDate(item.expense_date) === previousMonth);
  const previousMonthIncomes = incomes.filter((item) => monthKeyFromDate(item.income_date) === previousMonth);

  const expenseTotal = totalAmount(monthExpenses);
  const incomeTotal = totalAmount(monthIncomes);
  const previousExpenseTotal = totalAmount(previousMonthExpenses);
  const previousIncomeTotal = totalAmount(previousMonthIncomes);
  const sourceBalances = buildSourceBalances(incomeSources, incomes, expenses);

  const net = incomeTotal - expenseTotal;
  if (dom.heroNetBalance) {
    dom.heroNetBalance.textContent = toCurrency(net);
  }
  if (dom.heroIncomeChip) {
    dom.heroIncomeChip.textContent = `Income ${toCurrency(incomeTotal)}`;
  }
  if (dom.heroExpenseChip) {
    dom.heroExpenseChip.textContent = `Expenses ${toCurrency(expenseTotal)}`;
  }

  const savingsRate = incomeTotal > 0 ? Math.max(0, (net / incomeTotal) * 100) : 0;
  dom.savingsRateValue.textContent = `${Math.round(savingsRate)}%`;

  const previousNet = previousIncomeTotal - previousExpenseTotal;
  const netDelta = net - previousNet;
  const deltaPrefix = netDelta > 0 ? "+" : "";
  dom.savingsRateMeta.textContent = `${deltaPrefix}${toCurrency(netDelta)} ${t("vsLastMonth")}`;
  dom.savingsRateMeta.classList.toggle("positive", netDelta >= 0);

  const categorySummary = buildSummary(monthExpenses);
  const topCategory = categorySummary.byCategory[0];
  dom.topCategoryName.textContent = topCategory ? topCategory.category : t("noExpensesLogged");
  dom.topCategoryValue.textContent = topCategory ? toCurrency(topCategory.value) : toCurrency(0);

  renderIncomeSourceScroller(sourceBalances);
  renderMemoryCollectValue(notes);

  const focusItems = buildFocusItems({
    expenseTotal,
    incomeTotal,
    topCategory,
    savingsRate,
    netDelta
  });
  dom.focusList.innerHTML = focusItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function totalAmount(items) {
  return items.reduce((sum, item) => sum + Number(item.amount), 0);
}

function buildFocusItems({ expenseTotal, incomeTotal, topCategory, savingsRate, netDelta }) {
  const items = [];

  if (incomeTotal <= 0) {
    items.push(t("addIncomeRecord"));
  } else if (savingsRate < 30) {
    items.push(t("savingsBelow"));
  } else {
    items.push(t("savingsHealthy"));
  }

  if (topCategory) {
    items.push(`Top spending category is ${topCategory.category} (${toCurrency(topCategory.value)}).`);
  } else {
    items.push(t("noExpensesLogged"));
  }

  if (netDelta < 0) {
    items.push(t("monthlyNetDropped"));
  } else {
    items.push(t("monthlyNetImproved"));
  }

  if (expenseTotal > incomeTotal && incomeTotal > 0) {
    items.push(t("expensesAboveIncome"));
  }

  return items.slice(0, 3);
}

function renderSignedOutState() {
  if (dom.heroNetBalance) {
    dom.heroNetBalance.textContent = t("signInToViewDashboard");
  }
  if (dom.heroIncomeChip) {
    dom.heroIncomeChip.textContent = t("incomeDataUnavailable");
  }
  if (dom.heroExpenseChip) {
    dom.heroExpenseChip.textContent = t("expenseDataUnavailable");
  }
  dom.incomeSourceScroller.innerHTML = `<div class="income-source-empty">${t("signInToViewSources")}</div>`;
  if (dom.incomeSourceHint) {
    dom.incomeSourceHint.textContent = t("accounts");
  }
  dom.savingsRateValue.textContent = "-";
  dom.savingsRateMeta.textContent = t("signInToViewDashboard");
  dom.savingsRateMeta.classList.remove("positive");
  dom.topCategoryName.textContent = t("noSession");
  dom.topCategoryValue.textContent = t("pleaseSignIn");
  if (dom.memoryCollectValue) {
    dom.memoryCollectValue.textContent = t("signInToViewSources");
  }
  dom.focusList.innerHTML = `<li>${t("signInToViewDashboard")}</li>`;
}

function renderErrorState() {
  if (dom.heroNetBalance) {
    dom.heroNetBalance.textContent = t("noData");
  }
  if (dom.heroIncomeChip) {
    dom.heroIncomeChip.textContent = t("incomeDataUnavailable");
  }
  if (dom.heroExpenseChip) {
    dom.heroExpenseChip.textContent = t("expenseDataUnavailable");
  }
  dom.incomeSourceScroller.innerHTML = `<div class="income-source-empty">${t("incomeDataUnavailable")}</div>`;
  if (dom.incomeSourceHint) {
    dom.incomeSourceHint.textContent = t("accounts");
  }
  dom.savingsRateValue.textContent = "-";
  dom.savingsRateMeta.textContent = t("incomeDataUnavailable");
  dom.savingsRateMeta.classList.remove("positive");
  dom.topCategoryName.textContent = t("noData");
  dom.topCategoryValue.textContent = t("pleaseSignIn");
  if (dom.memoryCollectValue) {
    dom.memoryCollectValue.textContent = t("noData");
  }
  dom.focusList.innerHTML = `<li>${t("incomeDataUnavailable")}</li>`;
}

function renderMemoryCollectValue(notes) {
  if (!dom.memoryCollectValue) {
    return;
  }

  const outstanding = (notes || []).reduce((sum, note) => {
    const amount = Number(note.amount) || 0;
    return sum + (note.entry_type === "returned" ? -amount : amount);
  }, 0);

  if (outstanding > 0) {
    dom.memoryCollectValue.textContent = `${t("toCollect")} ${toCurrency(outstanding)}`;
    return;
  }

  dom.memoryCollectValue.textContent = t("noAmountToCollect");
}

function centerIncomeCard(scroller, card) {
  if (!scroller || !card) {
    return;
  }

  const targetLeft = Math.max(0, card.offsetLeft - (scroller.clientWidth - card.clientWidth) / 2);

  if (window.jQuery) {
    window.jQuery(scroller).stop(true).animate({ scrollLeft: targetLeft }, 260);
    return;
  }

  scroller.scrollTo({ left: targetLeft, behavior: "smooth" });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function applyStaticLabels() {
  const selectors = [
    [".income-strip-label", t("accounts")],
    [".dashboard-actions-card .summary-heading h2", t("quickActions")],
    [".dashboard-insights-card .summary-heading h2", t("todayFocus")],
    [".action-tile[href='./addexpense.html'] .action-text-wrap strong", t("addExpense")],
    [".action-tile[href='./addexpense.html'] .action-text-wrap span", t("quicklyRecordExpense")],
    [".action-tile[href='./addincome.html'] .action-text-wrap strong", t("addIncomeSource")],
    [".action-tile[href='./addincome.html'] .action-text-wrap span", t("quicklyManageIncomeSources")],
    [".action-tile[href='./expense.html'] .action-text-wrap strong", t("expensePage")],
    [".action-tile[href='./expense.html'] .action-text-wrap span", t("analyzeSpending")],
    [".action-tile[href='./income.html'] .action-text-wrap strong", t("incomePage")],
    [".action-tile[href='./income.html'] .action-text-wrap span", t("analyzeIncome")],
    [".action-tile[href='./notes.html'] .action-text-wrap strong", t("memoryPage")],
    [".action-tile[href='./notes.html'] .action-text-wrap span", t("trackPersonWise")],
    [".bottom-nav-item[href='./index.html'] .bottom-nav-label", t("accounts")],
    [".bottom-nav-item[href='./expense.html'] .bottom-nav-label", t("expenses")],
    [".bottom-nav-item[href='./income.html'] .bottom-nav-label", t("income")],
    [".bottom-nav-item[href='./notes.html'] .bottom-nav-label", t("memoryPage")]
  ];

  selectors.forEach(([selector, value]) => {
    document.querySelectorAll(selector).forEach((node) => {
      node.textContent = value;
    });
  });

  document.querySelectorAll("[aria-label='Dashboard navigation']").forEach((node) => {
    node.setAttribute("aria-label", t("dashboardNavigation"));
  });
}

function buildSourceBalances(incomeSources, incomes, expenses) {
  const balances = new Map();

  incomeSources.forEach((source) => {
    balances.set(source.name, {
      name: source.name,
      details: source.details || "",
      balance: 0
    });
  });

  incomes.forEach((income) => {
    const current = balances.get(income.source) || {
      name: income.source,
      details: "",
      balance: 0
    };
    current.balance += Number(income.amount);
    balances.set(income.source, current);
  });

  expenses.forEach((expense) => {
    if (!expense.expense_source) {
      return;
    }

    const current = balances.get(expense.expense_source) || {
      name: expense.expense_source,
      details: "",
      balance: 0
    };
    current.balance -= Number(expense.amount);
    balances.set(expense.expense_source, current);
  });

  return [...balances.values()].sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name));
}

function renderIncomeSourceScroller(sourceBalances) {
  if (!dom.incomeSourceScroller) {
    return;
  }

  const accounts = buildAccountCards(sourceBalances);
  const totalBalance = accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
  if (dom.incomeSourceHint) {
    dom.incomeSourceHint.textContent = `All income sources • Total ${toCurrency(totalBalance)}`;
  }

  if (!accounts.length) {
    dom.incomeSourceScroller.innerHTML = '<div class="income-source-empty">No income sources yet. Add one from Income page.</div>';
    return;
  }

  dom.incomeSourceScroller.innerHTML = accounts
    .map((account) => {
      const balanceClass = account.balance > 0 ? "positive" : account.balance < 0 ? "negative" : "zero";
      const statusLabel = account.balance > 0 ? "Available" : account.balance < 0 ? "Overdrawn" : "No balance";
      const detailText = account.details || account.backingName || "Add an income source";
      return `
        <article class="income-source-card ${account.kind} ${balanceClass}">
          <div class="income-source-card-top">
            <div>
              <div class="income-source-status">${account.kindLabel}</div>
              <div class="income-source-name">${escapeHtml(account.title)}</div>
            </div>
            <span class="income-source-badge">${statusLabel}</span>
          </div>
          <div class="income-source-details">${escapeHtml(detailText)}</div>
          <div class="income-source-footer">
            <div>
              <div class="income-source-footer-label">Linked source</div>
              <div class="income-source-footer-value">${escapeHtml(account.backingName || "None")}</div>
            </div>
            <div class="income-source-balance">${toCurrency(account.balance)}</div>
          </div>
        </article>
      `;
    })
    .join("");

  dom.incomeSourceScroller.querySelectorAll(".income-source-card").forEach((card, index, cards) => {
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");

    const advanceToNext = () => {
      // If clicking the active card, navigate to accounts
      if (card.classList.contains("is-active")) {
        goToAccountDetails();
        return;
      }
      
      // Otherwise, make this card active
      cards.forEach((item) => item.classList.remove("is-active"));
      card.classList.add("is-active");
      centerIncomeCard(dom.incomeSourceScroller, card);
    };

    card.addEventListener("click", advanceToNext);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        advanceToNext();
      }
    });
  });

  const firstCard = dom.incomeSourceScroller.querySelector(".income-source-card");
  firstCard?.classList.add("is-active");

  bindIncomeScrollerControls();
}

function buildAccountCards(sourceBalances) {
  return sourceBalances.map((source, index) => ({
    kind: index % 2 === 0 ? "general" : "savings",
    kindLabel: "Income Source",
    title: source.name,
    backingName: source.name,
    details: source.details || "No details",
    balance: source.balance
  }));
}

function bindIncomeScrollerControls() {
  const scroller = dom.incomeSourceScroller;
  if (!scroller) {
    return;
  }

  const slideByCard = (direction) => {
    const cards = [...scroller.querySelectorAll(".income-source-card")];
    if (!cards.length) {
      return;
    }

    const activeIndex = Math.max(0, cards.findIndex((card) => card.classList.contains("is-active")));
    const nextIndex = (activeIndex + direction + cards.length) % cards.length;
    cards.forEach((card) => card.classList.remove("is-active"));
    cards[nextIndex].classList.add("is-active");
    centerIncomeCard(scroller, cards[nextIndex]);
  };

  if (dom.incomeSourcePrev) {
    dom.incomeSourcePrev.onclick = (event) => {
      event.stopPropagation();
      slideByCard(-1);
    };
  }

  if (dom.incomeSourceNext) {
    dom.incomeSourceNext.onclick = (event) => {
      event.stopPropagation();
      slideByCard(1);
    };
  }
}

initDashboard();
