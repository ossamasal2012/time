/**
 * customize-android.js
 * -------------------------------------------------------------------------
 * Run in CI (GitHub Actions) right after `npx cap add android`.
 *
 * It injects the game's real branding and behavior into the freshly
 * generated native Android project:
 *
 *   1. Installs a proper ADAPTIVE icon (foreground layer + a fully
 *      transparent background layer) so the launcher never synthesizes its
 *      own padded/white-backed version of a legacy icon.
 *   2. Refreshes the legacy per-density ic_launcher.png / ic_launcher_round.png
 *      (fallback for pre-Android-8 launchers that ignore adaptive icons).
 *   3. Copies the pre-rendered branded splash screens into every
 *      drawable / drawable-land-* / drawable-port-* density bucket.
 *   4. Patches MainActivity for immersive full-screen mode (hides the
 *      status bar and gesture/navigation bar, revealable with an edge swipe).
 *   5. Reads version.properties (the ONE file you edit to publish an
 *      update) and injects versionCode/versionName into build.gradle,
 *      enables BuildConfig generation (AGP 8+ disables it by default), and
 *      injects a release signingConfig sourced from environment variables
 *      (set by .github/workflows/release.yml from GitHub Secrets — see
 *      README.md for the one-time setup). This block is always injected;
 *      it only matters when `assembleRelease` actually runs, so it's
 *      harmless for the everyday debug-build workflow.
 *   6. Adds the INTERNET + REQUEST_INSTALL_PACKAGES permissions and a
 *      <receiver> for the update system, and extends Capacitor's own
 *      already-present FileProvider paths file with a Download/ entry.
 *   7. Writes MainActivity.java, UpdateManager.java and UpdateReceiver.java
 *      — the full in-app update system (check → mandatory dialog →
 *      background download with progress → auto-prompt install, including
 *      picking back up an already-downloaded update if the app was closed
 *      mid-download). See README.md for exactly what this can and cannot
 *      do — Android itself always requires one final tap to confirm any
 *      APK install; no app can bypass that.
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
const BUILD_GRADLE = path.join(ROOT, "android", "app", "build.gradle");
const FILE_PATHS_XML = path.join(RES_DIR, "xml", "file_paths.xml");
const CAPACITOR_CONFIG = path.join(ROOT, "capacitor.config.json");
const VERSION_PROPERTIES = path.join(ROOT, "version.properties");

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

function readVersionProperties() {
  if (!fs.existsSync(VERSION_PROPERTIES)) {
    console.warn(`  [warn] version.properties not found at ${VERSION_PROPERTIES} — defaulting to versionCode=1, versionName=1.0`);
    return { versionCode: "1", versionName: "1.0" };
  }
  const text = fs.readFileSync(VERSION_PROPERTIES, "utf8");
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
  const legacySrc = path.join(ICON_SRC_DIR, `mipmap-${density}.png`);
  copyFile(legacySrc, path.join(mipmapDir, "ic_launcher.png"), `mipmap-${density}/ic_launcher.png (legacy)`);
  copyFile(legacySrc, path.join(mipmapDir, "ic_launcher_round.png"), `mipmap-${density}/ic_launcher_round.png (legacy)`);

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
 * 5. version.properties -> build.gradle (version + release signing + BuildConfig)
 * -------------------------------------------------------------------- */

