const form = document.getElementById("calcForm");
const tbody = document.querySelector("#results tbody");
const summary = document.getElementById("summary");
let chart;

form.addEventListener("submit", e => {
  e.preventDefault();
  runCalculation();
});

function runCalculation() {
  tbody.innerHTML = "";

  const currentAge = +currentAgeInput.value;
  const retireAge = +retireAgeInput.value;
  const lastAge = +lastAgeInput.value;

  let income = +incomeInput.value;
  let balance = +savingsInput.value;

  const saveRate = +saveRateInput.value / 100;
  const returnRate = +returnRateInput.value / 100;
  const inflation = +inflationInput.value / 100;
  const baseSpend = +spendInput.value;

  const ages = [];
  const balances = [];

  for (let age = currentAge; age <= lastAge; age++) {
    if (age < retireAge) {
      const contribution = income * saveRate;
      balance = (balance + contribution) * (1 + returnRate);
      income *= (1 + inflation);
    } else {
      const yearsRetired = age - retireAge;
      const withdrawal = baseSpend * Math.pow(1 + inflation, yearsRetired);
      balance = (balance - withdrawal) * (1 + returnRate);
    }

    ages.push(age);
    balances.push(balance);

    const row = tbody.insertRow();
    row.insertCell().textContent = age;
    row.insertCell().textContent = balance.toFixed(0);
  }

  const retirementBalance = balances[ages.indexOf(retireAge)];
  const finalBalance = balances[balances.length - 1];

  summary.textContent =
    `Savings at retirement: $${retirementBalance.toFixed(0)} | ` +
    `Final surplus/shortfall: $${finalBalance.toFixed(0)}`;

  drawChart(ages, balances);
}

function drawChart(ages, balances) {
  if (chart) chart.destroy();

  chart = new Chart(document.getElementById("chart"), {
    type: "line",
    data: {
      labels: ages,
      datasets: [{
        label: "Retirement Balance",
        data: balances,
        borderWidth: 2,
        fill: false
      }]
    }
  });
}
