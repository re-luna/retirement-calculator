const {
    DEFAULT_VALUES,
    INPUT_RULES,
    parseLocalizedNumber,
    parseInputValue,
    buildShareUrl,
    parseScenarioSearch,
    buildCsv,
    calculateRetirementData,
    calculateRequiredSavingsRate,
    calculateRequiredRetirementCapital,
    calculateMaximumSustainableSpending,
    calculateEarliestSustainableRetirementAge,
    calculatePlanSensitivities,
    calculateMonteCarloSuccessProbability,
    calculateRetirementStressTest,
    compareScenarioProjections,
    getRetirementStatus,
    formatCurrency
} = require('./calculator');

describe('DEFAULT_VALUES', () => {
    test('uses the documented reference scenario and percentage units', () => {
        expect(DEFAULT_VALUES).toEqual({
            currentAge: 30,
            retirementAge: 65,
            currentIncome: 30000,
            incomeIncrease: 2,
            currentSavings: 10000,
            savingsRate: 10,
            retirementSpending: 25000,
            returnBeforeRetirement: 6,
            returnDuringRetirement: 4,
            inflationRate: 2,
            finalBalanceGoal: 250000,
            endAge: 95,
            annualFeeRate: 0,
            withdrawalTaxRate: 0,
            otherIncomeAmount: 0,
            otherIncomeStartAge: 65,
            savingsMode: 'percentage',
            fixedMonthlySavings: 0,
            contributionGrowth: 0,
            annualDebtPayment: 0,
            debtUntilAge: 65,
            eventAge: 65,
            eventAmount: 0,
            returnVolatility: 15,
            localeSelector: 'es-MX',
            currencySelector: 'MXN'
        });
    });
});

describe('parseInputValue', () => {
    test('rejects blank and non-numeric values', () => {
        expect(parseInputValue('', INPUT_RULES.currentIncome).error).toBeTruthy();
        expect(parseInputValue('abc', INPUT_RULES.currentIncome).error).toBeTruthy();
        expect(parseInputValue('salary 30000', INPUT_RULES.currentIncome).error).toBeTruthy();
    });

    test('enforces age and inflation bounds', () => {
        expect(parseInputValue('13', INPUT_RULES.currentAge).error).toBeTruthy();
        expect(parseInputValue('250', INPUT_RULES.inflationRate).error).toBeTruthy();
        expect(parseInputValue('50', INPUT_RULES.inflationRate)).toEqual({ value: 50, error: null });
    });

    test('accepts comma and period decimals for percentages', () => {
        expect(parseInputValue('2,5', INPUT_RULES.inflationRate, 'es-ES').value).toBe(2.5);
        expect(parseInputValue('2.5', INPUT_RULES.inflationRate, 'pt-BR').value).toBe(2.5);
    });

    test('accepts common grouped formats and currency symbols for amounts', () => {
        expect(parseInputValue('30.000', INPUT_RULES.currentIncome, 'es-ES').value).toBe(30000);
        expect(parseInputValue('30,000 €', INPUT_RULES.currentIncome, 'en-US').value).toBe(30000);
        expect(parseInputValue('1.234,50', INPUT_RULES.currentIncome, 'es-ES').value).toBe(1234.5);
    });
});

describe('buildShareUrl', () => {
    test('encodes only allowlisted scenario values and removes old query/hash data', () => {
        const shareUrl = new URL(buildShareUrl('https://example.test/calculator?old=1#section', {
            currentAge: 70,
            currentIncome: '30,000 €',
            localeSelector: 'es-ES',
            privateNote: 'must not be shared'
        }));
        expect(shareUrl.searchParams.get('currentAge')).toBe('70');
        expect(shareUrl.searchParams.get('currentIncome')).toBe('30,000 €');
        expect(shareUrl.searchParams.get('localeSelector')).toBe('es-ES');
        expect(shareUrl.searchParams.has('privateNote')).toBe(false);
        expect(shareUrl.searchParams.has('old')).toBe(false);
        expect(shareUrl.hash).toBe('');
    });
});

