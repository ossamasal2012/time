const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const htmlPath = path.join(__dirname, "..", "www", "index.html");
const html = fs.readFileSync(htmlPath, "utf-8");

function makeGame() {
  const errors = [];
  const dom = new JSDOM(html, {
    url: "file://" + htmlPath,
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
    beforeParse(window) {
      window.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
      window.HTMLMediaElement.prototype.pause = function () {};
      window.AudioContext = function () {
        return {
          state: "running", currentTime: 0, resume() {},
          createOscillator() { return { type: "", frequency: { setValueAtTime(){}, exponentialRampToValueAtTime(){} }, connect(){return this;}, start(){}, stop(){} }; },
          createGain() { return { gain: { setValueAtTime(){}, exponentialRampToValueAtTime(){} }, connect(){return this;} }; },
          destination: {}
        };
      };
      window.addEventListener("error", (e) => errors.push(e.error ? e.error.stack : e.message));
      let fakeNow = 0;
      window.performance.now = () => fakeNow;
      window.__setFakeNow = (v) => { fakeNow = v; };
    }
  });
  return { dom, errors };
}

function fireClick(window, el) { el.dispatchEvent(new window.MouseEvent("click", { bubbles: true })); }

function setupGame(window, doc, playerNames, roundCount) {
  doc.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  doc.getElementById("main-menu").classList.add("active");

  fireClick(window, doc.getElementById("btn-play"));
  fireClick(window, doc.getElementById("mode-fixed-btn"));
  // stepper defaults to 5 -> bring to roundCount
  let current = 5;
  while (current > roundCount) { fireClick(window, doc.getElementById("rounds-minus-btn")); current--; }
  while (current < roundCount) { fireClick(window, doc.getElementById("rounds-plus-btn")); current++; }
  fireClick(window, doc.getElementById("mode-next-btn"));

  const badges = doc.querySelectorAll(".count-badge");
  fireClick(window, badges[playerNames.length - 1]);
  fireClick(window, doc.getElementById("count-next-btn"));

  const nameInputs = doc.querySelectorAll(".name-input");
  playerNames.forEach((name, i) => { nameInputs[i].value = name; });
  fireClick(window, doc.getElementById("start-game-btn"));
}

function playTurn(window, doc, elapsedSeconds) {
  const startBtn = doc.getElementById("start-stop-btn");
  window.__setFakeNow(0);
  fireClick(window, startBtn);
  window.__setFakeNow(elapsedSeconds * 1000);
  fireClick(window, startBtn);
}

function scoreOf(doc, name) {
  const rows = doc.querySelectorAll("#round-result-list .round-result-row");
  for (const row of rows) {
    if (row.querySelector(".round-result-name").textContent === name) {
      return row.classList.contains("winner");
    }
  }
  throw new Error("player not found in round result: " + name);
}

let anyFailure = false;
function check(label, cond) {
  if (cond) { console.log("✔", label); }
  else { console.log("✘ FAILED:", label); anyFailure = true; }
}

/* ---------- Scenario 1: solo play requires an EXACT match ---------- */
(() => {
  const { dom, errors } = makeGame();
  const { window } = dom;
  const doc = window.document;
  setTimeout(() => {
    setupGame(window, doc, ["اللاعب المنفرد"], 5);
    const target = parseFloat(doc.getElementById("target-number").textContent);

    playTurn(window, doc, target); // exact
    const scoreExact = parseInt(doc.getElementById("current-player-score").textContent, 10);
    // score display only updates on the NEXT render, so read it from round-result instead:
    const wonExact = scoreOf(doc, "اللاعب المنفرد");
    check("Scenario 1a: solo exact match wins the round", wonExact === true);

    fireClick(window, doc.getElementById("round-continue-btn"));
    const target2 = parseFloat(doc.getElementById("target-number").textContent);
    playTurn(window, doc, Math.max(0, target2 - 0.01)); // near miss
    const wonMiss = scoreOf(doc, "اللاعب المنفرد");
    check("Scenario 1b: solo near-miss (-0.01) wins nothing", wonMiss === false);

    check("Scenario 1: no runtime errors", errors.length === 0);
  }, 300);
})();

/* ---------- Scenario 2: two players, one clearly closer ---------- */
(() => {
  const { dom, errors } = makeGame();
  const { window } = dom;
  const doc = window.document;
  setTimeout(() => {
    setupGame(window, doc, ["قريب", "بعيد"], 5);
    const target = parseFloat(doc.getElementById("target-number").textContent);

    playTurn(window, doc, target); // "قريب" stops exactly on target
    fireClick(window, doc.getElementById("next-turn-btn"));
    playTurn(window, doc, Math.min(14, target + 0.5)); // "بعيد" is way off

    const closeWon = scoreOf(doc, "قريب");
    const farWon = scoreOf(doc, "بعيد");
    check("Scenario 2: the closer player wins the point", closeWon === true);
    check("Scenario 2: the farther player wins nothing", farWon === false);
    check("Scenario 2: no runtime errors", errors.length === 0);
  }, 300);
})();

/* ---------- Scenario 3: two players tie for closest -> BOTH score ---------- */
(() => {
  const { dom, errors } = makeGame();
  const { window } = dom;
  const doc = window.document;
  setTimeout(() => {
    setupGame(window, doc, ["أ", "ب"], 5);
    const target = parseFloat(doc.getElementById("target-number").textContent);

    // Both land exactly 0.02 away from target (one under, one over) -> tied distance.
    const low = Math.max(0.5, +(target - 0.02).toFixed(2));
    const high = Math.min(14, +(target + 0.02).toFixed(2));

    playTurn(window, doc, low);
    fireClick(window, doc.getElementById("next-turn-btn"));
    playTurn(window, doc, high);

    const aWon = scoreOf(doc, "أ");
    const bWon = scoreOf(doc, "ب");
    check("Scenario 3: tied-distance player A also wins the point", aWon === true);
    check("Scenario 3: tied-distance player B also wins the point", bWon === true);
    check("Scenario 3: no runtime errors", errors.length === 0);
  }, 300);
})();

/* ---------- Scenario 4: three players, only the single closest wins ---------- */
(() => {
  const { dom, errors } = makeGame();
  const { window } = dom;
  const doc = window.document;
  setTimeout(() => {
    setupGame(window, doc, ["الأقرب", "متوسط", "الأبعد"], 5);
    const target = parseFloat(doc.getElementById("target-number").textContent);

    playTurn(window, doc, target); // exact
    fireClick(window, doc.getElementById("next-turn-btn"));
    playTurn(window, doc, Math.max(0.5, +(target - 0.05).toFixed(2)));
    fireClick(window, doc.getElementById("next-turn-btn"));
    playTurn(window, doc, Math.min(14, +(target + 0.3).toFixed(2)));

    check("Scenario 4: closest player wins", scoreOf(doc, "الأقرب") === true);
    check("Scenario 4: middling player wins nothing", scoreOf(doc, "متوسط") === false);
    check("Scenario 4: farthest player wins nothing", scoreOf(doc, "الأبعد") === false);
    check("Scenario 4: no runtime errors", errors.length === 0);

    console.log("\n" + (anyFailure ? "SOME CHECKS FAILED" : "ALL CHECKS PASSED"));
    process.exitCode = anyFailure ? 1 : 0;
  }, 300);
})();
