/**
 * customize-android.js
 * -------------------------------------------------------------------------
 * Runs in CI (GitHub Actions) right after `npx cap add android`.
 *
 * It injects the game's real branding and behavior into the freshly
 * generated native Android project:
 *
 *   1. Installs a proper ADAPTIVE icon (foreground layer + a fully
 *      transparent background layer) instead of leaving Capacitor's
 *      default icon in place. This matters: if an app ships only a
 *      legacy square icon with no adaptive-icon XML, most modern
 *      launchers (Pixel/AOSP-derived ones especially) synthesize their
 *      OWN adaptive wrapper around it — shrinking it to ~66% and pasting
 *      it onto a solid white circle. That auto-wrapping is exactly what
 *      caused the thick white ring around the icon. By supplying our own
 *      full-bleed foreground with a transparent background layer, we
 *      control the fill ourselves and the icon reaches edge-to-edge.
 *   2. Also refreshes the legacy per-density ic_launcher.png /
 *      ic_launcher_round.png (used as a fallback on pre-Android-8
 *      devices/launchers that ignore adaptive icons).
 *   3. Copies the pre-rendered branded splash screens into every
 *      drawable / drawable-land-* / drawable-port-* density bucket.
 *   4. Removes the INTERNET permission from the manifest, since the game
 *      never makes a network request — it is 100% offline.
 *   5. Patches MainActivity to enable immersive full-screen mode (hides
 *      the status bar and the gesture/navigation bar, revealable with a
 *      swipe from the edge), so the game reads like a real full-screen
 *      Android app.
 *
 * This script only ever touches files that Capacitor itself generated a
 * moment earlier in the same CI job, so it is safe to run on every build.
 * -------------------------------------------------------------------------
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const RES_DIR = path.join(ROOT, "android", "app", "src", "main", "res");
const JAVA_ROOT = path.join(ROOT, "android", "app", "src", "main", "java");
const MANIFEST = path.join(ROOT, "android", "app", "src", "main", "AndroidManifest.xml");
const CAPACITOR_CONFIG = path.join(ROOT, "capacitor.config.json");

const ICON_SRC_DIR = path.join(ROOT, "resources", "icon");
const ADAPTIVE_SRC_DIR = path.join(ROOT, "resources", "icon-adaptive");
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

/* -------------------------------------------------------------------- *
 * 1 & 2. Icons — adaptive (fixes the white-border bug) + legacy fallback
 * -------------------------------------------------------------------- */

console.log("→ Installing adaptive icon (transparent background, full-bleed foreground)…");
DENSITIES.forEach((density) => {
  const mipmapDir = path.join(RES_DIR, `mipmap-${density}`);
  if (!fs.existsSync(mipmapDir)) {
    console.warn(`  [skip] no such resource folder: ${mipmapDir}`);
    return;
  }

  // Legacy fallback icons (pre-Android-8 launchers) — already full-bleed circles.
  const legacySrc = path.join(ICON_SRC_DIR, `mipmap-${density}.png`);
  copyFile(legacySrc, path.join(mipmapDir, "ic_launcher.png"), `mipmap-${density}/ic_launcher.png (legacy)`);
  copyFile(legacySrc, path.join(mipmapDir, "ic_launcher_round.png"), `mipmap-${density}/ic_launcher_round.png (legacy)`);

  // Adaptive-icon foreground — sized to the 108dp adaptive canvas, full bleed.
  const fgSrc = path.join(ADAPTIVE_SRC_DIR, `mipmap-${density}-foreground.png`);
  copyFile(fgSrc, path.join(mipmapDir, "ic_launcher_foreground.png"), `mipmap-${density}/ic_launcher_foreground.png (adaptive)`);
});

console.log("→ Writing adaptive-icon XML (transparent background layer)…");
const anydpiDir = path.join(RES_DIR, "mipmap-anydpi-v26");
if (!fs.existsSync(anydpiDir)) fs.mkdirSync(anydpiDir, { recursive: true });
copyFile(path.join(ADAPTIVE_SRC_DIR, "ic_launcher.xml"), path.join(anydpiDir, "ic_launcher.xml"), "mipmap-anydpi-v26/ic_launcher.xml");
copyFile(path.join(ADAPTIVE_SRC_DIR, "ic_launcher_round.xml"), path.join(anydpiDir, "ic_launcher_round.xml"), "mipmap-anydpi-v26/ic_launcher_round.xml");

/* -------------------------------------------------------------------- *
 * 3. Splash screens
 * -------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------- *
 * 4. Strip the unused INTERNET permission (the app is fully offline)
 * -------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------- *
 * 5. Immersive full-screen mode (hide status bar + gesture/nav bar)
 * -------------------------------------------------------------------- */

console.log("→ Enabling immersive full-screen mode…");
if (fs.existsSync(CAPACITOR_CONFIG)) {
  const config = JSON.parse(fs.readFileSync(CAPACITOR_CONFIG, "utf8"));
  const appId = config.appId;
  if (!appId) {
    console.warn("  [skip] no appId found in capacitor.config.json");
  } else {
    const packagePath = appId.split(".").join(path.sep);
    const mainActivityPath = path.join(JAVA_ROOT, packagePath, "MainActivity.java");

    if (!fs.existsSync(mainActivityPath)) {
      console.warn(`  [skip] MainActivity.java not found at expected path: ${mainActivityPath}`);
    } else {
      const javaSource = `package ${appId};

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

/**
 * Runs the game as a true full-screen Android app: the status bar and the
 * gesture/navigation bar are hidden, and can be revealed temporarily with
 * an edge swipe (standard "immersive sticky" behavior).
 */
public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        enableImmersiveMode();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            enableImmersiveMode();
        }
    }

    private void enableImmersiveMode() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            controller.setSystemBarsBehavior(
                    WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            controller.hide(WindowInsetsCompat.Type.systemBars());
        }
    }
}
`;
      fs.writeFileSync(mainActivityPath, javaSource, "utf8");
      console.log(`  [ok] MainActivity.java patched for immersive mode (package ${appId})`);
    }
  }
} else {
  console.warn("  [skip] capacitor.config.json not found");
}

console.log("✔ Android customization applied.");
