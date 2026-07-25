"""
ML engine: XGBoost, Random Forest, and Linear Regression models for
Business Health Score prediction with SHAP-based recommendations.
"""
import os
import pickle
import numpy as np
import pandas as pd
from pathlib import Path

import xgboost as xgb
import shap
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import MinMaxScaler


FEATURE_NAMES = [
    'gross_profit_margin',
    'expense_to_revenue_ratio',
    'inventory_turnover_rate',
    'customer_retention_rate',
    'total_sales_normalised',
    'num_transactions',
]

# Benchmark targets for a healthy Kigali restaurant
BENCHMARKS = {
    'gross_profit_margin':      {'target': 65, 'critical': 35, 'unit': '%'},
    'expense_to_revenue_ratio': {'target': 50, 'critical': 85, 'unit': '%'},
    'customer_retention_rate':  {'target': 60, 'critical': 25, 'unit': '%'},
    'inventory_turnover_rate':  {'target': 6,  'critical': 1.5, 'unit': 'x/month'},
    'total_sales_normalised':   {'target': 1.0, 'critical': 0.3, 'unit': 'M RWF'},
}


def compute_kpis(sales, expenses, inventory_records, retention):
    """Convert raw model data into feature vector."""
    total_sales = float(sales.get('total_sales', 0))
    total_expenses = float(expenses.get('total_expenses', 0))
    cost_of_goods = float(expenses.get('cost_of_goods', total_expenses * 0.4))
    num_transactions = int(sales.get('num_transactions', 0))
    inventory_used = float(inventory_records.get('quantity_used_value', 0))
    inventory_avg = float(inventory_records.get('avg_inventory_value', 1))
    retention_rate = float(retention.get('retention_rate', 0))

    gross_profit = total_sales - cost_of_goods
    gross_profit_margin = (gross_profit / total_sales * 100) if total_sales > 0 else 0
    expense_to_revenue = (total_expenses / total_sales * 100) if total_sales > 0 else 100
    inventory_turnover = (inventory_used / inventory_avg) if inventory_avg > 0 else 0

    return {
        'gross_profit_margin': round(gross_profit_margin, 2),
        'expense_to_revenue_ratio': round(expense_to_revenue, 2),
        'inventory_turnover_rate': round(inventory_turnover, 2),
        'customer_retention_rate': round(retention_rate, 2),
        'total_sales_normalised': round(total_sales / 1_000_000, 4),
        'num_transactions': num_transactions,
        'total_sales': total_sales,
        'total_expenses': total_expenses,
    }


def generate_synthetic_training_data(n_samples=5000):
    """
    Generate synthetic training data for initial model training.
    Mimics realistic patterns for a mid-tier Kigali restaurant.
    Uses 5 000 samples across varied operating conditions.
    """
    rng = np.random.default_rng(42)

    # Three operating regimes: struggling, average, thriving
    n_each = n_samples // 3
    extra = n_samples - n_each * 3

    def regime(n, gpm_mu, exp_mu, ret_mu, sales_mu):
        return {
            'gross_profit_margin':      np.clip(rng.normal(gpm_mu,  10, n), 5, 92),
            'expense_to_revenue_ratio': np.clip(rng.normal(exp_mu,  12, n), 15, 115),
            'inventory_turnover_rate':  np.clip(rng.normal(4.5, 2,  n), 0.2, 14),
            'customer_retention_rate':  np.clip(rng.normal(ret_mu,  15, n), 0, 100),
            'total_sales_normalised':   np.clip(rng.normal(sales_mu, 0.25, n), 0.03, 3.5),
            'num_transactions':         np.clip(rng.normal(80, 30, n), 3, 250).astype(int),
        }

    struggling = regime(n_each + extra, gpm_mu=35, exp_mu=85, ret_mu=28, sales_mu=0.4)
    average    = regime(n_each,         gpm_mu=55, exp_mu=65, ret_mu=48, sales_mu=0.75)
    thriving   = regime(n_each,         gpm_mu=72, exp_mu=45, ret_mu=68, sales_mu=1.2)

    data = {k: np.concatenate([struggling[k], average[k], thriving[k]]) for k in struggling}
    df = pd.DataFrame(data)

    # Deterministic health score formula (ground truth for training)
    score = (
        df['gross_profit_margin'] * 0.30
        + (100 - df['expense_to_revenue_ratio']) * 0.25
        + df['inventory_turnover_rate'] * 3.0 * 0.15
        + df['customer_retention_rate'] * 0.20
        + df['total_sales_normalised'] * 10 * 0.10
    )
    df['health_score'] = np.clip(score, 0, 100)

    # Shuffle so regimes are mixed
    return df.sample(frac=1, random_state=42).reset_index(drop=True)


