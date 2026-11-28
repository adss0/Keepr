// Keepr for Windows: a window onto the published web app, so it's always the latest version without reinstalling.
const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");

const APP_URL = "https://keepr-receipts.expo.app";
const APP_ORIGIN = new URL(APP_URL).origin;
/** Sign-in pages that must open inside the window so the session comes back to Keepr. */
const SIGN_IN_HOSTS = [/\.supabase\.co$/, /^accounts\.google\.com$/];

function staysInWindow(url) {
  try {
    const { origin, hostname, protocol } = new URL(url);
    return origin === APP_ORIGIN || (protocol === "https:" && SIGN_IN_HOSTS.some((host) => host.test(hostname)));
  } catch {
    return false;
  }
}

function openOutside(url) {
  // Only web links: never hand file:// or other schemes to the system.
  if (/^https?:\/\//.test(url)) shell.openExternal(url);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 820,
    minWidth: 380,
    minHeight: 560,
    title: "Keepr",
    icon: path.join(__dirname, "icon.png"),
    backgroundColor: "#21201C",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });

  // Links to other sites (a shop's page, help pages) open in the normal browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (staysInWindow(url)) return { action: "allow" };
    openOutside(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (staysInWindow(url)) return;
    event.preventDefault();
    openOutside(url);
  });

  // No internet: a plain page with a retry button instead of Chromium's error.
  win.webContents.on("did-fail-load", (_event, code, _description, url, isMainFrame) => {
    if (isMainFrame && code !== -3 && url.startsWith(APP_ORIGIN)) win.loadFile(path.join(__dirname, "offline.html"));
  });

  win.loadURL(APP_URL);
}

// One Keepr window at a time: opening it again brings the existing one forward.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(createWindow);
  app.on("window-all-closed", () => app.quit());
}
