const { describe } = require('yargs');
const {
    calculateSocialSecurity,
    calculateRetirementData,
    getRetirementStatus,
    formatCurrency
} = require('./calculator');

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
        inflationRate: 0.0,
        maritalStatus: 'single'
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
        inflationRate: 0.02,
        maritalStatus: 'single'
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
        expect(retirementRows[0].withdrawal).toBe(baseParams.retirementSpending);
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

describe('Reset Values Function', () => {
    test('resetValues sets default input values', () => {
        // Mock document.getElementById
        global.document = {
            getElementById: jest.fn().mockImplementation((id) => {
                return { value: baseParams[id] || 0 };
            })
        };
        resetValues();
        expect(global.document.getElementById).toHaveBeenCalledWith('currentAge');
        expect(global.document.getElementById).toHaveBeenCalledWith('retirementAge');
        expect(global.document.getElementById).toHaveBeenCalledWith('currentIncome');
        expect(global.document.getElementById).toHaveBeenCalledWith('incomeIncrease');
        expect(global.document.getElementById).toHaveBeenCalledWith('currentSavings');
        expect(global.document.getElementById).toHaveBeenCalledWith('savingsRate');
        expect(global.document.getElementById).toHaveBeenCalledWith('retirementSpending');
        expect(global.document.getElementById).toHaveBeenCalledWith('returnBeforeRetirement');
        expect(global.document.getElementById).toHaveBeenCalledWith('returnDuringRetirement');
        expect(global.document.getElementById).toHaveBeenCalledWith('inflationRate');
        expect(global.document.getElementById).toHaveBeenCalledWith('finalBalanceGoal');
    });
});