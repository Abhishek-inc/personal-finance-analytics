# Indian Income Tax Calculation Logic - FY 2024-25

from dataclasses import dataclass, field
from typing import List, Literal


@dataclass
class IncomeDetails:
    basicSalary: float
    hra: float
    specialAllowance: float
    otherIncome: float
    rentPaid: float
    metroCity: bool


@dataclass
class Deductions:
    section80C: float  # Max 1.5L
    section80D: float  # Medical insurance
    section80E: float  # Education loan interest
    section80G: float  # Donations
    nps80CCD: float  # NPS contribution (additional 50k)
    homeLoanInterest: float  # Section 24
    standardDeduction: float  # 50000 for salaried


@dataclass
class FinancialData:
    monthlyExpenses: float
    monthlySavings: float
    totalLoans: float
    emiAmount: float
    emergencyFund: float
    investments: float


@dataclass
class TaxSlab:
    range: str
    rate: str
    amount: float


@dataclass
class TaxResult:
    regime: Literal['old', 'new']
    grossIncome: float
    totalDeductions: float
    taxableIncome: float
    taxBeforeCess: float
    cess: float
    totalTax: float
    effectiveRate: float
    breakdown: List[TaxSlab]


@dataclass
class HealthFactor:
    name: str
    score: float
    weight: float
    status: Literal['good', 'moderate', 'poor']
    recommendation: str


@dataclass
class HealthScore:
    overall: float
    savingsRatio: float
    debtBurden: float
    emergencyFundRatio: float
    investmentRatio: float
    factors: List[HealthFactor]


# Financial Stress Prediction
StressLevel = Literal['low', 'medium', 'high']


@dataclass
class StressFactor:
    name: str
    impact: Literal['positive', 'neutral', 'negative']
    weight: float
    description: str


@dataclass
class StressPrediction:
    level: StressLevel
    score: float
    factors: List[StressFactor]
    recommendations: List[str]


# Calculate HRA exemption
def calculateHRAExemption(
    basicSalary: float,
    hra: float,
    rentPaid: float,
    metroCity: bool
) -> float:
    annualBasic = basicSalary * 12
    annualHRA = hra * 12
    annualRent = rentPaid * 12

    hraExemption1 = annualHRA
    hraExemption2 = 0.5 * annualBasic if metroCity else 0.4 * annualBasic
    hraExemption3 = max(0, annualRent - 0.1 * annualBasic)

    return min(hraExemption1, hraExemption2, hraExemption3)


# Old Tax Regime Calculation (FY 2024-25)
def calculateOldRegimeTax(
    income: IncomeDetails,
    deductions: Deductions
) -> TaxResult:
    grossIncome = (
        income.basicSalary * 12 +
        income.hra * 12 +
        income.specialAllowance * 12 +
        income.otherIncome
    )

    # Calculate HRA exemption
    hraExemption = calculateHRAExemption(
        income.basicSalary,
        income.hra,
        income.rentPaid,
        income.metroCity
    )

    # Total deductions
    totalDeductions = (
        min(deductions.section80C, 150000) +
        min(deductions.section80D, 75000) +
        deductions.section80E +
        deductions.section80G +
        min(deductions.nps80CCD, 50000) +
        min(deductions.homeLoanInterest, 200000) +
        deductions.standardDeduction +
        hraExemption
    )

    taxableIncome = max(0, grossIncome - totalDeductions)

    # Tax slabs - Old Regime
    breakdown: List[TaxSlab] = []
    tax = 0

    if taxableIncome > 250000:
        slab1 = min(taxableIncome - 250000, 250000)
        tax1 = slab1 * 0.05
        tax += tax1
        breakdown.append(TaxSlab(range='₹2.5L - ₹5L', rate='5%', amount=tax1))

    if taxableIncome > 500000:
        slab2 = min(taxableIncome - 500000, 500000)
        tax2 = slab2 * 0.2
        tax += tax2
        breakdown.append(TaxSlab(range='₹5L - ₹10L', rate='20%', amount=tax2))

    if taxableIncome > 1000000:
        slab3 = taxableIncome - 1000000
        tax3 = slab3 * 0.3
        tax += tax3
        breakdown.append(TaxSlab(range='Above ₹10L', rate='30%', amount=tax3))

    # Rebate under section 87A (if taxable income <= 5L)
    if taxableIncome <= 500000:
        tax = 0

    cess = tax * 0.04
    totalTax = tax + cess

    return TaxResult(
        regime='old',
        grossIncome=grossIncome,
        totalDeductions=totalDeductions,
        taxableIncome=taxableIncome,
        taxBeforeCess=tax,
        cess=cess,
        totalTax=totalTax,
        effectiveRate=(totalTax / grossIncome) * 100 if grossIncome > 0 else 0,
        breakdown=breakdown,
    )