describe('parseScenarioSearch', () => {
    test('ignores invalid numeric values and unsupported option values', () => {
        const values = parseScenarioSearch(
            '?currentAge=999&inflationRate=50&localeSelector=xx-XX&currencySelector=BAD&savingsMode=hack&eventAmount=-500'
        );
        expect(values).toEqual({ inflationRate: 50, eventAmount: -500 });
    });

    test('restores valid localized values and boolean options', () => {
        const values = parseScenarioSearch(
            '?localeSelector=es-ES&currencySelector=EUR&currentIncome=30.000&otherIncomeIndexed=false'
        );
        expect(values).toEqual({
            localeSelector: 'es-ES',
            currencySelector: 'EUR',
            currentIncome: 30000,
            otherIncomeIndexed: false
        });
    });
});

describe('buildCsv', () => {
    const rows = [{
        age: 65,
        income: 0,
        incomeToday: 0,
        contribution: 0,
        contributionToday: 0,
        withdrawal: 1000,
        withdrawalToday: 500,
        balance: 9000,
        balanceToday: 4500
    }];

    test("exports today's money by default", () => {
        expect(buildCsv(rows)).toBe('age,income,contribution,withdrawal,balance_today\r\n65,0,0,500,4500');
    });

    test('exports future values when requested', () => {
        expect(buildCsv(rows, false)).toBe('age,income,contribution,withdrawal,balance_future\r\n65,0,0,1000,9000');
    });
});

describe('formatCurrency', () => {
    test('formats number as currency', () => {
        expect(formatCurrency(1000)).toBe('$1,000');
        expect(formatCurrency(1000000)).toBe('$1,000,000');
    });

    test('handles zero', () => {
        expect(formatCurrency(0)).toBe('$0');
    });

    test('rounds values', () => {
        expect(formatCurrency(1000.4)).toBe('$1,000');
        expect(formatCurrency(1000.6)).toBe('$1,001');
    });

    test('formats selected locales and currencies', () => {
        expect(formatCurrency(1047131, { locale: 'es-ES', currency: 'EUR' })).toContain('€');
        expect(formatCurrency(1047131, { locale: 'pt-BR', currency: 'BRL' })).toContain('R$');
        expect(formatCurrency(1047131, { locale: 'es-MX', currency: 'MXN' })).toContain('$');
        expect(formatCurrency(1047131, { locale: 'en-US', currency: 'USD' })).toBe('$1,047,131');
    });
});

describe('Case A. Sanity check 0', () => {
    const baseParams = {
        currentAge: 0,
        retirementAge: 0,
        currentIncome: 0,
        incomeIncrease: 0,
        currentSavings: 0,
        savingsRate: 0,
        retirementSpending: 0,
        returnBeforeRetirement: 0.0,
        returnDuringRetirement: 0.0,
        inflationRate: 0.0
    };

    test('returns zero everywhere', () => {
        const result = calculateRetirementData(baseParams);
        expect(result.finalBalance).toBe(0);
        expect(result.totalContributions).toBe(0);
        expect(result.totalWithdrawals).toBe(0);
    });
});

describe('getRetirementStatus', () => {
    test('returns success status when balance exceeds goal', () => {
        const status = getRetirementStatus(300000, 250000);
        expect(status.text).toBe('Controlado ✅');
        expect(status.class).toBe('success');
    });

    test('returns warning status for balance between 0 and goal', () => {
        const status = getRetirementStatus(100000, 250000);
        expect(status.text).toBe('Precaución ⚠️');
        expect(status.class).toBe('warning');
    });

    test('returns danger status for negative balance', () => {
        const status = getRetirementStatus(-50000, 250000);
        expect(status.text).toBe('Peligro 🚨');
        expect(status.class).toBe('danger');
    });

    test('returns danger status for zero balance', () => {
        const status = getRetirementStatus(0, 250000);
        expect(status.text).toBe('Peligro 🚨');
        expect(status.class).toBe('danger');
    });

    test('uses default goal of 250000', () => {
        const status = getRetirementStatus(300000);
        expect(status.text).toBe('Controlado ✅');
        expect(status.class).toBe('success');
    });

    test('respects custom goal threshold', () => {
        const status = getRetirementStatus(500000, 600000);
        expect(status.text).toBe('Precaución ⚠️');
        expect(status.class).toBe('warning');
    });

    test('boundary case: exactly at goal returns warning', () => {
        const status = getRetirementStatus(250000, 250000);
        expect(status.class).toBe('warning'); // 250k is NOT > 250k
    });

    test('boundary case: just above goal returns success', () => {
        const status = getRetirementStatus(250001, 250000);
        expect(status.class).toBe('success');
    });
});

