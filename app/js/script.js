(function () {
  const elValue = document.getElementById("value");
  const elHistory = document.getElementById("history");
  const keys = document.getElementById("keys");

  const state = {
    display: "0",
    first: null,
    operator: null,
    awaitingSecond: false,
    lastSecond: null, // for repeat-equals behavior
    lastOperator: null,
  };

  function updateDisplay(blink = false) {
    elValue.textContent = formatDisplay(state.display);
    if (blink) {
      elValue.classList.remove("blink");
      void elValue.offsetWidth;
      elValue.classList.add("blink");
    }

    const h = [
      state.first !== null ? formatDisplay(state.first) : "",
      state.operator ? ` ${symbol(state.operator)} ` : "",
      state.awaitingSecond
        ? ""
        : state.operator
        ? formatDisplay(state.display)
        : "",
    ].join("");
    elHistory.textContent = h.trim();
  }

  function inputDigit(d) {
    if (state.awaitingSecond) {
      state.display = d;
      state.awaitingSecond = false;
    } else {
      state.display = state.display === "0" ? d : state.display + d;
    }
    updateDisplay(true);
  }

  function inputDecimal() {
    if (state.awaitingSecond) {
      state.display = "0.";
      state.awaitingSecond = false;
    } else if (!state.display.includes(".")) {
      state.display += ".";
    }
    updateDisplay(true);
  }

  function clearAll() {
    state.display = "0";
    state.first = null;
    state.operator = null;
    state.awaitingSecond = false;
    state.lastSecond = null;
    state.lastOperator = null;
    updateDisplay();
  }

  function backspace() {
    if (state.awaitingSecond) return;
    if (
      state.display.length <= 1 ||
      (state.display.length === 2 && state.display.startsWith("-"))
    ) {
      state.display = "0";
    } else {
      state.display = state.display.slice(0, -1);
    }
    updateDisplay(true);
  }

  function toggleSign() {
    if (state.display === "0") return;
    state.display = state.display.startsWith("-")
      ? state.display.slice(1)
      : "-" + state.display;
    updateDisplay(true);
  }

  function percent() {
    const x = toNumber(state.display);
    state.display = fromNumber(x / 100);
    updateDisplay(true);
  }

  function handleOperator(nextOp) {
    const inputValue = toNumber(state.display);

    if (state.operator && state.awaitingSecond) {
      state.operator = nextOp; // change operator before typing second operand
      updateDisplay();
      return;
    }

    if (state.first === null) {
      state.first = inputValue;
    } else if (state.operator) {
      const result = compute(state.first, state.operator, inputValue);
      state.first = result;
      state.display = fromNumber(result);
    }

    state.operator = nextOp;
    state.awaitingSecond = true;
    state.lastSecond = null;
    state.lastOperator = null;
    updateDisplay();
  }

  function equals() {
    const current = toNumber(state.display);

    let a, b, op;
    if (state.operator) {
      a = state.first !== null ? state.first : 0;
      b = current;
      op = state.operator;
      state.lastSecond = b;
      state.lastOperator = op;
    } else if (state.lastOperator) {
      a = current;
      b = state.lastSecond;
      op = state.lastOperator;
    } else {
      updateDisplay(true);
      return;
    }

    const result = compute(a, op, b);
    state.display = fromNumber(result);
    state.first = result;
    state.awaitingSecond = true; // allow chaining equals
    state.operator = null;
    updateDisplay(true);
  }

  function compute(a, op, b) {
    switch (op) {
      case "+":
        return round(a + b);
      case "-":
        return round(a - b);
      case "*":
        return round(a * b);
      case "/":
        return b === 0 ? NaN : round(a / b);
      default:
        return b;
    }
  }

  function round(n) {
    // Reduce binary floating point artifacts, keep up to 12 significant digits.
    if (!isFinite(n)) return n;
    return +Number(n).toPrecision(12);
  }
  function toNumber(s) {
    return parseFloat(s) || 0;
  }
  function fromNumber(n) {
    if (!isFinite(n)) return "Error";
    let s = String(n);
    // Avoid scientific notation for typical ranges
    if (Math.abs(n) < 1e12 && Math.abs(n) >= 1e-9) {
      s = n.toString();
    } else {
      s = n.toExponential(6);
    }
    // Trim trailing zeros
    if (s.includes("e")) return s;
    if (s.includes(".")) s = s.replace(/\.0+$/, "").replace(/(\..*?)0+$/, "$1");
    return s;
  }
  function symbol(op) {
    return { "/": "÷", "*": "×", "+": "+", "-": "−" }[op] || op;
  }
  function formatDisplay(s) {
    return s.length > 18 ? s.slice(0, 18) + "…" : s;
  }

  // Event handling (click + keyboard)
  keys.addEventListener("click", (e) => {
    const t = e.target.closest("button");
    if (!t) return;
    const d = t.dataset.digit;
    const op = t.dataset.op;
    const act = t.dataset.action;
    if (d !== undefined) return inputDigit(d);
    if (op) return handleOperator(op);
    if (act === "decimal") return inputDecimal();
    if (act === "clear") return clearAll();
    if (act === "equals") return equals();
    if (act === "sign") return toggleSign();
    if (act === "percent") return percent();
    if (act === "back") return backspace();
  });

  window.addEventListener("keydown", (e) => {
    const k = e.key;
    if (/^\d$/.test(k)) {
      inputDigit(k);
      return;
    }
    if (k === ".") {
      inputDecimal();
      return;
    }
    if (k === "Backspace") {
      backspace();
      return;
    }
    if (k === "Escape") {
      clearAll();
      return;
    }
    if (k === "Enter" || k === "=") {
      equals();
      return;
    }
    if (["+", "-", "*", "/"].includes(k)) {
      handleOperator(k);
      return;
    }
  });

  // Swipe left to delete last digit (mobile nicety)
  let touchX = null;
  elValue.addEventListener(
    "touchstart",
    (e) => {
      touchX = e.changedTouches[0].clientX;
    },
    { passive: true }
  );
  elValue.addEventListener(
    "touchend",
    (e) => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (dx < -30) backspace();
    },
    { passive: true }
  );

  updateDisplay();
})();

