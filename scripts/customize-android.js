/**
 * customize-android.js
 * -------------------------------------------------------------------------
 * Runs in CI (GitHub Actions) right after `npx cap add android`.
 *
 * It injects the game's real branding into the freshly-generated native
 * Android project:
 *   1. Copies the transparent app-icon PNGs into every mipmap density.
 *   2. Deletes the Android 8+ adaptive-icon XML definitions so the OS falls
 *      back to the legacy per-density PNGs, which are the only icon format
 *      that preserves a fully transparent background on the home screen.
 *   3. Copies the pre-rendered branded splash screens into every
 *      drawable / drawable-land-* / drawable-port-* density bucket.
 *   4. Removes the INTERNET permission from the manifest, since the game
 *      never makes a network request — it is 100% offline.
 *
 * This script only ever touches files that Capacitor itself generated a
 * moment earlier in the same CI job, so it is safe to run on every build.
 * -------------------------------------------------------------------------
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const RES_DIR = path.join(ROOT, "android", "app", "src", "main", "res");
const MANIFEST = path.join(ROOT, "android", "app", "src", "main", "AndroidManifest.xml");

const ICON_SRC_DIR = path.join(ROOT, "resources", "icon");
const SPLASH_SRC_DIR = path.join(ROOT, "resources", "splash");

const DENSITIES = ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"];

function copyFile(src, dest, label) {
  if (!fs.existsSync(src)) {
    console.warn(`  [skip] missing source: ${src}`);
    return;
  }
  fs.copyFileSync(src, dest);
  console.log(`  [ok] ${label}`);
}

function removeIfExists(p) {
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log(`  [removed] ${path.relative(ROOT, p)}`);
  }
}

console.log("→ Applying custom launcher icons (transparent background)…");
DENSITIES.forEach((density) => {
  const srcIcon = path.join(ICON_SRC_DIR, `mipmap-${density}.png`);
  const mipmapDir = path.join(RES_DIR, `mipmap-${density}`);
  if (!fs.existsSync(mipmapDir)) {
    console.warn(`  [skip] no such resource folder: ${mipmapDir}`);
    return;
  }
  copyFile(srcIcon, path.join(mipmapDir, "ic_launcher.png"), `mipmap-${density}/ic_launcher.png`);
  copyFile(srcIcon, path.join(mipmapDir, "ic_launcher_round.png"), `mipmap-${density}/ic_launcher_round.png`);
  copyFile(srcIcon, path.join(mipmapDir, "ic_launcher_foreground.png"), `mipmap-${density}/ic_launcher_foreground.png`);
});

console.log("→ Removing adaptive-icon XML so the legacy transparent PNG is used…");
removeIfExists(path.join(RES_DIR, "mipmap-anydpi-v26", "ic_launcher.xml"));
removeIfExists(path.join(RES_DIR, "mipmap-anydpi-v26", "ic_launcher_round.xml"));

console.log("→ Applying branded splash screens…");
if (fs.existsSync(SPLASH_SRC_DIR)) {
  fs.readdirSync(SPLASH_SRC_DIR).forEach((file) => {
    // Files are named e.g. "drawable-port-xxhdpi__splash.png" -> restore the "/" .
    const relPath = file.replace("__", path.sep);
    const dest = path.join(RES_DIR, relPath);
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    copyFile(path.join(SPLASH_SRC_DIR, file), dest, relPath);
  });
} else {
  console.warn("  [skip] resources/splash not found");
}

console.log("→ Removing unused INTERNET permission (the app is fully offline)…");
if (fs.existsSync(MANIFEST)) {
  let manifest = fs.readFileSync(MANIFEST, "utf8");
  const before = manifest;
  manifest = manifest.replace(/\s*<uses-permission[^>]*android:name="android\.permission\.INTERNET"[^>]*\/>\s*\n?/g, "\n");
  if (manifest !== before) {
    fs.writeFileSync(MANIFEST, manifest, "utf8");
    console.log("  [ok] INTERNET permission removed");
  } else {
    console.log("  [info] no INTERNET permission found (nothing to remove)");
  }
} else {
  console.warn(`  [skip] manifest not found at ${MANIFEST}`);
}

console.log("✔ Android branding applied.");
