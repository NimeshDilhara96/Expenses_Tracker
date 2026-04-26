import { CURRENCY } from "./constants.js";

const monthFormatter = new Intl.DateTimeFormat("en-LK", {
  month: "long",
  year: "numeric"
});

const dateFormatter = new Intl.DateTimeFormat("en-LK", {
  day: "2-digit",
  month: "short",
  year: "numeric"
});

const currencyFormatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 2
});

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function monthKeyFromDate(dateLike) {
  const iso = new Date(dateLike).toISOString().slice(0, 10);
  return iso.slice(0, 7);
}

export function monthLabelFromKey(monthKey) {
  const date = new Date(`${monthKey}-01T00:00:00`);
  return monthFormatter.format(date);
}

export function toDisplayDate(dateLike) {
  return dateFormatter.format(new Date(dateLike));
}

export function toCurrency(value) {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  return currencyFormatter.format(safeValue);
}

export function sortByDateDesc(items, dateField = "expense_date") {
  return [...items].sort((a, b) => {
    const dateDiff = new Date(b[dateField]).getTime() - new Date(a[dateField]).getTime();
    if (dateDiff !== 0) {
      return dateDiff;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
