// Runs before `npm start` (and the other start scripts) to catch an old Node.js early.
// Expo SDK 58's dev server needs Node 22.13+; older versions crash with
// "TypeError: URL.parse is not a function" as soon as a phone or browser connects.

const REQUIRED = [22, 13, 0];

/** Negative if version `a` is older than `b`, 0 if equal, positive if newer. */
function compareVersions(a, b) {
  for (let i = 0; i < b.length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

const current = process.versions.node.split(".").map(Number);
const tooOld = compareVersions(current, REQUIRED) < 0;

if (tooOld) {
  console.error(`
  Keepr needs Node.js ${REQUIRED.join(".")} or newer, but you have ${process.versions.node}.

  Install the latest LTS version from https://nodejs.org (or run:
    winget upgrade OpenJS.NodeJS.LTS
  in PowerShell), then close and reopen your terminal and run npm start again.
`);
  process.exit(1);
}
