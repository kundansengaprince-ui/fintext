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

RECOMMENDATIONS = {
    'expense_to_revenue_ratio': {
        'high': {
            'title': 'Expenses are eating your revenue',
            'body': 'Your costs are taking up too much of what you earn. Start by auditing your top 3 expense categories — chances are supplier prices or staff scheduling can be tightened without affecting quality.',
            'actions': [
                'Renegotiate supplier contracts or find alternative vendors',
                'Review weekly staff rosters against actual footfall',
                'Cut or pause low-ROI marketing spend temporarily',
            ],
            'urgency': 'high',
        },
        'low': {
            'title': 'Cost control is on point',
            'body': 'Your expense-to-revenue ratio is healthy. You are keeping costs lean while generating solid revenue — this is a key driver of your health score.',
            'actions': [
                'Keep monitoring weekly to catch any creeping costs early',
                'Consider reinvesting savings into staff training or equipment',
            ],
            'urgency': 'low',
        },
    },
    'gross_profit_margin': {
        'low': {
            'title': 'Profit margin needs attention',
            'body': 'After covering the cost of your food and beverages, not enough is left over. This usually means either your prices are too low or your ingredient costs are too high.',
            'actions': [
                'Review menu pricing — even a 5–10% increase on top sellers makes a big difference',
                'Identify your highest-cost dishes and reduce portion waste',
                'Negotiate bulk pricing with your main food suppliers',
            ],
            'urgency': 'high',
        },
        'high': {
            'title': 'Gross margin is strong',
            'body': 'You are keeping a healthy share of revenue after food and beverage costs. This gives you a solid foundation to cover overheads and generate profit.',
            'actions': [
                'Protect this by monitoring ingredient cost changes monthly',
                'Introduce higher-margin items to your menu to push it even further',
            ],
            'urgency': 'low',
        },
    },
    'customer_retention_rate': {
        'low': {
            'title': 'Customers are not coming back',
            'body': 'Most of your customers are visiting only once. Winning a new customer costs 5x more than keeping an existing one — improving retention is one of the fastest ways to grow revenue without spending more.',
            'actions': [
                'Launch a simple loyalty card or points programme',
                'Train floor staff to greet returning customers by name',
                'Follow up on negative feedback within 24 hours',
                'Offer a small incentive for a second visit (e.g. free drink on return)',
            ],
            'urgency': 'high',
        },
        'high': {
            'title': 'Customers keep coming back',
            'body': 'Your retention rate is excellent — a strong sign that customers enjoy the experience. This is one of the most valuable assets a restaurant can have.',
            'actions': [
                'Ask loyal customers for Google or social media reviews',
                'Introduce a referral incentive to turn regulars into ambassadors',
            ],
            'urgency': 'low',
        },
    },
    'inventory_turnover_rate': {
        'low': {
            'title': 'Stock is sitting too long',
            'body': 'Inventory is not moving fast enough, which means money is tied up in stock and wastage risk is high. Slow turnover often signals over-ordering or menu items that are not selling.',
            'actions': [
                'Switch to smaller, more frequent supplier orders',
                'Identify slow-moving items and remove or promote them',
                'Implement a daily stock count for perishables',
                'Use a FIFO (first in, first out) system in your kitchen',
            ],
            'urgency': 'medium',
        },
        'high': {
            'title': 'Inventory is moving efficiently',
            'body': 'Stock is turning over at a healthy rate, meaning you are ordering the right quantities and minimising waste. This directly protects your margins.',
            'actions': [
                'Keep reorder levels updated as seasonal demand shifts',
                'Watch for any sudden drops that could signal stockouts',
            ],
            'urgency': 'low',
        },
    },
    'total_sales_normalised': {
        'low': {
            'title': 'Daily sales are below potential',
            'body': 'Revenue is not where it should be for a business of your size. This could be a footfall problem, a conversion problem, or a slow-period problem — each has a different fix.',
            'actions': [
                'Run a weekend promotion or happy hour to drive footfall',
                'Train staff on upselling — suggesting starters, desserts, or drinks',
                'Review your opening hours against actual peak times',
                'Boost visibility with a Google Business profile update or social post',
            ],
            'urgency': 'high',
        },
        'high': {
            'title': 'Sales volume is performing well',
            'body': 'Daily revenue is strong. The focus now should be on making sure operations can handle the volume without quality slipping.',
            'actions': [
                'Ensure kitchen and service capacity matches peak demand',
                'Track your busiest hours and staff accordingly',
            ],
            'urgency': 'low',
        },
    },
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
    """Map SHAP-driven feature impacts to rich structured recommendations."""
    recs = []
    sorted_features = sorted(shap_dict.items(), key=lambda x: abs(x[1]), reverse=True)

    thresholds = {
        'gross_profit_margin':      {'low': 45, 'high': 65},
        'expense_to_revenue_ratio': {'high': 75, 'low': 50},
        'customer_retention_rate':  {'low': 40, 'high': 60},
        'inventory_turnover_rate':  {'low': 2.5, 'high': 6},
        'total_sales_normalised':   {'low': 0.5, 'high': 1.2},
    }

    for feature, impact in sorted_features[:3]:
        if feature not in RECOMMENDATIONS:
            continue
        val = kpis.get(feature, 0)
        t = thresholds.get(feature, {})

        if feature == 'expense_to_revenue_ratio':
            state = 'high' if val > t.get('high', 75) else 'low'
        else:
            state = 'low' if val < t.get('low', 50) else 'high'

        rec_data = RECOMMENDATIONS[feature].get(state, {})
        if rec_data:
            recs.append({
                'feature': feature,
                'impact': round(impact, 3),
                'state': state,
                'urgency': rec_data.get('urgency', 'medium'),
                'title': rec_data.get('title', ''),
                'body': rec_data.get('body', ''),
                'actions': rec_data.get('actions', []),
            })

    return recs
