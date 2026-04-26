import { getSession, onAuthStateChanged, signOut } from "./db.js";
import { getLanguage, setLanguage, toggleLanguage, t } from "./i18n.js";

const trigger = document.getElementById("profile-trigger");
const menu = document.getElementById("profile-menu");
const logoutBtn = document.getElementById("profile-logout-btn");
const loginBtn = document.getElementById("profile-login-btn");
const emailLabel = document.getElementById("profile-email");
const themeToggleBtn = document.getElementById("profile-theme-toggle");
const languageToggleBtn = document.getElementById("profile-language-toggle");
const avatarPill = document.querySelector(".avatar-pill");
const greetingAvatars = [...document.querySelectorAll(".js-greeting-avatar")];
const helloTexts = [...document.querySelectorAll(".js-profile-hello-text")];
const defaultAvatar = avatarPill?.dataset.defaultAvatar || avatarPill?.textContent?.trim() || "U";
let lastDisplayName = "";

if (trigger && menu && logoutBtn && emailLabel && themeToggleBtn && languageToggleBtn) {
  initProfileMenu();
}

async function initProfileMenu() {
  applySavedTheme();
  applySavedLanguage();
  syncThemeButtonLabel();
  syncLanguageButtonLabel();
  await refreshEmail();

  onAuthStateChanged(async () => {
    await refreshEmail();
  });

  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    const isHidden = menu.classList.contains("hidden");
    menu.classList.toggle("hidden", !isHidden);
    trigger.setAttribute("aria-expanded", String(isHidden));
  });

  document.addEventListener("click", (event) => {
    if (!menu.classList.contains("hidden") && !menu.contains(event.target) && event.target !== trigger) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });

  logoutBtn.addEventListener("click", async () => {
    if (!logoutBtn.dataset.active || logoutBtn.dataset.active !== "true") {
      return;
    }

    try {
      await signOut();
      closeMenu();
      await refreshEmail();
      window.location.href = "./index.html";
    } catch {
      closeMenu();
      window.alert("Logout failed. Please try again.");
    }
  });

  themeToggleBtn.addEventListener("click", () => {
    const makeDark = !document.body.classList.contains("dark");
    document.body.classList.toggle("dark", makeDark);
    localStorage.setItem("theme", makeDark ? "dark" : "light");
    syncThemeButtonLabel();
    closeMenu();
  });

  languageToggleBtn.addEventListener("click", () => {
    setLanguage(toggleLanguage());
    window.location.reload();
  });

  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      if (loginBtn.classList.contains("hidden")) {
        return;
      }

      const next = encodeURIComponent(`./${window.location.pathname.split("/").pop() || "index.html"}${window.location.hash || ""}`);
      window.location.href = `./auth.html?mode=signin&next=${next}`;
    });
  }
}

async function refreshEmail() {
  try {
    const session = await getSession();
    const isSignedIn = Boolean(session?.user);
    const email = session?.user?.email ?? "";
    const displayName = getDisplayName(session);

    emailLabel.textContent = email || t("notSignedIn");
    if (avatarPill) {
      avatarPill.textContent = isSignedIn && email ? email.charAt(0).toUpperCase() : defaultAvatar;
    }
    const greetingLetter = isSignedIn && email ? email.charAt(0).toUpperCase() : null;
    greetingAvatars.forEach((item) => {
      const fallback = item.dataset.defaultAvatar || "U";
      item.textContent = greetingLetter || fallback;
    });
    lastDisplayName = displayName;
    syncProfileCopy(displayName);
    logoutBtn.disabled = !isSignedIn;
    logoutBtn.dataset.active = String(isSignedIn);
    logoutBtn.classList.toggle("hidden", !isSignedIn);

    if (loginBtn) {
      loginBtn.classList.toggle("hidden", isSignedIn);
    }
  } catch {
    emailLabel.textContent = t("sessionUnavailable");
    if (avatarPill) {
      avatarPill.textContent = defaultAvatar;
    }
    greetingAvatars.forEach((item) => {
      item.textContent = item.dataset.defaultAvatar || "U";
    });
    helloTexts.forEach((item) => {
      item.textContent = "Hello";
    });
    logoutBtn.disabled = true;
    logoutBtn.dataset.active = "false";
    logoutBtn.classList.add("hidden");
    if (loginBtn) {
      loginBtn.classList.remove("hidden");
    }
  }
}

function closeMenu() {
  menu.classList.add("hidden");
  trigger.setAttribute("aria-expanded", "false");
}

function applySavedTheme() {
  const saved = localStorage.getItem("theme") || "light";
  document.body.classList.toggle("dark", saved === "dark");
}

function applySavedLanguage() {
  setLanguage(getLanguage());
}

function syncThemeButtonLabel() {
  const isDark = document.body.classList.contains("dark");
  themeToggleBtn.textContent = isDark ? t("lightMode") : t("darkMode");
}

function syncLanguageButtonLabel() {
  languageToggleBtn.textContent = t("language");
}

function syncProfileCopy(displayName = "") {
  document.documentElement.lang = getLanguage();
  helloTexts.forEach((item) => {
    item.textContent = displayName ? `${t("hello")}, ${displayName}` : t("hello");
  });
  if (loginBtn) {
    loginBtn.textContent = t("signInUp");
  }
  if (logoutBtn) {
    logoutBtn.textContent = t("logout");
  }
  if (emailLabel && !emailLabel.textContent) {
    emailLabel.textContent = t("notSignedIn");
  }
  const profileBadge = menu.querySelector(".profile-menu-badge");
  if (profileBadge) {
    profileBadge.textContent = t("account");
  }
  const profileSub = menu.querySelector(".profile-menu-sub");
  if (profileSub) {
    profileSub.textContent = t("manageAppearance");
  }
  if (trigger) {
    trigger.setAttribute("aria-label", t("openProfileMenu"));
  }
  syncThemeButtonLabel();
  syncLanguageButtonLabel();
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
