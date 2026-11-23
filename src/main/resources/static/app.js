const API_URL = "/api/transactions";
const CURRENCY = "USD";
const AUTH_URL = "/api/auth";

const elements = {
  authScreen: document.querySelector("#auth-screen"),
  appShell: document.querySelector("#app-shell"),
  authForm: document.querySelector("#auth-form"),
  authTitle: document.querySelector("#auth-title"),
  authCopy: document.querySelector("#auth-copy"),
  authError: document.querySelector("#auth-error"),
  authSubmit: document.querySelector("#auth-submit"),
  authSwitchCopy: document.querySelector("#auth-switch-copy"),
  authSwitch: document.querySelector("#auth-switch"),
  userEmail: document.querySelector("#user-email"),
  userAvatar: document.querySelector("#user-avatar"),
  balance: document.querySelector("#net-balance"),
  income: document.querySelector("#total-income"),
  expense: document.querySelector("#total-expense"),
  rows: document.querySelector("#transaction-rows"),
  tableEmpty: document.querySelector("#table-empty"),
  emptyTitle: document.querySelector("#empty-title"),
  emptyCopy: document.querySelector("#empty-copy"),
  chart: document.querySelector("#category-chart"),
  categoryCount: document.querySelector("#category-count"),
  monthlyActivity: document.querySelector("#monthly-activity"),
  monthlyCount: document.querySelector("#monthly-count"),
  transactionCount: document.querySelector("#transaction-count"),
  latestActivity: document.querySelector("#latest-activity"),
  shownCount: document.querySelector("#shown-count"),
  categoryFilter: document.querySelector("#category-filter"),
  search: document.querySelector("#search-input"),
  startDate: document.querySelector("#start-date"),
  endDate: document.querySelector("#end-date"),
  notice: document.querySelector("#notice"),
  dialog: document.querySelector("#transaction-dialog"),
  form: document.querySelector("#transaction-form"),
  formError: document.querySelector("#form-error"),
  saveButton: document.querySelector("#save-transaction"),
  toast: document.querySelector("#toast")
};

let transactions = [];
let toastTimer;
let csrfToken = "";
let registering = false;

const money = (amount) => new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 2
}).format(Number(amount) || 0);

function showNotice(message) {
  elements.notice.textContent = message;
  elements.notice.hidden = false;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("visible"), 3000);
}

async function request(url, options = {}) {
  const method = options.method || "GET";
  const headers = {
    "Content-Type": "application/json",
    ...options.headers
  };
  if (!["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase()) && csrfToken) {
    headers["X-XSRF-TOKEN"] = csrfToken;
  }
  const response = await fetch(url, {
    ...options,
    method,
    credentials: "same-origin",
    headers
  });
  if (!response.ok) {
    const detail = await response.text();
    let message = detail;
    try {
      message = JSON.parse(detail).error || detail;
    } catch (error) {
      message = detail;
    }
    const requestError = new Error(message || `Request failed (${response.status})`);
    requestError.status = response.status;
    throw requestError;
  }
  if (response.status === 204) return null;
  return response.json();
}

async function refreshCsrfToken() {
  const result = await request(`${AUTH_URL}/csrf`);
  csrfToken = result.token;
}

function showAuthenticatedApp(email) {
  elements.userEmail.textContent = email;
  elements.userAvatar.textContent = email.charAt(0).toUpperCase();
  elements.authScreen.hidden = true;
  elements.appShell.hidden = false;
}

function showAuthenticationScreen() {
  elements.appShell.hidden = true;
  elements.authScreen.hidden = false;
  elements.authForm.reset();
  elements.authError.hidden = true;
  registering = false;
  updateAuthMode();
}

function updateAuthMode() {
  const password = elements.authForm.elements.password;
  elements.authTitle.textContent = registering ? "Create your account" : "Welcome back";
  elements.authCopy.textContent = registering
    ? "Sign up to keep your finances private and in one place."
    : "Sign in to see your personal finances.";
  elements.authSubmit.textContent = registering ? "Create account" : "Sign in";
  elements.authSwitchCopy.textContent = registering ? "Already have an account?" : "New here?";
  elements.authSwitch.textContent = registering ? "Sign in" : "Create an account";
  password.autocomplete = registering ? "new-password" : "current-password";
  password.minLength = registering ? 8 : 1;
}

function clearPrivateData() {
  transactions = [];
  render();
  elements.balance.textContent = money(0);
  elements.income.textContent = money(0);
  elements.expense.textContent = money(0);
}

async function initializeAuthentication() {
  try {
    await refreshCsrfToken();
    const user = await request(`${AUTH_URL}/me`);
    showAuthenticatedApp(user.email);
    await loadTransactions();
  } catch (error) {
    showAuthenticationScreen();
    if (error.status !== 401) {
      elements.authError.textContent = `Could not connect to your account: ${error.message}`;
      elements.authError.hidden = false;
    }
  }
}

function calculateSummary(items) {
  return items.reduce((summary, item) => {
    const amount = Number(item.amount) || 0;
    if (item.type === "INCOME") summary.totalIncome += amount;
    if (item.type === "EXPENSE") summary.totalExpense += amount;
    return summary;
  }, { totalIncome: 0, totalExpense: 0 });
}

async function loadTransactions() {
  elements.notice.hidden = true;
  try {
    transactions = await request(API_URL);
    if (!Array.isArray(transactions)) throw new Error("The transactions response was not a list.");
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date) || Number(b.id) - Number(a.id));
    render();
    try {
      const summary = await request(`${API_URL}/summary`);
      elements.income.textContent = money(summary.totalIncome);
      elements.expense.textContent = money(summary.totalExpense);
      elements.balance.textContent = money(summary.netBalance);
    } catch (error) {
      const summary = calculateSummary(transactions);
      elements.income.textContent = money(summary.totalIncome);
      elements.expense.textContent = money(summary.totalExpense);
      elements.balance.textContent = money(summary.totalIncome - summary.totalExpense);
      showNotice(`Your transaction list loaded, but the summary could not be refreshed: ${error.message}`);
    }
  } catch (error) {
    transactions = [];
    render();
    showNotice(`Could not load transactions. Make sure the application and database are running, then try again. ${error.message}`);
  }
}