describe('calculateRetirementData', () => {
    const baseParams = {
        currentAge: 30,
        retirementAge: 65,
        currentIncome: 30000,
        incomeIncrease: 0.02,
        currentSavings: 10000,
        savingsRate: 0.1,
        retirementSpending: 25000,
        returnBeforeRetirement: 0.06,
        returnDuringRetirement: 0.04,
        inflationRate: 0.02
    };

    test('returns retirement data structure', () => {
        const result = calculateRetirementData(baseParams);
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('finalBalance');
        expect(result).toHaveProperty('totalContributions');
        expect(result).toHaveProperty('totalWithdrawals');
    });

    test('data array contains correct number of years in accumulation phase', () => {
        const result = calculateRetirementData(baseParams);
        const preRetirementRows = result.data.filter(row => !row.isRetired);
        expect(preRetirementRows.length).toBe(35); // 65 - 30
    });

    test('all pre-retirement rows have zero withdrawals', () => {
        const result = calculateRetirementData(baseParams);
        const preRetirementRows = result.data.filter(row => !row.isRetired);
        preRetirementRows.forEach(row => {
            expect(row.withdrawal).toBe(0);
        });
    });

    test('all retirement rows have zero income and contributions', () => {
        const result = calculateRetirementData(baseParams);
        const retirementRows = result.data.filter(row => row.isRetired);
        retirementRows.forEach(row => {
            expect(row.income).toBe(0);
            expect(row.contribution).toBe(0);
        });
    });

    test('first withdrawal after retirement matches retirement spending', () => {
        const result = calculateRetirementData(baseParams);
        const retirementRows = result.data.filter(row => row.isRetired);
        expect(retirementRows[0].withdrawal).toBeCloseTo(
            baseParams.retirementSpending * Math.pow(1 + baseParams.inflationRate, 35),
            8
        );
    });

    test('tracks total contributions correctly', () => {
        const params = {
            ...baseParams,
            currentAge: 60,
            retirementAge: 65,
            currentIncome: 100000,
            currentSavings: 0,
            savingsRate: 0.1,
            incomeIncrease: 0,
            returnBeforeRetirement: 0
        };
        const result = calculateRetirementData(params);
        // 5 years * 100k * 0.1 = 50k
        expect(result.totalContributions).toBeCloseTo(50000, -2);
    });

    test('balance grows with positive returns and contributions', () => {
        const result = calculateRetirementData(baseParams);
        const balances = result.data
            .filter(row => !row.isRetired)
            .map(row => row.balance);
        
        for (let i = 1; i < balances.length; i++) {
            expect(balances[i]).toBeGreaterThan(balances[i - 1]);
        }
    });

    test('final balance is non-negative', () => {
        const result = calculateRetirementData(baseParams);
        expect(result.finalBalance).toBeGreaterThanOrEqual(0);
    });

    test('stops simulation if balance reaches zero', () => {
        const poorParams = {
            currentAge: 30,
            retirementAge: 40,
            currentIncome: 50000,
            incomeIncrease: 0,
            currentSavings: 10000,
            savingsRate: 0.05,
            retirementSpending: 100000,
            returnBeforeRetirement: 0.05,
            returnDuringRetirement: 0.02,
            inflationRate: 0.02
        };
        const result = calculateRetirementData(poorParams);
        expect(result.data[result.data.length - 1].balance).toBeLessThanOrEqual(0);
    });

    test('uses endAge parameter correctly', () => {
        const customEndAge = { ...baseParams, endAge: 80 };
        const result = calculateRetirementData(customEndAge);
        const maxAge = Math.max(...result.data.map(row => row.age));
        expect(maxAge).toBeLessThanOrEqual(80);
    });

    test('starts retirement rows at the current age when already retired', () => {
        const result = calculateRetirementData({ ...baseParams, currentAge: 70, retirementAge: 65 });
        expect(result.data[0].age).toBe(70);
        expect(result.data[0].isRetired).toBe(true);
    });

    test("reports balances in both future and today's money", () => {
        const result = calculateRetirementData({
            ...baseParams,
            currentAge: 30,
            retirementAge: 31,
            endAge: 31,
            currentIncome: 0,
            currentSavings: 10000,
            savingsRate: 0,
            retirementSpending: 0,
            returnBeforeRetirement: 0,
            returnDuringRetirement: 0,
            inflationRate: 0.1
        });
        const finalRow = result.data[result.data.length - 1];
        expect(finalRow.balance).toBe(10000);
        expect(finalRow.balanceToday).toBeCloseTo(10000 / Math.pow(1.1, 2));
        expect(result.finalBalanceToday).toBe(finalRow.balanceToday);
    });

    test('subtracts annual fees from accumulation returns', () => {
        const result = calculateRetirementData({
            ...baseParams,
            currentAge: 30,
            retirementAge: 31,
            endAge: 30,
            currentIncome: 0,
            currentSavings: 10000,
            savingsRate: 0,
            retirementSpending: 0,
            returnBeforeRetirement: 0.05,
            returnDuringRetirement: 0.02,
            annualFeeRate: 0.02
        });
        expect(result.data[0].balance).toBeCloseTo(10300);
        expect(result.totalInvestmentGrowth).toBeCloseTo(300);
    });

    test('grosses up withdrawals for effective retirement tax', () => {
        const result = calculateRetirementData({
            ...baseParams,
            currentAge: 65,
            retirementAge: 65,
            endAge: 65,
            currentSavings: 10000,
            retirementSpending: 1000,
            inflationRate: 0,
            returnDuringRetirement: 0,
            withdrawalTaxRate: 0.2
        });
        expect(result.data[0].withdrawal).toBe(1250);
        expect(result.finalBalance).toBe(8750);
    });

    test('offsets spending with inflation-indexed retirement income', () => {
        const result = calculateRetirementData({
            ...baseParams,
            currentAge: 30,
            retirementAge: 32,
            endAge: 32,
            currentSavings: 10000,
            currentIncome: 0,
            savingsRate: 0,
            retirementSpending: 1000,
            returnBeforeRetirement: 0,
            returnDuringRetirement: 0,
            inflationRate: 0.1,
            otherRetirementIncome: [{ amount: 500, startAge: 32, indexed: true }]
        });
        expect(result.data[2].retirementIncome).toBeCloseTo(605);
        expect(result.data[2].withdrawal).toBeCloseTo(605);
    });

    test('supports fixed monthly savings and growth', () => {
        const result = calculateRetirementData({
            ...baseParams,
            currentAge: 30,
            retirementAge: 32,
            endAge: 32,
            currentIncome: 0,
            currentSavings: 0,
            retirementSpending: 0,
            returnBeforeRetirement: 0,
            returnDuringRetirement: 0,
            inflationRate: 0,
            savingsMode: 'fixed',
            fixedMonthlySavings: 100,
            contributionGrowth: 0.1
        });
        expect(result.totalContributions).toBeCloseTo(2520);
        expect(result.finalBalance).toBeCloseTo(2520);
    });

    test('applies retirement debt and one-time events before returns', () => {
        const result = calculateRetirementData({
            ...baseParams,
            currentAge: 65,
            retirementAge: 65,
            endAge: 65,
            currentSavings: 10000,
            retirementSpending: 1000,
            inflationRate: 0,
            returnDuringRetirement: 0,
            debts: [{ annualPayment: 1000, untilAge: 66 }],
            events: [{ age: 65, amount: 5000 }]
        });
        expect(result.data[0].withdrawal).toBe(2000);
        expect(result.finalBalance).toBe(13000);
    });

    test('does not report depletion when no withdrawal is needed', () => {
        const result = calculateRetirementData({
            ...baseParams,
            currentAge: 70,
            retirementAge: 65,
            currentIncome: 0,
            currentSavings: 0,
            savingsRate: 0,
            retirementSpending: 0,
            returnDuringRetirement: 0
        });
        expect(result.depletionAge).toBeNull();
        expect(getRetirementStatus(result.finalBalance, 100000, false).class).toBe('warning');
    });

    test('handles zero savings rate', () => {
        const params = { ...baseParams, savingsRate: 0 };
        const result = calculateRetirementData(params);
        expect(result.totalContributions).toBe(0);
    });

    test('calculates correct data row structure', () => {
        const result = calculateRetirementData(baseParams);
        const row = result.data[0];
        
        expect(row).toHaveProperty('age');
        expect(row).toHaveProperty('income');
        expect(row).toHaveProperty('contribution');
        expect(row).toHaveProperty('withdrawal');
        expect(row).toHaveProperty('balance');
        expect(row).toHaveProperty('isRetired');
    });
});

