# Expense Tracker Website

A full-stack personal finance dashboard built with Spring Boot and a vanilla HTML, CSS, and JavaScript frontend. Users can create an account, sign in securely, add income and expense transactions, search and filter records, view financial summaries, and delete transactions.

## Features

- Account registration and login
- BCrypt password hashing
- Session-based authentication with CSRF protection
- Personal transaction records isolated by logged-in user
- Income and expense entry with category, description, amount, and date
- Total income, total expenses, and net balance summary
- Category and monthly activity dashboards
- Search, category filtering, and date-range filtering
- Responsive transaction table
- Secure logout

## Technology Stack

- Java 21
- Spring Boot 4.1.1
- Spring MVC
- Spring Security
- Spring Data JPA / Hibernate
- MySQL
- Lombok
- HTML5
- CSS3
- JavaScript
- Maven

## Project Structure

```text
ExpanseTracker-Website/
├── src/
│   ├── main/
│   │   ├── java/com/example/ExpanseProject/
│   │   │   ├── Config/         # Spring Security configuration
│   │   │   ├── Controller/     # Authentication and transaction APIs
│   │   │   ├── DTO/            # Financial summary response
│   │   │   ├── Model/          # User and transaction entities
│   │   │   ├── Repository/     # JPA repositories
│   │   │   └── Service/        # Registration and transaction logic
│   │   └── resources/
│   │       ├── static/         # HTML, CSS, JavaScript frontend
│   │       └── application.properties
│   └── test/java/              # Spring test suite
├── pom.xml
├── mvnw / mvnw.cmd
└── README.md
```

## Prerequisites

Install or configure:

- Java 21 or newer
- Maven (optional; Maven Wrapper is included)
- MySQL 8 or another compatible MySQL server

## Database Setup

1. Start MySQL.
2. Create the database:

```sql
CREATE DATABASE expansetricker;
```

3. Update `src/main/resources/application.properties` if your MySQL credentials differ:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/expansetricker
spring.datasource.username=root
spring.datasource.password=YOUR_MYSQL_PASSWORD
```

The application uses `spring.jpa.hibernate.ddl-auto=update`, so JPA will create or update the required tables when the application starts.

## Run the Application

### Windows

```powershell
.\mvnw.cmd spring-boot:run
```

### macOS or Linux

```bash
./mvnw spring-boot:run
```

Open <http://localhost:8080> in a browser.

The application serves the frontend and REST API from the same server.

## Build and Test

Build the JAR:

```bash
.\mvnw.cmd clean package
```

Run tests:

```bash
.\mvnw.cmd test
```

On macOS or Linux, replace `mvnw.cmd` with `./mvnw`.

After packaging, the executable JAR is available in `target/ExpanseProject-0.0.1-SNAPSHOT.jar`.

## REST API

All transaction endpoints require authentication.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register and log in |
| `POST` | `/api/auth/login` | Authenticate a user |
| `POST` | `/api/auth/logout` | Log out |
| `GET` | `/api/auth/me` | Get the current user |
| `GET` | `/api/auth/csrf` | Get a CSRF token |
| `GET` | `/api/transactions` | List the user's transactions |
| `POST` | `/api/transactions` | Add a transaction |
| `GET` | `/api/transactions/{id}` | Get a transaction by ID |
| `DELETE` | `/api/transactions/{id}` | Delete a transaction |
| `GET` | `/api/transactions/summary` | Get income, expense, and balance totals |
| `GET` | `/api/transactions/type/{type}` | Filter by `INCOME` or `EXPENSE` |
| `GET` | `/api/transactions/filter` | Filter by category and date range |

Example transaction JSON:

```json
{
  "type": "EXPENSE",
  "amount": 42.50,
  "category": "Food",
  "description": "Lunch",
  "date": "2026-11-23"
}
```

## Security Configuration

- Passwords are encoded with BCrypt.
- Transaction data is scoped to the authenticated account.
- State-changing requests require a CSRF token.
- Session cookies use HTTP-only and SameSite=Lax settings.
- Set `SESSION_COOKIE_SECURE=true` when deploying over HTTPS.

Do not commit real database passwords or private credentials. Replace the local MySQL password before sharing or deploying the project.

## Troubleshooting

- `Unknown database 'expansetricker'`: create the database using the SQL command above.
- `Access denied for user`: verify the MySQL username and password in `application.properties`.
- `Could not connect`: make sure MySQL is running and accepts local TCP connections on port `3306`.
- Login or transaction requests fail: refresh the page to obtain a new CSRF token and ensure cookies are enabled.
