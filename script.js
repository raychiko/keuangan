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
const sortSelect = document.createElement("select");

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

/* ======================================================
   SORTING
====================================================== */
function sortData(data) {
  const sortValue = sortSelect.value;
  if (sortValue === "newest")
    return data.sort((a, b) => new Date(b.date) - new Date(a.date));
  if (sortValue === "oldest")
    return data.sort((a, b) => new Date(a.date) - new Date(b.date));
  if (sortValue === "biggest") return data.sort((a, b) => b.amount - a.amount);
  if (sortValue === "smallest") return data.sort((a, b) => a.amount - b.amount);
  return data;
}

/* ======================================================
   RENDER
====================================================== */
function render() {
  list.innerHTML = "";
  budgetList.innerHTML = "";

  let income = 0,
    expense = 0;
  let data = filteredData();
  data = sortData(data);

  data.forEach((t, i) => {
    t.type === "income" ? (income += t.amount) : (expense += t.amount);
    list.innerHTML += `
      <tr>
        <td>${t.date}</td>
        <td>${t.category}</td>
        <td style="color:${t.type === "income" ? "#10b981" : "#ef4444"}">${
      t.type
    }</td>
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
   BUDGETS
====================================================== */
function renderBudgets(data) {
  budgetList.innerHTML = "";
  Object.keys(budgets).forEach((cat) => {
    const used = data
      .filter((t) => t.type === "expense" && normalize(t.category) === cat)
      .reduce((a, b) => a + b.amount, 0);
    const limit = budgets[cat];
    const percent = limit > 0 ? Math.round((used / limit) * 100) : 0;

    let cls = "progress-bar-safe";
    if (percent >= 100) cls = "progress-bar-danger";
    else if (percent >= 80) cls = "progress-bar-warning";

    // text color for light/dark
    const textColor = document.body.classList.contains("dark")
      ? "#f3f4f6"
      : "#000";

    budgetList.innerHTML += `
      <tr>
        <td>${cat}</td>
        <td>Rp ${limit.toLocaleString("id-ID")}</td>
        <td>Rp ${used.toLocaleString("id-ID")}</td>
        <td class="relative">
          <div class="w-full bg-gray-200 rounded h-4 relative">
            <div class="h-4 rounded ${cls}" style="width:${Math.min(
      percent,
      100
    )}%"></div>
            <span class="absolute left-1/2 top-0 -translate-x-1/2 text-sm font-semibold" style="color:${textColor};">${percent}%</span>
          </div>
        </td>
        <td>
          <button class="px-1 py-0.5 bg-red-500 text-white rounded" onclick="deleteBudget('${cat}')">🗑️</button>
        </td>
      </tr>
    `;
  });
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
        { data: [income, expense], backgroundColor: ["#10b981", "#ef4444"] },
      ],
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
  });
}

/* ======================================================
   FORM EVENTS
====================================================== */
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const editIdx = editIndexEl.value;
  const obj = {
    date: date.value,
    category: normalize(category.value),
    type: type.value,
    amount: Number(amount.value),
  };
  if (editIdx !== "") transactions[editIdx] = obj;
  else transactions.push(obj);

  saveTransactions();
  render();
  form.reset();
  editIndexEl.value = "";
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
  date.value = t.date;
  category.value = t.category;
  type.value = t.type;
  amount.value = t.amount;
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

// auto dark mode sesuai HP
if (
  window.matchMedia &&
  window.matchMedia("(prefers-color-scheme: dark)").matches
) {
  document.body.classList.add("dark");
}

/* ======================================================
   INITIAL RENDER
====================================================== */
render();
