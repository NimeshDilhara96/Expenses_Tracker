import { getSession, signIn, signUp } from "./db.js";
import { applyTheme, toast } from "./ui.js";
import { t } from "./i18n.js";

const params = new URLSearchParams(window.location.search);

const dom = {
  title: document.getElementById("auth-title"),
  subtitle: document.getElementById("auth-subtitle"),
  form: document.getElementById("auth-form"),
  email: document.getElementById("auth-email"),
  password: document.getElementById("auth-password"),
  submit: document.getElementById("auth-submit"),
  switch: document.getElementById("auth-switch"),
  status: document.getElementById("auth-status"),
  back: document.getElementById("auth-back")
};

const state = {
  mode: params.get("mode") === "signup" ? "signup" : "signin",
  isBusy: false,
  next: sanitizeNext(params.get("next"))
};

init();

async function init() {
  applyTheme(localStorage.getItem("theme") || "light");
  dom.back.href = state.next;
  renderMode();

  dom.switch.addEventListener("click", () => {
    state.mode = state.mode === "signin" ? "signup" : "signin";
    renderMode();
  });

  dom.form.addEventListener("submit", onSubmit);

  try {
    const session = await getSession();
    if (session?.user) {
      window.location.replace(state.next);
    }
  } catch {
    setStatus(t("sessionCheckFailed"));
  }
}

async function onSubmit(event) {
  event.preventDefault();
  if (state.isBusy) {
    return;
  }

  const email = String(dom.email.value || "").trim();
  const password = String(dom.password.value || "").trim();

  if (!email || !password) {
    setStatus(t("emailAndPasswordRequired"));
    return;
  }

  state.isBusy = true;
  syncBusyState();

  try {
    if (state.mode === "signup") {
      const data = await signUp(email, password);
      if (data?.session?.user) {
        toast(t("accountCreated"));
        window.location.replace(state.next);
        return;
      }

      setStatus(t("accountCreatedCheckEmail"));
      toast(t("accountCreated"));
      state.mode = "signin";
      renderMode();
      return;
    }

    await signIn(email, password);
    toast(t("signedIn"));
    window.location.replace(state.next);
  } catch (error) {
    setStatus(normalizeError(error));
  } finally {
    state.isBusy = false;
    syncBusyState();
  }
}

function renderMode() {
  const isSignup = state.mode === "signup";
  dom.title.textContent = isSignup ? t("createAccount") : t("signIn");
  dom.subtitle.textContent = isSignup
    ? t("createAccountToSync")
    : t("useAccountToContinue");
  dom.submit.textContent = isSignup ? t("createAccount") : t("signIn");
  dom.switch.textContent = isSignup ? t("iAlreadyHaveAnAccount") : t("createAccount");
  dom.password.autocomplete = isSignup ? "new-password" : "current-password";

  const url = new URL(window.location.href);
  url.searchParams.set("mode", state.mode);
  url.searchParams.set("next", state.next);
  window.history.replaceState({}, "", url);
}

function syncBusyState() {
  dom.submit.disabled = state.isBusy;
  dom.switch.disabled = state.isBusy;
}

function setStatus(message) {
  dom.status.textContent = message;
}

function normalizeError(error) {
  const message = typeof error?.message === "string" ? error.message : "Authentication failed.";
  if (message.toLowerCase().includes("invalid login credentials")) {
    return t("invalidEmailOrPassword");
  }

  return message === "Authentication failed." ? t("authenticationFailed") : message;
}

function sanitizeNext(nextValue) {
  if (!nextValue) {
    return "./index.html";
  }

  const decoded = decodeURIComponent(nextValue);
  if (!decoded.startsWith("./") || decoded.includes("://") || decoded.includes("\\")) {
    return "./index.html";
  }

  return decoded;
}