function filteredTransactions() {
  const search = elements.search.value.trim().toLowerCase();
  const category = elements.categoryFilter.value.toLowerCase();
  const start = elements.startDate.value;
  const end = elements.endDate.value;

  return transactions.filter((item) => {
    const matchesText = !search || [item.description, item.category, item.type]
      .some((value) => String(value || "").toLowerCase().includes(search));
    const matchesCategory = !category || String(item.category).toLowerCase() === category;
    return matchesText && matchesCategory && (!start || item.date >= start) && (!end || item.date <= end);
  });
}

function refreshCategoryOptions() {
  const selected = elements.categoryFilter.value;
  const categories = [...new Set(transactions.map((item) => item.category).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  elements.categoryFilter.replaceChildren(new Option("All categories", ""));
  categories.forEach((category) => elements.categoryFilter.add(new Option(category, category)));
  if (categories.includes(selected)) elements.categoryFilter.value = selected;
}

function formatDate(date) {
  if (!date) return "—";
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? date : new Intl.DateTimeFormat(undefined, {
    month: "short", day: "numeric", year: "numeric"
  }).format(parsed);
}

function localDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createTransactionRow(item) {
  const row = document.createElement("tr");
  const descriptionCell = document.createElement("td");
  const description = document.createElement("div");
  description.className = "description-cell";
  const symbol = document.createElement("span");
  symbol.className = `transaction-symbol${item.type === "INCOME" ? " income" : ""}`;
  symbol.setAttribute("aria-hidden", "true");
  symbol.textContent = item.type === "INCOME" ? "↙" : "↗";
  const descriptionText = document.createElement("span");
  descriptionText.textContent = item.description || "Untitled transaction";
  description.append(symbol, descriptionText);
  descriptionCell.append(description);

  const categoryCell = document.createElement("td");
  const category = document.createElement("span");
  category.className = "category-pill";
  category.textContent = item.category || "Uncategorized";
  categoryCell.append(category);

  const dateCell = document.createElement("td");
  dateCell.textContent = formatDate(item.date);

  const typeCell = document.createElement("td");
  const type = document.createElement("span");
  type.className = `type-label${item.type === "INCOME" ? " income" : ""}`;
  type.textContent = item.type === "INCOME" ? "Income" : "Expense";
  typeCell.append(type);

  const amountCell = document.createElement("td");
  amountCell.className = `amount-cell ${item.type === "INCOME" ? "income" : "expense"}`;
  amountCell.textContent = `${item.type === "INCOME" ? "+" : "−"}${money(item.amount)}`;

  const actionCell = document.createElement("td");
  actionCell.className = "action-cell";
  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-button";
  deleteButton.textContent = "×";
  deleteButton.setAttribute("aria-label", `Delete ${item.description || "transaction"}`);
  deleteButton.addEventListener("click", () => deleteTransaction(item));
  actionCell.append(deleteButton);
  row.append(descriptionCell, categoryCell, dateCell, typeCell, amountCell, actionCell);
  return row;
}

function renderChart(items) {
  const totals = new Map();
  items.filter((item) => item.type === "EXPENSE").forEach((item) => {
    const category = item.category || "Uncategorized";
    totals.set(category, (totals.get(category) || 0) + (Number(item.amount) || 0));
  });
  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  elements.categoryCount.textContent = `${sorted.length} ${sorted.length === 1 ? "category" : "categories"}`;
  elements.chart.replaceChildren();
  if (!sorted.length) {
    const empty = document.createElement("div");
    empty.className = "chart-empty";
    empty.textContent = "Add an expense to see your spending breakdown.";
    elements.chart.append(empty);
    return;
  }
  const maximum = sorted[0][1] || 1;
  sorted.slice(0, 5).forEach(([name, amount]) => {
    const item = document.createElement("div");
    item.className = "category-item";
    const label = document.createElement("span");
    label.className = "category-name";
    label.textContent = name;
    const track = document.createElement("div");
    track.className = "category-track";
    const bar = document.createElement("div");
    bar.className = "category-bar";
    bar.style.width = `${Math.max(3, amount / maximum * 100)}%`;
    track.append(bar);
    const value = document.createElement("span");
    value.className = "category-amount";
    value.textContent = money(amount);
    item.append(label, track, value);
    elements.chart.append(item);
  });
}

function renderMonthlyActivity() {
  const months = new Map();
  transactions.forEach((transaction) => {
    const month = String(transaction.date || "").slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) return;
    if (!months.has(month)) {
      months.set(month, { transactions: [], income: 0, expense: 0 });
    }
    const summary = months.get(month);
    summary.transactions.push(transaction);
    if (transaction.type === "INCOME") summary.income += Number(transaction.amount) || 0;
    if (transaction.type === "EXPENSE") summary.expense += Number(transaction.amount) || 0;
  });

  const sortedMonths = [...months.entries()].sort(([a], [b]) => b.localeCompare(a));
  elements.monthlyCount.textContent = `${sortedMonths.length} ${sortedMonths.length === 1 ? "month" : "months"}`;
  elements.monthlyActivity.replaceChildren();
  if (!sortedMonths.length) {
    const empty = document.createElement("div");
    empty.className = "monthly-empty";
    empty.textContent = "Your monthly activity will appear here once you add transactions.";
    elements.monthlyActivity.append(empty);
    return;
  }

  sortedMonths.forEach(([month, summary]) => {
    const monthDate = new Date(`${month}-01T00:00:00`);
    const monthLabel = new Intl.DateTimeFormat(undefined, {
      month: "long",
      year: "numeric"
    }).format(monthDate);
    const details = document.createElement("details");
    details.className = "month-group";

    const heading = document.createElement("summary");
    heading.className = "month-summary";
    const title = document.createElement("span");
    title.className = "month-title";
    title.textContent = monthLabel;
    const count = document.createElement("span");
    count.className = "month-transaction-count";
    count.textContent = `${summary.transactions.length} ${summary.transactions.length === 1 ? "transaction" : "transactions"}`;
    const income = document.createElement("span");
    income.className = "month-total month-income";
    income.textContent = `Income ${money(summary.income)}`;
    const expense = document.createElement("span");
    expense.className = "month-total month-expense";
    expense.textContent = `Expenses ${money(summary.expense)}`;
    heading.append(title, count, income, expense);

    const transactionList = document.createElement("ul");
    transactionList.className = "month-transactions";
    summary.transactions.forEach((transaction) => {
      const item = document.createElement("li");
      item.className = "month-transaction";
      const description = document.createElement("span");
      description.className = "month-transaction-description";
      description.textContent = transaction.description || "Untitled transaction";
      const metadata = document.createElement("span");
      metadata.className = "month-transaction-meta";
      metadata.textContent = `${formatDate(transaction.date)} · ${transaction.category || "Uncategorized"} · ${transaction.type === "INCOME" ? "Income" : "Expense"}`;
      const amount = document.createElement("span");
      amount.className = `month-transaction-amount ${transaction.type === "INCOME" ? "income" : "expense"}`;
      amount.textContent = `${transaction.type === "INCOME" ? "+" : "−"}${money(transaction.amount)}`;
      item.append(description, metadata, amount);
      transactionList.append(item);
    });

    details.append(heading, transactionList);
    elements.monthlyActivity.append(details);
  });
}

function render() {
  refreshCategoryOptions();
  const items = filteredTransactions();
  elements.rows.replaceChildren(...items.map(createTransactionRow));
  elements.tableEmpty.hidden = items.length > 0;
  elements.rows.closest("table").hidden = items.length === 0;
  elements.shownCount.textContent = `${items.length} ${items.length === 1 ? "transaction" : "transactions"}`;
  elements.transactionCount.textContent = transactions.length;
  elements.latestActivity.textContent = transactions.length
    ? `${transactions[0].description || transactions[0].category} · ${formatDate(transactions[0].date)}`
    : "No transactions yet";
  elements.emptyTitle.textContent = transactions.length ? "No matching transactions" : "No transactions yet";
  elements.emptyCopy.textContent = transactions.length
    ? "Try changing your search or filters to find what you’re looking for."
    : "Add your first transaction to get a clearer picture of your money.";
  document.querySelector("#empty-add").hidden = transactions.length > 0;
  renderChart(items);
  renderMonthlyActivity();
}

async function deleteTransaction(item) {
  if (!window.confirm(`Delete "${item.description || "this transaction"}"?`)) return;
  try {
    await request(`${API_URL}/${encodeURIComponent(item.id)}`, { method: "DELETE" });
    showToast("Transaction deleted.");
    await loadTransactions();
  } catch (error) {
    showNotice(`Could not delete this transaction: ${error.message}`);
  }
}

function openDialog() {
  elements.form.reset();
  elements.form.elements.date.value = localDateValue();
  elements.formError.hidden = true;
  elements.dialog.showModal();
  elements.form.elements.amount.focus();
}

document.querySelector("#open-transaction").addEventListener("click", openDialog);
document.querySelector("#empty-add").addEventListener("click", openDialog);
document.querySelector("#close-dialog").addEventListener("click", () => elements.dialog.close());
document.querySelector("#cancel-dialog").addEventListener("click", () => elements.dialog.close());
elements.dialog.addEventListener("click", (event) => {
  if (event.target === elements.dialog) elements.dialog.close();
});
elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  elements.formError.hidden = true;
  elements.saveButton.disabled = true;
  elements.saveButton.textContent = "Saving...";
  const formData = new FormData(elements.form);
  const payload = {
    type: formData.get("type"),
    amount: Number(formData.get("amount")),
    category: String(formData.get("category")).trim(),
    description: String(formData.get("description")).trim(),
    date: formData.get("date")
  };
  try {
    await request(API_URL, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    elements.dialog.close();
    showToast("Transaction added.");
    await loadTransactions();
  } catch (error) {
    elements.formError.textContent = `Could not save this transaction: ${error.message}`;
    elements.formError.hidden = false;
  } finally {
    elements.saveButton.disabled = false;
    elements.saveButton.textContent = "Save transaction";
  }
});