# New Tax Regime Calculation (FY 2024-25)
def calculateNewRegimeTax(income: IncomeDetails) -> TaxResult:
    grossIncome = (
        income.basicSalary * 12 +
        income.hra * 12 +
        income.specialAllowance * 12 +
        income.otherIncome
    )

    # Standard deduction in new regime
    standardDeduction = 75000
    taxableIncome = max(0, grossIncome - standardDeduction)

    # Tax slabs - New Regime (FY 2024-25)
    breakdown: List[TaxSlab] = []
    tax = 0

    if taxableIncome > 300000:
        slab1 = min(taxableIncome - 300000, 400000)
        tax1 = slab1 * 0.05
        tax += tax1
        if tax1 > 0:
            breakdown.append(TaxSlab(range='₹3L - ₹7L', rate='5%', amount=tax1))

    if taxableIncome > 700000:
        slab2 = min(taxableIncome - 700000, 300000)
        tax2 = slab2 * 0.1
        tax += tax2
        if tax2 > 0:
            breakdown.append(TaxSlab(range='₹7L - ₹10L', rate='10%', amount=tax2))

    if taxableIncome > 1000000:
        slab3 = min(taxableIncome - 1000000, 200000)
        tax3 = slab3 * 0.15
        tax += tax3
        if tax3 > 0:
            breakdown.append(TaxSlab(range='₹10L - ₹12L', rate='15%', amount=tax3))

    if taxableIncome > 1200000:
        slab4 = min(taxableIncome - 1200000, 300000)
        tax4 = slab4 * 0.2
        tax += tax4
        if tax4 > 0:
            breakdown.append(TaxSlab(range='₹12L - ₹15L', rate='20%', amount=tax4))

    if taxableIncome > 1500000:
        slab5 = taxableIncome - 1500000
        tax5 = slab5 * 0.3
        tax += tax5
        if tax5 > 0:
            breakdown.append(TaxSlab(range='Above ₹15L', rate='30%', amount=tax5))

    # Rebate under section 87A (if taxable income <= 7L in new regime)
    if taxableIncome <= 700000:
        tax = 0

    cess = tax * 0.04
    totalTax = tax + cess

    return TaxResult(
        regime='new',
        grossIncome=grossIncome,
        totalDeductions=standardDeduction,
        taxableIncome=taxableIncome,
        taxBeforeCess=tax,
        cess=cess,
        totalTax=totalTax,
        effectiveRate=(totalTax / grossIncome) * 100 if grossIncome > 0 else 0,
        breakdown=breakdown,
    )


