# FinText — Business Health Intelligence Platform

> AI-powered financial health scoring for restaurants, bars and cafés in Rwanda.
> Built for **Hanga Pitch 2026**.

## Links
- **GitHub:** https://github.com/kundansengaprince-ui/fintext
- **Frontend:** https://your-frontend.railway.app *(update after Railway deploy)*
- **Backend API:** https://your-backend.railway.app/api/ *(update after Railway deploy)*

### Demo Credentials
| Role | Username | Password |
|------|----------|----------|
| Manager (full access) | manager | manager123 |
| Cashier | cashier | cashier123 |
| Finance Officer | finance | finance123 |
| IT Admin | itadmin | itadmin123 |
| Floor Staff | waiter | waiter123 |

---

## What It Does

FinText gives restaurant and café owners in Rwanda a real-time **Business Health Score (0–100)** powered by machine learning. Instead of guessing how their business is doing, owners get a daily score with plain-language explanations of what's driving it up or down.

### Core Features
- **Daily data entry** — Sales, Expenses, Inventory, Customer retention
- **ML Health Score** — XGBoost model trained on restaurant KPIs
- **SHAP Explainability** — tells you *why* the score changed, not just what it is
- **3-Model Comparison** — XGBoost vs Random Forest vs Linear Regression
- **Role-based access** — Manager, Cashier, Finance Officer, IT Admin, Floor Staff
- **Multi-business** — each business has isolated data
- **Audit log** — every action tracked with user, timestamp and IP
- **30-day trend chart** — visualise score trajectory over time

### KPIs Tracked
| KPI | Weight |
|-----|--------|
| Gross Profit Margin | 30% |
| Expense-to-Revenue Ratio | 25% |
| Customer Retention Rate | 20% |
| Inventory Turnover Rate | 15% |
| Daily Sales Volume | 10% |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Django 6 + Django REST Framework |
| Database | PostgreSQL |
| ML | XGBoost, Random Forest, Linear Regression |
| Explainability | SHAP |
| Frontend | React + Vite + Tailwind CSS |
| Auth | Token-based + Role-based permissions |
| Deployment | Railway |

---

## Local Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in your values
python manage.py migrate
python create_admin.py
python create_test_users.py
python manage.py train_model
python manage.py runserver 8001
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Problem We Solve

Over **60% of SMEs in Rwanda fail within 3 years**, largely due to poor financial visibility. Most restaurant owners in Kigali track finances manually in notebooks or basic spreadsheets — they have no early warning system when their business is declining.

FinText gives them a single number they can act on, with specific recommendations backed by their own data.

---

## Team
Built in Kigali, Rwanda 🇷🇼
