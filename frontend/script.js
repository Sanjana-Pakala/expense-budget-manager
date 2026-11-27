const API_URL = "http://127.0.0.1:3000";

// Get elements from HTML
const form = document.getElementById("transactionForm");
const transactionsList = document.getElementById("transactionsList");

const totalIncome = document.getElementById("totalIncome");
const totalExpenses = document.getElementById("totalExpenses");
const balance = document.getElementById("balance");

const searchInput = document.getElementById("searchInput");
const filterCategory = document.getElementById("filterCategory");

// Store all transactions
let allTransactions = [];


// Load transactions when page opens
loadTransactions();


// ========================================
// ADD TRANSACTION
// ========================================

form.addEventListener("submit", async function (event) {

    event.preventDefault();

    const transaction = {

        transaction_type:
            document.getElementById("transactionType").value,

        category:
            document.getElementById("category").value,

        amount:
            Number(document.getElementById("amount").value),

        description:
            document.getElementById("description").value,

        date:
            document.getElementById("date").value
    };


    try {

        const response = await fetch(`${API_URL}/transactions`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(transaction)
        });


        if (!response.ok) {

            throw new Error("Failed to add transaction");

        }


        const result = await response.json();

        alert(result.message);


        // Clear form
        form.reset();


        // Reload transactions
        loadTransactions();


    } catch (error) {

        console.error(error);

        alert("Could not connect to the Rust server.");

    }

});


// ========================================
// GET TRANSACTIONS
// ========================================

async function loadTransactions() {

    try {

        const response =
            await fetch(`${API_URL}/transactions`);


        if (!response.ok) {

            throw new Error("Failed to fetch transactions");

        }


        const transactions =
            await response.json();


        // Store all transactions
        allTransactions = transactions;


        // Display transactions
        displayTransactions(allTransactions);


    } catch (error) {

        console.error(error);

        transactionsList.innerHTML =
            "<p>Could not connect to the Rust server.</p>";

    }

}


// ========================================
// DISPLAY TRANSACTIONS
// ========================================

function displayTransactions(transactions) {

    transactionsList.innerHTML = "";


    if (transactions.length === 0) {

        transactionsList.innerHTML =
            "<p>No transactions found.</p>";

        // Keep summary based on ALL transactions
    updateSummary(allTransactions);
    updateExpenseChart(allTransactions);
    updateInsights(allTransactions);
    updateIncomeExpenseChart(allTransactions);

        return;

    }


    transactions.forEach(transaction => {

        const div =
            document.createElement("div");


        div.className = "transaction";


        // Decide + or -
        const sign =
            transaction.transaction_type === "expense"
                ? "-"
                : "+";


        // Decide CSS class
        const amountClass =
            transaction.transaction_type === "expense"
                ? "expense"
                : "income";


        div.innerHTML = `

            <div class="transaction-info">

                <h3>${transaction.category}</h3>

                <p>
                    ${transaction.description || "No description"}
                </p>

                <p>
                    ${transaction.date}
                </p>

            </div>


            <div class="amount ${amountClass}">

                ${sign} ₹${transaction.amount}

            </div>
            <button
                class="edit-btn"
                onclick="editTransaction(${transaction.id})">
                ✏️ Edit
            </button>
            <button
                class="delete-btn"
                onclick="deleteTransaction(${transaction.id})">
                🗑️
            </button>

        `;


        transactionsList.appendChild(div);

    });


    // Always calculate summary using ALL transactions
    updateSummary(allTransactions);
    updateExpenseChart(allTransactions);
    updateInsights(allTransactions);
    updateIncomeExpenseChart(allTransactions);
}


// ========================================
// CALCULATE SUMMARY
// ========================================

function updateSummary(transactions) {

    let income = 0;

    let expenses = 0;


    transactions.forEach(transaction => {

        if (transaction.transaction_type === "income") {

            income += transaction.amount;

        } else {

            expenses += transaction.amount;

        }

    });


    // Update dashboard
    totalIncome.textContent =
        `₹${income}`;

    totalExpenses.textContent =
        `₹${expenses}`;

    balance.textContent =
        `₹${income - expenses}`;

}


// ========================================
// SEARCH
// ========================================

searchInput.addEventListener(
    "input",
    filterTransactions
);


// ========================================
// CATEGORY FILTER
// ========================================

filterCategory.addEventListener(
    "change",
    filterTransactions
);


// ========================================
// FILTER TRANSACTIONS
// ========================================

function filterTransactions() {

    const searchText =
        searchInput.value.toLowerCase();


    const selectedCategory =
        filterCategory.value;


    const filteredTransactions =
        allTransactions.filter(transaction => {


            // Search category
            const categoryMatch =
                transaction.category
                    .toLowerCase()
                    .includes(searchText);


            // Search description
            const descriptionMatch =
                (transaction.description || "")
                    .toLowerCase()
                    .includes(searchText);


            // Category dropdown
            const categoryFilterMatch =
                selectedCategory === "All" ||
                transaction.category === selectedCategory;


            return (
                (categoryMatch || descriptionMatch)
                &&
                categoryFilterMatch
            );

        });


    displayTransactions(filteredTransactions);

}
// EXPENSE CHART
let expenseChart;

