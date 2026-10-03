const KEY = "expenseTrackerV6";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const PAYMENTS = [
  "UPI",
  "Cash",
  "Credit Card",
  "Debit Card",
  "Bank Transfer",
  "Other"
];

function fresh() {
  const n = new Date();

  return {
    currency: "₹",
    year: n.getFullYear(),
    month: n.getMonth(),
    months: {},
    goals: []
  };
}

let state = load();

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || fresh();
  } catch {
    return fresh();
  }
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function k(y = state.year, m = state.month) {
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

function month() {
  const key = k();

  if (!state.months[key]) {
    state.months[key] = {
      budget: 0,
      startBank: 0,
      transactions: [],
      categories: [],
      savingsAllocations: []
    };
  }

  const m = state.months[key];

  m.transactions ||= [];
  m.categories ||= [];
  m.savingsAllocations ||= [];

  return m;
}

function money(n) {
  return `${state.currency}${Number(n || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2
  })}`;
}

function esc(s = "") {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function mlabel() {
  return `${MONTHS[state.month]} ${state.year}`;
}

function categorySpent(name, m = month()) {
  return (m.transactions || [])
    .filter(t => t.category === name)
    .reduce((a, t) => a + Number(t.amount || 0), 0);
}

function monthUnspentTotal(m = month()) {
  return (m.categories || []).reduce((sum, c) => {
    return sum + Math.max(
      0,
      Number(c.budget || 0) - categorySpent(c.name, m)
    );
  }, 0);
}

function allocatedThisMonth(m = month()) {
  return (m.savingsAllocations || [])
    .reduce((a, x) => a + Number(x.amount || 0), 0);
}

function availableToAllocate(m = month()) {
  return Math.max(
    0,
    monthUnspentTotal(m) - allocatedThisMonth(m)
  );
}

function goalStatus(g) {
  return (
    Number(g.target || 0) > 0 &&
    Number(g.saved || 0) >= Number(g.target || 0)
  )
    ? "completed"
    : "active";
}

function stats(y = state.year, m = state.month) {
  const mm = state.months[k(y, m)] || {
    budget: 0,
    startBank: 0,
    transactions: []
  };

  const spent = (mm.transactions || [])
    .reduce((a, t) => a + Number(t.amount || 0), 0);

  return {
    spent,
    remaining: Math.max(
      0,
      Number(mm.budget || 0) - spent
    ),
    current:
      Number(mm.startBank || 0) - spent,
    potential: Math.max(
      0,
      Number(mm.budget || 0) - spent
    )
  };
}

function toast(msg) {
  let t = document.getElementById("toast");

  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.className = "toast";
    document.body.appendChild(t);
  }

  t.textContent = msg;
  t.classList.add("show");

  setTimeout(() => {
    t.classList.remove("show");
  }, 1800);
}

function shell(active, title, subtitle) {
  return `
  <div class="app">

    <aside class="sidebar">

      <div class="brand">

        <div class="brand-mark">
          ₹
        </div>

        <div>
          <h1>My Expense Tracker</h1>
        </div>

      </div>

      <nav class="nav">

        <a
          class="${active === "dashboard" ? "active" : ""}"
          href="dashboard.html"
        >
          ⌂ <span>Dashboard</span>
        </a>

        <a
          class="${active === "add" ? "active" : ""}"
          href="add-expense.html"
        >
          ＋ <span>Add Expense</span>
        </a>

        <a
          class="${active === "transactions" ? "active" : ""}"
          href="transactions.html"
        >
          ▤ <span>Transactions</span>
        </a>

        <a
          class="${active === "insights" ? "active" : ""}"
          href="insights.html"
        >
          ▥ <span>Insights</span>
        </a>

        <a
          class="${active === "savings" ? "active" : ""}"
          href="savings.html"
        >
          ◎ <span>Savings</span>
        </a>

        <a
          class="${active === "settings" ? "active" : ""}"
          href="settings.html"
        >
          ⚙ <span>Settings</span>
        </a>

      </nav>

    </aside>

    <main class="main">

      <div class="top">

        <div class="page-title">

          <h2>${title}</h2>

          ${
            subtitle
              ? `<p>${subtitle}</p>`
              : ""
          }

        </div>

        <div class="month-control">

          <span>📅</span>

          <input
            id="monthPicker"
            type="month"
            value="${state.year}-${String(
              state.month + 1
            ).padStart(2, "0")}"
          >

        </div>

      </div>

      <div id="page"></div>

    </main>

  </div>

  <div id="toast" class="toast"></div>
  `;
}

function initShell(active, title, subtitle) {
  document.body.innerHTML =
    shell(active, title, subtitle);

  const picker =
    document.getElementById("monthPicker");

  picker.onchange = e => {

    if (!e.target.value) {
      return;
    }

    const [y, m] =
      e.target.value
        .split("-")
        .map(Number);

    state.year = y;
    state.month = m - 1;

    save();

    location.reload();
  };
}

function stat(
  cls,
  icon,
  label,
  value
) {
  return `
    <div class="stat-card ${cls}">

      <div class="stat-icon">
        ${icon}
      </div>

      <div>

        <div class="label">
          ${label}
        </div>

        <div class="value">
          ${value}
        </div>

      </div>

    </div>
  `;
}

function categorySelectOptions() {
  const cats =
    month().categories || [];

  if (!cats.length) {
    return `
      <option
        value=""
        selected
        disabled
      >
        No categories yet
      </option>
    `;
  }

  return `
    <option
      value=""
      selected
      disabled
    >
      Select category
    </option>
  ` +
    cats.map(c => `
      <option value="${esc(c.name)}">
        ${esc(c.name)}
      </option>
    `).join("");
}

function paymentOptions() {
  return `
    <option
      value=""
      selected
      disabled
    >
      Select payment method
    </option>
  ` +
    PAYMENTS.map(p => `
      <option value="${p}">
        ${p}
      </option>
    `).join("");
}

function catColor(name) {
  const c =
    (month().categories || [])
      .find(
        x => x.name === name
      );

  if (c?.color) {
    return c.color;
  }

  const colors = [
    "#5b7cfa",
    "#ff6f91",
    "#34c77b",
    "#8b6df3",
    "#f2b84b",
    "#4ec6df",
    "#ef7d64",
    "#54b7a4"
  ];

  const total =
    [...name].reduce(
      (a, ch) =>
        a + ch.charCodeAt(0),
      0
    );

  return colors[
    Math.abs(total) %
    colors.length
  ];
}

/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {
  initShell(
    "dashboard",
    "Dashboard",
    mlabel()
  );

  const m = month();
  const s = stats();

  const p =
    document.getElementById("page");

  p.innerHTML = `
    <div class="cards">

      ${stat(
        "soft-blue",
        "💳",
        "Monthly Budget",
        money(m.budget)
      )}

      ${stat(
        "soft-pink",
        "🛒",
        "Spent",
        money(s.spent)
      )}

      ${stat(
        "soft-green",
        "📈",
        "Budget Remaining",
        money(s.remaining)
      )}

      ${stat(
        "soft-purple",
        "🏦",
        "Starting Bank Balance",
        money(m.startBank)
      )}

      ${stat(
        "soft-yellow",
        "🪙",
        "Current Bank Balance",
        money(s.current)
      )}

      ${stat(
        "soft-cyan",
        "🌿",
        "Potential Savings",
        money(s.potential)
      )}

    </div>

    <div class="grid2">

      <div class="panel">

        <h3>
          Spending by Category
        </h3>

        <div class="chart">
          <canvas id="catChart"></canvas>
        </div>

      </div>

      <div class="panel">

        <h3>
          Monthly Spending Trend
        </h3>

        <div class="chart">
          <canvas id="trendChart"></canvas>
        </div>

      </div>

    </div>

    <div class="grid2 equal">

      <div class="panel">

        <h3>
          Recent Transactions
        </h3>

        <div id="recent"></div>

      </div>

      <div class="panel">

        <h3>
          Category Budgets
        </h3>

        <div
          id="catBudgets"
          class="compact-list"
        ></div>

      </div>

    </div>
  `;

  drawCharts();
  drawRecent();
  drawBudgets();
}

function drawCharts() {
  if (
    typeof Chart === "undefined"
  ) {
    return;
  }

  const m = month();

  const names = [
    ...new Set(
      (m.transactions || [])
        .map(t => t.category)
    )
  ];

  const values =
    names.map(name =>
      categorySpent(name, m)
    );

  const cat =
    document
      .getElementById("catChart");

  if (cat) {

    new Chart(cat, {

      type: "doughnut",

      data: {

        labels:
          names.length
            ? names
            : ["No spending"],

        datasets: [{
          data:
            values.length
              ? values
              : [1],

          backgroundColor:
            names.length
              ? names.map(catColor)
              : ["#e8edf5"],

          borderWidth: 0
        }]
      },

      options: {

        responsive: true,
        maintainAspectRatio: false,
        cutout: "66%",

        plugins: {

          legend: {

            position: "right",

            labels: {
              boxWidth: 10,
              usePointStyle: true,

              font: {
                family: "Manrope"
              }
            }
          }
        }
      }
    });
  }

  const monthly =
    MONTHS.map((_, i) =>
      stats(state.year, i).spent
    );

  const trend =
    document
      .getElementById("trendChart");

  if (trend) {

    new Chart(trend, {

      type: "bar",

      data: {

        labels:
          MONTHS.map(
            x => x.slice(0, 3)
          ),

        datasets: [{

          data: monthly,

          backgroundColor:
            MONTHS.map(
              (_, i) =>
                i === state.month
                  ? "#7b6cf2"
                  : "#a8c7ff"
            ),

          borderRadius: 8
        }]
      },

      options: {

        responsive: true,
        maintainAspectRatio: false,

        plugins: {
          legend: {
            display: false
          }
        },

        scales: {

          y: {
            beginAtZero: true,

            grid: {
              color: "#eef1f5"
            }
          },

          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }
}

function drawRecent() {
  const box =
    document
      .getElementById("recent");

  if (!box) {
    return;
  }

  const arr = [
    ...(month().transactions || [])
  ]
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date)
    )
    .slice(0, 6);

  if (!arr.length) {

    box.innerHTML = `
      <div class="empty">
        No transactions yet.
      </div>
    `;

    return;
  }

  box.innerHTML =
    arr.map(t => `
      <div
        class="tx"
        style="
          grid-template-columns:
          120px 1fr 100px
        "
      >

        <span>
          ${t.date}
        </span>

        <b>
          ${esc(t.category)}
        </b>

        <span class="amt">
          -${money(t.amount)}
        </span>

      </div>
    `).join("");
}

function drawBudgets() {
  const box =
    document
      .getElementById("catBudgets");

  if (!box) {
    return;
  }

  const cats =
    month().categories || [];

  if (!cats.length) {

    box.innerHTML = `
      <div class="empty">
        No category budgets yet.
      </div>
    `;

    return;
  }

  box.innerHTML =
    cats.map(c => {

      const spent =
        categorySpent(c.name);

      const pct =
        c.budget
          ? Math.round(
              spent /
              c.budget *
              100
            )
          : 0;

      return `
        <div class="cat-budget">

          <b>
            ${esc(c.name)}
          </b>

          <span>
            ${money(c.budget)}
          </span>

          <span>
            ${money(spent)}
          </span>

          <div class="progress">

            <span
              style="
                width:
                ${Math.min(100, pct)}%;

                background:
                ${c.color}
              "
            ></span>

          </div>

          <span class="pct">
            ${pct}%
          </span>

        </div>
      `;
    }).join("");
}

/* =========================================================
   ADD EXPENSE
========================================================= */

function renderAdd() {
  initShell(
    "add",
    "Add Expense",
    "Add one transaction"
  );

  const p =
    document.getElementById("page");

  const cats =
    month().categories || [];

  if (!cats.length) {

    p.innerHTML = `
      <div class="panel form-card">

        <div
          class="empty"
          style="
            padding:
            45px 20px
          "
        >

          <div
            style="
              font-size:32px;
              margin-bottom:12px
            "
          >
            🏷️
          </div>

          <b
            style="
              display:block;
              margin-bottom:7px;
              font-size:17px
            "
          >
            No categories added
            for ${mlabel()}
          </b>

          <span>
            Add your categories
            in Settings first.
          </span>

          <div
            style="
              margin-top:18px
            "
          >

            <a
              href="settings.html"
              class="btn primary"
              style="
                display:inline-block
              "
            >
              Go to Settings
            </a>

          </div>

        </div>

      </div>
    `;

    return;
  }

  p.innerHTML = `
    <div class="panel form-card">

      <form
        id="expenseForm"
        class="form-grid"
      >

        <div class="field">

          <label>
            Amount
          </label>

          <input
            id="amount"
            type="number"
            min="0"
            step="any"
            required
            placeholder="₹0"
          >

        </div>

        <div class="field">

          <label>
            Category
          </label>

          <select
            id="category"
            required
          >
            ${categorySelectOptions()}
          </select>

        </div>

        <div class="field">

          <label>
            Date
          </label>

          <input
            id="date"
            type="date"
            required
          >

        </div>

        <div class="field">

          <label>
            Payment Method
          </label>

          <select
            id="payment"
            required
          >
            ${paymentOptions()}
          </select>

        </div>

        <div class="field fullrow">

          <label>
            Note
          </label>

          <textarea
            id="note"
            placeholder="Optional note"
          ></textarea>

        </div>

        <div class="fullrow">

          <button
            class="btn primary"
            type="submit"
          >
            Save Expense
          </button>

        </div>

      </form>

    </div>
  `;

  const now =
    new Date();

  document
    .getElementById("date")
    .value =
      `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, "0")}-${String(
        now.getDate()
      ).padStart(2, "0")}`;

  document
    .getElementById("expenseForm")
    .onsubmit = e => {

      e.preventDefault();

      const amount =
        Number(
          document
            .getElementById("amount")
            .value || 0
        );

      const category =
        document
          .getElementById("category")
          .value;

      const date =
        document
          .getElementById("date")
          .value;

      const payment =
        document
          .getElementById("payment")
          .value;

      const note =
        document
          .getElementById("note")
          .value.trim();

      if (amount <= 0) {
        toast(
          "Enter a valid amount"
        );
        return;
      }

      if (!category) {
        toast(
          "Select a category"
        );
        return;
      }

      if (!payment) {
        toast(
          "Select a payment method"
        );
        return;
      }

      month()
        .transactions
        .push({
          id:
            crypto.randomUUID(),

          amount,
          category,
          date,
          payment,
          note
        });

      save();

      toast(
        "Expense saved"
      );

      setTimeout(() => {
        location.href =
          "transactions.html";
      }, 450);
    };
}

/* =========================================================
   TRANSACTIONS
========================================================= */

function renderTransactions() {
  initShell(
    "transactions",
    "Transactions",
    mlabel()
  );

  const p =
    document
      .getElementById("page");

  const arr = [
    ...(month().transactions || [])
  ]
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date)
    );

  p.innerHTML = `
    <div class="panel">
      <div id="groups"></div>
    </div>
  `;

  const g =
    document
      .getElementById("groups");

  if (!arr.length) {

    g.innerHTML = `
      <div class="empty">
        No transactions yet.
      </div>
    `;

    return;
  }

  const groups = {};

  arr.forEach(t => {
    (groups[t.date] ??= [])
      .push(t);
  });

  g.innerHTML =
    Object.entries(groups)
      .map(([d, items]) => {

        const total =
          items.reduce(
            (a, t) =>
              a +
              Number(
                t.amount || 0
              ),
            0
          );

        return `
          <div
            style="
              margin-bottom:
              14px
            "
          >

            <div class="group-date">

              <span>
                ${new Date(
                  d + "T00:00:00"
                ).toLocaleDateString(
                  "en-IN",
                  {
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                  }
                )}
              </span>

              <span>
                ${money(total)}
              </span>

            </div>

            ${
              items.map(t => `
                <div class="tx">

                  <b>
                    ${esc(t.category)}
                  </b>

                  <span class="note">
                    ${esc(t.note || "—")}
                  </span>

                  <span class="pay">
                    ${esc(t.payment)}
                  </span>

                  <span class="amt">
                    -${money(t.amount)}
                  </span>

                  <button
                    class="del"
                    data-del="${t.id}"
                  >
                    ×
                  </button>

                </div>
              `).join("")
            }

          </div>
        `;
      })
      .join("");

  g.onclick = e => {

    const id =
      e.target.dataset.del;

    if (!id) {
      return;
    }

    if (
      confirm(
        "Delete this transaction?"
      )
    ) {

      month().transactions =
        month()
          .transactions
          .filter(
            t => t.id !== id
          );

      save();

      location.reload();
    }
  };
}

/* =========================================================
   INSIGHTS
========================================================= */

function renderInsights() {
  initShell(
    "insights",
    "Insights",
    "A cleaner view of your spending"
  );

  const s = stats();
  const m = month();

  const names = [
    ...new Set(
      (m.transactions || [])
        .map(
          t => t.category
        )
    )
  ];

  let topCat = "—";

  if (names.length) {

    topCat =
      names.sort(
        (a, b) =>
          categorySpent(b, m) -
          categorySpent(a, m)
      )[0];
  }

  const p =
    document
      .getElementById("page");

  p.innerHTML = `
    <div class="insight-cards">

      <div class="insight-mini">

        <span>
          Total Spent
        </span>

        <b>
          ${money(s.spent)}
        </b>

      </div>

      <div class="insight-mini">

        <span>
          Budget Remaining
        </span>

        <b>
          ${money(s.remaining)}
        </b>

      </div>

      <div class="insight-mini">

        <span>
          Top Category
        </span>

        <b>
          ${esc(topCat)}
        </b>

      </div>

      <div class="insight-mini">

        <span>
          Transactions
        </span>

        <b>
          ${m.transactions.length}
        </b>

      </div>

    </div>

    <div class="grid2">

      <div class="panel">

        <h3>
          Category Breakdown
        </h3>

        <div class="chart">
          <canvas id="catChart"></canvas>
        </div>

      </div>

      <div class="panel">

        <h3>
          Monthly Trend
        </h3>

        <div class="chart">
          <canvas id="trendChart"></canvas>
        </div>

      </div>

    </div>
  `;

  drawCharts();
}

/* =========================================================
   SAVINGS
========================================================= */

/* =========================================================
   SAVINGS
========================================================= */

function renderSavings() {
  initShell(
    "savings",
    "Savings Goals",
    "Turn your goals into reality ✨"
  );

  const page = document.getElementById("page");

  const totalSaved = state.goals.reduce(
    (sum, goal) => sum + Number(goal.saved || 0),
    0
  );

  const shortGoals = state.goals.filter(
    goal => (goal.type || "short") === "short"
  );

  const longGoals = state.goals.filter(
    goal => goal.type === "long"
  );

  page.innerHTML = `

    <!-- =========================
         SAVINGS SUMMARY
    ========================== -->

    <div class="savings-summary">

      <div class="saving-summary-card total-saved-card">

        <div class="saving-summary-icon">
          🐷
        </div>

        <div>
          <span>Total Saved</span>

          <strong>
            ${money(totalSaved)}
          </strong>

          <small>
            across ${state.goals.length} goals
          </small>
        </div>

      </div>


      <div class="saving-summary-card">

        <div class="saving-summary-icon short-icon">
          🎯
        </div>

        <div>
          <strong>
            ${shortGoals.length}
          </strong>

          <span>
            Short-Term
          </span>
        </div>

      </div>


      <div class="saving-summary-card">

        <div class="saving-summary-icon long-icon">
          ◎
        </div>

        <div>
          <strong>
            ${longGoals.length}
          </strong>

          <span>
            Long-Term
          </span>
        </div>

      </div>

    </div>


    <!-- =========================
         SHORT TERM
    ========================== -->

    <section class="goal-section short-goal-section">

      <div class="goal-section-header">

        <div class="goal-section-title">

          <div class="goal-heading-icon short">
            🎯
          </div>

          <div>

            <h3>
              Short-Term Goals
            </h3>

            <p>
              Smaller purchases and near-term goals
            </p>

          </div>

        </div>


        <div class="goal-header-actions">

          <div class="goal-scroll-controls">

            <button
              class="goal-scroll-btn"
              id="shortLeft"
              aria-label="Previous goals"
            >
              ‹
            </button>

            <button
              class="goal-scroll-btn"
              id="shortRight"
              aria-label="Next goals"
            >
              ›
            </button>

          </div>

          <button
            id="addShortGoal"
            class="btn short-add-btn"
          >
            ＋ Add Short-Term Goal
          </button>

        </div>

      </div>


      <div
        class="goal-carousel"
        id="shortGoals"
      ></div>

    </section>


    <!-- =========================
         LONG TERM
    ========================== -->

    <section class="goal-section long-goal-section">

      <div class="goal-section-header">

        <div class="goal-section-title">

          <div class="goal-heading-icon long">
            ◎
          </div>

          <div>

            <h3>
              Long-Term Goals
            </h3>

            <p>
              Bigger financial goals you build over time
            </p>

          </div>

        </div>


        <div class="goal-header-actions">

          <div class="goal-scroll-controls">

            <button
              class="goal-scroll-btn"
              id="longLeft"
              aria-label="Previous goals"
            >
              ‹
            </button>

            <button
              class="goal-scroll-btn"
              id="longRight"
              aria-label="Next goals"
            >
              ›
            </button>

          </div>

          <button
            id="addLongGoal"
            class="btn long-add-btn"
          >
            ＋ Add Long-Term Goal
          </button>

        </div>

      </div>


      <div
        class="goal-carousel"
        id="longGoals"
      ></div>

    </section>


    <!-- =========================
         ADD GOAL MODAL
    ========================== -->

    <div
      id="goalModal"
      class="modal"
    >

      <div class="modal-card">

        <h3 id="goalModalTitle">
          Add Savings Goal
        </h3>

        <input
          id="goalType"
          type="hidden"
        >


        <div class="field">

          <label>
            Goal Name
          </label>

          <input
            id="gName"
            placeholder="e.g. Scalp Massager"
          >

        </div>


        <div
          class="field"
          style="margin-top:12px"
        >

          <label>
            Target Amount
          </label>

          <input
            id="gTarget"
            type="number"
            min="0"
            placeholder="₹0"
          >

        </div>


        <div
          class="field"
          style="margin-top:12px"
        >

          <label>
            Already Saved
          </label>

          <input
            id="gSaved"
            type="number"
            min="0"
            value="0"
          >

        </div>


        <div class="modal-actions">

          <button
            id="cancelGoal"
            class="btn secondary"
          >
            Cancel
          </button>

          <button
            id="saveGoal"
            class="btn primary"
          >
            Save Goal
          </button>

        </div>

      </div>

    </div>


    <!-- =========================
         ADD MONEY MODAL
    ========================== -->

    <div
      id="addMoneyModal"
      class="modal"
    >

      <div class="modal-card">

        <h3>
          Add Money
        </h3>

        <div
          id="moneyGoalName"
          class="money-goal-name"
        ></div>


        <div class="field">

          <label>
            Amount
          </label>

          <input
            id="moneyAmount"
            type="number"
            min="0"
            placeholder="₹0"
          >

        </div>


        <div class="modal-actions">

          <button
            id="cancelMoney"
            class="btn secondary"
          >
            Cancel
          </button>

          <button
            id="saveMoney"
            class="btn primary"
          >
            Add Money
          </button>

        </div>

      </div>

    </div>


    <!-- =========================
         GOAL OPTIONS MODAL
    ========================== -->

    <div
      id="goalOptionsModal"
      class="modal"
    >

      <div class="modal-card small-options-modal">

        <h3 id="optionGoalName">
          Goal Options
        </h3>

        <button
          id="deleteGoalButton"
          class="goal-delete-full"
        >
          Delete Goal
        </button>

        <div class="modal-actions">

          <button
            id="closeGoalOptions"
            class="btn secondary"
          >
            Cancel
          </button>

        </div>

      </div>

    </div>
  `;


  drawGoals();


  /* =========================
     ADD SHORT GOAL
  ========================== */

  document
    .getElementById("addShortGoal")
    .onclick = () => {

      openGoalModal("short");

    };


  /* =========================
     ADD LONG GOAL
  ========================== */

  document
    .getElementById("addLongGoal")
    .onclick = () => {

      openGoalModal("long");

    };


  /* =========================
     CANCEL ADD GOAL
  ========================== */

  document
    .getElementById("cancelGoal")
    .onclick = () => {

      document
        .getElementById("goalModal")
        .classList.remove("show");

    };


  /* =========================
     SAVE GOAL
  ========================== */

  document
    .getElementById("saveGoal")
    .onclick = () => {

      const type =
        document
          .getElementById("goalType")
          .value;

      const name =
        document
          .getElementById("gName")
          .value
          .trim();

      const target =
        Number(
          document
            .getElementById("gTarget")
            .value || 0
        );

      const saved =
        Number(
          document
            .getElementById("gSaved")
            .value || 0
        );


      if (!name) {

        toast("Enter a goal name");

        return;

      }


      if (target <= 0) {

        toast("Enter a target amount");

        return;

      }


      state.goals.push({

        id: crypto.randomUUID(),

        name,

        target,

        saved,

        type,

        contributions:
          saved > 0
            ? [{
                id: crypto.randomUUID(),
                amount: saved,
                date: new Date().toISOString(),
                type: "Starting Amount"
              }]
            : [],

        createdAt:
          new Date().toISOString()

      });


      save();

      document
        .getElementById("goalModal")
        .classList.remove("show");

      renderSavings();

      toast("Goal added");

    };


  /* =========================
     CANCEL MONEY
  ========================== */

  document
    .getElementById("cancelMoney")
    .onclick = () => {

      document
        .getElementById("addMoneyModal")
        .classList.remove("show");

    };


  /* =========================
     CLOSE OPTIONS
  ========================== */

  document
    .getElementById("closeGoalOptions")
    .onclick = () => {

      document
        .getElementById("goalOptionsModal")
        .classList.remove("show");

    };


  setupGoalCarousel(
    "shortGoals",
    "shortLeft",
    "shortRight"
  );


  setupGoalCarousel(
    "longGoals",
    "longLeft",
    "longRight"
  );
}



/* =========================================================
   OPEN ADD GOAL MODAL
========================================================= */

function openGoalModal(type) {

  document
    .getElementById("goalType")
    .value = type;


  document
    .getElementById("goalModalTitle")
    .textContent =
      type === "short"
        ? "Add Short-Term Goal"
        : "Add Long-Term Goal";


  document
    .getElementById("gName")
    .value = "";


  document
    .getElementById("gTarget")
    .value = "";


  document
    .getElementById("gSaved")
    .value = "0";


  document
    .getElementById("goalModal")
    .classList.add("show");
}



/* =========================================================
   GOAL ICON
========================================================= */

function getGoalIcon(goal) {

  const name =
    String(goal.name || "")
      .toLowerCase();


  if (
    name.includes("house") ||
    name.includes("home")
  ) {
    return "🏠";
  }


  if (
    name.includes("emergency")
  ) {
    return "🚨";
  }


  if (
    name.includes("gold")
  ) {
    return "🪙";
  }


  if (
    name.includes("hair remover")
  ) {
    return "✨";
  }


  if (
    name.includes("massager")
  ) {
    return "💆";
  }


  if (
    name.includes("trimmer") ||
    name.includes("grooming")
  ) {
    return "🌸";
  }


  if (
    name.includes("phone")
  ) {
    return "📱";
  }


  if (
    name.includes("travel")
  ) {
    return "✈️";
  }


  if (
    name.includes("car")
  ) {
    return "🚗";
  }


  return "🎯";
}



/* =========================================================
   DRAW GOALS
========================================================= */

function drawGoals() {

  const shortBox =
    document
      .getElementById("shortGoals");

  const longBox =
    document
      .getElementById("longGoals");


  if (
    !shortBox ||
    !longBox
  ) {
    return;
  }


  const shortGoals =
    state.goals.filter(
      goal =>
        (goal.type || "short") ===
        "short"
    );


  const longGoals =
    state.goals.filter(
      goal =>
        goal.type === "long"
    );


  shortBox.innerHTML =
    shortGoals.length
      ? shortGoals
          .map(goalCardHTML)
          .join("")
      : emptyGoalHTML(
          "No short-term goals yet."
        );


  longBox.innerHTML =
    longGoals.length
      ? longGoals
          .map(goalCardHTML)
          .join("")
      : emptyGoalHTML(
          "No long-term goals yet."
        );


  bindGoalButtons();
}



/* =========================================================
   GOAL CARD
========================================================= */

function goalCardHTML(goal) {

  const target =
    Number(goal.target || 0);

  const saved =
    Number(goal.saved || 0);


  const percentage =
    target > 0
      ? Math.min(
          100,
          Math.round(
            saved / target * 100
          )
        )
      : 0;


  const completed =
    goalStatus(goal) === "completed";


  return `
    <article class="compact-goal-card">

      <div class="compact-goal-top">

        <div class="goal-card-icon">
          ${getGoalIcon(goal)}
        </div>


        <div class="goal-card-info">

          <h4>
            ${esc(goal.name)}
          </h4>


          <div class="goal-money-line">

            <span>
              ${money(saved)}
              of
              ${money(target)}
            </span>

            <strong>
              ${percentage}%
            </strong>

          </div>


          <div class="goal-progress">

            <span
              style="
                width:${percentage}%
              "
              class="${
                completed
                  ? "goal-progress-complete"
                  : ""
              }"
            ></span>

          </div>

        </div>

      </div>


      <div class="compact-goal-actions">

        ${
          completed
            ? `
              <span class="goal-complete-pill">
                ✓ Completed
              </span>
            `
            : `
              <button
                class="goal-add-money"
                data-add-money="${goal.id}"
              >
                ＋ Add Money
              </button>
            `
        }


        <button
          class="goal-more-btn"
          data-goal-more="${goal.id}"
          aria-label="Goal options"
        >
          •••
        </button>

      </div>

    </article>
  `;
}



/* =========================================================
   EMPTY GOAL CARD
========================================================= */

function emptyGoalHTML(message) {

  return `
    <div class="goal-empty-card">

      <div>
        🎯
      </div>

      <span>
        ${message}
      </span>

    </div>
  `;
}



/* =========================================================
   GOAL BUTTON EVENTS
========================================================= */

function bindGoalButtons() {

  document
    .querySelectorAll(
      "[data-add-money]"
    )
    .forEach(button => {

      button.onclick = () => {

        const goal =
          state.goals.find(
            item =>
              item.id ===
              button.dataset.addMoney
          );


        if (!goal) {
          return;
        }


        document
          .getElementById("moneyGoalName")
          .textContent =
            goal.name;


        document
          .getElementById("moneyAmount")
          .value = "";


        const modal =
          document
            .getElementById(
              "addMoneyModal"
            );


        modal.dataset.goalId =
          goal.id;


        modal
          .classList.add("show");

      };

    });



  document
    .querySelectorAll(
      "[data-goal-more]"
    )
    .forEach(button => {

      button.onclick = () => {

        const goal =
          state.goals.find(
            item =>
              item.id ===
              button.dataset.goalMore
          );


        if (!goal) {
          return;
        }


        const modal =
          document
            .getElementById(
              "goalOptionsModal"
            );


        modal.dataset.goalId =
          goal.id;


        document
          .getElementById(
            "optionGoalName"
          )
          .textContent =
            goal.name;


        modal
          .classList.add("show");

      };

    });



  const saveMoneyButton =
    document
      .getElementById("saveMoney");


  if (saveMoneyButton) {

    saveMoneyButton.onclick = () => {

      const modal =
        document
          .getElementById(
            "addMoneyModal"
          );


      const goal =
        state.goals.find(
          item =>
            item.id ===
            modal.dataset.goalId
        );


      if (!goal) {
        return;
      }


      const amount =
        Number(
          document
            .getElementById(
              "moneyAmount"
            )
            .value || 0
        );


      if (amount <= 0) {

        toast(
          "Enter an amount"
        );

        return;
      }


      goal.saved =
        Number(
          goal.saved || 0
        ) + amount;


      if (
        !goal.contributions
      ) {
        goal.contributions = [];
      }


      goal.contributions.push({

        id:
          crypto.randomUUID(),

        amount,

        date:
          new Date()
            .toISOString(),

        type:
          "Manual"

      });


      save();


      modal
        .classList
        .remove("show");


      renderSavings();


      toast(
        "Savings updated"
      );

    };

  }



  const deleteButton =
    document
      .getElementById(
        "deleteGoalButton"
      );


  if (deleteButton) {

    deleteButton.onclick = () => {

      const modal =
        document
          .getElementById(
            "goalOptionsModal"
          );


      const id =
        modal.dataset.goalId;


      const goal =
        state.goals.find(
          item =>
            item.id === id
        );


      if (!goal) {
        return;
      }


      const confirmed =
        confirm(
          `Delete "${goal.name}"?`
        );


      if (!confirmed) {
        return;
      }


      state.goals =
        state.goals.filter(
          item =>
            item.id !== id
        );


      save();


      modal
        .classList
        .remove("show");


      renderSavings();


      toast(
        "Goal deleted"
      );

    };

  }
}



/* =========================================================
   HORIZONTAL GOAL SCROLL
========================================================= */

function setupGoalCarousel(
  carouselId,
  leftButtonId,
  rightButtonId
) {

  const carousel =
    document
      .getElementById(
        carouselId
      );


  const left =
    document
      .getElementById(
        leftButtonId
      );


  const right =
    document
      .getElementById(
        rightButtonId
      );


  if (
    !carousel ||
    !left ||
    !right
  ) {
    return;
  }


  function scrollAmount() {

    const card =
      carousel.querySelector(
        ".compact-goal-card"
      );


    if (!card) {
      return 350;
    }


    return (
      card.offsetWidth +
      14
    );
  }


  left.onclick = () => {

    carousel.scrollBy({

      left:
        -scrollAmount(),

      behavior:
        "smooth"

    });

  };


  right.onclick = () => {

    carousel.scrollBy({

      left:
        scrollAmount(),

      behavior:
        "smooth"

    });

  };


  function updateButtons() {

    const maxScroll =
      carousel.scrollWidth -
      carousel.clientWidth;


    left.disabled =
      carousel.scrollLeft <= 5;


    right.disabled =
      carousel.scrollLeft >=
      maxScroll - 5;

  }


  carousel.addEventListener(
    "scroll",
    updateButtons
  );


  window.setTimeout(
    updateButtons,
    100
  );

}

/* =========================================================
   SETTINGS
========================================================= */

function renderSettings() {
  initShell(
    "settings",
    "Settings",
    "Manage this month and your categories"
  );

  const m = month();

  const p =
    document
      .getElementById("page");

  p.innerHTML = `
    <div class="settings-stack">

      <div class="panel">

        <h3>
          Month Setup
        </h3>

        <div class="form-grid">

          <div class="field">

            <label>
              Monthly Budget
            </label>

            <input
              id="budget"
              type="number"
              min="0"
              value="${m.budget || ""}"
              placeholder="₹0"
            >

          </div>

          <div class="field">

            <label>
              Starting Bank Balance
            </label>

            <input
              id="bank"
              type="number"
              min="0"
              value="${m.startBank || ""}"
              placeholder="₹0"
            >

          </div>

          <div class="fullrow">

            <button
              id="saveMonth"
              class="btn primary"
            >
              Save Month Setup
            </button>

          </div>

        </div>

      </div>

      <div class="panel">

        <div class="savings-head">

          <h3 style="margin:0">
            Categories
          </h3>

          <div class="actions">

            <button
              id="loadMyCats"
              class="btn secondary"
            >
              Use My October Categories
            </button>

            <button
              id="openCat"
              class="btn secondary"
            >
              ＋ Add Category
            </button>

          </div>

        </div>

        <div id="catRows"></div>

      </div>

      <div class="panel">

        <h3>
          Month End & Savings Allocation
        </h3>

        <div class="alloc-summary">

          <div class="alloc-box">

            <span>
              Total Unspent from Categories
            </span>

            <b id="unspentTotal">
              ${money(monthUnspentTotal())}
            </b>

          </div>

          <div class="alloc-box">

            <span>
              Already Allocated to Savings
            </span>

            <b id="allocatedTotal">
              ${money(allocatedThisMonth())}
            </b>

          </div>

          <div class="alloc-box">

            <span>
              Still Available to Allocate
            </span>

            <b id="availableTotal">
              ${money(availableToAllocate())}
            </b>

          </div>

        </div>

        <div
          id="leftoverRows"
          class="leftover-table"
        ></div>

        <div
          class="actions"
          style="
            margin-top:14px
          "
        >

          <button
            id="allocateSavings"
            class="btn secondary"
          >
            ＋ Allocate Leftover to Savings
          </button>

          <button
            id="exportX"
            class="btn green"
          >
            ⇩ Export Workbook
          </button>

          <button
            id="resetM"
            class="btn danger"
          >
            Close Month & Start Next
          </button>

        </div>

      </div>

    </div>

    <div
      id="catModal"
      class="modal"
    >

      <div class="modal-card">

        <h3>
          Add Category
        </h3>

        <div class="field">

          <label>
            Category name
          </label>

          <input
            id="cName"
            placeholder="e.g. Groceries"
          >

        </div>

        <div
          class="field"
          style="
            margin-top:12px
          "
        >

          <label>
            Monthly budget
          </label>

          <input
            id="cBudget"
            type="number"
            min="0"
            placeholder="₹0"
          >

        </div>

        <div class="modal-actions">

          <button
            id="cancelCat"
            class="btn secondary"
          >
            Cancel
          </button>

          <button
            id="saveCat"
            class="btn primary"
          >
            Add Category
          </button>

        </div>

      </div>

    </div>

    <div
      id="allocateModal"
      class="modal"
    >

      <div class="modal-card">

        <h3>
          Allocate Leftover to Savings
        </h3>

        <div class="field">

          <label>
            Savings Goal
          </label>

          <select id="allocGoal"></select>

        </div>

        <div
          class="field"
          style="
            margin-top:12px
          "
        >

          <label>
            Amount
          </label>

          <input
            id="allocAmount"
            type="number"
            min="0"
            placeholder="₹0"
          >

        </div>

        <div
          style="
            margin-top:8px;
            font-size:11px;
            color:var(--muted)
          "
        >
          This does not reduce
          your bank balance.
          It only marks part
          of your existing money
          as reserved for this
          savings goal.
        </div>

        <div class="modal-actions">

          <button
            id="cancelAlloc"
            class="btn secondary"
          >
            Cancel
          </button>

          <button
            id="saveAlloc"
            class="btn primary"
          >
            Allocate
          </button>

        </div>

      </div>

    </div>
  `;

  drawCatRows();
  renderLeftovers();

  document
    .getElementById("saveMonth")
    .onclick = () => {

      m.budget =
        Number(
          document
            .getElementById("budget")
            .value || 0
        );

      m.startBank =
        Number(
          document
            .getElementById("bank")
            .value || 0
        );

      save();

      toast(
        "Month setup saved"
      );
    };

  document
    .getElementById("loadMyCats")
    .onclick =
      loadOctoberCategories;

  document
    .getElementById("openCat")
    .onclick = () => {

      document
        .getElementById("catModal")
        .classList
        .add("show");
    };

  document
    .getElementById("cancelCat")
    .onclick = () => {

      document
        .getElementById("catModal")
        .classList
        .remove("show");
    };

  document
    .getElementById("saveCat")
    .onclick = () => {

      const name =
        document
          .getElementById("cName")
          .value
          .trim();

      const budget =
        Number(
          document
            .getElementById("cBudget")
            .value || 0
        );

      if (!name) {

        toast(
          "Enter a category name"
        );

        return;
      }

      const colors = [
        "#5b7cfa",
        "#ff6f91",
        "#34c77b",
        "#8b6df3",
        "#f2b84b",
        "#4ec6df"
      ];

      month()
        .categories
        .push({

          name,
          budget,

          color:
            colors[
              month()
                .categories
                .length %
              colors.length
            ]
        });

      save();

      document
        .getElementById("catModal")
        .classList
        .remove("show");

      drawCatRows();
      renderLeftovers();

      document
        .getElementById("cName")
        .value = "";

      document
        .getElementById("cBudget")
        .value = "";

      toast(
        "Category added"
      );
    };

  document
    .getElementById("allocateSavings")
    .onclick =
      openAllocationModal;

  document
    .getElementById("cancelAlloc")
    .onclick = () => {

      document
        .getElementById("allocateModal")
        .classList
        .remove("show");
    };

  document
    .getElementById("saveAlloc")
    .onclick =
      saveAllocation;

  document
    .getElementById("exportX")
    .onclick =
      exportWorkbook;

  document
    .getElementById("resetM")
    .onclick =
      closeMonth;
}

function loadOctoberCategories() {
  if (
    (month().categories || []).length &&
    !confirm(
      "Replace this month's current category list?"
    )
  ) {
    return;
  }

  const colors = [
    "#5b7cfa",
    "#ff6f91",
    "#34c77b",
    "#8b6df3",
    "#f2b84b",
    "#4ec6df",
    "#ef7d64",
    "#54b7a4",
    "#f18ab2",
    "#60b6a5",
    "#8d98f0"
  ];

  const preset = [
    ["Monthly Chits", 3400],
    ["Office Commute", 700],
    ["Native Place Commute", 600],
    ["Groceries", 4000],
    ["Personal Care", 1500],
    ["Shopping", 1500],
    ["Eating Out & Treats", 500],
    ["Miscellaneous", 2000],
    ["Entertainment", 1000],
    ["Health & Wellness", 5000],
    ["Gifts & Occasions", 2000]
  ];

  month().categories =
    preset.map((x, i) => ({
      name: x[0],
      budget: x[1],

      color:
        colors[
          i %
          colors.length
        ]
    }));

  month().budget =
    preset.reduce(
      (a, x) =>
        a + Number(x[1]),
      0
    );

  save();

  drawCatRows();
  renderLeftovers();

  const budget =
    document
      .getElementById("budget");

  if (budget) {
    budget.value =
      month().budget;
  }

  toast(
    "October categories added. Monthly budget ₹22,200"
  );
}

function openAllocationModal() {
  if (!state.goals.length) {

    toast(
      "Create a savings goal first"
    );

    return;
  }

  const avail =
    availableToAllocate();

  if (avail <= 0) {

    toast(
      "No unallocated leftover available"
    );

    return;
  }

  const sel =
    document
      .getElementById("allocGoal");

  sel.innerHTML =
    state.goals
      .map(g => `
        <option value="${g.id}">
          ${esc(g.name)}
        </option>
      `)
      .join("");

  document
    .getElementById("allocAmount")
    .value = avail;

  document
    .getElementById("allocateModal")
    .classList
    .add("show");
}

function saveAllocation() {
  const avail =
    availableToAllocate();

  const amt =
    Number(
      document
        .getElementById("allocAmount")
        .value || 0
    );

  const id =
    document
      .getElementById("allocGoal")
      .value;

  const g =
    state.goals.find(
      x => x.id === id
    );

  if (!g) {

    toast(
      "Choose a savings goal"
    );

    return;
  }

  if (
    amt <= 0 ||
    amt > avail
  ) {

    toast(
      `Enter an amount up to ${money(avail)}`
    );

    return;
  }

  g.saved =
    Number(
      g.saved || 0
    ) + amt;

  month()
    .savingsAllocations
    .push({

      id:
        crypto.randomUUID(),

      goalId: g.id,
      goalName: g.name,
      amount: amt,

      date:
        new Date()
          .toISOString()
    });

  save();

  document
    .getElementById("allocateModal")
    .classList
    .remove("show");

  renderLeftovers();

  toast(
    "Leftover allocated to savings"
  );
}

function closeMonth() {
  if (
    !confirm(
      "Close this month and start the next month?"
    )
  ) {
    return;
  }

  const previousCategories =
    JSON.parse(
      JSON.stringify(
        month().categories || []
      )
    );

  state.month++;

  if (state.month > 11) {
    state.month = 0;
    state.year++;
  }

  const next = month();

  if (
    !(next.categories || [])
      .length
  ) {
    next.categories =
      previousCategories;
  }

  save();

  location.reload();
}

function renderLeftovers() {
  const box =
    document
      .getElementById("leftoverRows");

  if (!box) {
    return;
  }

  const cats =
    month().categories || [];

  if (!cats.length) {
    box.innerHTML = "";
    return;
  }

  box.innerHTML = `
    <div
      class="leftover-row"
      style="
        font-weight:800;
        color:#53617e
      "
    >

      <span>
        Category
      </span>

      <span>
        Budget
      </span>

      <span>
        Spent
      </span>

      <span>
        Left
      </span>

    </div>
  ` +
    cats.map(c => {

      const spent =
        categorySpent(c.name);

      const left =
        Math.max(
          0,
          Number(c.budget || 0) -
          spent
        );

      return `
        <div class="leftover-row">

          <span>
            ${esc(c.name)}
          </span>

          <span>
            ${money(c.budget)}
          </span>

          <span>
            ${money(spent)}
          </span>

          <b>
            ${money(left)}
          </b>

        </div>
      `;
    }).join("");

  document
    .getElementById("unspentTotal")
    .textContent =
      money(
        monthUnspentTotal()
      );

  document
    .getElementById("allocatedTotal")
    .textContent =
      money(
        allocatedThisMonth()
      );

  document
    .getElementById("availableTotal")
    .textContent =
      money(
        availableToAllocate()
      );
}

function drawCatRows() {
  const box =
    document
      .getElementById("catRows");

  const cats =
    month().categories || [];

  if (!box) {
    return;
  }

  if (!cats.length) {

    box.innerHTML = `
      <div class="empty">
        No categories yet.
        Add only the categories
        you want for this month.
      </div>
    `;

    return;
  }

  box.innerHTML =
    cats.map((c, i) => `
      <div class="category-row">

        <input
          data-name="${i}"
          value="${esc(c.name)}"
        >

        <input
          data-budget="${i}"
          type="number"
          value="${c.budget || 0}"
        >

        <button
          class="del"
          data-cdel="${i}"
        >
          ×
        </button>

      </div>
    `).join("");

  box.oninput = e => {

    if (
      e.target.dataset.name !==
      undefined
    ) {

      month()
        .categories[
          Number(
            e.target.dataset.name
          )
        ]
        .name =
          e.target.value;
    }

    if (
      e.target.dataset.budget !==
      undefined
    ) {

      month()
        .categories[
          Number(
            e.target.dataset.budget
          )
        ]
        .budget =
          Number(
            e.target.value || 0
          );
    }

    save();

    renderLeftovers();
  };

  box.onclick = e => {

    if (
      e.target.dataset.cdel ===
      undefined
    ) {
      return;
    }

    month()
      .categories
      .splice(
        Number(
          e.target.dataset.cdel
        ),
        1
      );

    save();

    drawCatRows();
    renderLeftovers();
  };
}

/* =========================================================
   EXCEL EXPORT
========================================================= */

function exportWorkbook() {
  if (
    typeof XLSX ===
    "undefined"
  ) {

    toast(
      "Excel library not loaded"
    );

    return;
  }

  const wb =
    XLSX.utils.book_new();

  const entries =
    Object.entries(
      state.months
    )
      .sort(
        ([a], [b]) =>
          a.localeCompare(b)
      );

  entries.forEach(
    ([key, m]) => {

      if (
        !(m.transactions || [])
          .length &&
        !m.budget &&
        !m.startBank
      ) {
        return;
      }

      const [y, mo] =
        key
          .split("-")
          .map(Number);

      const rows = [

        [
          "My Expense Tracker",
          `${MONTHS[mo - 1]} ${y}`
        ],

        [
          "Monthly Budget",
          m.budget
        ],

        [
          "Starting Bank Balance",
          m.startBank
        ],

        [
          "Unspent Category Budget",
          monthUnspentTotal(m)
        ],

        [
          "Allocated to Savings",
          (
            m.savingsAllocations ||
            []
          ).reduce(
            (a, x) =>
              a +
              Number(
                x.amount || 0
              ),
            0
          )
        ],

        [],

        [
          "Date",
          "Category",
          "Note",
          "Payment Method",
          "Amount"
        ]
      ];

      (
        m.transactions ||
        []
      ).forEach(t => {

        rows.push([
          t.date,
          t.category,
          t.note,
          t.payment,
          t.amount
        ]);
      });

      if (
        (
          m.savingsAllocations ||
          []
        ).length
      ) {

        rows.push(
          [],
          ["Savings Allocations"],
          ["Goal", "Amount"]
        );

        m.savingsAllocations
          .forEach(a => {

            rows.push([
              a.goalName,
              a.amount
            ]);
          });
      }

      XLSX.utils
        .book_append_sheet(
          wb,

          XLSX.utils
            .aoa_to_sheet(
              rows
            ),

          `${MONTHS[mo - 1]} ${y}`
            .slice(0, 31)
        );
    }
  );

  const annual = [
    [
      "Month",
      "Budget",
      "Spent",
      "Budget Remaining",
      "Starting Bank",
      "Closing Bank"
    ]
  ];

  entries.forEach(
    ([key, m]) => {

      const [y, mo] =
        key
          .split("-")
          .map(Number);

      const s =
        stats(
          y,
          mo - 1
        );

      annual.push([
        `${MONTHS[mo - 1]} ${y}`,
        m.budget,
        s.spent,
        s.remaining,
        m.startBank,
        s.current
      ]);
    }
  );

  XLSX.utils
    .book_append_sheet(
      wb,

      XLSX.utils
        .aoa_to_sheet(
          annual
        ),

      "Annual Summary"
    );

  const goals = [
    [
      "Goal",
      "Type",
      "Target",
      "Saved",
      "Status"
    ]
  ];

  state.goals
    .forEach(g => {

      goals.push([
        g.name,

        g.type ||
        "short",

        g.target,
        g.saved,

        goalStatus(g) ===
        "completed"
          ? "Completed"
          : "Active"
      ]);
    });

  XLSX.utils
    .book_append_sheet(
      wb,

      XLSX.utils
        .aoa_to_sheet(
          goals
        ),

      "Savings Goals"
    );

  XLSX.writeFile(
    wb,
    `My_Expense_Tracker_${state.year}.xlsx`
  );

  toast(
    "Workbook downloaded"
  );
}