describe('calculateRequiredSavingsRate', () => {
    const referenceParams = {
        currentAge: 30,
        retirementAge: 65,
        endAge: 95,
        currentIncome: 30000,
        incomeIncrease: 0.02,
        currentSavings: 10000,
        savingsRate: 0.1,
        retirementSpending: 25000,
        returnBeforeRetirement: 0.06,
        returnDuringRetirement: 0.04,
        inflationRate: 0.02,
        annualFeeRate: 0,
        withdrawalTaxRate: 0,
        finalBalanceGoal: 250000
    };

    test('returns a rate that meets the goal when re-projected', () => {
        const savingsRate = calculateRequiredSavingsRate(referenceParams);
        expect(savingsRate).not.toBeNull();
        const result = calculateRetirementData({ ...referenceParams, savingsRate });
        expect(result.depletionAge).toBeNull();
        expect(result.finalBalanceToday).toBeGreaterThan(referenceParams.finalBalanceGoal);
    });

    test('returns null when the goal cannot be met with 100% savings', () => {
        const savingsRate = calculateRequiredSavingsRate({
            ...referenceParams,
            currentIncome: 0,
            currentSavings: 0
        });
        expect(savingsRate).toBeNull();
    });

    test('matches the no-inheritance reference savings rate', () => {
        const savingsRate = calculateRequiredSavingsRate({ ...referenceParams, finalBalanceGoal: 0 });
        expect(savingsRate).toBeCloseTo(0.258, 3);
    });

    test('matches the indexed-pension reference savings rate', () => {
        const savingsRate = calculateRequiredSavingsRate({
            ...referenceParams,
            finalBalanceGoal: 0,
            otherRetirementIncome: [{ amount: 12000, startAge: 67, indexed: true }]
        });
        expect(savingsRate).toBeCloseTo(0.136, 3);
    });
});