def _metrics(y_test, y_pred, X_train):
    return {
        'mae':              round(float(mean_absolute_error(y_test, y_pred)), 4),
        'rmse':             round(float(np.sqrt(mean_squared_error(y_test, y_pred))), 4),
        'r2':               round(float(r2_score(y_test, y_pred)), 4),
        'training_samples': len(X_train),
    }


def train_all_models(df=None, model_path=None):
    """Train XGBoost, Random Forest and Linear Regression. Save all three."""
    if df is None:
        df = generate_synthetic_training_data()

    X = df[FEATURE_NAMES]
    y = df['health_score']
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    models = {
        'xgboost': xgb.XGBRegressor(
            n_estimators=200, max_depth=5, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8, random_state=42, verbosity=0,
        ),
        'random_forest': RandomForestRegressor(
            n_estimators=200, max_depth=8, random_state=42, n_jobs=-1,
        ),
        'linear_regression': LinearRegression(),
    }

    results = {}
    for name, model in models.items():
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        results[name] = (model, _metrics(y_test, y_pred, X_train))

    if model_path:
        os.makedirs(model_path, exist_ok=True)
        for name, (model, _) in results.items():
            with open(Path(model_path) / f'{name}_model.pkl', 'wb') as f:
                pickle.dump(model, f)

    return results


# Keep backward-compatible single-model helpers
def train_model(df=None, model_path=None):
    results = train_all_models(df, model_path)
    model, metrics = results['xgboost']
    return model, metrics


def load_model(model_path):
    """Load XGBoost model (default)."""
    return _load_named_model(model_path, 'xgboost')


def _load_named_model(model_path, name):
    model_file = Path(model_path) / f'{name}_model.pkl'
    if not model_file.exists():
        return None
    with open(model_file, 'rb') as f:
        return pickle.load(f)


def load_all_models(model_path):
    """Return dict of all three loaded models (None if not trained yet)."""
    return {
        name: _load_named_model(model_path, name)
        for name in ('xgboost', 'random_forest', 'linear_regression')
    }


def predict_score(model, kpis: dict) -> dict:
    """Predict health score and generate SHAP-based recommendations (XGBoost)."""
    features = pd.DataFrame([{k: kpis[k] for k in FEATURE_NAMES}])
    score = float(np.clip(model.predict(features)[0], 0, 100))

    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(features)
    shap_dict = {
        feature: float(shap_values[0][i])
        for i, feature in enumerate(FEATURE_NAMES)
    }
    recommendations = _generate_recommendations(kpis, shap_dict)
    return {
        'score': round(score, 2),
        'shap_values': shap_dict,
        'recommendations': recommendations,
    }


def predict_score_simple(model, kpis: dict) -> float:
    """Predict score for Random Forest or Linear Regression (no SHAP)."""
    features = pd.DataFrame([{k: kpis[k] for k in FEATURE_NAMES}])
    return round(float(np.clip(model.predict(features)[0], 0, 100)), 2)


