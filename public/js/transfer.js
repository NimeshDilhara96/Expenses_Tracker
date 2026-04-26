import { fetchIncomeSources, fetchTransfers, addTransfer, deleteTransfer, getSession } from "./db.js";
import { toast } from "./ui.js";
import { t } from "./i18n.js";
import { todayISO, toDisplayDate, toCurrency } from "./utils.js";

const dom = {
  form: document.getElementById("transfer-form"),
  fromSelect: document.getElementById("transfer-from"),
  toSelect: document.getElementById("transfer-to"),
  amount: document.getElementById("transfer-amount"),
  date: document.getElementById("transfer-date"),
  note: document.getElementById("transfer-note"),
  submit: document.getElementById("transfer-submit"),
  status: document.getElementById("transfer-status"),
  list: document.getElementById("transfer-list")
};

init();

async function init() {
  dom.date.value = todayISO();
  
  try {
    const session = await getSession();
    if (!session?.user) {
      renderSignedOutState();
      return;
    }

    const [sources, transfers] = await Promise.all([
      fetchIncomeSources(),
      fetchTransfers()
    ]);

    populateAccountSelects(sources);
    renderTransferList(transfers, sources);
    
    dom.form.addEventListener("submit", (e) => onSubmit(e, sources));
  } catch (error) {
    setStatus(`Error: ${error.message}`);
  }
}

function populateAccountSelects(sources) {
  const accountNames = sources.map(s => s.name);
  
  dom.fromSelect.innerHTML = `<option value="">Select account to transfer from</option>${accountNames.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")}`;
  dom.toSelect.innerHTML = `<option value="">Select account to transfer to</option>${accountNames.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")}`;

  dom.fromSelect.addEventListener("change", () => {
    const selected = dom.fromSelect.value;
    dom.toSelect.innerHTML = `<option value="">Select account to transfer to</option>${accountNames.filter(name => name !== selected).map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")}`;
  });
}

async function onSubmit(event, sources) {
  event.preventDefault();
  
  if (dom.submit.disabled) return;

  const fromAccount = String(dom.fromSelect.value || "").trim();
  const toAccount = String(dom.toSelect.value || "").trim();
  const amount = Number(dom.amount.value || 0);
  const date = String(dom.date.value || "").trim();
  const note = String(dom.note.value || "").trim();

  if (!fromAccount || !toAccount || amount <= 0 || !date) {
    setStatus("Please fill in all required fields");
    return;
  }

  if (fromAccount === toAccount) {
    setStatus("Transfer account must be different");
    return;
  }

  dom.submit.disabled = true;

  try {
    await addTransfer({
      from_account: fromAccount,
      to_account: toAccount,
      amount,
      note: note || null,
      transfer_date: date
    });

    toast("Transfer completed successfully");
    dom.form.reset();
    dom.date.value = todayISO();
    dom.fromSelect.value = "";
    dom.toSelect.innerHTML = `<option value="">Select account to transfer to</option>`;
    setStatus("");

    const transfers = await fetchTransfers();
    renderTransferList(transfers, sources);
  } catch (error) {
    setStatus(`Error: ${error.message}`);
  } finally {
    dom.submit.disabled = false;
  }
}

function renderTransferList(transfers, sources) {
  if (!transfers || transfers.length === 0) {
    dom.list.innerHTML = `<li class="text-slate-500">No transfers yet</li>`;
    return;
  }

  dom.list.innerHTML = transfers.map(transfer => `
    <li class="card p-4 flex justify-between items-start">
      <div>
        <p class="font-medium">${escapeHtml(transfer.from_account)} → ${escapeHtml(transfer.to_account)}</p>
        <p class="text-sm text-slate-500 mt-1">${toDisplayDate(transfer.transfer_date)}</p>
        ${transfer.note ? `<p class="text-sm text-slate-600 mt-2">${escapeHtml(transfer.note)}</p>` : ''}
      </div>
      <p class="font-semibold text-right">${toCurrency(transfer.amount)}</p>
    </li>
  `).join("");
}

function renderSignedOutState() {
  dom.form.innerHTML = `<p class="text-slate-500">${t("signInToViewDashboard")}</p>`;
  dom.list.innerHTML = `<li class="text-slate-500">${t("signInToViewDashboard")}</li>`;
}

function setStatus(message) {
  dom.status.textContent = message;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}