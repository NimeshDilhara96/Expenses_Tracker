import { addNote, clearNotes, deleteNote, fetchNotes, getSession, onAuthStateChanged } from "./db.js";
import { applyTheme, renderAuthView, toast } from "./ui.js";
import { t } from "./i18n.js";
import { toCurrency } from "./utils.js";

const dom = {
  authView: document.getElementById("auth-view"),
  appView: document.getElementById("app-view"),
  noteForm: document.getElementById("note-form"),
  notePerson: document.getElementById("note-person"),
  personOptions: document.getElementById("person-options"),
  personChips: document.getElementById("person-chips"),
  noteTitle: document.getElementById("note-title"),
  noteAmount: document.getElementById("note-amount"),
  noteType: document.getElementById("note-type"),
  noteCategory: document.getElementById("note-category"),
  noteDetails: document.getElementById("note-details"),
  noteClear: document.getElementById("note-clear"),
  notesList: document.getElementById("notes-list")
};

const state = {
  session: null,
  isBusy: false,
  notes: [],
  expandedPerson: null,
  theme: localStorage.getItem("theme") || "light"
};

async function init() {
  applyTheme(state.theme);
  document.documentElement.lang = localStorage.getItem("language") === "si" ? "si" : "en";
  document.title = t("memoryPage");
  applyStaticLabels();

  try {
    state.session = await getSession();
  } catch {
    renderError();
    return;
  }

  onAuthStateChanged(async (session) => {
    state.session = session;
    if (session?.user) {
      await refreshNotes();
    } else {
      state.notes = [];
      render();
    }
  });

  render();

  if (state.session?.user) {
    await refreshNotes();
  }
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

  renderNotes();
}

async function refreshNotes() {
  try {
    state.notes = await fetchNotes();
    render();
  } catch (error) {
    toast(normalizeError(error));
  }
}

function renderNotes() {
  if (!state.notes.length) {
    renderPersonHelpers([]);
    state.expandedPerson = null;
    dom.notesList.innerHTML = `<div class="notes-empty">${t("noMemoriesSavedYet")}</div>`;
    return;
  }

  const groupedNotes = groupNotesByPerson(state.notes);
  if (!groupedNotes.some((group) => group.personName === state.expandedPerson)) {
    state.expandedPerson = groupedNotes[0]?.personName ?? null;
  }
  renderPersonHelpers(groupedNotes.map((group) => group.personName));

  dom.notesList.innerHTML = groupedNotes
    .map(
      (group) => `
        <section class="person-group-card ${state.expandedPerson === group.personName ? "open" : "closed"}">
          <button class="person-group-header" type="button" data-person="${escapeHtml(group.personName)}" aria-expanded="${String(state.expandedPerson === group.personName)}">
            <div>
              <div class="note-person">${escapeHtml(group.personName)}</div>
              <div class="note-meta">${group.items.length} ${t("entries")}</div>
            </div>
            <div class="person-group-total">
              <div class="person-group-total-label">${t("total")}</div>
              <div class="person-group-total-value">${toCurrency(group.total)}</div>
            </div>
          </button>
          <div class="person-group-items ${state.expandedPerson === group.personName ? "open" : "closed"}">
            ${group.items
              .map(
                (note) => `
                  <article class="note-card">
                    <div class="note-card-top">
                      <div>
                        <div class="note-entry-type ${note.entry_type === "returned" ? "returned" : "given"}">${escapeHtml(note.entry_type === "returned" ? t("returned") : t("given"))}</div>
                        <div class="note-category">${escapeHtml(note.category)}</div>
                        <h3>${escapeHtml(note.title)}</h3>
                      </div>
                      <button class="note-delete" type="button" data-id="${note.id}">${t("delete")}</button>
                    </div>
                    <p class="note-details">${escapeHtml(note.details)}</p>
                    <div class="note-amount ${note.entry_type === "returned" ? "returned" : "given"}">${toCurrency(getSignedAmount(note))}</div>
                    <div class="note-meta">${t("saved")} ${escapeHtml(formatDate(note.created_at))}</div>
                  </article>
                `
              )
              .join("")}
          </div>
        </section>
      `
    )
    .join("");

  dom.notesList.querySelectorAll(".person-group-header").forEach((button) => {
    button.addEventListener("click", () => {
      const personName = button.getAttribute("data-person");
      state.expandedPerson = state.expandedPerson === personName ? null : personName;
      renderNotes();
    });
  });

  dom.notesList.querySelectorAll(".note-delete").forEach((button) => {
    button.addEventListener("click", async () => {
      if (state.isBusy) {
        return;
      }

      state.isBusy = true;
      try {
        await deleteNote(button.getAttribute("data-id"));
        state.notes = state.notes.filter((note) => note.id !== button.getAttribute("data-id"));
        const remainingPeople = new Set(state.notes.map((note) => note.person_name.trim()));
        if (state.expandedPerson && !remainingPeople.has(state.expandedPerson)) {
          state.expandedPerson = [...remainingPeople][0] ?? null;
        }
        renderNotes();
        toast(t("memoryDeleted"));
      } catch (error) {
        toast(normalizeError(error));
      } finally {
        state.isBusy = false;
      }
    });
  });
}