def compare_all_models(models: dict, kpis: dict) -> dict:
    """Run all three models on the same KPIs and return comparison."""
    results = {}
    for name, model in models.items():
        if model is None:
            results[name] = None
            continue
        if name == 'xgboost':
            r = predict_score(model, kpis)
            results[name] = {'score': r['score'], 'shap_values': r['shap_values']}
        else:
            results[name] = {'score': predict_score_simple(model, kpis)}
    return results


def _generate_recommendations(kpis, shap_dict):
    """Generate context-aware recommendations using actual KPI values vs benchmarks."""
    recs = []
    sorted_features = sorted(shap_dict.items(), key=lambda x: abs(x[1]), reverse=True)

    for feature, impact in sorted_features:
        if feature not in BENCHMARKS:
            continue
        val = kpis.get(feature, 0)
        b = BENCHMARKS[feature]
        target, critical, unit = b['target'], b['critical'], b['unit']

        # Determine state and urgency based on distance from target
        if feature == 'expense_to_revenue_ratio':
            gap = val - target  # positive = bad
            is_bad = val > target
            pct_off = round(abs(gap), 1)
            if val >= critical:
                urgency = 'high'
            elif val > target:
                urgency = 'medium'
            else:
                urgency = 'low'
        else:
            gap = target - val  # positive = bad
            is_bad = val < target
            pct_off = round(abs(gap), 1)
            if val <= critical:
                urgency = 'high'
            elif val < target:
                urgency = 'medium'
            else:
                urgency = 'low'

        title, body, actions = _build_rec_content(feature, val, target, pct_off, unit, is_bad, urgency)

        recs.append({
            'feature': feature,
            'impact': round(impact, 3),
            'state': 'bad' if is_bad else 'good',
            'urgency': urgency,
            'current_value': round(val, 2),
            'target_value': target,
            'unit': unit,
            'gap': round(gap, 2),
            'title': title,
            'body': body,
            'actions': actions,
        })

        if len(recs) == 4:  # top 4 most impactful
            break

    return recs


