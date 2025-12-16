/* ======================================================
   ELEMENTS
====================================================== */
const form = document.getElementById("form");
const budgetForm = document.getElementById("budgetForm");
const list = document.getElementById("list");
const budgetList = document.getElementById("budgetList");
const monthFilter = document.getElementById("monthFilter");
const totalIncomeEl = document.getElementById("totalIncome");
const totalExpenseEl = document.getElementById("totalExpense");
const balanceEl = document.getElementById("balance");
const darkToggle = document.getElementById("darkToggle");
const editIndexEl = document.getElementById("editIndex");

const dateInput = document.getElementById("date");
const categoryInput = document.getElementById("category");
const nameInput = document.getElementById("name");
const typeInput = document.getElementById("type");
const amountInput = document.getElementById("amount");

/* ======================================================
   DATA
====================================================== */
let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
let budgets = JSON.parse(localStorage.getItem("budgets")) || {};

let summaryChart, categoryChart;

/* ======================================================
   HELPERS
====================================================== */
const normalize = (text) => text.trim().toLowerCase();

const saveTransactions = () =>
  localStorage.setItem("transactions", JSON.stringify(transactions));

const saveBudgets = () =>
  localStorage.setItem("budgets", JSON.stringify(budgets));

const filteredData = () =>
  monthFilter.value
    ? transactions.filter((t) => t.date.startsWith(monthFilter.value))
    : transactions;

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

/* ======================================================
   RENDER
====================================================== */
function render() {
  list.innerHTML = "";
  budgetList.innerHTML = "";

  let income = 0;
  let expense = 0;

  const data = filteredData();

  data.forEach((t, i) => {
    t.type === "income" ? (income += t.amount) : (expense += t.amount);

    list.innerHTML += `
      <tr>
        <td>${t.date}</td>
        <td>${t.category}</td>
        <td>${t.name || "-"}</td>
        <td class="${t.type}">
          ${t.type === "income" ? "Pemasukan" : "Pengeluaran"}
        </td>
        <td>Rp ${t.amount.toLocaleString("id-ID")}</td>
        <td>
          <button class="px-1 py-0.5 bg-yellow-400 text-white rounded" onclick="editTx(${i})">✏️</button>
          <button class="px-1 py-0.5 bg-red-500 text-white rounded" onclick="deleteTx(${i})">🗑️</button>
        </td>
      </tr>
    `;
  });

  totalIncomeEl.textContent = `Rp ${income.toLocaleString("id-ID")}`;
  totalExpenseEl.textContent = `Rp ${expense.toLocaleString("id-ID")}`;
  balanceEl.textContent = `Rp ${(income - expense).toLocaleString("id-ID")}`;

  renderBudgets(data);
  renderCharts(data, income, expense);
}

/* ======================================================
   BUDGET
====================================================== */
function renderBudgets(data) {
  budgetList.innerHTML = "";

  let totalBudget = 0;
  let totalUsed = 0;

  Object.keys(budgets).forEach((cat) => {
    const used = data
      .filter((t) => t.type === "expense" && normalize(t.category) === cat)
      .reduce((a, b) => a + b.amount, 0);

    const limit = budgets[cat];
    const percent = limit > 0 ? Math.round((used / limit) * 100) : 0;

    totalBudget += limit;
    totalUsed += used;

    let cls = "progress-bar-safe";
    if (percent >= 100) cls = "progress-bar-danger";
    else if (percent >= 80) cls = "progress-bar-warning";

    budgetList.innerHTML += `
      <tr>
        <td>${cat}</td>
        <td>Rp ${limit.toLocaleString("id-ID")}</td>
        <td>Rp ${used.toLocaleString("id-ID")}</td>
        <td>
          <div class="w-full bg-gray-200 rounded h-4 relative">
            <div class="h-4 rounded ${cls}" style="width:${Math.min(
      percent,
      100
    )}%"></div>
            <span class="progress-percentage">${percent}%</span>
          </div>
        </td>
        <td>
          <button class="px-1 py-0.5 bg-red-500 text-white rounded" onclick="deleteBudget('${cat}')">🗑️</button>
        </td>
      </tr>
    `;
  });

  if (Object.keys(budgets).length > 0) {
    budgetList.innerHTML += `
      <tr class="font-bold bg-gray-100">
        <td>TOTAL</td>
        <td>Rp ${totalBudget.toLocaleString("id-ID")}</td>
        <td>Rp ${totalUsed.toLocaleString("id-ID")}</td>
        <td colspan="2"></td>
      </tr>
    `;
  }
}

/* ======================================================
   CHARTS
====================================================== */
function renderCharts(data, income, expense) {
  if (summaryChart) summaryChart.destroy();
  if (categoryChart) categoryChart.destroy();

  summaryChart = new Chart(document.getElementById("summaryChart"), {
    type: "doughnut",
    data: {
      labels: ["Pemasukan", "Pengeluaran"],
      datasets: [
        {
          data: [income, expense],
          backgroundColor: ["#10b981", "#ef4444"],
        },
      ],
    },
    options: {
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) =>
              `${ctx.label}: Rp ${ctx.raw.toLocaleString("id-ID")}`,
          },
        },
      },
    },
  });

  const catMap = {};
  data
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      const key = normalize(t.category);
      catMap[key] = (catMap[key] || 0) + t.amount;
    });

  categoryChart = new Chart(document.getElementById("categoryChart"), {
    type: "pie",
    data: {
      labels: Object.keys(catMap),
      datasets: [
        {
          data: Object.values(catMap),
          backgroundColor: Object.keys(catMap).map(
            (_, i) => `hsl(${i * 60},70%,50%)`
          ),
        },
      ],
    },
    options: {
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) =>
              `${ctx.label}: Rp ${ctx.raw.toLocaleString("id-ID")}`,
          },
        },
      },
    },
  });
}

/* ======================================================
   FORM EVENTS
====================================================== */
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const editIdx = editIndexEl.value;

  const obj = {
    date: dateInput.value,
    category: normalize(categoryInput.value),
    name: nameInput.value.trim(),
    type: typeInput.value,
    amount: Number(amountInput.value),
  };

  if (editIdx !== "") transactions[editIdx] = obj;
  else transactions.push(obj);

  saveTransactions();
  render();
  form.reset();
  editIndexEl.value = "";

  // 📅 auto set tanggal hari ini setelah simpan
  dateInput.value = todayISO();
});

budgetForm.addEventListener("submit", (e) => {
  e.preventDefault();
  budgets[normalize(budgetCategory.value)] = Number(budgetAmount.value);
  saveBudgets();
  render();
  budgetForm.reset();
});

/* ======================================================
   ACTIONS
====================================================== */
function deleteTx(i) {
  if (!confirm("Hapus transaksi?")) return;
  transactions.splice(i, 1);
  saveTransactions();
  render();
}

function editTx(i) {
  const t = filteredData()[i];
  dateInput.value = t.date;
  categoryInput.value = t.category;
  nameInput.value = t.name || "";
  typeInput.value = t.type;
  amountInput.value = t.amount;
  editIndexEl.value = i;
}

function deleteBudget(cat) {
  if (!confirm("Hapus budget?")) return;
  delete budgets[cat];
  saveBudgets();
  render();
}

/* ======================================================
   FILTER & DARK MODE
====================================================== */
monthFilter.addEventListener("change", render);

darkToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  render();
});

if (
  window.matchMedia &&
  window.matchMedia("(prefers-color-scheme: dark)").matches
) {
  document.body.classList.add("dark");
}

/* ======================================================
   INITIAL
====================================================== */
dateInput.value = todayISO();
render();