# Financial Health Score (0-100)
def calculateFinancialHealthScore(
    income: IncomeDetails,
    financial: FinancialData
) -> HealthScore:
    monthlyIncome = income.basicSalary + income.hra + income.specialAllowance
    annualIncome = monthlyIncome * 12 + income.otherIncome

    factors: List[HealthFactor] = []

    # 1. Savings Ratio (25% weight) - Ideal: 20%+
    savingsRatio = (financial.monthlySavings / monthlyIncome) * 100 if monthlyIncome > 0 else 0
    savingsScore = min(100, (savingsRatio / 30) * 100)
    factors.append(HealthFactor(
        name='Savings Ratio',
        score=savingsScore,
        weight=25,
        status='good' if savingsRatio >= 20 else ('moderate' if savingsRatio >= 10 else 'poor'),
        recommendation=(
            'Excellent savings habit!' if savingsRatio >= 20
            else 'Try to save at least 20% of your income'
        ),
    ))

    # 2. Debt-to-Income Ratio (25% weight) - Ideal: <40%
    dtiRatio = (financial.emiAmount / monthlyIncome) * 100 if monthlyIncome > 0 else 0
    if dtiRatio <= 20:
        debtScore = 100
    elif dtiRatio <= 40:
        debtScore = 70
    elif dtiRatio <= 50:
        debtScore = 40
    else:
        debtScore = 20
    factors.append(HealthFactor(
        name='Debt Burden',
        score=debtScore,
        weight=25,
        status='good' if dtiRatio <= 30 else ('moderate' if dtiRatio <= 50 else 'poor'),
        recommendation=(
            'Healthy debt levels' if dtiRatio <= 30
            else 'Consider reducing EMI burden below 40% of income'
        ),
    ))

    # 3. Emergency Fund (25% weight) - Ideal: 6 months expenses
    emergencyMonths = (
        financial.emergencyFund / financial.monthlyExpenses
        if financial.monthlyExpenses > 0
        else 0
    )
    emergencyScore = min(100, (emergencyMonths / 6) * 100)
    factors.append(HealthFactor(
        name='Emergency Fund',
        score=emergencyScore,
        weight=25,
        status='good' if emergencyMonths >= 6 else ('moderate' if emergencyMonths >= 3 else 'poor'),
        recommendation=(
            'Well-prepared for emergencies' if emergencyMonths >= 6
            else f'Build up to {max(0, 6 - int(emergencyMonths))} more months of expenses'
        ),
    ))

    # 4. Investment Ratio (25% weight) - Ideal: 15%+ of income
    investmentRatio = (financial.investments / annualIncome) * 100 if annualIncome > 0 else 0
    investmentScore = min(100, (investmentRatio / 20) * 100)
    factors.append(HealthFactor(
        name='Investment Health',
        score=investmentScore,
        weight=25,
        status='good' if investmentRatio >= 15 else ('moderate' if investmentRatio >= 8 else 'poor'),
        recommendation=(
            'Strong investment portfolio' if investmentRatio >= 15
            else 'Consider increasing investments for long-term wealth'
        ),
    ))

    # Calculate weighted overall score
    overall = sum((f.score * f.weight) / 100 for f in factors)

    return HealthScore(
        overall=round(overall),
        savingsRatio=savingsRatio,
        debtBurden=dtiRatio,
        emergencyFundRatio=emergencyMonths,
        investmentRatio=investmentRatio,
        factors=factors,
    )


