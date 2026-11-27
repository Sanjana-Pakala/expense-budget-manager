use axum::{
    extract::{Path, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, sqlite::SqlitePoolOptions};
use tower_http::cors::CorsLayer;

#[derive(Deserialize)]
struct TransactionInput {
    transaction_type: String,
    category: String,
    amount: f64,
    description: Option<String>,
    date: String,
}

#[derive(Serialize, FromRow)]
struct Transaction {
    id: i64,
    transaction_type: String,
    category: String,
    amount: f64,
    description: Option<String>,
    date: String,
}

#[derive(Serialize)]
struct TransactionResponse {
    message: String,
}

#[tokio::main]
async fn main() {
    // Connect to SQLite
    let database_url = "sqlite://expenses.db?mode=rwc";

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await
        .expect("Failed to connect to database");

    // Create transactions table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_type TEXT NOT NULL,
            category TEXT NOT NULL,
            amount REAL NOT NULL,
            description TEXT,
            date TEXT NOT NULL
        )
        "#,
    )
    .execute(&pool)
    .await
    .expect("Failed to create transactions table");

    // Create API routes
    let app = Router::new()
        .route(
        "/transactions",
        post(add_transaction).get(get_transactions),
    )
    .route(
        "/transactions/{id}",
        put(update_transaction).delete(delete_transaction),
    )
    .layer(CorsLayer::permissive())
    .with_state(pool);

    println!("Server running at http://127.0.0.1:3000");

    // Start server
    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000")
        .await
        .unwrap();

    axum::serve(listener, app)
        .await
        .unwrap();
}

// POST /transactions
async fn add_transaction(
    State(pool): State<sqlx::SqlitePool>,
    Json(input): Json<TransactionInput>,
) -> Json<TransactionResponse> {
    sqlx::query(
        r#"
        INSERT INTO transactions
        (transaction_type, category, amount, description, date)
        VALUES (?, ?, ?, ?, ?)
        "#,
    )
    .bind(&input.transaction_type)
    .bind(&input.category)
    .bind(input.amount)
    .bind(&input.description)
    .bind(&input.date)
    .execute(&pool)
    .await
    .expect("Failed to insert transaction");

    Json(TransactionResponse {
        message: "Transaction added successfully!".to_string(),
    })
}

// GET /transactions
async fn get_transactions(
    State(pool): State<sqlx::SqlitePool>,
) -> Json<Vec<Transaction>> {
    let transactions = sqlx::query_as::<_, Transaction>(
        r#"
        SELECT id, transaction_type, category, amount, description, date
        FROM transactions
        ORDER BY id DESC
        "#,
    )
    .fetch_all(&pool)
    .await
    .expect("Failed to fetch transactions");

    Json(transactions)
}
async fn update_transaction(
    State(pool): State<sqlx::SqlitePool>,
    Path(id): Path<i64>,
    Json(input): Json<TransactionInput>,
) -> Json<TransactionResponse> {

    sqlx::query(
        r#"
        UPDATE transactions
        SET
            transaction_type = ?,
            category = ?,
            amount = ?,
            description = ?,
            date = ?
        WHERE id = ?
        "#,
    )
    .bind(&input.transaction_type)
    .bind(&input.category)
    .bind(input.amount)
    .bind(&input.description)
    .bind(&input.date)
    .bind(id)
    .execute(&pool)
    .await
    .expect("Failed to update transaction");

    Json(TransactionResponse {
        message: "Transaction updated successfully!".to_string(),
    })
}
async fn delete_transaction(
    State(pool): State<sqlx::SqlitePool>,
    Path(id): Path<i64>,
) -> Json<TransactionResponse> {

    sqlx::query(
        "DELETE FROM transactions WHERE id = ?"
    )
    .bind(id)
    .execute(&pool)
    .await
    .expect("Failed to delete transaction");

    Json(TransactionResponse {
        message: "Transaction deleted successfully!".to_string(),
    })
}