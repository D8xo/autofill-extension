const fillBtn      = document.getElementById("fill-btn");
const subtitle     = document.getElementById("subtitle");
const results      = document.getElementById("results");
const summary      = document.getElementById("results-summary");
const unfilledList = document.getElementById("unfilled-list");

document.getElementById("edit-profile-link").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

fillBtn.addEventListener("click", () => {
  fillBtn.disabled = true;
  fillBtn.textContent = "Filling…";
  results.classList.add("hidden");

  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    chrome.tabs.sendMessage(tab.id, { action: "fill" }, (response) => {
      fillBtn.disabled = false;
      fillBtn.textContent = "Fill Again";

      if (chrome.runtime.lastError || !response) {
        showError("Could not connect to page. Try reloading the tab.");
        return;
      }

      showResults(response);
    });
  });
});

function showResults({ filled, unfilled }) {
  results.classList.remove("hidden");

  const filledCount = filled.length;
  summary.textContent = `Filled ${filledCount} field${filledCount !== 1 ? "s" : ""}`;
  summary.className = "results-summary " + (filledCount > 0 ? "ok" : "warn");

  const required = unfilled.filter(f => f.required);

  if (required.length === 0) {
    unfilledList.innerHTML = filledCount > 0
      ? '<p class="all-good">All detected fields filled.</p>'
      : "";
    return;
  }

  unfilledList.innerHTML =
    `<p class="needs-heading">Needs your input (${required.length}):</p>` +
    `<ul class="needs-list">` +
    required.map(f => `<li>${esc(f.label)}</li>`).join("") +
    `</ul>`;
}

function showError(msg) {
  results.classList.remove("hidden");
  summary.textContent = msg;
  summary.className = "results-summary error";
  unfilledList.innerHTML = "";
}

function esc(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
