const FIELDS = [
  "firstName", "lastName", "email", "phone",
  "addressStreet", "addressCity", "addressState", "addressZip", "addressCountry",
  "linkedin", "github", "portfolio",
  "veteranStatus", "disabilityStatus",
  "schoolName", "degree", "major", "gpa", "gradMonth", "gradYear",
  "yearsExperience", "recentTitle", "recentCompany",
  "desiredSalary", "startDate",
  "customQ1", "customA1", "customQ2", "customA2", "customQ3", "customA3",
];

const RADIO_GROUPS = ["workAuthorized", "requireSponsorship", "jobType"];

function loadProfile() {
  chrome.storage.sync.get(null, (data) => {
    FIELDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el && data[id] !== undefined) el.value = data[id];
    });

    RADIO_GROUPS.forEach((name) => {
      if (data[name] !== undefined) {
        const radio = document.querySelector(`input[name="${name}"][value="${data[name]}"]`);
        if (radio) radio.checked = true;
      }
    });
  });
}

function saveProfile(e) {
  e.preventDefault();

  const profile = {};

  FIELDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) profile[id] = el.value.trim();
  });

  RADIO_GROUPS.forEach((name) => {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    profile[name] = checked ? checked.value : "";
  });

  chrome.storage.sync.set(profile, () => {
    const status = document.getElementById("save-status");
    status.textContent = "Saved!";
    status.classList.add("visible");
    setTimeout(() => status.classList.remove("visible"), 2000);
  });
}

document.addEventListener("DOMContentLoaded", loadProfile);
document.getElementById("profile-form").addEventListener("submit", saveProfile);
