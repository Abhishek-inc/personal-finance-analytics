# FinanceHub ML API — api.py
# Place this file in your FinanceHub folder alongside index.html

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import numpy as np
import json
import os

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})  # allows your dashboard JS to call this API

# ── Load all models on startup ────────────────────────────────
BASE = os.path.dirname(__file__)
MODELS_DIR = os.path.join(BASE, 'models')

exp_model  = joblib.load(os.path.join(MODELS_DIR, 'expense_forecast_model.pkl'))
exp_scaler = joblib.load(os.path.join(MODELS_DIR, 'expense_scaler.pkl'))
h_model    = joblib.load(os.path.join(MODELS_DIR, 'health_score_model.pkl'))
h_scaler   = joblib.load(os.path.join(MODELS_DIR, 'health_scaler.pkl'))
clf        = joblib.load(os.path.join(MODELS_DIR, 'stress_classifier.pkl'))
le_stress  = joblib.load(os.path.join(MODELS_DIR, 'stress_label_encoder.pkl'))

with open(os.path.join(MODELS_DIR, 'model_meta.json')) as f:
    meta = json.load(f)

EXPENSE_FEATURES = meta['expense_features']
HEALTH_FEATURES  = meta['health_features']

print('✅ All models loaded')

# ── Helper functions ──────────────────────────────────────────
def build_user_row(data):
    """
    Takes raw Firebase user data (same shape as your Firestore docs)
    and builds the feature dict the models expect.
    """
    total_income   = data.get('total_income', 0)
    monthly_income = total_income / 12

    # Expense categories
    rent           = data.get('rent', 0)
    groceries      = data.get('groceries', 0)
    utilities      = data.get('utilities', 0)
    transportation = data.get('transportation', 0)
    healthcare     = data.get('healthcare', 0)
    education      = data.get('education', 0)
    entertainment  = data.get('entertainment', 0)
    shopping       = data.get('shopping', 0)
    insurance      = data.get('insurance', 0)
    miscellaneous  = data.get('miscellaneous', 0)
    total_exp      = (rent + groceries + utilities + transportation +
                      healthcare + education + entertainment +
                      shopping + insurance + miscellaneous)

    # Savings / investments
    savings_account = data.get('savings_account', 0)
    fixed_deposits  = data.get('fixed_deposits', 0)
    mutual_funds    = data.get('mutual_funds', 0)
    stocks          = data.get('stocks', 0)
    ppf             = data.get('ppf', 0)
    epf             = data.get('epf', 0)
    gold            = data.get('gold', 0)
    real_estate     = data.get('real_estate', 0)
    total_inv       = (savings_account + fixed_deposits + mutual_funds +
                       stocks + ppf + epf + gold + real_estate)

    # Debt
    home_loan      = data.get('home_loan', 0)
    car_loan       = data.get('car_loan', 0)
    personal_loan  = data.get('personal_loan', 0)
    edu_loan       = data.get('education_loan', 0)
    total_emi      = data.get('total_monthly_emi', 0)
    total_debt     = home_loan + car_loan + personal_loan + edu_loan
    emergency_fund = data.get('emergency_fund', 0)

    # Derived ratios
    savings_ratio  = (total_inv / total_income) if total_income > 0 else 0
    expense_ratio  = (total_exp * 12 / total_income) if total_income > 0 else 0
    emi_ratio      = (total_emi * 12 / total_income) if total_income > 0 else 0
    dti            = (total_emi * 12 / total_income) if total_income > 0 else 0
    ef_months      = (emergency_fund / total_exp) if total_exp > 0 else 0
    dependents     = data.get('dependents', 0)
    inc_per_dep    = total_income / (dependents + 1)
    inv_diversity  = sum([
        savings_account > 0, fixed_deposits > 0, mutual_funds > 0,
        stocks > 0, ppf > 0, epf > 0, gold > 0, real_estate > 0
    ])
    loan_count     = sum([home_loan > 0, car_loan > 0,
                          personal_loan > 0, edu_loan > 0])
    net_monthly    = monthly_income - total_exp

    return {
        # Income
        'total_income'            : total_income,
        'monthly_income_est'      : monthly_income,
        'age'                     : data.get('age', 30),
        'dependents'              : dependents,
        'gender'                  : data.get('gender', 0),
        'city'                    : data.get('city', 0),
        'sector'                  : data.get('sector', 0),
        'marital_status'          : data.get('marital_status', 0),
        # Expenses
        'rent'                    : rent,
        'groceries'               : groceries,
        'utilities'               : utilities,
        'transportation'          : transportation,
        'healthcare'              : healthcare,
        'education'               : education,
        'entertainment'           : entertainment,
        'shopping'                : shopping,
        'insurance'               : insurance,
        'miscellaneous'           : miscellaneous,
        'total_monthly_expenses'  : total_exp,
        # Investments & debt
        'total_investments'       : total_inv,
        'monthly_sip'             : data.get('monthly_sip', 0),
        'savings_account'         : savings_account,
        'fixed_deposits'          : fixed_deposits,
        'mutual_funds'            : mutual_funds,
        'stocks'                  : stocks,
        'ppf'                     : ppf,
        'epf'                     : epf,
        'gold'                    : gold,
        'real_estate'             : real_estate,
        'total_debt'              : total_debt,
        'home_loan'               : home_loan,
        'car_loan'                : car_loan,
        'personal_loan'           : personal_loan,
        'education_loan'          : edu_loan,
        'total_monthly_emi'       : total_emi,
        'emergency_fund'          : emergency_fund,
        # Ratios
        'savings_ratio'           : savings_ratio,
        'expense_ratio'           : expense_ratio,
        'emi_ratio'               : emi_ratio,
        'debt_to_income_ratio_x'  : dti,
        'debt_to_income_ratio_y'  : dti,
        'emergency_fund_months'   : ef_months,
        # Deductions
        'section_80c'             : data.get('section_80c', 0),
        'total_deductions'        : data.get('total_deductions', 0),
        # Derived
        'income_per_dependent'    : inc_per_dep,
        'investment_diversity'    : inv_diversity,
        'loan_count'              : loan_count,
        'net_monthly'             : net_monthly,
    }


