(function () {
  "use strict";

  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  const LABELS = {
    christmas: "Christmas Day",
    thanksgiving: "Thanksgiving Day",
    halloween: "Halloween",
    easter: "Easter Sunday",
    "mothers-day": "Mother’s Day",
    "fathers-day": "Father’s Day",
    "independence-day": "Independence Day",
    "valentines-day": "Valentine’s Day",
    "new-years-day": "New Year’s Day",
    winter: "Winter",
    summer: "Summer",
    spring: "Spring",
    autumn: "Autumn",
    ramadan: "First Day of Ramadan",
    custom: "your selected date",
  };

  /**
   * Approximate first day of Ramadan (Islamic lunar calendar).
   * These are commonly published civil estimates and may differ by 1 day
   * depending on moon sighting. Update as new years approach.
   */
  const RAMADAN_STARTS = [
    { y: 2025, m: 2, d: 28 },
    { y: 2026, m: 2, d: 17 },
    { y: 2027, m: 2, d: 7 },
    { y: 2028, m: 1, d: 26 },
    { y: 2029, m: 1, d: 14 },
    { y: 2030, m: 1, d: 4 },
  ];

  const form = document.getElementById("countdown-form");
  const customFields = document.getElementById("custom-date-fields");
  const daySelect = document.getElementById("custom-day");
  const monthSelect = document.getElementById("custom-month");
  const errorEl = document.getElementById("form-error");
  const resultEl = document.getElementById("result");
  const resultLabel = document.getElementById("result-label");
  const resultDays = document.getElementById("result-days");
  const resultDate = document.getElementById("result-date");

  const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  function populateDayOptions() {
    const previous = daySelect.value;
    const month = Number(monthSelect.value);
    const maxDay = month >= 1 && month <= 12 ? DAYS_IN_MONTH[month - 1] : 31;

    daySelect.innerHTML = '<option value="">----</option>';
    for (let day = 1; day <= maxDay; day += 1) {
      const option = document.createElement("option");
      option.value = String(day);
      option.textContent = String(day);
      daySelect.appendChild(option);
    }

    if (previous && Number(previous) <= maxDay) {
      daySelect.value = previous;
    }
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function daysBetween(from, to) {
    return Math.round((startOfDay(to) - startOfDay(from)) / MS_PER_DAY);
  }

  function nextFixedDate(monthIndex, day, from = new Date()) {
    const today = startOfDay(from);
    let candidate = new Date(today.getFullYear(), monthIndex, day);
    if (candidate < today) {
      candidate = new Date(today.getFullYear() + 1, monthIndex, day);
    }
    return candidate;
  }

  /** nth weekday in a month (weekday: 0=Sun … 6=Sat). */
  function nthWeekday(year, monthIndex, weekday, n) {
    const first = new Date(year, monthIndex, 1);
    const offset = (weekday - first.getDay() + 7) % 7;
    return new Date(year, monthIndex, 1 + offset + (n - 1) * 7);
  }

  function nextNthWeekday(monthIndex, weekday, n, from = new Date()) {
    const today = startOfDay(from);
    let candidate = nthWeekday(today.getFullYear(), monthIndex, weekday, n);
    if (candidate < today) {
      candidate = nthWeekday(today.getFullYear() + 1, monthIndex, weekday, n);
    }
    return candidate;
  }

  /** Anonymous Gregorian algorithm for Easter Sunday. */
  function easterSunday(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month, day);
  }

  function nextEaster(from = new Date()) {
    const today = startOfDay(from);
    let candidate = easterSunday(today.getFullYear());
    if (candidate < today) {
      candidate = easterSunday(today.getFullYear() + 1);
    }
    return candidate;
  }

  function nextRamadan(from = new Date()) {
    const today = startOfDay(from);
    for (const entry of RAMADAN_STARTS) {
      const candidate = new Date(entry.y, entry.m, entry.d);
      if (candidate >= today) return candidate;
    }
    // Fallback: rough 354-day lunar year from last known start
    const last = RAMADAN_STARTS[RAMADAN_STARTS.length - 1];
    let candidate = new Date(last.y, last.m, last.d);
    while (candidate < today) {
      candidate = new Date(candidate.getTime() + 354 * MS_PER_DAY);
      candidate = startOfDay(candidate);
    }
    return candidate;
  }

  function nextCustom(month, day, from = new Date()) {
    const today = startOfDay(from);
    const year = today.getFullYear();
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) {
      const nextYearDays = new Date(year + 1, month, 0).getDate();
      if (day < 1 || day > nextYearDays) {
        throw new Error("That day doesn’t exist in the selected month.");
      }
    }

    let candidate = new Date(year, month - 1, day);
    if (Number.isNaN(candidate.getTime()) || candidate.getMonth() !== month - 1) {
      throw new Error("That day doesn’t exist in the selected month.");
    }
    if (candidate < today) {
      candidate = new Date(year + 1, month - 1, day);
      if (candidate.getMonth() !== month - 1) {
        throw new Error("That day doesn’t exist in the selected month next year.");
      }
    }
    return candidate;
  }

  function resolveEvent(eventKey, from = new Date()) {
    switch (eventKey) {
      case "christmas":
        return nextFixedDate(11, 25, from);
      case "halloween":
        return nextFixedDate(9, 31, from);
      case "independence-day":
        return nextFixedDate(6, 4, from);
      case "valentines-day":
        return nextFixedDate(1, 14, from);
      case "new-years-day":
        return nextFixedDate(0, 1, from);
      case "winter":
        return nextFixedDate(11, 21, from);
      case "summer":
        return nextFixedDate(5, 21, from);
      case "spring":
        return nextFixedDate(2, 20, from);
      case "autumn":
        return nextFixedDate(8, 22, from);
      case "thanksgiving":
        return nextNthWeekday(10, 4, 4, from);
      case "mothers-day":
        return nextNthWeekday(4, 0, 2, from);
      case "fathers-day":
        return nextNthWeekday(5, 0, 3, from);
      case "easter":
        return nextEaster(from);
      case "ramadan":
        return nextRamadan(from);
      case "custom": {
        const day = Number(daySelect.value);
        const month = Number(monthSelect.value);
        if (!monthSelect.value || !daySelect.value) {
          throw new Error("Choose a day and a month.");
        }
        return nextCustom(month, day, from);
      }
      default:
        throw new Error("Choose an event or a custom date.");
    }
  }

  function formatLongDate(date) {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function selectedEvent() {
    const checked = form.querySelector('input[name="event"]:checked');
    return checked ? checked.value : null;
  }

  function syncCustomFields() {
    const isCustom = selectedEvent() === "custom";
    customFields.classList.toggle("is-disabled", !isCustom);
    daySelect.disabled = !isCustom;
    monthSelect.disabled = !isCustom;
    daySelect.required = isCustom;
    monthSelect.required = isCustom;
  }

  function showError(message) {
    errorEl.hidden = false;
    errorEl.textContent = message;
    resultEl.hidden = true;
  }

  function clearError() {
    errorEl.hidden = true;
    errorEl.textContent = "";
  }

  function showResult(eventKey, target) {
    const today = startOfDay(new Date());
    const days = daysBetween(today, target);
    const label = LABELS[eventKey] || "that date";

    clearError();
    resultEl.hidden = false;
    resultEl.classList.remove("is-visible");
    void resultEl.offsetWidth;
    resultEl.classList.add("is-visible");

    resultLabel.textContent = `Days left until ${label}`;

    if (days === 0) {
      resultDays.textContent = "Today!";
    } else if (days === 1) {
      resultDays.textContent = "1 day";
    } else {
      resultDays.textContent = `${days} days`;
    }

    resultDate.textContent = `Falls on ${formatLongDate(target)}`;
  }

  form.addEventListener("change", (event) => {
    if (event.target.name === "event") {
      syncCustomFields();
      clearError();
    }
    if (event.target.name === "month") {
      populateDayOptions();
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const key = selectedEvent();
      if (!key) {
        showError("Choose an event or a custom date.");
        return;
      }
      const target = resolveEvent(key);
      showResult(key, target);
    } catch (err) {
      showError(err.message || "Could not calculate that date.");
    }
  });

  populateDayOptions();
  syncCustomFields();
})();
