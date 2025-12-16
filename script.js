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

let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
let budgets = JSON.parse(localStorage.getItem("budgets")) || {};
let summaryChart, categoryChart;

/* ================= HELPERS ================= */
const normalize = (t) => t.trim().toLowerCase();
const rupiah = (n) => `Rp ${n.toLocaleString("id-ID")}`;
const saveTx = () =>
  localStorage.setItem("transactions", JSON.stringify(transactions));
const saveBudgets = () =>
  localStorage.setItem("budgets", JSON.stringify(budgets));

const filteredData = () =>
  monthFilter.value
    ? transactions.filter((t) => t.date.startsWith(monthFilter.value))
    : transactions;

/* ================= RENDER ================= */
function render() {
  list.innerHTML = "";
  budgetList.innerHTML = "";

  let income = 0;
  let expense = 0;
  let totalBudget = 0;

  const data = filteredData();

  data.forEach((t, i) => {
    t.type === "income" ? (income += t.amount) : (expense += t.amount);

    list.innerHTML += `
      <tr>
        <td>${t.date}</td>
        <td>${t.title}</td>
        <td>${t.category}</td>
        <td class="${t.type}">${t.type}</td>
        <td>${rupiah(t.amount)}</td>
        <td>
          <button onclick="editTx(${i})">✏️</button>
          <button onclick="deleteTx(${i})">🗑️</button>
        </td>
      </tr>
    `;
  });

  totalIncomeEl.textContent = rupiah(income);
  totalExpenseEl.textContent = rupiah(expense);
  balanceEl.textContent = rupiah(income - expense);

  renderBudgets(data, expense, totalBudget);
  renderCharts(data, income, expense);
}

/* ================= BUDGET ================= */
function renderBudgets(data, expense) {
  let totalBudget = 0;

  Object.keys(budgets).forEach((cat) => {
    const limit = budgets[cat];
    totalBudget += limit;

    const used = data
      .filter((t) => t.type === "expense" && normalize(t.category) === cat)
      .reduce((a, b) => a + b.amount, 0);

    const percent = limit ? Math.round((used / limit) * 100) : 0;
    const width = Math.min(percent, 100);

    let barColor = "bg-green-500";
    if (percent >= 100) barColor = "bg-red-500";
    else if (percent >= 80) barColor = "bg-yellow-400";

    budgetList.innerHTML += `
      <tr>
        <td>${cat}</td>
        <td>${rupiah(limit)}</td>
        <td>${rupiah(used)}</td>
        <td>
          <div class="w-full bg-gray-200 rounded h-4 relative">
            <div class="h-4 rounded ${barColor}" style="width:${width}%"></div>
            <span class="progress-percentage">${percent}%</span>
          </div>
        </td>
        <td>
          <button onclick="deleteBudget('${cat}')">🗑️</button>
        </td>
      </tr>
    `;
  });

  if (Object.keys(budgets).length > 0) {
    budgetList.innerHTML += `
      <tr class="bg-gray-100 font-bold">
        <td colspan="4" class="text-right px-2">TOTAL BUDGET</td>
        <td>${rupiah(totalBudget)}</td>
      </tr>
    `;
  }
}

/* ================= CHARTS ================= */
function renderCharts(data, income, expense) {
  if (summaryChart) summaryChart.destroy();
  if (categoryChart) categoryChart.destroy();

  const totalBudget = Object.values(budgets).reduce((a, b) => a + b, 0);
  const budgetJebol = expense > totalBudget && totalBudget > 0;

  /* === RINGKASAN === */
  summaryChart = new Chart(document.getElementById("summaryChart"), {
    type: "doughnut",
    data: {
      labels: ["Pemasukan", "Pengeluaran"],
      datasets: [
        {
          data: [income, expense],
          backgroundColor: budgetJebol
            ? ["#9ca3af", "#ef4444"] // warning merah
            : ["#10b981", "#ef4444"],
        },
      ],
    },
    options: {
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${rupiah(ctx.parsed)}`,
          },
        },
      },
    },
  });

  /* === PER KATEGORI === */
  const catMap = {};
  data
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    });

  categoryChart = new Chart(document.getElementById("categoryChart"), {
    type: "pie",
    data: {
      labels: Object.keys(catMap),
      datasets: [
        {
          data: Object.values(catMap),
          backgroundColor: Object.keys(catMap).map(
            (_, i) => `hsl(${i * 60},70%,55%)`
          ),
        },
      ],
    },
    options: {
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${rupiah(ctx.parsed)}`,
          },
        },
      },
    },
  });
}

/* ================= EVENTS ================= */
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const obj = {
    date: date.value,
    title: title.value,
    category: normalize(category.value),
    type: type.value,
    amount: Number(amount.value),
  };

  editIndexEl.value !== ""
    ? (transactions[editIndexEl.value] = obj)
    : transactions.push(obj);

  saveTx();
  form.reset();
  editIndexEl.value = "";
  render();
});

budgetForm.addEventListener("submit", (e) => {
  e.preventDefault();
  budgets[normalize(budgetCategory.value)] = Number(budgetAmount.value);
  saveBudgets();
  budgetForm.reset();
  render();
});

function deleteTx(i) {
  if (confirm("Hapus transaksi?")) {
    transactions.splice(i, 1);
    saveTx();
    render();
  }
}

function editTx(i) {
  const t = filteredData()[i];
  date.value = t.date;
  title.value = t.title;
  category.value = t.category;
  type.value = t.type;
  amount.value = t.amount;
  editIndexEl.value = i;
}

function deleteBudget(cat) {
  if (confirm("Hapus budget?")) {
    delete budgets[cat];
    saveBudgets();
    render();
  }
}

monthFilter.addEventListener("change", render);
darkToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  render();
});

render();