console.log("→ Injecting version + release signing config into build.gradle…");
if (fs.existsSync(BUILD_GRADLE)) {
  let gradle = fs.readFileSync(BUILD_GRADLE, "utf8");
  const versionProps = readVersionProperties();
  const versionCode = parseInt(versionProps.versionCode, 10) || 1;
  const versionName = versionProps.versionName || "1.0";

  gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
  gradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "${versionName}"`);

  // AGP 8+ no longer generates BuildConfig by default — UpdateManager reads
  // BuildConfig.VERSION_CODE at runtime, so this must be turned back on.
  gradle = gradle.replace(
    /(compileSdk\s*=\s*rootProject\.ext\.compileSdkVersion\n)/,
    `$1    buildFeatures {\n        buildConfig true\n    }\n`
  );

  const signingBlock =
    `    signingConfigs {\n` +
    `        release {\n` +
    `            storeFile file(System.getenv("RELEASE_KEYSTORE_PATH") ?: "missing-release.keystore")\n` +
    `            storePassword System.getenv("RELEASE_KEYSTORE_PASSWORD") ?: ""\n` +
    `            keyAlias System.getenv("RELEASE_KEY_ALIAS") ?: ""\n` +
    `            keyPassword System.getenv("RELEASE_KEY_PASSWORD") ?: ""\n` +
    `        }\n` +
    `    }\n`;
  gradle = gradle.replace(/(\n\s*buildTypes\s*\{)/, `\n${signingBlock}$1`);
  gradle = gradle.replace(
    /(buildTypes\s*\{\s*release\s*\{)/,
    "$1\n            signingConfig signingConfigs.release"
  );

  fs.writeFileSync(BUILD_GRADLE, gradle, "utf8");
  console.log(`  [ok] versionCode=${versionCode} versionName=${versionName}; buildConfig + release signing injected`);
} else {
  console.warn(`  [skip] build.gradle not found at ${BUILD_GRADLE}`);
}

/* -------------------------------------------------------------------- *
 * 6. Manifest: permissions + receiver. FileProvider paths: add Download/.
 * -------------------------------------------------------------------- */

console.log("→ Adding update-system permissions and receiver to the manifest…");
if (fs.existsSync(MANIFEST)) {
  let manifest = fs.readFileSync(MANIFEST, "utf8");

  const neededPermissions = [
    "android.permission.INTERNET",
    "android.permission.REQUEST_INSTALL_PACKAGES"
  ];
  neededPermissions.forEach((perm) => {
    if (manifest.indexOf(perm) === -1) {
      manifest = manifest.replace(
        "<!-- Permissions -->",
        `<!-- Permissions -->\n    <uses-permission android:name="${perm}" />`
      );
      console.log(`  [ok] added permission: ${perm}`);
    } else {
      console.log(`  [info] permission already present: ${perm}`);
    }
  });

  if (manifest.indexOf("UpdateReceiver") === -1) {
    manifest = manifest.replace(
      "</provider>\n    </application>",
      `</provider>\n\n        <receiver\n            android:name=".UpdateReceiver"\n            android:exported="true">\n            <intent-filter>\n                <action android:name="android.intent.action.DOWNLOAD_COMPLETE" />\n            </intent-filter>\n        </receiver>\n    </application>`
    );
  }

  fs.writeFileSync(MANIFEST, manifest, "utf8");
  console.log("  [ok] manifest updated");
} else {
  console.warn(`  [skip] manifest not found at ${MANIFEST}`);
}

console.log("→ Extending FileProvider paths for the downloaded update APK…");
if (fs.existsSync(FILE_PATHS_XML)) {
  let paths = fs.readFileSync(FILE_PATHS_XML, "utf8");
  if (paths.indexOf("external-files-path") === -1) {
    paths = paths.replace(
      "</paths>",
      `    <external-files-path name="downloads" path="Download/" />\n</paths>`
    );
    fs.writeFileSync(FILE_PATHS_XML, paths, "utf8");
    console.log("  [ok] file_paths.xml extended");
  } else {
    console.log("  [info] file_paths.xml already has an external-files-path entry");
  }
} else {
  console.warn(`  [skip] file_paths.xml not found at ${FILE_PATHS_XML} (unexpected — Capacitor usually ships one)`);
}

/* -------------------------------------------------------------------- *
 * 4 & 7. MainActivity, UpdateManager, UpdateReceiver
 * -------------------------------------------------------------------- */

console.log("→ Writing MainActivity.java, UpdateManager.java, UpdateReceiver.java…");
if (fs.existsSync(CAPACITOR_CONFIG)) {
  const config = JSON.parse(fs.readFileSync(CAPACITOR_CONFIG, "utf8"));
  const appId = config.appId;

  if (!appId) {
    console.warn("  [skip] no appId found in capacitor.config.json");
  } else {
    const packagePath = appId.split(".").join(path.sep);
    const javaDir = path.join(JAVA_ROOT, packagePath);

    if (!fs.existsSync(javaDir)) {
      console.warn(`  [skip] expected java source dir not found: ${javaDir}`);
    } else {
      const repo = process.env.GITHUB_REPOSITORY || "YOUR_GITHUB_USERNAME/YOUR_REPO_NAME";
      if (repo.indexOf("YOUR_GITHUB_USERNAME") !== -1) {
        console.warn("  [warn] GITHUB_REPOSITORY not set — UpdateManager will use a placeholder URL. This is fine locally, but should never happen in the actual CI run.");
      }
      const versionJsonUrl = `https://github.com/${repo}/releases/latest/download/version.json`;

      const mainActivityJava = `package ${appId};

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

/**
 * Runs the game as a true full-screen Android app (immersive sticky mode),
 * and drives the in-app update system: a check on every fresh launch, and
 * a check for an already-downloaded update waiting to be installed every
 * time the app comes back to the foreground.
 */
public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        enableImmersiveMode();
        UpdateManager.checkForUpdate(this);
    }

    @Override
    public void onResume() {
        super.onResume();
        UpdateManager.resumePendingInstallIfReady(this);
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

      const updateManagerJava = `package ${appId};

import android.app.Activity;
import android.app.DownloadManager;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import androidx.appcompat.app.AlertDialog;
import androidx.core.content.FileProvider;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * The whole in-app update system in one place.
 *
 * Flow: checkForUpdate() runs on every app launch. If no update is already
 * downloaded and waiting, it fetches version.json in the background; if the
 * server's versionCode is higher than BuildConfig.VERSION_CODE, it shows a
 * non-cancelable dialog with a single "تحديث الآن" button. Tapping it
 * enqueues a DownloadManager request (which keeps running system-wide even
 * if the app is closed, with its own progress notification) and shows a
 * live in-app progress dialog while the app stays open. Once the download
 * finishes — whether the app is open or was closed in the meantime — the
 * system installer is launched automatically. Android itself still
 * requires one tap on its own "Install" confirmation there; no app can
 * skip that step, by design of the platform.
 */
public final class UpdateManager {

    private static final String TAG = "UpdateManager";
    private static final String PREFS = "update_manager_prefs";
    private static final String KEY_PENDING_DOWNLOAD_ID = "pending_download_id";
    private static final String KEY_PENDING_VERSION_CODE = "pending_version_code";
    private static final String APK_FILE_NAME = "update.apk";

    // Filled in automatically at build time from this repo's GitHub location.
    private static final String VERSION_JSON_URL = "${versionJsonUrl}";

    private static AlertDialog progressDialogRef;
    private static TextView progressLabelRef;
    private static ProgressBar progressBarRef;
    private static Handler pollHandler;

    private UpdateManager() {}

    /** Call once from MainActivity.onCreate(). */
    public static void checkForUpdate(final Activity activity) {
        cleanupIfAlreadyUpToDate(activity);

        if (resumePendingInstallIfReady(activity)) {
            return; // already downloaded — installing now, no need to hit the network
        }

        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    JSONObject json = fetchJson(VERSION_JSON_URL);
                    final int remoteVersionCode = json.getInt("versionCode");
                    final String remoteVersionName = json.optString("versionName", "");
                    final String apkUrl = json.getString("apk_url");

                    if (remoteVersionCode > BuildConfig.VERSION_CODE) {
                        activity.runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                if (!activity.isFinishing()) {
                                    showMandatoryUpdateDialog(activity, apkUrl, remoteVersionCode, remoteVersionName);
                                }
                            }
                        });
                    }
                } catch (Exception e) {
                    // No internet, host unreachable, malformed JSON, etc. — the game
                    // stays fully playable offline; we simply try again next launch.
                    Log.i(TAG, "Update check skipped: " + e.getMessage());
                }
            }
        }).start();
    }

    /**
     * Cheap, no-network check: is a previously-downloaded update sitting
     * there ready to install? Call from onResume() too, so returning to the
     * app after the download finished in the background (or after the app
     * was closed entirely) prompts the install immediately — never
     * re-downloading. Returns true if an install was just triggered.
     */
    public static boolean resumePendingInstallIfReady(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        long downloadId = prefs.getLong(KEY_PENDING_DOWNLOAD_ID, -1);
        if (downloadId == -1) return false;

        DownloadManager dm = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
        if (dm == null) return false;

        Cursor cursor = dm.query(new DownloadManager.Query().setFilterById(downloadId));
        try {
            if (cursor != null && cursor.moveToFirst()) {
                int status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
                if (status == DownloadManager.STATUS_SUCCESSFUL) {
                    promptInstall(context, getApkFile(context));
                    return true;
                } else if (status == DownloadManager.STATUS_FAILED) {
                    clearPendingState(context);
                }
            }
        } finally {
            if (cursor != null) cursor.close();
        }
        return false;
    }

    private static void showMandatoryUpdateDialog(final Activity activity, final String apkUrl,
                                                    final int versionCode, String versionName) {
        String message = "يتوفر إصدار جديد من تحدّي الثانية" +
                (versionName.isEmpty() ? "" : " (الإصدار " + versionName + ")") +
                ".\\nيرجى التحديث للمتابعة.";

        new AlertDialog.Builder(activity)
                .setTitle("تحديث متوفر")
                .setMessage(message)
                .setCancelable(false)
                .setPositiveButton("تحديث الآن", new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        startDownload(activity, apkUrl, versionCode);
                    }
                })
                .show();
    }

    private static void startDownload(Context context, String apkUrl, int versionCode) {
        DownloadManager dm = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
        if (dm == null) return;

        File existing = getApkFile(context);
        if (existing.exists()) existing.delete();

        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(apkUrl));
        request.setTitle("تحديث تحدّي الثانية");
        request.setDescription("جارِ تنزيل التحديث…");
        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
        request.setDestinationInExternalFilesDir(context, Environment.DIRECTORY_DOWNLOADS, APK_FILE_NAME);
        request.setMimeType("application/vnd.android.package-archive");
        request.setAllowedOverMetered(true);
        request.setAllowedOverRoaming(true);

        long downloadId = dm.enqueue(request);

        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putLong(KEY_PENDING_DOWNLOAD_ID, downloadId)
                .putInt(KEY_PENDING_VERSION_CODE, versionCode)
                .apply();

        if (context instanceof Activity) {
            showProgressDialog((Activity) context, downloadId);
        }
    }

    private static void showProgressDialog(final Activity activity, final long downloadId) {
        float density = activity.getResources().getDisplayMetrics().density;
        int pad = (int) (24 * density);

        LinearLayout layout = new LinearLayout(activity);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(pad, pad, pad, pad);

        final TextView label = new TextView(activity);
        label.setText("جارِ تنزيل التحديث… 0%");
        label.setGravity(Gravity.CENTER);
        layout.addView(label);

        final ProgressBar bar = new ProgressBar(activity, null, android.R.attr.progressBarStyleHorizontal);
        bar.setMax(100);
        LinearLayout.LayoutParams barParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        barParams.topMargin = pad / 2;
        layout.addView(bar, barParams);

        AlertDialog dialog = new AlertDialog.Builder(activity)
                .setTitle("تحديث تحدّي الثانية")
                .setView(layout)
                .setCancelable(false)
                .create();
        dialog.show();

        progressDialogRef = dialog;
        progressLabelRef = label;
        progressBarRef = bar;

        pollHandler = new Handler(Looper.getMainLooper());
        pollDownloadProgress(activity, downloadId);
    }

    private static void pollDownloadProgress(final Context context, final long downloadId) {
        final DownloadManager dm = (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
        if (dm == null) return;

        Cursor cursor = dm.query(new DownloadManager.Query().setFilterById(downloadId));
        try {
            if (cursor != null && cursor.moveToFirst()) {
                int status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
                long downloaded = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
                long total = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
                int pct = (total > 0) ? (int) (downloaded * 100L / total) : 0;

                if (progressBarRef != null) progressBarRef.setProgress(pct);
                if (progressLabelRef != null) progressLabelRef.setText("جارِ تنزيل التحديث… " + pct + "%");

                if (status == DownloadManager.STATUS_SUCCESSFUL) {
                    dismissProgressDialog();
                    promptInstall(context, getApkFile(context));
                    return;
                } else if (status == DownloadManager.STATUS_FAILED) {
                    dismissProgressDialog();
                    clearPendingState(context);
                    return;
                }
            }
        } finally {
            if (cursor != null) cursor.close();
        }

        if (pollHandler != null) {
            pollHandler.postDelayed(new Runnable() {
                @Override
                public void run() {
                    pollDownloadProgress(context, downloadId);
                }
            }, 400);
        }
    }

    private static void dismissProgressDialog() {
        if (pollHandler != null) pollHandler.removeCallbacksAndMessages(null);
        if (progressDialogRef != null && progressDialogRef.isShowing()) {
            progressDialogRef.dismiss();
        }
        progressDialogRef = null;
        progressLabelRef = null;
        progressBarRef = null;
    }

    /** Called from the app in the foreground, or from UpdateReceiver in the background. */
    public static void promptInstall(Context context, File apkFile) {
        if (!apkFile.exists()) return;

        Uri apkUri = FileProvider.getUriForFile(context, context.getPackageName() + ".fileprovider", apkFile);

        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        if (!(context instanceof Activity)) {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        }
        context.startActivity(intent);
    }

    private static void cleanupIfAlreadyUpToDate(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        int pendingVersionCode = prefs.getInt(KEY_PENDING_VERSION_CODE, -1);
        if (pendingVersionCode != -1 && BuildConfig.VERSION_CODE >= pendingVersionCode) {
            // We're now running the version we downloaded earlier — the update
            // succeeded. Clean up the leftover APK file and forget the pending state,
            // so nothing lingers from the old update cycle.
            File apk = getApkFile(context);
            if (apk.exists()) apk.delete();
            clearPendingState(context);
        }
    }

    private static void clearPendingState(Context context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .remove(KEY_PENDING_DOWNLOAD_ID)
                .remove(KEY_PENDING_VERSION_CODE)
                .apply();
    }

    private static File getApkFile(Context context) {
        File dir = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        return new File(dir, APK_FILE_NAME);
    }

    private static JSONObject fetchJson(String urlStr) throws Exception {
        URL url = new URL(urlStr);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setConnectTimeout(6000);
        conn.setReadTimeout(6000);
        conn.setRequestProperty("Cache-Control", "no-cache");
        try {
            BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) sb.append(line);
            reader.close();
            return new JSONObject(sb.toString());
        } finally {
            conn.disconnect();
        }
    }
}
`;

      const updateReceiverJava = `package ${appId};

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Catches DownloadManager's completion broadcast even when the app itself
 * isn't running, so an update finishes installing the moment the player
 * next opens the app (or immediately, if the app happens to be open).
 * DownloadManager is a shared system service — this fires for ALL
 * downloads on the device, so we always double-check the completed id
 * against our own saved one before doing anything.
 */
public class UpdateReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (DownloadManager.ACTION_DOWNLOAD_COMPLETE.equals(intent.getAction())) {
            UpdateManager.resumePendingInstallIfReady(context);
        }
    }
}
`;

      fs.writeFileSync(path.join(javaDir, "MainActivity.java"), mainActivityJava, "utf8");
      console.log(`  [ok] MainActivity.java (package ${appId})`);
      fs.writeFileSync(path.join(javaDir, "UpdateManager.java"), updateManagerJava, "utf8");
      console.log("  [ok] UpdateManager.java");
      fs.writeFileSync(path.join(javaDir, "UpdateReceiver.java"), updateReceiverJava, "utf8");
      console.log("  [ok] UpdateReceiver.java");
    }
  }
} else {
  console.warn("  [skip] capacitor.config.json not found");
}

console.log("✔ Android customization applied.");
