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

    // Mock performance.now() so we can dictate exact elapsed durations.
    let fakeNow = 0;
    window.performance.now = () => fakeNow;
    window.__setFakeNow = (v) => { fakeNow = v; };
  }
});

const { window } = dom;
const doc = window.document;
function fireClick(el) { el.dispatchEvent(new window.MouseEvent("click", { bubbles: true })); }

setTimeout(() => {
  doc.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  doc.getElementById("main-menu").classList.add("active");

  fireClick(doc.getElementById("btn-play"));
  fireClick(doc.querySelectorAll(".count-badge")[0]); // 1 player
  fireClick(doc.getElementById("count-next-btn"));
  doc.querySelectorAll(".name-input")[0].value = "لاعب الاختبار";
  fireClick(doc.getElementById("start-game-btn"));

  const target = parseFloat(doc.getElementById("target-number").textContent);
  console.log("Target for this round:", target.toFixed(2));

  // --- Case 1: stop EXACTLY on target -> must score a point ---
  window.__setFakeNow(0);
  fireClick(doc.getElementById("start-stop-btn")); // START at t=0
  window.__setFakeNow(target * 1000); // exactly target seconds later
  fireClick(doc.getElementById("start-stop-btn")); // STOP

  const revealed1 = doc.getElementById("timer-display").textContent;
  const scoreAfterExact = parseInt(doc.getElementById("current-player-score").textContent, 10);
  console.log("Case 1 (exact): revealed =", revealed1, "| score =", scoreAfterExact, "| expected 1");
  if (scoreAfterExact !== 1) { console.log("✘ FAILED: exact match should award a point"); process.exitCode = 1; }
  else console.log("✔ exact match correctly awarded a point");

  const bannerHit = doc.getElementById("result-banner").classList.contains("hit");
  console.log(bannerHit ? "✔ banner shows hit state" : "✘ banner missing hit state");

  // advance to next round (only 1 player -> wraps back to same player, new target)
  fireClick(doc.getElementById("next-turn-btn"));
  const newTarget = parseFloat(doc.getElementById("target-number").textContent);
  console.log("New round target:", newTarget.toFixed(2));

  // --- Case 2: stop 0.01s OFF target -> must NOT score ---
  const scoreBefore = parseInt(doc.getElementById("current-player-score").textContent, 10);
  window.__setFakeNow(0);
  fireClick(doc.getElementById("start-stop-btn")); // START
  const offTarget = Math.max(0, newTarget - 0.01);
  window.__setFakeNow(offTarget * 1000);
  fireClick(doc.getElementById("start-stop-btn")); // STOP

  const revealed2 = doc.getElementById("timer-display").textContent;
  const scoreAfterMiss = parseInt(doc.getElementById("current-player-score").textContent, 10);
  console.log("Case 2 (near-miss -0.01): revealed =", revealed2, "| score =", scoreAfterMiss, "| expected", scoreBefore);
  if (scoreAfterMiss !== scoreBefore) { console.log("✘ FAILED: near-miss should NOT award a point"); process.exitCode = 1; }
  else console.log("✔ near-miss correctly awarded no point");

  const bannerMiss = doc.getElementById("result-banner").classList.contains("miss");
  console.log(bannerMiss ? "✔ banner shows miss state" : "✘ banner missing miss state");

  console.log("\nwindow errors captured:", errors.length ? errors : "(none)");
  if (errors.length) process.exitCode = 1;
}, 300);