describe('inverse retirement calculations', () => {
    const oneYearRetirement = {
        currentAge: 65,
        retirementAge: 65,
        endAge: 65,
        currentIncome: 0,
        incomeIncrease: 0,
        currentSavings: 0,
        savingsRate: 0,
        retirementSpending: 1000,
        returnBeforeRetirement: 0,
        returnDuringRetirement: 0,
        inflationRate: 0,
        finalBalanceGoal: 0
    };

    test('finds the capital needed for a one-year retirement', () => {
        const capital = calculateRequiredRetirementCapital(oneYearRetirement);
        expect(capital).toBeCloseTo(1000, 3);
    });

    test('keeps required capital in current purchasing power with inflation', () => {
        const capital = calculateRequiredRetirementCapital({
            ...oneYearRetirement,
            currentAge: 64,
            retirementAge: 65,
            finalBalanceGoal: 100,
            inflationRate: 0.1
        });
        expect(capital).toBeCloseTo(1110, 0);
    });

    test('finds maximum spending and returns a feasible value', () => {
        const params = { ...oneYearRetirement, currentSavings: 10000 };
        const spending = calculateMaximumSustainableSpending(params);
        expect(spending).toBeCloseTo(10000, 2);
        const result = calculateRetirementData({ ...params, retirementSpending: spending });
        expect(result.depletionAge).toBeNull();
    });

    test('returns null when no spending level can meet the goal', () => {
        expect(calculateMaximumSustainableSpending(oneYearRetirement)).toBeNull();
    });
});

describe('calculateEarliestSustainableRetirementAge', () => {
    test('returns an age whose re-projection meets the inheritance goal', () => {
        const params = {
            currentAge: 60,
            retirementAge: 65,
            endAge: 75,
            currentIncome: 100000,
            incomeIncrease: 0,
            currentSavings: 100000,
            savingsRate: 0.1,
            retirementSpending: 5000,
            returnBeforeRetirement: 0.03,
            returnDuringRetirement: 0.03,
            inflationRate: 0,
            finalBalanceGoal: 10000
        };
        const retirementAge = calculateEarliestSustainableRetirementAge(params);
        expect(retirementAge).not.toBeNull();
        const result = calculateRetirementData({ ...params, retirementAge });
        expect(result.depletionAge).toBeNull();
        expect(result.finalBalanceToday).toBeGreaterThan(params.finalBalanceGoal);
    });

    test('returns null when no retirement age meets the goal', () => {
        const retirementAge = calculateEarliestSustainableRetirementAge({
            currentAge: 65,
            retirementAge: 65,
            endAge: 65,
            currentIncome: 0,
            incomeIncrease: 0,
            currentSavings: 0,
            savingsRate: 0,
            retirementSpending: 1000,
            returnBeforeRetirement: 0,
            returnDuringRetirement: 0,
            inflationRate: 0,
            finalBalanceGoal: 0
        });
        expect(retirementAge).toBeNull();
    });
});