def predictFinancialStress(
    income: IncomeDetails,
    financial: FinancialData,
    taxResult: TaxResult
) -> StressPrediction:
    monthlyIncome = income.basicSalary + income.hra + income.specialAllowance
    annualIncome = monthlyIncome * 12 + income.otherIncome

    factors: List[StressFactor] = []
    stressScore = 50  # Neutral baseline

    # Factor 1: Expense-to-Income Ratio
    expenseRatio = (financial.monthlyExpenses / monthlyIncome) * 100 if monthlyIncome > 0 else 100
    if expenseRatio > 80:
        stressScore += 20
        factors.append(StressFactor(
            name='High Expense Ratio',
            impact='negative',
            weight=20,
            description='Expenses consume most of your income',
        ))
    elif expenseRatio < 60:
        stressScore -= 10
        factors.append(StressFactor(
            name='Controlled Expenses',
            impact='positive',
            weight=10,
            description='Good expense management',
        ))

    # Factor 2: Debt Burden
    dtiRatio = (financial.emiAmount / monthlyIncome) * 100 if monthlyIncome > 0 else 0
    if dtiRatio > 50:
        stressScore += 25
        factors.append(StressFactor(
            name='High Debt Burden',
            impact='negative',
            weight=25,
            description='EMIs consume over half your income',
        ))
    elif dtiRatio > 30:
        stressScore += 10
        factors.append(StressFactor(
            name='Moderate Debt',
            impact='neutral',
            weight=10,
            description='Debt levels are manageable but watch closely',
        ))
    elif dtiRatio < 20:
        stressScore -= 10
        factors.append(StressFactor(
            name='Low Debt',
            impact='positive',
            weight=10,
            description='Healthy debt-to-income ratio',
        ))

    # Factor 3: Emergency Fund
    emergencyMonths = (
        financial.emergencyFund / financial.monthlyExpenses
        if financial.monthlyExpenses > 0
        else 0
    )
    if emergencyMonths < 3:
        stressScore += 15
        factors.append(StressFactor(
            name='Insufficient Emergency Fund',
            impact='negative',
            weight=15,
            description='Less than 3 months of expenses saved',
        ))
    elif emergencyMonths >= 6:
        stressScore -= 15
        factors.append(StressFactor(
            name='Strong Emergency Fund',
            impact='positive',
            weight=15,
            description='Well-prepared for unexpected events',
        ))

    # Factor 4: Tax Burden
    if taxResult.effectiveRate > 25:
        stressScore += 10
        factors.append(StressFactor(
            name='High Tax Burden',
            impact='negative',
            weight=10,
            description='Consider tax optimization strategies',
        ))

    # Factor 5: Savings Rate
    savingsRate = (financial.monthlySavings / monthlyIncome) * 100 if monthlyIncome > 0 else 0
    if savingsRate < 10:
        stressScore += 15
        factors.append(StressFactor(
            name='Low Savings',
            impact='negative',
            weight=15,
            description='Saving less than 10% of income',
        ))
    elif savingsRate >= 25:
        stressScore -= 15
        factors.append(StressFactor(
            name='Excellent Savings',
            impact='positive',
            weight=15,
            description='Saving 25%+ of income',
        ))

    # Normalize score (0-100)
    stressScore = max(0, min(100, stressScore))

    # Determine level
    if stressScore < 35:
        level: StressLevel = 'low'
    elif stressScore < 65:
        level = 'medium'
    else:
        level = 'high'

    # Generate recommendations
    recommendations: List[str] = []
    if expenseRatio > 70:
        recommendations.append('Review and cut non-essential expenses')
    if dtiRatio > 40:
        recommendations.append('Focus on paying off high-interest debt first')
    if emergencyMonths < 6:
        recommendations.append('Build emergency fund to cover 6 months of expenses')
    if savingsRate < 20:
        recommendations.append('Automate savings to reach 20% of income')
    if taxResult.effectiveRate > 20:
        recommendations.append('Explore tax-saving investment options under Section 80C/80D')
    if len(recommendations) == 0:
        recommendations.append('Great job! Maintain your current financial habits')

    return StressPrediction(
        level=level,
        score=stressScore,
        factors=factors,
        recommendations=recommendations,
    )


# Format currency for Indian Rupees
def formatINR(amount: float) -> str:
    # Convert to integer for whole rupees
    amount_int = int(amount)
    
    # Handle negative amounts
    is_negative = amount_int < 0
    amount_int = abs(amount_int)
    
    # Convert to string
    amount_str = str(amount_int)
    
    # Apply Indian numbering system (lakhs and crores)
    if len(amount_str) <= 3:
        formatted = amount_str
    else:
        # Last 3 digits
        last_three = amount_str[-3:]
        # Remaining digits
        remaining = amount_str[:-3]
        # Add commas every 2 digits for remaining
        formatted_remaining = ''
        while len(remaining) > 2:
            formatted_remaining = ',' + remaining[-2:] + formatted_remaining
            remaining = remaining[:-2]
        if remaining:
            formatted_remaining = remaining + formatted_remaining
        formatted = formatted_remaining + ',' + last_three
    
    # Add currency symbol and negative sign if needed
    result = '₹' + formatted
    if is_negative:
        result = '-' + result
    
    return result