def _build_rec_content(feature, val, target, pct_off, unit, is_bad, urgency):
    """Build dynamic title, body and actions based on actual values."""

    if feature == 'gross_profit_margin':
        if is_bad:
            title = f'Gross margin at {val:.1f}% — target is {target}%'
            body = (
                f'You are {pct_off}% below the healthy benchmark of {target}%. '
                f'After food and beverage costs, too little revenue remains to cover overheads. '
                f'Even a small price increase on your top 5 dishes can recover this quickly.'
            )
            actions = [
                f'Increase prices on your 3 best-selling dishes by 8–12% — test for 2 weeks',
                'Calculate cost-per-plate for your full menu and cut the 2 lowest-margin items',
                'Negotiate a bulk deal with your main ingredient supplier (aim for 10% off)',
                'Reduce portion sizes on high-cost ingredients by 5–8% without changing presentation',
            ]
        else:
            title = f'Gross margin strong at {val:.1f}%'
            body = f'You are {pct_off}% above the {target}% benchmark — excellent cost discipline on food and beverages.'
            actions = [
                'Introduce 2–3 premium menu items to push margin even higher',
                'Lock in current supplier prices with a 3-month contract before costs rise',
            ]

    elif feature == 'expense_to_revenue_ratio':
        if is_bad:
            title = f'Expenses at {val:.1f}% of revenue — should be under {target}%'
            body = (
                f'For every 100 RWF you earn, {val:.0f} RWF goes to expenses — that is {pct_off}% above the safe threshold. '
                f'At this rate, profitability is under serious pressure. '
                f'Staff costs and supplier invoices are typically the fastest wins.'
            )
            actions = [
                f'Audit your top 3 expense categories this week — identify anything above 15% of revenue',
                'Reduce staff hours during off-peak times (typically 14:00–17:00 on weekdays)',
                'Switch 2 high-cost ingredients to local Rwandan alternatives',
                'Pause any non-essential subscriptions or services for 30 days',
            ]
        else:
            title = f'Expense ratio healthy at {val:.1f}%'
            body = f'Costs are well controlled at {val:.1f}% of revenue, {pct_off}% below the {target}% ceiling.'
            actions = [
                'Reinvest savings into staff training or a small marketing push',
                'Set a monthly expense alert at {target}% to catch any drift early',
            ]

    elif feature == 'customer_retention_rate':
        if is_bad:
            title = f'Only {val:.0f}% of customers return — target is {target}%'
            body = (
                f'You are retaining {val:.0f}% of customers against a {target}% benchmark — a gap of {pct_off}%. '
                f'Acquiring a new customer costs 5x more than keeping one. '
                f'Even moving from {val:.0f}% to {min(val+15, target):.0f}% retention would significantly boost monthly revenue.'
            )
            actions = [
                'Start a simple stamp-card loyalty programme — 10 visits = 1 free item',
                'Train every staff member to greet returning customers by name',
                'Send a WhatsApp follow-up to customers 3 days after their visit',
                f'Offer a 10% discount on the next visit for anyone who has not returned in 14 days',
            ]
        else:
            title = f'Strong retention at {val:.0f}%'
            body = f'Customers are coming back — {val:.0f}% retention is {pct_off}% above the {target}% benchmark.'
            actions = [
                'Ask your top 20% most loyal customers for a Google review this week',
                'Launch a referral programme — existing customers bring a friend, both get a discount',
            ]

    elif feature == 'inventory_turnover_rate':
        if is_bad:
            title = f'Inventory turning {val:.1f}x — target is {target}x'
            body = (
                f'Stock is turning over {val:.1f} times against a target of {target}x — {pct_off} turns below benchmark. '
                f'Slow turnover means cash is locked in stock and spoilage risk is high. '
                f'In a Kigali restaurant, perishables sitting more than 3 days are a direct cost.'
            )
            actions = [
                'Order perishables every 3 days instead of weekly — smaller, fresher batches',
                'Identify your 5 slowest-moving items and run a daily special to clear them',
                'Implement FIFO strictly — label every delivery with arrival date',
                'Do a daily 5-minute stock count on your top 10 perishable items',
            ]
        else:
            title = f'Inventory turning efficiently at {val:.1f}x'
            body = f'Stock is moving at {val:.1f}x, {pct_off} turns above the {target}x benchmark — waste is minimal.'
            actions = [
                'Update reorder points as you enter a new season to avoid stockouts',
                'Monitor for sudden drops in turnover that could signal a slow-selling new item',
            ]

    elif feature == 'total_sales_normalised':
        sales_rwf = val * 1_000_000
        target_rwf = target * 1_000_000
        if is_bad:
            title = f'Daily sales at {sales_rwf/1000:.0f}K RWF — target is {target_rwf/1000:.0f}K RWF'
            body = (
                f'Revenue is {pct_off * 1_000_000 / 1000:.0f}K RWF below the daily benchmark. '
                f'This could be a footfall issue, a slow-period problem, or a missed upsell opportunity. '
                f'Each of these has a different fix — start by identifying your peak vs off-peak hours.'
            )
            actions = [
                'Run a lunch special (12:00–14:00) at 15% off to drive midday footfall',
                'Train staff to suggest one upsell per table — a drink, starter, or dessert',
                'Post on Instagram/WhatsApp status every morning with today\'s special',
                'Review your opening hours — are you open during Kigali\'s peak dining windows?',
            ]
        else:
            title = f'Sales strong at {sales_rwf/1000:.0f}K RWF/day'
            body = f'Daily revenue is {pct_off * 1_000_000 / 1000:.0f}K RWF above the benchmark — operations are generating solid volume.'
            actions = [
                'Ensure kitchen capacity can sustain this volume without quality dropping',
                'Analyse your top-selling hours and make sure you are fully staffed then',
            ]
    else:
        title = feature.replace('_', ' ').title()
        body = f'Current value: {val:.2f}. Target: {target}.'
        actions = []

    return title, body, actions
