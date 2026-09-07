/**
 * generate-version-json.js
 * -------------------------------------------------------------------------
 * Reads version.properties and writes version.json — the small file the
 * installed app checks on every launch to know whether a newer release
 * exists. Runs only inside .github/workflows/release.yml, right before the
 * GitHub Release is published, using GITHUB_REPOSITORY (automatically set
 * by GitHub Actions to "owner/repo") to build the correct download URLs
 * for THIS repo automatically — nothing to hard-code by hand.
 * -------------------------------------------------------------------------
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PROPS_PATH = path.join(ROOT, "version.properties");
const OUT_PATH = path.join(ROOT, "version.json");

function readVersionProperties() {
  const text = fs.readFileSync(PROPS_PATH, "utf8");
  const props = {};
  text.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eq = trimmed.indexOf("=");
    if (eq === -1) return;
    props[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  });
  return props;
}

const props = readVersionProperties();
const versionCode = parseInt(props.versionCode, 10);
const versionName = props.versionName;

if (!Number.isInteger(versionCode) || versionCode < 1) {
  console.error("✘ version.properties: versionCode must be a positive integer, got:", props.versionCode);
  process.exit(1);
}
if (!versionName) {
  console.error("✘ version.properties: versionName is missing");
  process.exit(1);
}

const repo = process.env.GITHUB_REPOSITORY || "YOUR_GITHUB_USERNAME/YOUR_REPO_NAME";
if (repo.indexOf("YOUR_GITHUB_USERNAME") !== -1) {
  console.warn("⚠ GITHUB_REPOSITORY was not set (not running inside GitHub Actions?) — using a placeholder URL.");
}

const versionJson = {
  versionCode: versionCode,
  versionName: versionName,
  apk_url: `https://github.com/${repo}/releases/latest/download/app-release.apk`,
  force_update: true
};

fs.writeFileSync(OUT_PATH, JSON.stringify(versionJson, null, 2) + "\n", "utf8");
console.log("✔ version.json written:", versionJson);
