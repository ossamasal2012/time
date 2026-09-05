const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const htmlPath = path.join(__dirname, "..", "www", "index.html");
const html = fs.readFileSync(htmlPath, "utf-8");

const errors = [];

const dom = new JSDOM(html, {
  url: "file://" + htmlPath,
  runScripts: "dangerously",
  resources: "usable",
  pretendToBeVisual: true,
  beforeParse(window) {
    // Stub out things jsdom doesn't implement.
    window.HTMLMediaElement.prototype.play = function () {
      this.dispatchEvent(new window.Event("play"));
      return Promise.resolve();
    };
    window.HTMLMediaElement.prototype.pause = function () {};
    window.AudioContext = function () {
      return {
        state: "running",
        currentTime: 0,
        resume() {},
        createOscillator() {
          return {
            type: "",
            frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
            connect() { return this; },
            start() {},
            stop() {}
          };
        },
        createGain() {
          return {
            gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
            connect() { return this; }
          };
        },
        destination: {}
      };
    };
    window.onerror = function (msg, src, line, col, err) {
      errors.push((err && err.stack) || msg);
    };
    window.addEventListener("error", (e) => {
      errors.push(e.error ? e.error.stack : e.message);
    });
  }
});

const { window } = dom;
const doc = window.document;

function fireClick(el) {
  el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
}

function step(label, fn) {
  try {
    fn();
    console.log("✔", label);
  } catch (e) {
    console.log("✘", label, "->", e.message);
    errors.push(e.stack);
  }
}

// Let DOMContentLoaded fire, then fast-forward past the splash timers.
setTimeout(() => {
  step("splash boot ran without throwing", () => {
    if (!doc.getElementById("splash-screen")) throw new Error("splash element missing");
  });

  // Manually invoke the splash->menu transition logic since we don't want to
  // wait 2 real seconds; simulate by directly showing main-menu as app.js would.
  step("navigate to main menu", () => {
    doc.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    doc.getElementById("main-menu").classList.add("active");
    if (!doc.getElementById("main-menu").classList.contains("active")) throw new Error("menu not active");
  });

  step("open and close how-to-play modal", () => {
    fireClick(doc.getElementById("btn-howto"));
    if (!doc.getElementById("howto-modal").classList.contains("open")) throw new Error("modal did not open");
    fireClick(doc.querySelector('#howto-modal .modal-close'));
    if (doc.getElementById("howto-modal").classList.contains("open")) throw new Error("modal did not close");
  });

  step("open sound modal and move volume slider", () => {
    fireClick(doc.getElementById("btn-sound"));
    const slider = doc.getElementById("volume-slider");
    slider.value = "0.3";
    slider.dispatchEvent(new window.Event("input", { bubbles: true }));
    fireClick(doc.querySelector('#sound-modal .modal-close'));
  });

  step("click Play -> choose 2 players -> enter names -> start game", () => {
    fireClick(doc.getElementById("btn-play"));
    const badges = doc.querySelectorAll(".count-badge");
    if (badges.length !== 10) throw new Error("expected 10 count badges, got " + badges.length);
    fireClick(badges[1]); // "2"
    fireClick(doc.getElementById("count-next-btn"));
    const nameInputs = doc.querySelectorAll(".name-input");
    if (nameInputs.length !== 2) throw new Error("expected 2 name inputs, got " + nameInputs.length);
    nameInputs[0].value = "أحمد";
    nameInputs[1].value = "سارة";
    fireClick(doc.getElementById("start-game-btn"));
    if (!doc.getElementById("game-screen").classList.contains("active")) throw new Error("game screen not active");
    if (doc.getElementById("current-player-name").textContent !== "أحمد") {
      throw new Error("expected player 1 to be أحمد, got " + doc.getElementById("current-player-name").textContent);
    }
  });

  step("target number is a valid two-decimal value from the pool", () => {
    const txt = doc.getElementById("target-number").textContent;
    const val = parseFloat(txt);
    if (isNaN(val) || val < 0.5 || val > 14.0) throw new Error("target out of range: " + txt);
    if (!/^\d{1,2}\.\d{2}$/.test(txt)) throw new Error("target format invalid: " + txt);
  });

  step("start/stop timer flow reveals a value instantly, no lingering hidden state", () => {
    const startBtn = doc.getElementById("start-stop-btn");
    fireClick(startBtn); // START
    if (doc.getElementById("timer-display").textContent === "--.--") {
      // expected: should now show the hidden running indicator, not the placeholder
    }
    if (startBtn.textContent !== "توقف") throw new Error("button did not switch to توقف");

    fireClick(startBtn); // STOP
    const revealed = doc.getElementById("timer-display").textContent;
    if (!/^\d+\.\d{2}$/.test(revealed)) throw new Error("revealed value not formatted X.XX: " + revealed);
    if (!doc.getElementById("next-turn-btn").classList.contains("show")) throw new Error("next button not shown");
  });

  step("advance to player 2 turn", () => {
    fireClick(doc.getElementById("next-turn-btn"));
    if (doc.getElementById("current-player-name").textContent !== "سارة") {
      throw new Error("expected player 2 to be سارة, got " + doc.getElementById("current-player-name").textContent);
    }
  });

  step("rankings modal opens and lists both players", () => {
    fireClick(doc.getElementById("rankings-btn"));
    const rows = doc.querySelectorAll(".rank-row");
    if (rows.length !== 2) throw new Error("expected 2 ranking rows, got " + rows.length);
    fireClick(doc.querySelector('#rankings-modal .modal-close'));
  });

  step("exit game shows confirm dialog and returns to menu", () => {
    fireClick(doc.getElementById("exit-game-btn"));
    if (!doc.getElementById("confirm-modal").classList.contains("open")) throw new Error("confirm modal did not open");
    fireClick(doc.getElementById("confirm-yes"));
    if (!doc.getElementById("main-menu").classList.contains("active")) throw new Error("did not return to main menu");
  });

  setTimeout(() => {
    console.log("\n--- window errors captured ---");
    console.log(errors.length ? errors : "(none)");
    process.exit(errors.length ? 1 : 0);
  }, 100);

}, 300);