[elements.search, elements.categoryFilter, elements.startDate, elements.endDate]
  .forEach((element) => element.addEventListener("input", render));
document.querySelector("#clear-filters").addEventListener("click", () => {
  elements.search.value = "";
  elements.categoryFilter.value = "";
  elements.startDate.value = "";
  elements.endDate.value = "";
  render();
});

document.querySelector("#today-label").textContent = new Intl.DateTimeFormat(undefined, {
  weekday: "short", month: "short", day: "numeric"
}).format(new Date());

elements.authSwitch.addEventListener("click", () => {
  registering = !registering;
  elements.authError.hidden = true;
  updateAuthMode();
});

elements.authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  elements.authError.hidden = true;
  elements.authSubmit.disabled = true;
  elements.authSubmit.textContent = registering ? "Creating account..." : "Signing in...";
  const formData = new FormData(elements.authForm);
  try {
    const user = await request(`${AUTH_URL}/${registering ? "register" : "login"}`, {
      method: "POST",
      body: JSON.stringify({
        email: String(formData.get("email")).trim(),
        password: String(formData.get("password"))
      })
    });
    showAuthenticatedApp(user.email);
    await loadTransactions();
  } catch (error) {
    elements.authError.textContent = error.message;
    elements.authError.hidden = false;
  } finally {
    elements.authSubmit.disabled = false;
    updateAuthMode();
  }
});

document.querySelector("#logout-button").addEventListener("click", async () => {
  try {
    await request(`${AUTH_URL}/logout`, { method: "POST" });
    clearPrivateData();
    showAuthenticationScreen();
    await refreshCsrfToken();
  } catch (error) {
    showNotice(`Could not sign out: ${error.message}`);
  }
});

initializeAuthentication();
