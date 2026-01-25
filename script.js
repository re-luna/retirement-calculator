let chart = null;

function formatCurrency(value) {
    return '$' + Math.round(value).toLocaleString();
}

function calculateSocialSecurity(income, maritalStatus) {
    const maxBenefit = maritalStatus === 'married' ? 62400 : 41400;
    const baseBenefit = Math.min(income * 0.35, maxBenefit);
    return baseBenefit;
}

function calculate() {
    const currentAge = parseInt(document.getElementById('currentAge').value);
    const retirementAge = parseInt(document.getElementById('retirementAge').value);
    const currentIncome = parseFloat(document.getElementById('currentIncome').value);
    const incomeIncrease = parseFloat(document.getElementById('incomeIncrease').value) / 100;
    const currentSavings = parseFloat(document.getElementById('currentSavings').value);
    const savingsRate = parseFloat(document.getElementById('savingsRate').value) / 100;
    const retirementSpending = parseFloat(document.getElementById('retirementSpending').value);
    const returnBeforeRetirement = parseFloat(document.getElementById('returnBeforeRetirement').value) / 100;
    const returnDuringRetirement = parseFloat(document.getElementById('returnDuringRetirement').value) / 100;
    const inflationRate = parseFloat(document.getElementById('inflationRate').value) / 100;
    const maritalStatus = document.getElementById('maritalStatus').value;

    const endAge = 95;
    let balance = currentSavings;
    let income = currentIncome;
    let totalContributions = 0;
    let totalWithdrawals = 0;

    const data = [];
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    for (let age = currentAge; age < retirementAge; age++) {
        const contribution = income * savingsRate;
        balance = balance * (1 + returnBeforeRetirement) + contribution;
        totalContributions += contribution;

        data.push({
            age,
            income,
            contribution,
            withdrawal: 0,
            balance,
            isRetired: false
        });

        income = income * (1 + incomeIncrease);
    }

    let adjustedSpending = retirementSpending;
    for (let age = retirementAge; age <= endAge; age++) {
        const socialSecurity = calculateSocialSecurity(income / (1 + incomeIncrease), maritalStatus);
        const withdrawal = Math.max(0, adjustedSpending - socialSecurity);
        
        balance = (balance * (1 + returnDuringRetirement)) - withdrawal;
        totalWithdrawals += withdrawal;
        adjustedSpending = adjustedSpending * (1 + inflationRate);

        data.push({
            age,
            income: 0,
            contribution: 0,
            withdrawal,
            balance: Math.max(0, balance),
            isRetired: true
        });

        if (balance <= 0) break;
    }

    data.forEach(row => {
        const tr = document.createElement('tr');
        if (row.isRetired) tr.classList.add('retirement-row');
        
        tr.innerHTML = `
            <td>Age ${row.age}</td>
            <td>${row.income > 0 ? formatCurrency(row.income) : '-'}</td>
            <td>${row.contribution > 0 ? formatCurrency(row.contribution) : '-'}</td>
            <td>${row.withdrawal > 0 ? formatCurrency(row.withdrawal) : '-'}</td>
            <td ${row.balance <= 0 ? 'class="shortage"' : ''}>${formatCurrency(row.balance)}</td>
        `;
        tableBody.appendChild(tr);
    });

    const finalBalance = data[data.length - 1].balance;
    document.getElementById('finalBalance').textContent = formatCurrency(finalBalance);
    document.getElementById('totalContributions').textContent = formatCurrency(totalContributions);
    document.getElementById('totalWithdrawals').textContent = formatCurrency(totalWithdrawals);

    const statusCard = document.getElementById('statusCard');
    const statusElement = document.getElementById('status');
    const finalBalanceCard = document.getElementById('finalBalanceCard');
    
    if (finalBalance > 500000) {
        statusElement.textContent = 'On Track ✓';
        statusCard.classList.remove('warning', 'danger');
        statusCard.classList.add('success');
        finalBalanceCard.classList.remove('warning', 'danger');
        finalBalanceCard.classList.add('success');
    } else if (finalBalance > 0) {
        statusElement.textContent = 'Needs Attention';
        statusCard.classList.remove('success', 'danger');
        statusCard.classList.add('warning');
        finalBalanceCard.classList.remove('success', 'danger');
        finalBalanceCard.classList.add('warning');
    } else {
        statusElement.textContent = 'Shortfall ⚠';
        statusCard.classList.remove('success', 'warning');
        statusCard.classList.add('danger');
        finalBalanceCard.classList.remove('success', 'warning');
        finalBalanceCard.classList.add('danger');
    }

    updateChart(data);
}

function updateChart(data) {
    const ctx = document.getElementById('retirementChart').getContext('2d');
    
    if (chart) {
        chart.destroy();
    }

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.age),
            datasets: [{
                label: 'Retirement Balance',
                data: data.map(d => d.balance),
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Balance: ' + formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + (value / 1000).toFixed(0) + 'K';
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Age'
                    }
                }
            }
        }
    });
}

document.querySelectorAll('input, select').forEach(input => {
    input.addEventListener('input', calculate);
});

calculate();