function updateExpenseChart(transactions) {

    const categoryTotals = {};

    transactions.forEach(transaction => {

        if (transaction.transaction_type === "expense") {

            if (!categoryTotals[transaction.category]) {
                categoryTotals[transaction.category] = 0;
            }

            categoryTotals[transaction.category] += transaction.amount;
        }
    });

    const categories = Object.keys(categoryTotals);
    const amounts = Object.values(categoryTotals);

    const ctx = document.getElementById("expenseChart");

    if (expenseChart) {
        expenseChart.destroy();
    }

    expenseChart = new Chart(ctx, {
        type: "doughnut",

        data: {
            labels: categories,

            datasets: [{
                label: "Expenses",
                data: amounts
            }]
        },

        options: {
            responsive: true,

            plugins: {
                legend: {
                    position: "bottom"
                }
            }
        }
    });
}
// MONTHLY BUDGET

const budgetInput = document.getElementById("budgetInput");
const setBudgetBtn = document.getElementById("setBudgetBtn");

const monthlyBudget = document.getElementById("monthlyBudget");
const amountSpent = document.getElementById("amountSpent");
const remainingBudget = document.getElementById("remainingBudget");

let budget = 0;

// Set budget
setBudgetBtn.addEventListener("click", function () {

    budget = Number(budgetInput.value);

    if (budget <= 0) {
        alert("Please enter a valid budget.");
        return;
    }

    monthlyBudget.textContent = `₹${budget}`;

    updateBudget();
});

// Calculate budget usage
function updateBudget() {

    let spent = 0;

    allTransactions.forEach(transaction => {

        if (transaction.transaction_type === "expense") {
            spent += transaction.amount;
        }

    });

    const remaining = budget - spent;

    amountSpent.textContent = `₹${spent}`;
    remainingBudget.textContent = `₹${remaining}`;

    // Calculate budget usage percentage
    const usagePercentage = (spent / budget) * 100;

    const budgetHealth =
        document.getElementById("budgetHealth");

    if (usagePercentage <= 50) {

        budgetHealth.textContent =
            "🟢 Excellent! Your spending is under control.";

    } else if (usagePercentage <= 75) {

        budgetHealth.textContent =
            "🟡 Good! Keep an eye on your spending.";

    } else if (usagePercentage <= 100) {

        budgetHealth.textContent =
            "🟠 Warning! You are close to your budget limit.";

    } else {

        budgetHealth.textContent =
            "🔴 Over Budget! Your expenses have exceeded your budget.";

    }
}
// SPENDING INSIGHTS

function updateInsights(transactions) {

    const insights = document.getElementById("insights");

    let totalSpent = 0;
    const categoryTotals = {};

    transactions.forEach(transaction => {

        if (transaction.transaction_type === "expense") {

            totalSpent += transaction.amount;

            if (!categoryTotals[transaction.category]) {
                categoryTotals[transaction.category] = 0;
            }

            categoryTotals[transaction.category] += transaction.amount;
        }
    });

    // No expenses
    if (totalSpent === 0) {

        insights.innerHTML =
            "<p>💡 No expenses recorded yet.</p>";

        return;
    }

    // Find highest spending category
    let highestCategory = "";
    let highestAmount = 0;

    for (const category in categoryTotals) {

        if (categoryTotals[category] > highestAmount) {

            highestAmount = categoryTotals[category];
            highestCategory = category;
        }
    }

    insights.innerHTML = `
        <p>
            💰 Total spending:
            <strong>₹${totalSpent}</strong>
        </p>

        <p>
            📌 Highest spending category:
            <strong>${highestCategory}</strong>
            (₹${highestAmount})
        </p>
    `;
}
// INCOME VS EXPENSE CHART

let incomeExpenseChart;

function updateIncomeExpenseChart(transactions) {

    let income = 0;
    let expenses = 0;

    transactions.forEach(transaction => {

        if (transaction.transaction_type === "income") {
            income += transaction.amount;
        } else {
            expenses += transaction.amount;
        }

    });

    const ctx =
        document.getElementById("incomeExpenseChart");

    if (incomeExpenseChart) {
        incomeExpenseChart.destroy();
    }

    incomeExpenseChart = new Chart(ctx, {

        type: "bar",

        data: {
            labels: ["Income", "Expenses"],

            datasets: [{
                label: "Amount",
                data: [income, expenses]
            }]
        },

        options: {
            responsive: true,

            plugins: {
                legend: {
                    display: false
                }
            },

            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }

    });
}
// EDIT TRANSACTION

async function editTransaction(id) {

    const transaction = allTransactions.find(
        transaction => transaction.id === id
    );

    if (!transaction) {
        alert("Transaction not found.");
        return;
    }

    const newAmount = prompt(
        "Enter new amount:",
        transaction.amount
    );

    if (newAmount === null) {
        return;
    }

    const newDescription = prompt(
        "Enter new description:",
        transaction.description || ""
    );

    if (newDescription === null) {
        return;
    }

    const updatedTransaction = {
        transaction_type: transaction.transaction_type,
        category: transaction.category,
        amount: Number(newAmount),
        description: newDescription,
        date: transaction.date
    };

    try {

        const response = await fetch(
            `${API_URL}/transactions/${id}`,
            {
                method: "PUT",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(updatedTransaction)
            }
        );

        if (!response.ok) {
            throw new Error("Failed to update transaction");
        }

        const result = await response.json();

        alert(result.message);

        loadTransactions();

    } catch (error) {

        console.error(error);

        alert("Could not update transaction.");
    }
}
async function deleteTransaction(id) {

    const confirmed = confirm(
        "Are you sure you want to delete this transaction?"
    );

    if (!confirmed) {
        return;
    }

    try {

        const response = await fetch(
            `${API_URL}/transactions/${id}`,
            {
                method: "DELETE"
            }
        );

        if (!response.ok) {
            throw new Error("Failed to delete transaction");
        }

        const result = await response.json();

        alert(result.message);

        loadTransactions();

    } catch (error) {

        console.error(error);

        alert("Could not delete transaction.");
    }
}