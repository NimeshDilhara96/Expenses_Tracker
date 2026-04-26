import { CATEGORY_OPTIONS } from "./constants.js";
import { t } from "./i18n.js";
import { monthLabelFromKey, toCurrency, toDisplayDate } from "./utils.js";

export function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
  const btn = document.getElementById("theme-toggle");
  if (btn) {
    btn.textContent = theme === "dark" ? "Light" : "Dark";
  }
}

export function renderAuthView({ isBusy }) {
  const root = document.getElementById("auth-view");
  const target = `${window.location.pathname.split("/").pop() || "expense"}${window.location.hash || ""}`;
  const next = encodeURIComponent(`./${target}`);

  root.innerHTML = `
    <h2>${t("signInToContinue")}</h2>
    <p class="eyebrow" style="margin: 0.35rem 0 0.9rem;">${t("useDedicatedAuthPage")}</p>
    <div class="dialog-actions" style="justify-content: flex-start; gap: 0.65rem;">
      <a class="btn primary ${isBusy ? "disabled" : ""}" href="./auth.html?mode=signin&next=${next}" ${isBusy ? 'aria-disabled="true" tabindex="-1"' : ""}>${t("signIn")}</a>
      <a class="btn ghost ${isBusy ? "disabled" : ""}" href="./auth.html?mode=signup&next=${next}" ${isBusy ? 'aria-disabled="true" tabindex="-1"' : ""}>${t("createAccount")}</a>
    </div>
    <p class="eyebrow" style="margin-top: 0.8rem;">${t("afterLoginReturn")}</p>
  `;
}

export function populateCategorySelect(select, includeAll = false) {
  const options = includeAll ? ["All", ...CATEGORY_OPTIONS] : CATEGORY_OPTIONS;
  select.innerHTML = options.map((category) => `<option value="${category}">${category}</option>`).join("");
}

export function populateMonthSelect(select, monthKeys, selectedMonth) {
  select.innerHTML = monthKeys
    .map((key) => `<option value="${key}" ${key === selectedMonth ? "selected" : ""}>${monthLabelFromKey(key)}</option>`)
    .join("");
}

export function renderSummary(summary) {
  const totalNode = document.getElementById("month-total");
  totalNode.textContent = toCurrency(summary.total);

  const breakdownNode = document.getElementById("category-breakdown");
  if (summary.byCategory.length === 0) {
    breakdownNode.innerHTML = `<span class="chip">${t("noExpenseRecordsYet")}</span>`;
    return;
  }

  breakdownNode.innerHTML = summary.byCategory
    .map((item) => `<span class="chip">${escapeHtml(String(item.category))}: ${toCurrency(item.value)}</span>`)
    .join("");
}

export function renderIncomeSummary(summary) {
  const totalNode = document.getElementById("income-total");
  totalNode.textContent = toCurrency(summary.total);

  const breakdownNode = document.getElementById("income-breakdown");
  if (summary.byCategory.length === 0) {
    breakdownNode.innerHTML = `<span class="chip">${t("noData")}</span>`;
    return;
  }

  breakdownNode.innerHTML = summary.byCategory
    .map((item) => `<span class="chip">${escapeHtml(String(item.category))}: ${toCurrency(item.value)}</span>`)
    .join("");
}

export function renderNetSummary({ net, bySource }) {
  const netTotal = document.getElementById("net-total");
  const netBySource = document.getElementById("net-by-source");

  netTotal.textContent = toCurrency(net);
  netTotal.classList.toggle("net-positive", net > 0);
  netTotal.classList.toggle("net-negative", net < 0);

  if (!bySource || bySource.length === 0) {
    netBySource.innerHTML = `<div class="net-source-empty">${t("noData")}</div>`;
    return;
  }

  netBySource.innerHTML = bySource
    .map((item) => {
      const netClass = item.net < 0 ? "net-source-card negative" : item.net > 0 ? "net-source-card positive" : "net-source-card";
      return `
        <article class="${netClass}">
          <p class="net-source-name">${escapeHtml(item.source)}</p>
          <p class="net-source-value">${toCurrency(item.net)}</p>
        </article>
      `;
    })
    .join("");
}

export function renderExpenseList(expenses, { onEdit, onDelete }, listId = "expense-list") {
  renderTransactionList({
    listId,
    rows: expenses,
    dateField: "expense_date",
    titleField: "category",
    sourceField: "expense_source",
    sourceLabel: "From",
    emptyText: t("noExpenseRecordsYet"),
    onEdit,
    onDelete
  });
}

export function renderIncomeList(incomes, { onEdit, onDelete }) {
  renderTransactionList({
    listId: "income-list",
    rows: incomes,
    dateField: "income_date",
    titleField: "source",
    sourceField: "source",
    sourceLabel: "Source",
    emptyText: t("noData"),
    onEdit,
    onDelete
  });
}

