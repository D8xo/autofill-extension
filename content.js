// Maps each profile key to every label variation it might appear as
const FIELD_KEYWORDS = {
  firstName:          ["first name", "given name", "forename", "legal first"],
  lastName:           ["last name", "surname", "family name", "legal last"],
  email:              ["email", "e-mail", "email address", "electronic mail"],
  phone:              ["phone", "telephone", "mobile", "cell", "contact number", "phone number"],
  addressStreet:      ["street address", "address line 1", "address 1", "street", "mailing address"],
  addressCity:        ["city", "town", "municipality", "locality"],
  addressState:       ["state", "province", "region", "state / province"],
  addressZip:         ["zip", "zip code", "postal code", "post code", "postal"],
  addressCountry:     ["country", "nation", "country of residence"],
  linkedin:           ["linkedin", "linkedin url", "linkedin profile"],
  github:             ["github", "github url", "github profile"],
  portfolio:          ["portfolio", "personal website", "personal site", "website url", "personal url", "website"],
  workAuthorized:     ["authorized to work", "work authorization", "legally authorized", "eligible to work",
                       "employment eligibility", "work in the us", "u.s. work", "authorized in the",
                       "right to work", "work legally", "legally work"],
  requireSponsorship: ["sponsorship", "visa sponsorship", "require sponsorship", "need sponsorship",
                       "work visa", "employment sponsorship", "sponsor", "require visa"],
  veteranStatus:      ["veteran", "military", "protected veteran", "military service", "veteran status"],
  disabilityStatus:   ["disability", "disabled", "accommodation", "disability status"],
  schoolName:         ["school", "university", "college", "institution", "secondary education",
                       "undergraduate institution", "alma mater", "academic institution",
                       "school name", "university name", "college name", "name of school",
                       "name of university", "name of college", "attended", "educational institution"],
  degree:             ["degree", "education level", "highest degree", "highest level of education",
                       "qualification", "academic degree", "degree type", "degree earned",
                       "level of education", "type of degree"],
  major:              ["major", "field of study", "concentration", "area of study",
                       "discipline", "program of study", "area of concentration", "study area"],
  gpa:                ["gpa", "grade point average", "cumulative gpa", "academic gpa", "grade point"],
  gradMonth:          ["graduation month", "grad month", "month of graduation"],
  gradYear:           ["graduation year", "grad year", "year of graduation", "expected graduation",
                       "graduation date", "class of", "graduating year", "year graduated"],
  yearsExperience:    ["years of experience", "years experience", "how many years", "total years",
                       "professional experience", "years of professional", "number of years"],
  recentTitle:        ["job title", "current title", "most recent title", "position title",
                       "current position", "last position", "your title", "title"],
  recentCompany:      ["company", "employer", "organization", "most recent employer",
                       "current employer", "last employer", "current company", "company name",
                       "employer name", "place of employment"],
  startDate:          ["start date", "available to start", "earliest start date",
                       "when can you start", "availability date", "date available"],
  jobType:            ["work arrangement", "work type", "job type", "work location",
                       "remote preference", "location preference", "work setting"],
};

const YES_NO_MAP = {
  yes: ["yes", "y", "i am", "i do", "true", "will", "i will", "i can"],
  no:  ["no",  "n", "i am not", "i do not", "false", "will not", "i won't", "i cannot"],
};

// --- Label detection ---

function getLabelText(el) {
  // 1. <label for="id">
  if (el.id) {
    try {
      const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (label) return label.textContent.trim().toLowerCase();
    } catch (_) {}
  }
  // 2. aria-label
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel.toLowerCase();
  // 3. aria-labelledby
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const text = labelledBy.split(" ")
      .map(id => document.getElementById(id)?.textContent.trim() || "")
      .join(" ").trim();
    if (text) return text.toLowerCase();
  }
  // 4. Wrapping <label>
  const wrappingLabel = el.closest("label");
  if (wrappingLabel) return wrappingLabel.textContent.trim().toLowerCase();
  // 5. Parent/grandparent label element
  for (let el2 = el.parentElement; el2 && el2 !== document.body; el2 = el2.parentElement) {
    const label = el2.querySelector("label");
    if (label && label !== el) return label.textContent.trim().toLowerCase();
    // Workday uses data-automation-id on label containers
    const autoLabel = el2.querySelector(
      "[data-automation-id*='Label'], [data-automation-id*='label'], [class*='label']"
    );
    if (autoLabel && autoLabel !== el) return autoLabel.textContent.trim().toLowerCase();
    // Stop after a few levels — don't grab unrelated labels higher up
    if (el2.querySelectorAll("input, select, textarea").length > 3) break;
  }
  // 6. Placeholder fallback
  if (el.placeholder) return el.placeholder.toLowerCase();
  return "";
}

function getRadioGroupLabel(name) {
  const first = document.querySelector(`input[type="radio"][name="${name}"]`);
  if (!first) return "";
  // fieldset > legend
  const fieldset = first.closest("fieldset");
  if (fieldset) {
    const legend = fieldset.querySelector("legend");
    if (legend) return legend.textContent.trim().toLowerCase();
  }
  // role="radiogroup" with aria-labelledby
  for (let el = first.parentElement; el && el !== document.body; el = el.parentElement) {
    if (el.getAttribute("role") === "radiogroup") {
      const lid = el.getAttribute("aria-labelledby");
      if (lid) return (document.getElementById(lid)?.textContent || "").trim().toLowerCase();
      const al = el.getAttribute("aria-label");
      if (al) return al.toLowerCase();
    }
  }
  return getLabelText(first);
}

