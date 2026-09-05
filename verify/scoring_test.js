const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const htmlPath = path.join(__dirname, "..", "www", "index.html");
const html = fs.readFileSync(htmlPath, "utf-8");

let anyFailure = false;
function check(label, cond) {
  if (cond) { console.log("  ✔", label); }
  else { console.log("  ✘ FAILED:", label); anyFailure = true; }
}

function makeGame() {
  const errors = [];
  const dom = new JSDOM(html, {
    url: "file://" + htmlPath,
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
    beforeParse(window) {
      window.HTMLMediaElement.prototype.load = function () {};
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

// Run each scenario in its own JSDOM instance, one at a time (sequential),
// to avoid any cross-instance timing races between parallel script loads.
function runScenario(name, fn) {
  return new Promise((resolve) => {
    const { dom, errors } = makeGame();
    const { window } = dom;
    const doc = window.document;
    setTimeout(() => {
      console.log("\n" + name);
      try {
        fn(window, doc);
      } catch (e) {
        console.log("  ✘ EXCEPTION:", e.message);
        anyFailure = true;
      }
      if (errors.length) {
        console.log("  ✘ runtime errors:", errors);
        anyFailure = true;
      } else {
        console.log("  (no runtime errors)");
      }
      resolve();
    }, 250);
  });
}

function fireClick(window, el) { el.dispatchEvent(new window.MouseEvent("click", { bubbles: true })); }

function setRuleViaUI(window, doc, rule) {
  fireClick(window, doc.getElementById("btn-rules"));
  if (rule === "default") {
    fireClick(window, doc.getElementById("rule-default-radio"));
  } else {
    if (!doc.getElementById("double-points-toggle").checked) {
      fireClick(window, doc.getElementById("double-points-toggle"));
    }
    const radioId = rule === "customA" ? "rule-a-radio" : "rule-b-radio";
    fireClick(window, doc.getElementById(radioId));
  }
  fireClick(window, doc.getElementById("rules-back-btn"));
}

function setupGame(window, doc, playerNames, roundCount) {
  doc.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  doc.getElementById("main-menu").classList.add("active");

  fireClick(window, doc.getElementById("btn-play"));
  fireClick(window, doc.getElementById("mode-fixed-btn"));
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

function pointsOf(doc, name) {
  const rows = doc.querySelectorAll("#round-result-list .round-result-row");
  for (const row of rows) {
    if (row.querySelector(".round-result-name").textContent === name) {
      const badge = row.querySelector(".round-result-point");
      return badge ? parseInt(badge.textContent.replace("+", ""), 10) : 0;
    }
  }
  throw new Error("player not found in round result: " + name);
}

(async () => {
  await runScenario("Scenario 1 [default]: solo requires an exact match", (window, doc) => {
    setupGame(window, doc, ["اللاعب المنفرد"], 5);
    const target = parseFloat(doc.getElementById("target-number").textContent);

    playTurn(window, doc, target);
    check("exact match on solo turn wins 1 point", pointsOf(doc, "اللاعب المنفرد") === 1);

    fireClick(window, doc.getElementById("round-continue-btn"));
    const target2 = parseFloat(doc.getElementById("target-number").textContent);
    playTurn(window, doc, Math.max(0, target2 - 0.01));
    check("near-miss on solo turn wins 0 points", pointsOf(doc, "اللاعب المنفرد") === 0);
  });

  await runScenario("Scenario 2 [default]: clearly closer player wins, farther wins nothing", (window, doc) => {
    setupGame(window, doc, ["قريب", "بعيد"], 5);
    const target = parseFloat(doc.getElementById("target-number").textContent);
    playTurn(window, doc, target);
    fireClick(window, doc.getElementById("next-turn-btn"));
    playTurn(window, doc, Math.min(14, target + 0.5));
    check("closer player wins 1 point", pointsOf(doc, "قريب") === 1);
    check("farther player wins 0 points", pointsOf(doc, "بعيد") === 0);
  });

  await runScenario("Scenario 3 [default]: tied distance -> both win 1 point", (window, doc) => {
    setupGame(window, doc, ["أ", "ب"], 5);
    const target = parseFloat(doc.getElementById("target-number").textContent);
    const low = Math.max(0.5, +(target - 0.02).toFixed(2));
    const high = Math.min(14, +(target + 0.02).toFixed(2));
    playTurn(window, doc, low);
    fireClick(window, doc.getElementById("next-turn-btn"));
    playTurn(window, doc, high);
    check("tied player A wins 1 point", pointsOf(doc, "أ") === 1);
    check("tied player B wins 1 point", pointsOf(doc, "ب") === 1);
  });

  await runScenario("Scenario 4 [default]: exact hit still only worth 1 point (not 2) under default rules", (window, doc) => {
    setupGame(window, doc, ["مصيب", "بعيد"], 5);
    const target = parseFloat(doc.getElementById("target-number").textContent);
    playTurn(window, doc, target); // exact
    fireClick(window, doc.getElementById("next-turn-btn"));
    playTurn(window, doc, Math.min(14, target + 1));
    check("exact hit under DEFAULT rule is worth exactly 1 point", pointsOf(doc, "مصيب") === 1);
    check("far player wins 0 points", pointsOf(doc, "بعيد") === 0);
  });

  await runScenario("Scenario 5 [customA]: exact hit worth 2, non-exact gets nothing", (window, doc) => {
    setRuleViaUI(window, doc, "customA");
    setupGame(window, doc, ["مصيب", "قريب لكن ليس تامًا"], 5);
    const target = parseFloat(doc.getElementById("target-number").textContent);
    playTurn(window, doc, target); // exact
    fireClick(window, doc.getElementById("next-turn-btn"));
    playTurn(window, doc, Math.max(0.5, +(target - 0.01).toFixed(2))); // very close but not exact
    check("exact hit under CUSTOM-A is worth 2 points", pointsOf(doc, "مصيب") === 2);
    check("near-miss wins 0 when an exact hit exists (CUSTOM-A)", pointsOf(doc, "قريب لكن ليس تامًا") === 0);
  });

  await runScenario("Scenario 6 [customA]: no exact hit -> falls back to closest wins 1 point", (window, doc) => {
    setRuleViaUI(window, doc, "customA");
    setupGame(window, doc, ["قريب", "بعيد"], 5);
    const target = parseFloat(doc.getElementById("target-number").textContent);
    playTurn(window, doc, Math.max(0.5, +(target - 0.05).toFixed(2))); // close, not exact
    fireClick(window, doc.getElementById("next-turn-btn"));
    playTurn(window, doc, Math.min(14, +(target + 0.8).toFixed(2))); // far
    check("closest (non-exact) wins 1 point via CUSTOM-A fallback", pointsOf(doc, "قريب") === 1);
    check("farther player wins 0 points", pointsOf(doc, "بعيد") === 0);
  });

  await runScenario("Scenario 7 [customA]: two players both hit exactly -> both get 2 points", (window, doc) => {
    setRuleViaUI(window, doc, "customA");
    setupGame(window, doc, ["أ", "ب"], 5);
    const target = parseFloat(doc.getElementById("target-number").textContent);
    playTurn(window, doc, target);
    fireClick(window, doc.getElementById("next-turn-btn"));
    playTurn(window, doc, target);
    check("tied exact hit A wins 2 points (CUSTOM-A)", pointsOf(doc, "أ") === 2);
    check("tied exact hit B wins 2 points (CUSTOM-A)", pointsOf(doc, "ب") === 2);
  });

  await runScenario("Scenario 8 [customB]: exact hit worth 2, rest get nothing", (window, doc) => {
    setRuleViaUI(window, doc, "customB");
    setupGame(window, doc, ["مصيب", "آخر"], 5);
    const target = parseFloat(doc.getElementById("target-number").textContent);
    playTurn(window, doc, target);
    fireClick(window, doc.getElementById("next-turn-btn"));
    playTurn(window, doc, Math.max(0.5, +(target - 0.05).toFixed(2)));
    check("exact hit under CUSTOM-B is worth 2 points", pointsOf(doc, "مصيب") === 2);
    check("non-exact player wins 0 (CUSTOM-B)", pointsOf(doc, "آخر") === 0);
  });

  await runScenario("Scenario 9 [customB]: NO exact hit -> nobody scores at all, even the closest", (window, doc) => {
    setRuleViaUI(window, doc, "customB");
    setupGame(window, doc, ["قريب جدًا", "بعيد"], 5);
    const target = parseFloat(doc.getElementById("target-number").textContent);
    playTurn(window, doc, Math.max(0.5, +(target - 0.01).toFixed(2))); // very close, not exact
    fireClick(window, doc.getElementById("next-turn-btn"));
    playTurn(window, doc, Math.min(14, +(target + 1).toFixed(2)));
    check("closest-but-not-exact wins 0 under CUSTOM-B (no fallback)", pointsOf(doc, "قريب جدًا") === 0);
    check("farther player also wins 0 under CUSTOM-B", pointsOf(doc, "بعيد") === 0);
    const winnerBanner = doc.getElementById("round-result-winner-banner").textContent;
    check("banner announces nobody scored", winnerBanner.indexOf("لم يُصب") !== -1);
  });

  await runScenario("Scenario 10 [customA, solo]: exact -> 2 points, non-exact -> 0 (no trivial fallback)", (window, doc) => {
    setRuleViaUI(window, doc, "customA");
    setupGame(window, doc, ["منفرد"], 5);
    const target = parseFloat(doc.getElementById("target-number").textContent);
    playTurn(window, doc, target);
    check("solo exact hit under CUSTOM-A wins 2 points", pointsOf(doc, "منفرد") === 2);

    fireClick(window, doc.getElementById("round-continue-btn"));
    const target2 = parseFloat(doc.getElementById("target-number").textContent);
    playTurn(window, doc, Math.max(0.5, target2 - 0.01));
    check("solo near-miss under CUSTOM-A wins 0 (closest-fallback does not apply solo)", pointsOf(doc, "منفرد") === 0);
  });

  await runScenario("Scenario 11 [customB, solo]: exact -> 2 points, non-exact -> 0", (window, doc) => {
    setRuleViaUI(window, doc, "customB");
    setupGame(window, doc, ["منفرد"], 5);
    const target = parseFloat(doc.getElementById("target-number").textContent);
    playTurn(window, doc, target);
    check("solo exact hit under CUSTOM-B wins 2 points", pointsOf(doc, "منفرد") === 2);
  });

  await runScenario("Scenario 12: Rules screen UI stays in sync with the selected rule", (window, doc) => {
    setRuleViaUI(window, doc, "customB");
    fireClick(window, doc.getElementById("btn-rules"));
    check("rule-b-radio is checked right after selecting it", doc.getElementById("rule-b-radio").checked === true);
    check("toggle is ON after selecting a custom rule", doc.getElementById("double-points-toggle").checked === true);
  });

  console.log("\n" + (anyFailure ? "SOME CHECKS FAILED" : "ALL CHECKS PASSED"));
  process.exitCode = anyFailure ? 1 : 0;
})();