# ── Route 1: 6-Month Expense Forecast ────────────────────────
@app.route('/api/forecast', methods=['POST'])
def forecast():
    try:
        data    = request.get_json()
        row     = build_user_row(data)
        X       = pd.DataFrame([row])[EXPENSE_FEATURES]
        X_s     = exp_scaler.transform(X)
        base    = float(exp_model.predict(X_s)[0])

        # Generate 6 months with trend + slight variance
        np.random.seed(42)
        months = []
        for i in range(6):
            noise = np.random.uniform(-0.03, 0.03)
            trend = 1 + (i * 0.005)
            months.append(round(base * trend * (1 + noise)))

        return jsonify({
            'success'        : True,
            'base_prediction': round(base),
            'forecast'       : months,
            'confidence_band': {
                'lower': [round(v * 0.93) for v in months],
                'upper': [round(v * 1.07) for v in months],
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


# ── Route 2: Financial Health Score ──────────────────────────
@app.route('/api/health', methods=['POST'])
def health():
    try:
        data   = request.get_json()
        row    = build_user_row(data)
        X      = pd.DataFrame([row])[HEALTH_FEATURES]
        X_s    = h_scaler.transform(X)

        # Stress score → health score (inverted)
        stress = float(h_model.predict(X_s)[0])
        stress = max(0, min(100, stress))
        score  = round(100 - stress, 1)

        # Stress level classification
        stress_class = le_stress.inverse_transform(clf.predict(X_s))[0]
        probs        = clf.predict_proba(X_s)[0]
        prob_dict    = {c: round(float(p), 3)
                        for c, p in zip(le_stress.classes_, probs)}

        # Risk flags
        flags = []
        if row['expense_ratio'] > 0.7:
            flags.append('Expense ratio above 70% of income')
        if row['emergency_fund_months'] < 3:
            flags.append('Emergency fund below 3 months of expenses')
        if row['savings_ratio'] < 0.1:
            flags.append('Savings ratio below 10%')
        if row['debt_to_income_ratio_x'] > 0.4:
            flags.append('Debt-to-income ratio above 40%')
        if row['investment_diversity'] < 2:
            flags.append('Low investment diversification — add more asset types')

        return jsonify({
            'success'       : True,
            'health_score'  : score,
            'stress_level'  : stress_class,
            'probabilities' : prob_dict,
            'risk_flags'    : flags,
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


# ── Route 3: Health check ─────────────────────────────────────
@app.route('/api/ping', methods=['GET'])
def ping():
    return jsonify({'status': 'ok', 'models_loaded': True})


@app.route('/', methods=['GET'])
def index():
    return jsonify({
        'name'   : 'FinanceHub ML API',
        'status' : 'running',
        'routes' : ['/api/ping', '/api/forecast', '/api/health']
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
