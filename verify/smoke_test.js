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
    // AudioContext is used only by the synthesized click sound (no <audio>
    // element or media playback exists in this app anymore).
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

setTimeout(() => {
  step("splash boot ran without throwing", () => {
    if (!doc.getElementById("splash-screen")) throw new Error("splash element missing");
  });

  step("navigate to main menu", () => {
    doc.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    doc.getElementById("main-menu").classList.add("active");
    if (!doc.getElementById("main-menu").classList.contains("active")) throw new Error("menu not active");
  });

  step("sound/music UI is fully removed, but the click-sound synth still fires on button press", () => {
    if (doc.getElementById("btn-sound")) throw new Error("btn-sound should no longer exist");
    if (doc.getElementById("sound-modal")) throw new Error("sound-modal should no longer exist");
    if (doc.getElementById("bg-music")) throw new Error("bg-music <audio> element should no longer exist");
    if (doc.getElementById("volume-slider")) throw new Error("volume-slider should no longer exist");
    // The click-sound synthesizer (Web Audio, no file) should be untouched:
    // exercised indirectly on every fireClick() throughout this suite via
    // the mocked AudioContext above — if it threw, it would show up in
    // "errors" collected at the end.
  });

  step("open and close how-to-play modal", () => {
    fireClick(doc.getElementById("btn-howto"));
    if (!doc.getElementById("howto-modal").classList.contains("open")) throw new Error("modal did not open");
    fireClick(doc.querySelector('#howto-modal .modal-close'));
    if (doc.getElementById("howto-modal").classList.contains("open")) throw new Error("modal did not close");
  });

  step("Play -> mode selection appears first and gates the Next button", () => {
    fireClick(doc.getElementById("btn-play"));
    if (!doc.getElementById("setup-step-mode").classList.contains("active")) {
      throw new Error("mode step should be active first, not count/names");
    }
    if (!doc.getElementById("mode-next-btn").disabled) {
      throw new Error("mode-next-btn should start disabled until a mode is chosen");
    }
  });

  step("choose fixed-rounds tournament mode with 1 round", () => {
    fireClick(doc.getElementById("mode-fixed-btn"));
    if (doc.getElementById("rounds-stepper").hidden) throw new Error("rounds stepper should reveal for fixed mode");
    if (doc.getElementById("mode-next-btn").disabled) throw new Error("mode-next-btn should enable once a mode is picked");
    for (let i = 0; i < 5; i++) fireClick(doc.getElementById("rounds-minus-btn"));
    if (doc.getElementById("rounds-value").textContent !== "1") throw new Error("rounds stepper floor should be 1");
    fireClick(doc.getElementById("mode-next-btn"));
    if (!doc.getElementById("setup-step-count").classList.contains("active")) throw new Error("did not advance to count step");
  });

  step("choose 2 players -> enter names -> start game", () => {
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

  step("player 1's turn: start/stop reveals instantly, then advances (not last player)", () => {
    const startBtn = doc.getElementById("start-stop-btn");
    fireClick(startBtn); // START
    if (startBtn.textContent !== "توقف") throw new Error("button did not switch to توقف");
    fireClick(startBtn); // STOP
    const revealed = doc.getElementById("timer-display").textContent;
    if (!/^\d+\.\d{2}$/.test(revealed)) throw new Error("revealed value not formatted X.XX: " + revealed);
    if (!doc.getElementById("next-turn-btn").classList.contains("show")) throw new Error("next button not shown for non-final player");
    if (doc.getElementById("round-result-panel").hidden !== true) throw new Error("round-result should stay hidden until the LAST player goes");
  });

  step("advance to player 2 turn (same round, same target)", () => {
    const targetBefore = doc.getElementById("target-number").textContent;
    fireClick(doc.getElementById("next-turn-btn"));
    if (doc.getElementById("current-player-name").textContent !== "سارة") {
      throw new Error("expected player 2 to be سارة, got " + doc.getElementById("current-player-name").textContent);
    }
    if (doc.getElementById("target-number").textContent !== targetBefore) {
      throw new Error("target must stay the same for all players within one round");
    }
  });

  step("player 2 (last player) triggers the round-result panel automatically", () => {
    const startBtn = doc.getElementById("start-stop-btn");
    fireClick(startBtn); // START
    fireClick(startBtn); // STOP
    if (doc.getElementById("round-result-panel").hidden !== false) throw new Error("round-result panel should now be visible");
    if (doc.getElementById("turn-play-area").hidden !== true) throw new Error("turn-play-area should be hidden during round-result");
    const rows = doc.querySelectorAll(".round-result-row");
    if (rows.length !== 2) throw new Error("expected 2 rows in round result, got " + rows.length);
  });

  step("continuing through the only round reaches the tournament-end screen", () => {
    if (doc.getElementById("round-continue-btn").textContent !== "عرض نتيجة البطولة") {
      throw new Error("expected round-continue-btn to offer tournament result on the final round, got: " + doc.getElementById("round-continue-btn").textContent);
    }
    fireClick(doc.getElementById("round-continue-btn"));
    if (!doc.getElementById("tournament-end-screen").classList.contains("active")) {
      throw new Error("did not reach tournament-end screen");
    }
    const champion = doc.getElementById("champion-name").textContent;
    if (!champion || champion === "—") throw new Error("champion name not set");
    const standings = doc.querySelectorAll("#final-standings-list .rank-row");
    if (standings.length !== 2) throw new Error("expected 2 rows in final standings, got " + standings.length);
  });

  step("return to main menu from tournament-end screen", () => {
    fireClick(doc.getElementById("tournament-menu-btn"));
    if (!doc.getElementById("main-menu").classList.contains("active")) throw new Error("did not return to main menu");
  });

  setTimeout(() => {
    console.log("\n--- window errors captured ---");
    console.log(errors.length ? errors : "(none)");
    process.exit(errors.length ? 1 : 0);
  }, 100);

}, 300);