function matchField(labelText) {
  if (!labelText) return null;
  for (const [key, keywords] of Object.entries(FIELD_KEYWORDS)) {
    for (const kw of keywords) {
      if (labelText.includes(kw)) return key;
    }
  }
  return null;
}

// --- Required detection ---

function isRequired(el) {
  if (el.required || el.getAttribute("aria-required") === "true") return true;
  // Check label text for asterisk or "required"
  const labelText = getLabelText(el);
  if (labelText.includes("*") || labelText.includes("required")) return true;
  // Check nearby DOM — keep scope tight to avoid false positives
  const container = el.closest("fieldset, [role='group'], .field, [class*='field'], [class*='form-item']");
  if (container && container.textContent.length < 400) {
    if (container.querySelector("[aria-required='true'], [required]")) return true;
    if (container.textContent.includes("*")) return true;
  }
  return false;
}

// --- Fill helpers ---

function nativeSet(el, value) {
  const proto = el instanceof HTMLSelectElement
    ? HTMLSelectElement.prototype
    : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter ? setter.call(el, value) : (el.value = value);
  ["input", "change"].forEach(t => el.dispatchEvent(new Event(t, { bubbles: true })));
}

function fillSelect(el, value) {
  const norm = value.toLowerCase().trim();
  const candidates = YES_NO_MAP[norm] || [norm];

  for (const option of el.options) {
    if (!option.value || option.disabled) continue;
    const optText = option.text.toLowerCase().trim();
    const optVal  = option.value.toLowerCase().trim();
    for (const c of candidates) {
      if (optText === c || optVal === c) { nativeSet(el, option.value); return true; }
    }
  }
  // Substring fallback
  let best = null, bestScore = 0;
  for (const option of el.options) {
    if (!option.value || option.disabled) continue;
    const optText = option.text.toLowerCase().trim();
    for (const c of candidates) {
      if (optText.includes(c) || c.includes(optText)) {
        const score = Math.min(optText.length, c.length);
        if (score > bestScore) { bestScore = score; best = option; }
      }
    }
  }
  if (best) { nativeSet(el, best.value); return true; }
  return false;
}

function fillRadioGroup(name, value) {
  const norm = value.toLowerCase().trim();
  const candidates = YES_NO_MAP[norm] || [norm];
  const radios = document.querySelectorAll(`input[type="radio"][name="${name}"]`);

  for (const r of radios) {
    const rVal   = r.value.toLowerCase().trim();
    const rLabel = (() => {
      try {
        if (r.id) {
          const lbl = document.querySelector(`label[for="${CSS.escape(r.id)}"]`);
          if (lbl) return lbl.textContent.trim().toLowerCase();
        }
      } catch (_) {}
      return r.closest("label")?.textContent.trim().toLowerCase() || r.value.toLowerCase();
    })();

    if (candidates.some(c => rVal === c || rLabel.includes(c))) {
      r.checked = true;
      r.dispatchEvent(new Event("change", { bubbles: true }));
      r.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      return true;
    }
  }
  return false;
}

function isVisible(el) {
  if (el.type === "radio" || el.type === "checkbox") return true;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

// --- Main fill logic ---

function runFill(profile) {
  const filled   = [];
  const unfilled = [];
  const seenRadioGroups = new Set();

  const els = document.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"])' +
    ':not([type="reset"]):not([type="file"]):not([type="image"]),' +
    'select, textarea'
  );

  for (const el of els) {
    if (!isVisible(el)) continue;

    // --- Radio groups ---
    if (el.type === "radio") {
      if (seenRadioGroups.has(el.name)) continue;
      seenRadioGroups.add(el.name);

      const question  = getRadioGroupLabel(el.name);
      const key       = matchField(question);
      const req       = isRequired(el);
      const display   = question || el.name || "Unknown field";

      if (key && profile[key]) {
        fillRadioGroup(el.name, profile[key])
          ? filled.push({ label: display, key })
          : unfilled.push({ label: display, required: req });
      } else if (req) {
        unfilled.push({ label: display, required: true });
      }
      continue;
    }

    // --- Everything else ---
    const labelText = getLabelText(el);
    const key       = matchField(labelText);
    const req       = isRequired(el);
    const display   = labelText || el.name || el.id || "Unknown field";

    if (!key || !profile[key]) {
      if (req) unfilled.push({ label: display, required: true });
      continue;
    }

    const value = profile[key];
    let ok = false;

    if (el.tagName === "SELECT") {
      ok = fillSelect(el, value);
    } else if (el.tagName === "TEXTAREA") {
      nativeSet(el, value);
      el.dispatchEvent(new Event("blur", { bubbles: true }));
      ok = true;
    } else {
      nativeSet(el, value);
      ok = true;
    }

    ok
      ? filled.push({ label: display, key })
      : unfilled.push({ label: display, required: req });
  }

  return { filled, unfilled };
}

// --- Message listener ---

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "fill") {
    chrome.storage.sync.get(null, (profile) => {
      sendResponse(runFill(profile));
    });
    return true; // keep channel open for async response
  }
});

console.log("[Application Filler] content script loaded on:", window.location.href);