export function openEditDialog(expense) {
  const dialog = document.getElementById("edit-dialog");
  document.getElementById("edit-id").value = expense.id;
  document.getElementById("edit-amount").value = expense.amount;
  document.getElementById("edit-category").value = expense.category;
  const sourceSelect = document.getElementById("edit-expense-source");
  const sourceExists = [...sourceSelect.options].some((item) => item.value === expense.expense_source);
  sourceSelect.value = sourceExists ? expense.expense_source : sourceSelect.options[0]?.value ?? "";
  document.getElementById("edit-date").value = expense.expense_date;
  document.getElementById("edit-note").value = expense.note ?? "";
  dialog.showModal();
}

export function closeEditDialog() {
  const dialog = document.getElementById("edit-dialog");
  if (dialog.open) {
    dialog.close();
  }
}

export function openEditIncomeDialog(income) {
  const dialog = document.getElementById("edit-income-dialog");
  document.getElementById("edit-income-id").value = income.id;
  document.getElementById("edit-income-amount").value = income.amount;
  document.getElementById("edit-income-source").value = income.source;
  document.getElementById("edit-income-date").value = income.income_date;
  document.getElementById("edit-income-note").value = income.note ?? "";
  dialog.showModal();
}

export function closeEditIncomeDialog() {
  const dialog = document.getElementById("edit-income-dialog");
  if (dialog.open) {
    dialog.close();
  }
}

export function populateTextSelect(select, values, includeAll = false) {
  const options = includeAll ? ["All", ...values] : values;
  select.innerHTML = options
    .map((value) => `<option value="${escapeHtml(String(value))}">${escapeHtml(String(value))}</option>`)
    .join("");
}

export function renderIncomeSources(sources, sourceBalances, { onRename, onDelete }) {
  const root = document.getElementById("source-list");
  if (sources.length === 0) {
    root.innerHTML = `<div class="empty-state">${t("noData")}</div>`;
    return;
  }

  root.innerHTML = sources
    .map((source) => {
      const balance = Number(sourceBalances[source.name] ?? 0);
      const balanceClass = balance < 0 ? "source-balance-negative" : "";

      return `
      <div class="source-row" data-id="${source.id}">
        <div>
          <strong>${escapeHtml(source.name)}</strong>
          ${source.details ? `<div class="source-details">${escapeHtml(source.details)}</div>` : ""}
          <div class="expense-meta ${balanceClass}">Balance: ${toCurrency(balance)}</div>
        </div>
        <div class="source-actions">
          <button class="action-btn" type="button" data-action="rename">Rename</button>
          <button class="action-btn delete" type="button" data-action="delete">Delete</button>
        </div>
      </div>
    `;
    })
    .join("");

  root.querySelectorAll(".source-row").forEach((row) => {
    const id = row.dataset.id;
    row.querySelector("[data-action='rename']").addEventListener("click", () => onRename(id));
    row.querySelector("[data-action='delete']").addEventListener("click", () => onDelete(id));
  });
}

export function setActiveView(activeView) {
  const expenseTab = document.getElementById("expense-tab");
  const incomeTab = document.getElementById("income-tab");
  const expenseSection = document.getElementById("expense-section");
  const incomeSection = document.getElementById("income-section");

  const showExpense = activeView === "expense";
  expenseSection.classList.toggle("hidden", !showExpense);
  incomeSection.classList.toggle("hidden", showExpense);
  expenseTab.classList.toggle("active", showExpense);
  incomeTab.classList.toggle("active", !showExpense);
  expenseTab.setAttribute("aria-selected", String(showExpense));
  incomeTab.setAttribute("aria-selected", String(!showExpense));
}

export function toast(message) {
  const toastEl = document.getElementById("toast");
  toastEl.textContent = message;
  toastEl.classList.add("show");
  window.clearTimeout(toastEl._timeout);
  toastEl._timeout = window.setTimeout(() => {
    toastEl.classList.remove("show");
  }, 2200);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderTransactionList({ listId, rows, dateField, titleField, sourceField, sourceLabel, emptyText, onEdit, onDelete }) {
  const list = document.getElementById(listId);

  if (rows.length === 0) {
    list.innerHTML = `<div class="empty-state">${emptyText}</div>`;
    return;
  }

  list.innerHTML = rows
    .map(
      (item) => `
      <article class="expense-item" data-id="${item.id}">
        <div class="expense-title">
          <strong>${escapeHtml(String(item[titleField]))}</strong>
          <span class="expense-meta">${toDisplayDate(item[dateField])}${item[sourceField] ? ` • ${sourceLabel}: ${escapeHtml(String(item[sourceField]))}` : ""}${item.note ? ` • ${escapeHtml(item.note)}` : ""}</span>
        </div>
        <div style="display:grid; gap:0.4rem; justify-items:end;">
          <span class="expense-amount">${toCurrency(item.amount)}</span>
          <div class="item-actions">
            <button class="action-btn" type="button" data-action="edit">Edit</button>
            <button class="action-btn delete" type="button" data-action="delete">Delete</button>
          </div>
        </div>
      </article>
    `
    )
    .join("");

  list.querySelectorAll(".expense-item").forEach((row) => {
    const id = row.dataset.id;
    row.querySelector("[data-action='edit']").addEventListener("click", () => onEdit(id));
    row.querySelector("[data-action='delete']").addEventListener("click", () => onDelete(id));
  });
}
