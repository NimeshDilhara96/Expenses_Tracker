import { monthKeyFromDate } from "./utils.js";

export function getMonthKeys(items, dateField = "expense_date") {
  const keys = new Set(items.map((item) => monthKeyFromDate(item[dateField])));
  const ordered = Array.from(keys).sort((a, b) => (a < b ? 1 : -1));

  if (ordered.length === 0) {
    ordered.push(monthKeyFromDate(new Date()));
  }

  return ordered;
}

export function filterExpenses(expenses, selectedMonth, selectedCategory) {
  return filterItems(expenses, selectedMonth, selectedCategory, "expense_date", "category");
}

export function filterIncomes(incomes, selectedMonth, selectedSource) {
  return filterItems(incomes, selectedMonth, selectedSource, "income_date", "source");
}

export function filterItems(items, selectedMonth, selectedFilter, dateField, valueField) {
  return items.filter((item) => {
    const monthMatch = monthKeyFromDate(item[dateField]) === selectedMonth;
    const categoryMatch = selectedFilter === "All" || item[valueField] === selectedFilter;
    return monthMatch && categoryMatch;
  });
}

export function buildSummary(filteredExpenses) {
  const total = filteredExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const byCategoryMap = filteredExpenses.reduce((map, item) => {
    const key = item.category ?? item.source ?? "Other";
    const current = map.get(key) ?? 0;
    map.set(key, current + Number(item.amount));
    return map;
  }, new Map());

  const byCategory = Array.from(byCategoryMap.entries())
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value);

  return { total, byCategory };
}

export function buildNetSummary(expenseTotal, incomeTotal) {
  const net = Number(incomeTotal) - Number(expenseTotal);
  return {
    expenseTotal: Number(expenseTotal),
    incomeTotal: Number(incomeTotal),
    net
  };
}