describe('calculatePlanSensitivities', () => {
    test('reports years gained from one more work year', () => {
        const result = calculatePlanSensitivities({
            currentAge: 60,
            retirementAge: 61,
            endAge: 63,
            currentIncome: 1000,
            incomeIncrease: 0,
            currentSavings: 0,
            savingsRate: 0.5,
            retirementSpending: 1000,
            returnBeforeRetirement: 0,
            returnDuringRetirement: 0,
            inflationRate: 0
        });
        expect(result.extraWorkYear).toBe(1);
        expect(result.lowerFees).toBeNull();
    });

    test('marks inapplicable adjustments unavailable', () => {
        const result = calculatePlanSensitivities({
            currentAge: 65,
            retirementAge: 65,
            endAge: 65,
            currentIncome: 0,
            incomeIncrease: 0,
            currentSavings: 0,
            savingsRate: 0.1,
            savingsMode: 'fixed',
            retirementSpending: 0,
            returnBeforeRetirement: 0,
            returnDuringRetirement: 0,
            inflationRate: 0,
            annualFeeRate: 0
        });
        expect(result.savingsRate).toBeNull();
        expect(result.extraWorkYear).toBeNull();
        expect(result.lowerFees).toBeNull();
    });
});

describe('calculateRetirementStressTest', () => {
    test('applies a one-time market loss at retirement and compares depletion ages', () => {
        const result = calculateRetirementStressTest({
            currentAge: 65,
            retirementAge: 65,
            endAge: 70,
            currentIncome: 0,
            incomeIncrease: 0,
            currentSavings: 5000,
            savingsRate: 0,
            retirementSpending: 1000,
            returnBeforeRetirement: 0,
            returnDuringRetirement: 0,
            inflationRate: 0
        });
        expect(result.shockAge).toBe(65);
        expect(result.baseline.depletionAge).toBe(69);
        expect(result.stressed.depletionAge).toBe(68);
        expect(result.yearsLost).toBe(1);
    });
});

describe('compareScenarioProjections', () => {
    test('projects each saved scenario independently', () => {
        const base = {
            currentAge: 65,
            retirementAge: 65,
            endAge: 65,
            currentIncome: 0,
            incomeIncrease: 0,
            savingsRate: 0,
            retirementSpending: 0,
            returnBeforeRetirement: 0,
            returnDuringRetirement: 0,
            inflationRate: 0
        };
        const comparison = compareScenarioProjections(
            { ...base, currentSavings: 10000 },
            { ...base, currentSavings: 50000 }
        );
        expect(comparison.A.finalBalance).toBe(10000);
        expect(comparison.B.finalBalance).toBe(50000);
    });
});

describe('calculateMonteCarloSuccessProbability', () => {
    const stablePlan = {
        currentAge: 60,
        retirementAge: 65,
        endAge: 70,
        currentIncome: 100000,
        incomeIncrease: 0,
        currentSavings: 1000000,
        savingsRate: 0.1,
        retirementSpending: 0,
        returnBeforeRetirement: 0.05,
        returnDuringRetirement: 0.04,
        inflationRate: 0,
        finalBalanceGoal: 0
    };

    test('matches the deterministic result when volatility is zero', () => {
        const result = calculateMonteCarloSuccessProbability(stablePlan, {
            simulations: 20,
            volatility: 0,
            seed: 1
        });
        expect(result.probability).toBe(1);
        expect(result.successes).toBe(20);
    });

    test('is reproducible for the same seed and assumptions', () => {
        const options = { simulations: 100, volatility: 0.15, seed: 42 };
        expect(calculateMonteCarloSuccessProbability(stablePlan, options))
            .toEqual(calculateMonteCarloSuccessProbability(stablePlan, options));
    });

    test('rejects invalid counts, seeds, and volatility', () => {
        expect(() => calculateMonteCarloSuccessProbability(stablePlan, { simulations: 0 })).toThrow(RangeError);
        expect(() => calculateMonteCarloSuccessProbability(stablePlan, { seed: 1.5 })).toThrow(RangeError);
        expect(() => calculateMonteCarloSuccessProbability(stablePlan, { volatility: 1.5 })).toThrow(RangeError);
    });
});