function renderPersonHelpers(personNames) {
  if (dom.personOptions) {
    dom.personOptions.innerHTML = personNames.map((name) => `<option value="${escapeHtml(name)}"></option>`).join("");
  }

  if (!dom.personChips) {
    return;
  }

  dom.personChips.innerHTML = personNames.length
    ? personNames
        .map(
          (name) => `
            <button class="person-chip" type="button" data-person="${escapeHtml(name)}">${escapeHtml(name)}</button>
          `
        )
        .join("")
    : `<div class="notes-empty">${t("noPeopleYetAddFirstPerson")}</div>`;

  dom.personChips.querySelectorAll(".person-chip").forEach((button) => {
    button.addEventListener("click", () => {
      dom.notePerson.value = button.getAttribute("data-person") || "";
      dom.notePerson.focus();
    });
  });
}

dom.noteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.session?.user || state.isBusy) {
    return;
  }

  const personName = dom.notePerson.value.trim();
  const title = dom.noteTitle.value.trim();
  const amount = Number(dom.noteAmount.value);
  const entryType = dom.noteType.value;
  const details = dom.noteDetails.value.trim();
  const category = dom.noteCategory.value;

  if (!personName || !title || !details || !Number.isFinite(amount) || amount <= 0) {
    toast(t("personNameTitleAmountDetailsRequired"));
    return;
  }

  state.isBusy = true;
  try {
    const created = await addNote({ person_name: personName, amount, entry_type: entryType, title, details, category });
    state.notes = [created, ...state.notes];
    dom.notePerson.value = personName;
    state.expandedPerson = personName;
    dom.noteTitle.value = "";
    dom.noteAmount.value = "";
    dom.noteType.value = "given";
    dom.noteDetails.value = "";
    dom.noteCategory.value = "General";
    renderNotes();
    toast(t("expenseNoteSaved"));
  } catch (error) {
    toast(normalizeError(error));
  } finally {
    state.isBusy = false;
  }
});

dom.noteClear.addEventListener("click", async () => {
  if (!state.session?.user || state.isBusy) {
    return;
  }

  state.isBusy = true;
  try {
    await clearNotes();
    state.notes = [];
    renderNotes();
    toast(t("allExpenseNotesCleared"));
  } catch (error) {
    toast(normalizeError(error));
  } finally {
    state.isBusy = false;
  }
});

function renderError() {
  dom.authView.innerHTML = `<div class="empty-state">${t("couldNotLoadSession")}</div>`;
}

function normalizeError(error) {
  return error instanceof Error ? error.message : t("somethingWentWrong");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return t("justNow");
  }

  return date.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function formatGroupDate(value) {
  if (!value) {
    return "";
  }

  return formatDate(value);
}

function getSignedAmount(note) {
  const value = Number(note.amount) || 0;
  return note.entry_type === "returned" ? -value : value;
}

function groupNotesByPerson(notes) {
  const groups = new Map();

  notes.forEach((note) => {
    const key = note.person_name.trim();
    const current = groups.get(key) || [];
    current.push(note);
    groups.set(key, current);
  });

  return [...groups.entries()]
    .map(([personName, items]) => ({
      personName,
      items: items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      total: items.reduce((sum, item) => sum + getSignedAmount(item), 0)
    }))
    .sort((a, b) => new Date(b.items[0]?.created_at || 0).getTime() - new Date(a.items[0]?.created_at || 0).getTime());
}

init();

function applyStaticLabels() {
  const formLabels = dom.noteForm.querySelectorAll("label");
  const labelTexts = [t("personName"), t("expenseTitle"), t("amountLkr"), t("entryType"), t("category"), t("details")];
  formLabels.forEach((label, index) => {
    const textNode = [...label.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
    if (textNode) {
      textNode.textContent = `${labelTexts[index]}\n            `;
    }
  });

  const staticLabels = [
    [".notes-hero .hero-label", t("saveDetails")],
    [".notes-hero h2", t("trackPersonWise")],
    [".notes-hero .hero-meta", t("storedInSupabase")],
    ["#note-form button[type='submit']", t("addExpenseNote")],
    [".notes-panel .summary-heading h2", t("personLedger")],
    ["#note-clear", t("clearAll")],
    [".notes-panel .eyebrow", t("totalsAutoCalculated")],
    [".bottom-nav-item[href='./index.html'] .bottom-nav-label", t("accounts")],
    [".bottom-nav-item[href='./expense.html'] .bottom-nav-label", t("expenses")],
    [".bottom-nav-item[href='./income.html'] .bottom-nav-label", t("income")],
    [".bottom-nav-item[href='./notes.html'] .bottom-nav-label", t("memoryPage")]
  ];

  staticLabels.forEach(([selector, value]) => {
    document.querySelectorAll(selector).forEach((node) => {
      node.textContent = value;
    });
  });
}