let chart = null;
let useTodaysMoney = true;
let displayLocale = 'es-MX';
let displayCurrency = 'MXN';
let calculationTimer = null;
let lastProjectionParams = null;
let lastProjectionData = [];
let lastProjectionResult = null;
let lastInverseResults = { savingsRate: null, capital: null, spending: null };
let lastMonteCarloResult = null;
let formIsValid = false;
let csvObjectUrl = null;

const DEFAULT_VALUES = {
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
};

const INPUT_RULES = {
    currentAge: { min: 14, max: 120, integer: true },
    retirementAge: { min: 30, max: 120, integer: true },
    currentIncome: { min: 0, amount: true },
    incomeIncrease: { min: 0, max: 20 },
    currentSavings: { min: 0, amount: true },
    savingsRate: { min: 0, max: 100 },
    retirementSpending: { min: 0, amount: true },
    returnBeforeRetirement: { min: 0, max: 30 },
    returnDuringRetirement: { min: 0, max: 30 },
    inflationRate: { min: 0, max: 200 },
    finalBalanceGoal: { min: 0, amount: true },
    endAge: { min: 14, max: 120, integer: true },
    annualFeeRate: { min: 0, max: 20 },
    withdrawalTaxRate: { min: 0, max: 95 },
    otherIncomeAmount: { min: 0, amount: true },
    otherIncomeStartAge: { min: 14, max: 120, integer: true },
    fixedMonthlySavings: { min: 0, amount: true },
    contributionGrowth: { min: 0, max: 20 },
    annualDebtPayment: { min: 0, amount: true },
    debtUntilAge: { min: 14, max: 120, integer: true },
    eventAge: { min: 14, max: 120, integer: true },
    eventAmount: { min: -1000000000, max: 1000000000, amount: true },
    returnVolatility: { min: 0, max: 100 }
};

const SCENARIO_CONTROL_IDS = [
    ...Object.keys(INPUT_RULES),
    'savingsMode',
    'localeSelector',
    'currencySelector',
    'otherIncomeIndexed',
    'todaysMoneyToggle'
];

const TRANSLATIONS = {
    es: {
        pageTitle: 'Calculadora de plan de retiro | CalculatOR',
        metaDescription: 'Proyecta tu retiro en tu moneda con supuestos editables de inflación, comisiones, impuestos e ingresos.',
        tagline: 'Criterio Compounding: si no lo calculas, no es una decisión.',
        trustNote: 'Herramienta educativa; los resultados dependen de tus supuestos y no son asesoría financiera ni fiscal.',
        privacyStatement: 'Tus valores se calculan en este navegador. Al compartir, se incluyen en un enlace que el servicio de alojamiento podría registrar.',
        thirdPartyPrivacy: 'Esta página carga servicios de publicidad y CDN de terceros, que pueden procesar datos técnicos según sus propias políticas.',
        methodTitle: 'Cómo calculamos',
        methodTiming: 'La proyección usa pasos anuales. Durante el ahorro, el saldo rinde neto de comisiones y luego recibe el aporte y los eventos. Durante el retiro, el retiro se descuenta antes del rendimiento anual.',
        methodAccumulation: 'Año de ahorro: saldo nuevo = saldo × (1 + rendimiento - comisión) + aporte + evento.',
        methodWithdrawal: 'Año de retiro: retiro bruto = max(0, gasto + deuda - otros ingresos) / (1 - impuesto). Saldo nuevo = (saldo - retiro + evento) × (1 + rendimiento - comisión).',
        methodPurchasingPower: 'Saldo en dinero de hoy = saldo nominal / (1 + inflación)^(edad - edad actual + 1).',
        methodTaxes: 'El gasto en dinero de hoy se ajusta por inflación desde tu edad actual. Otros ingresos reducen la necesidad de retiro antes de aplicar la tasa efectiva de impuestos. La deuda reduce el aporte antes del retiro y aumenta el gasto después.',
        methodValues: 'La opción de dinero de hoy divide cada saldo y flujo futuro entre la inflación acumulada. El cambio de vista no modifica el escenario calculado.',
        methodLimits: 'La herramienta no aplica leyes fiscales ni reglas de pensiones de ningún país. La proyección es determinista; la simulación opcional usa rendimientos normales independientes. Ningún resultado es garantía ni asesoría.',
        language: 'Idioma', currency: 'Moneda', inputs: 'Tu información', results: 'Resultados',
        currentAge: '¿Cuál es tu edad actual?', retirementAge: '¿A qué edad planeas retirarte?',
        currentIncome: '¿Cuánto es tu ingreso anual?', currentIncomeHelper: 'Ingreso total familiar o personal',
        incomeIncrease: '¿Cuánto esperas que incrementen tus ingresos anuales? (%)',
        currentSavings: '¿Cuánto tienes ahorrado hasta hoy?', currentSavingsHelper: 'Incluye tus ahorros en cuentas de inversión o ahorro.',
        savingsRate: '¿Cuánto planeas ahorrar cada año para tu retiro? (%)',
        retirementSpending: '¿Cuánto planeas gastar al año durante el retiro, en dinero de hoy?',
        returnBefore: '¿Cuál es el rendimiento anual esperado antes del retiro? (%)',
        returnDuring: '¿Cuál es el rendimiento anual esperado durante el retiro? (%)',
        returnHelp: 'Usa una estimación anual prudente para tu mezcla de inversiones.',
        inflationRate: '¿Cuál es la inflación esperada? (%)', finalBalanceGoal: '¿Cuánto quieres dejar como herencia?',
        inflationHelp: 'Consulta la meta o proyección de largo plazo del banco central de tu país.',
        advanced: 'Ajustes globales', endAge: '¿Hasta qué edad quieres planificar?',
        annualFee: 'Comisiones anuales (%)', withdrawalTax: 'Impuestos efectivos sobre retiros (%)',
        feeHelp: 'Incluye fondos, plataforma, asesoría y comisiones del broker.',
        taxHelp: 'Estima la tasa efectiva de tu caso; la herramienta no aplica leyes locales.',
        otherIncome: 'Otros ingresos anuales durante el retiro (valor de hoy)',
        otherIncomeHelp: 'Incluye pensión, rentas u otros ingresos recurrentes.',
        otherIncomeStart: 'Edad en que empiezan esos ingresos', otherIncomeIndexed: 'Se ajustan por inflación',
        savingsMode: 'Cómo ahorrar', savingsPercentage: 'Porcentaje del ingreso', savingsFixed: 'Monto fijo mensual',
        fixedMonthly: 'Ahorro fijo mensual', contributionGrowth: 'Aumento anual del ahorro fijo (%)',
        annualDebt: 'Pago anual de deuda', debtUntil: 'Pagar deuda hasta la edad',
        eventAge: 'Edad del evento único', eventAmount: 'Monto del evento (negativo es un gasto)',
        shareScenario: 'Compartir este escenario',
        shareWarning: 'El enlace incluirá tus valores financieros. Quienes lo reciban y el servicio que aloja la página podrían ver o registrar esos datos. ¿Continuar?',
        shareLinkLabel: 'Enlace del escenario', shareReady: 'Enlace listo para copiar.',
        shareInvalid: 'Corrige los campos antes de compartir.',
        saveScenarioA: 'Guardar como escenario A', saveScenarioB: 'Guardar como escenario B',
        compareScenarios: 'Comparar A y B', scenarioA: 'Escenario A', scenarioB: 'Escenario B',
        localOnly: 'Los escenarios guardados permanecen en este navegador.',
        scenarioSaved: 'Escenario {slot} guardado en este navegador.',
        clearScenarios: 'Borrar escenarios guardados',
        clearScenariosWarning: '¿Eliminar los escenarios A y B guardados en este navegador?',
        scenariosCleared: 'Se eliminaron los escenarios guardados.',
        scenarioOutcome: '{outcome}. Saldo final: {balance}.', endingBalance: 'Saldo final',
        fixBeforeSave: 'Corrige los campos antes de guardar.', saveUnavailable: 'No se pudo guardar en este navegador.',
        downloadCsv: 'Descargar CSV', printReport: 'Imprimir o guardar como PDF',
        csvReady: 'Si no se descargó automáticamente, usa este enlace.',
        displayToday: 'Mostrar valores en dinero de hoy', finalBalanceInitial: 'Balance final',
        statusTitle: 'Estado del retiro', totalContributions: 'Contribuciones totales',
        totalWithdrawals: 'Retiros totales', requiredSavingsRate: 'Ahorro necesario para la meta',
        investmentGrowth: 'Crecimiento neto de inversión',
        requiredCapital: 'Capital necesario para retirarte', maximumSpending: 'Gasto máximo sostenible',
        earliestRetirement: 'Edad más temprana para retirarte',
        sensitivityTitle: 'Qué palanca mueve más tu plan', sensitivitySavings: '+1 punto de ahorro',
        sensitivityWork: '+1 año trabajando', sensitivityFees: '-1 punto de comisiones',
        yearGained: '{years} año', yearsGained: '{years} años', notAvailable: 'No disponible',
        unreachable: 'No alcanzable', age: 'Edad', income: 'Ingreso',
        stressTest: '¿Y si el mercado cae 30% el año que te retiras?',
        stressResult: 'Escenario normal: {baseline}. Con la caída: {stressed}.',
        returnVolatility: 'Volatilidad anual estimada (%)',
        runSimulation: 'Simular 2.000 escenarios',
        simulationResult: 'El plan alcanza la meta en {successes} de {simulations} escenarios ({probability}).',
        simulationAssumption: 'Usa la rentabilidad indicada como media y la volatilidad elegida en rendimientos anuales normales independientes. Las pérdidas se limitan a -99%; la semilla es fija para reproducir el resultado. Éxito significa llegar al horizonte y superar la meta de herencia. No es una garantía.',
        simulationRunning: 'Calculando escenarios…',
        depletesAt: 'se agota a los {age} años', survivesThrough: 'llega a los {age} años sin agotarse',
        contribution: 'Contribución', withdrawal: 'Retiro', balance: 'Balance', reset: 'Empezar de nuevo',
        balanceHeading: 'Balance ({mode})', depletionHeading: 'Tu dinero dura hasta los',
        finalBalanceHeading: 'Balance final a los {age} años ({mode})', ageYears: '{age} años',
        moneyToday: 'dinero de hoy', moneyFuture: 'dinero futuro',
        announcementDepleted: 'Tu dinero dura hasta los {age} años. Estado: {status}.',
        announcementBalance: 'Balance final a los {age} años: {balance}. Estado: {status}.',
        statusControlled: 'Controlado ✅', statusCaution: 'Precaución ⚠️', statusDanger: 'Peligro 🚨',
        errorRequired: 'Este campo es obligatorio.', errorNumber: 'Ingresa un número válido.',
        errorInteger: 'Ingresa una edad en años enteros.', errorMinimum: 'El valor mínimo es {value}.',
        errorMaximum: 'El valor máximo es {value}.', chartToday: 'Balance en dinero de hoy',
        chartFuture: 'Balance futuro', chartBalance: 'Balance'
    },
    en: {
        pageTitle: 'Retirement Plan Calculator | CalculatOR',
        metaDescription: 'Project retirement in your currency with editable inflation, fee, tax, and income assumptions.',
        tagline: 'Compounding principle: if you do not calculate it, it is not a decision.',
        trustNote: 'Educational tool; results depend on your assumptions and are not financial or tax advice.',
        privacyStatement: 'Your values are calculated in this browser. Sharing puts them in a link that the hosting service may log.',
        thirdPartyPrivacy: 'This page loads third-party advertising and CDN services, which may process technical data under their own policies.',
        methodTitle: 'How we calculate',
        methodTiming: 'The projection uses annual steps. During saving, the balance earns returns net of fees, then receives the contribution and events. During retirement, withdrawals are deducted before the annual return.',
        methodAccumulation: 'Saving year: new balance = balance × (1 + return - fee) + contribution + event.',
        methodWithdrawal: 'Retirement year: gross withdrawal = max(0, spending + debt - other income) / (1 - tax). New balance = (balance - withdrawal + event) × (1 + return - fee).',
        methodPurchasingPower: 'Balance in today’s money = nominal balance / (1 + inflation)^(age - current age + 1).',
        methodTaxes: 'Today’s-money spending is adjusted for inflation from your current age. Other income offsets the withdrawal need before the effective tax rate is applied. Debt reduces contributions before retirement and increases spending afterward.',
        methodValues: 'Today’s-money view divides future balances and cash flows by accumulated inflation. Switching views does not change the projected scenario.',
        methodLimits: 'The calculator does not apply any country’s tax laws or pension rules. The projection is deterministic; optional simulations use independent normal returns. No result is a guarantee or advice.',
        language: 'Language', currency: 'Currency', inputs: 'Your information', results: 'Results',
        currentAge: 'How old are you today?', retirementAge: 'At what age do you plan to retire?',
        currentIncome: 'What is your annual income?', currentIncomeHelper: 'Total personal or household income',
        incomeIncrease: 'How much do you expect your income to grow each year? (%)',
        currentSavings: 'How much have you saved so far?', currentSavingsHelper: 'Include savings and investment accounts.',
        savingsRate: 'What percentage of your income will you save each year? (%)',
        retirementSpending: 'How much do you plan to spend per year in retirement, in today’s money?',
        returnBefore: 'Expected annual return before retirement (%)',
        returnDuring: 'Expected annual return during retirement (%)',
        returnHelp: 'Use a prudent annual estimate for your investment mix.',
        inflationRate: 'Expected inflation (%)', finalBalanceGoal: 'How much would you like to leave as an inheritance?',
        inflationHelp: 'Check your central bank’s target or long-term forecast.',
        advanced: 'Global assumptions', endAge: 'Plan through what age?', annualFee: 'Annual fees (%)',
        withdrawalTax: 'Effective tax on withdrawals (%)', feeHelp: 'Include fund, platform, adviser, and broker charges.',
        taxHelp: 'Estimate your effective rate; this tool does not apply local tax law.',
        otherIncome: 'Other annual retirement income (today’s value)',
        otherIncomeHelp: 'Include pensions, rent, or other recurring income.',
        otherIncomeStart: 'Age when this income starts', otherIncomeIndexed: 'Adjust for inflation',
        savingsMode: 'Savings method', savingsPercentage: 'Percentage of income', savingsFixed: 'Fixed monthly amount',
        fixedMonthly: 'Fixed monthly savings', contributionGrowth: 'Annual growth of fixed savings (%)',
        annualDebt: 'Annual debt payment', debtUntil: 'Pay debt through age', eventAge: 'One-time event age',
        shareScenario: 'Share this scenario',
        shareWarning: 'The link will include your financial inputs. Recipients and the site host may view or log them. Continue?',
        shareLinkLabel: 'Scenario link', shareReady: 'Link ready to copy.',
        shareInvalid: 'Fix the invalid fields before sharing.',
        saveScenarioA: 'Save as scenario A', saveScenarioB: 'Save as scenario B',
        compareScenarios: 'Compare A and B', scenarioA: 'Scenario A', scenarioB: 'Scenario B',
        localOnly: 'Saved scenarios stay in this browser.',
        scenarioSaved: 'Scenario {slot} saved in this browser.',
        clearScenarios: 'Clear saved scenarios',
        clearScenariosWarning: 'Delete scenarios A and B saved in this browser?',
        scenariosCleared: 'Saved scenarios were deleted.',
        scenarioOutcome: '{outcome}. Ending balance: {balance}.', endingBalance: 'Ending balance',
        fixBeforeSave: 'Fix the invalid fields before saving.', saveUnavailable: 'Could not save in this browser.',
        downloadCsv: 'Download CSV', printReport: 'Print or save as PDF',
        csvReady: 'If it did not download automatically, use this link.',
        eventAmount: 'Event amount (negative for an expense)', displayToday: 'Show values in today’s money',
        finalBalanceInitial: 'Final balance', statusTitle: 'Retirement status',
        totalContributions: 'Total contributions', totalWithdrawals: 'Total withdrawals',
        requiredSavingsRate: 'Savings rate needed', unreachable: 'Not achievable', age: 'Age',
        investmentGrowth: 'Net investment growth',
        requiredCapital: 'Capital needed to retire', maximumSpending: 'Maximum sustainable spending',
        earliestRetirement: 'Earliest sustainable retirement age',
        sensitivityTitle: 'Which lever moves your plan most?', sensitivitySavings: '+1 point savings rate',
        sensitivityWork: '+1 more year working', sensitivityFees: '-1 point in fees',
        yearGained: '{years} year', yearsGained: '{years} years', notAvailable: 'Not available',
        stressTest: 'What if the market drops 30% in your retirement year?',
        stressResult: 'Baseline: {baseline}. With the drop: {stressed}.',
        returnVolatility: 'Estimated annual volatility (%)',
        runSimulation: 'Simulate 2,000 scenarios',
        simulationResult: 'The plan meets the goal in {successes} of {simulations} scenarios ({probability}).',
        simulationAssumption: 'Uses the entered return as the mean and selected volatility for independent normal annual returns. Losses are floored at -99%; the seed is fixed for reproducibility. Success means surviving through the horizon and exceeding the inheritance goal. This is not a guarantee.',
        simulationRunning: 'Simulating scenarios…',
        depletesAt: 'runs out at age {age}', survivesThrough: 'lasts through age {age}',
        income: 'Income', contribution: 'Contribution', withdrawal: 'Withdrawal', balance: 'Balance',
        reset: 'Start over', balanceHeading: 'Balance ({mode})',
        depletionHeading: 'Your money lasts until', finalBalanceHeading: 'Final balance at age {age} ({mode})',
        ageYears: 'age {age}', moneyToday: 'today’s money', moneyFuture: 'future money',
        announcementDepleted: 'Your money lasts until age {age}. Status: {status}.',
        announcementBalance: 'Final balance at age {age}: {balance}. Status: {status}.',
        statusControlled: 'On track ✅', statusCaution: 'Caution ⚠️', statusDanger: 'At risk 🚨',
        errorRequired: 'This field is required.', errorNumber: 'Enter a valid number.',
        errorInteger: 'Enter a whole-number age.', errorMinimum: 'The minimum is {value}.',
        errorMaximum: 'The maximum is {value}.', chartToday: 'Balance in today’s money',
        chartFuture: 'Future balance', chartBalance: 'Balance'
    },
    pt: {
        pageTitle: 'Calculadora de aposentadoria | CalculatOR',
        metaDescription: 'Projete sua aposentadoria na sua moeda com premissas editáveis de inflação, taxas, impostos e renda.',
        tagline: 'Princípio dos juros compostos: sem calcular, não é uma decisão.',
        trustNote: 'Ferramenta educativa; os resultados dependem das suas premissas e não são aconselhamento financeiro ou fiscal.',
        privacyStatement: 'Seus valores são calculados neste navegador. Ao compartilhar, eles vão em um link que o serviço de hospedagem pode registrar.',
        thirdPartyPrivacy: 'Esta página carrega serviços de publicidade e CDN de terceiros, que podem processar dados técnicos conforme suas próprias políticas.',
        methodTitle: 'Como calculamos',
        methodTiming: 'A projeção usa etapas anuais. Durante a poupança, o saldo rende após as taxas e depois recebe a contribuição e os eventos. Na aposentadoria, os saques são descontados antes do retorno anual.',
        methodAccumulation: 'Ano de poupança: novo saldo = saldo × (1 + retorno - taxa) + contribuição + evento.',
        methodWithdrawal: 'Ano de aposentadoria: saque bruto = max(0, gasto + dívida - outra renda) / (1 - imposto). Novo saldo = (saldo - saque + evento) × (1 + retorno - taxa).',
        methodPurchasingPower: 'Saldo em valores de hoje = saldo nominal / (1 + inflação)^(idade - idade atual + 1).',
        methodTaxes: 'Os gastos em valores de hoje são corrigidos pela inflação desde a idade atual. Outra renda reduz a necessidade de saque antes da aplicação do imposto efetivo. A dívida reduz as contribuições antes da aposentadoria e aumenta os gastos depois.',
        methodValues: 'A visualização em valores de hoje divide saldos e fluxos futuros pela inflação acumulada. Alternar a visualização não altera o cenário projetado.',
        methodLimits: 'A ferramenta não aplica leis fiscais nem regras de previdência de nenhum país. A projeção é determinística; a simulação opcional usa retornos normais independentes. Nenhum resultado é garantia ou aconselhamento.',
        language: 'Idioma', currency: 'Moeda', inputs: 'Suas informações', results: 'Resultados',
        currentAge: 'Qual é a sua idade atual?', retirementAge: 'Com que idade pretende se aposentar?',
        currentIncome: 'Qual é a sua renda anual?', currentIncomeHelper: 'Renda pessoal ou familiar total',
        incomeIncrease: 'Quanto espera que sua renda aumente por ano? (%)',
        currentSavings: 'Quanto você já tem guardado?', currentSavingsHelper: 'Inclua contas de investimento e poupança.',
        savingsRate: 'Qual porcentagem da renda pretende guardar por ano? (%)',
        retirementSpending: 'Quanto pretende gastar por ano na aposentadoria, em valores de hoje?',
        returnBefore: 'Retorno anual esperado antes da aposentadoria (%)',
        returnDuring: 'Retorno anual esperado durante a aposentadoria (%)',
        returnHelp: 'Use uma estimativa anual prudente para sua carteira de investimentos.',
        inflationRate: 'Inflação esperada (%)', finalBalanceGoal: 'Quanto deseja deixar de herança?',
        inflationHelp: 'Consulte a meta ou projeção de longo prazo do banco central do seu país.',
        advanced: 'Premissas globais', endAge: 'Até que idade deseja planejar?', annualFee: 'Taxas anuais (%)',
        withdrawalTax: 'Imposto efetivo sobre saques (%)', feeHelp: 'Inclua fundos, plataforma, consultoria e corretora.',
        taxHelp: 'Estime sua taxa efetiva; a ferramenta não aplica leis fiscais locais.',
        otherIncome: 'Outra renda anual na aposentadoria (valor de hoje)',
        otherIncomeHelp: 'Inclua previdência, aluguel ou outra renda recorrente.',
        otherIncomeStart: 'Idade em que essa renda começa', otherIncomeIndexed: 'Corrigir pela inflação',
        savingsMode: 'Forma de poupar', savingsPercentage: 'Porcentagem da renda', savingsFixed: 'Valor mensal fixo',
        fixedMonthly: 'Poupança mensal fixa', contributionGrowth: 'Aumento anual da poupança fixa (%)',
        annualDebt: 'Pagamento anual de dívidas', debtUntil: 'Pagar dívidas até a idade', eventAge: 'Idade do evento único',
        shareScenario: 'Compartilhar este cenário',
        shareWarning: 'O link incluirá seus dados financeiros. Quem recebê-lo e o serviço de hospedagem poderão visualizar ou registrar esses dados. Continuar?',
        shareLinkLabel: 'Link do cenário', shareReady: 'Link pronto para copiar.',
        shareInvalid: 'Corrija os campos inválidos antes de compartilhar.',
        saveScenarioA: 'Salvar como cenário A', saveScenarioB: 'Salvar como cenário B',
        compareScenarios: 'Comparar A e B', scenarioA: 'Cenário A', scenarioB: 'Cenário B',
        localOnly: 'Os cenários salvos ficam somente neste navegador.',
        scenarioSaved: 'Cenário {slot} salvo neste navegador.',
        clearScenarios: 'Apagar cenários salvos',
        clearScenariosWarning: 'Excluir os cenários A e B salvos neste navegador?',
        scenariosCleared: 'Os cenários salvos foram excluídos.',
        scenarioOutcome: '{outcome}. Saldo final: {balance}.', endingBalance: 'Saldo final',
        fixBeforeSave: 'Corrija os campos inválidos antes de salvar.', saveUnavailable: 'Não foi possível salvar neste navegador.',
        downloadCsv: 'Baixar CSV', printReport: 'Imprimir ou salvar como PDF',
        csvReady: 'Se não baixou automaticamente, use este link.',
        eventAmount: 'Valor do evento (negativo para uma despesa)', displayToday: 'Mostrar valores em dinheiro de hoje',
        finalBalanceInitial: 'Saldo final', statusTitle: 'Situação da aposentadoria',
        totalContributions: 'Total contribuído', totalWithdrawals: 'Total retirado',
        requiredSavingsRate: 'Taxa de poupança necessária', unreachable: 'Não alcançável', age: 'Idade',
        investmentGrowth: 'Crescimento líquido dos investimentos',
        requiredCapital: 'Capital necessário para se aposentar', maximumSpending: 'Gasto máximo sustentável',
        earliestRetirement: 'Idade mínima sustentável para se aposentar',
        sensitivityTitle: 'Qual ajuste mais ajuda seu plano?', sensitivitySavings: '+1 ponto na taxa de poupança',
        sensitivityWork: '+1 ano trabalhando', sensitivityFees: '-1 ponto nas taxas',
        yearGained: '{years} ano', yearsGained: '{years} anos', notAvailable: 'Indisponível',
        stressTest: 'E se o mercado cair 30% no ano da aposentadoria?',
        stressResult: 'Cenário normal: {baseline}. Com a queda: {stressed}.',
        returnVolatility: 'Volatilidade anual estimada (%)',
        runSimulation: 'Simular 2.000 cenários',
        simulationResult: 'O plano atinge a meta em {successes} de {simulations} cenários ({probability}).',
        simulationAssumption: 'Usa o retorno informado como média e a volatilidade selecionada em retornos anuais normais independentes. As perdas são limitadas a -99%; a semente é fixa para reproduzir o resultado. Sucesso significa chegar ao horizonte e superar a meta de herança. Não é garantia.',
        simulationRunning: 'Calculando cenários…',
        depletesAt: 'acaba aos {age} anos', survivesThrough: 'dura até os {age} anos',
        income: 'Renda', contribution: 'Contribuição', withdrawal: 'Saque', balance: 'Saldo',
        reset: 'Recomeçar', balanceHeading: 'Saldo ({mode})',
        depletionHeading: 'Seu dinheiro dura até', finalBalanceHeading: 'Saldo final aos {age} anos ({mode})',
        ageYears: '{age} anos', moneyToday: 'valores de hoje', moneyFuture: 'valores futuros',
        announcementDepleted: 'Seu dinheiro dura até os {age} anos. Situação: {status}.',
        announcementBalance: 'Saldo final aos {age} anos: {balance}. Situação: {status}.',
        statusControlled: 'Sob controle ✅', statusCaution: 'Atenção ⚠️', statusDanger: 'Em risco 🚨',
        errorRequired: 'Este campo é obrigatório.', errorNumber: 'Digite um número válido.',
        errorInteger: 'Digite uma idade em anos inteiros.', errorMinimum: 'O valor mínimo é {value}.',
        errorMaximum: 'O valor máximo é {value}.', chartToday: 'Saldo em valores de hoje',
        chartFuture: 'Saldo futuro', chartBalance: 'Saldo'
    }
};

function translate(key, values = {}) {
    const language = displayLocale.split('-')[0];
    const template = TRANSLATIONS[language]?.[key] || TRANSLATIONS.es[key] || key;
    return template.replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match);
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        element.textContent = translate(element.dataset.i18n);
    });
    document.title = translate('pageTitle');
    document.getElementById('metaDescription').content = translate('metaDescription');
    document.getElementById('ogTitle').content = translate('pageTitle');
    document.getElementById('ogDescription').content = translate('metaDescription');
    const structuredData = JSON.parse(document.getElementById('structuredData').textContent);
    structuredData.description = translate('metaDescription');
    document.getElementById('structuredData').textContent = JSON.stringify(structuredData);
}

function readPresentationSettings() {
    displayLocale = document.getElementById('localeSelector').value;
    displayCurrency = document.getElementById('currencySelector').value;
    useTodaysMoney = document.getElementById('todaysMoneyToggle').checked;
    document.documentElement.lang = displayLocale.split('-')[0];
    applyTranslations();
}

function renderProjectionResults() {
    if (!lastProjectionResult || !lastProjectionParams) return;
    renderTable(lastProjectionResult.data, useTodaysMoney);
    updateStatusDisplay(
        lastProjectionResult,
        lastProjectionParams.finalBalanceGoal,
        useTodaysMoney,
        lastInverseResults.savingsRate,
        lastInverseResults.capital,
        lastInverseResults.spending,
        lastInverseResults.retirementAge,
        lastInverseResults.sensitivities
    );
    updateChart(lastProjectionResult.data, useTodaysMoney);
}

function renderMonteCarloResult() {
    if (!lastMonteCarloResult) return;
    document.getElementById('simulationResult').textContent = translate('simulationResult', {
        successes: new Intl.NumberFormat(displayLocale).format(lastMonteCarloResult.successes),
        simulations: new Intl.NumberFormat(displayLocale).format(lastMonteCarloResult.simulations),
        probability: new Intl.NumberFormat(displayLocale, { style: 'percent', maximumFractionDigits: 1 })
            .format(lastMonteCarloResult.probability)
    });
    document.getElementById('simulationResult').hidden = false;
}

function updatePresentation() {
    readPresentationSettings();
    renderProjectionResults();
    renderMonteCarloResult();
}

function scheduleCalculate() {
    clearTimeout(calculationTimer);
    calculationTimer = setTimeout(() => {
        calculationTimer = null;
        calculate();
    }, 200);
}

function parseLocalizedNumber(value, isAmount) {
    let text = String(value).trim().replace(/[\s\u00a0\u202f]/g, '');
    text = text.replace(/^(?:US\$|R\$|[$€£¥₹₺])/i, '');
    text = text.replace(/(?:US\$|R\$|[$€£¥₹₺])$/i, '');
    if (text === '' || text === '-') return NaN;
    if (!/^-?(?:\d+|\d{1,3}(?:[.,]\d{3})+)(?:[.,]\d+)?$/.test(text)) return NaN;

    const commaIndex = text.lastIndexOf(',');
    const periodIndex = text.lastIndexOf('.');
    let decimalSeparator = null;

    if (commaIndex !== -1 && periodIndex !== -1) {
        decimalSeparator = commaIndex > periodIndex ? ',' : '.';
    } else {
        const separator = commaIndex !== -1 ? ',' : periodIndex !== -1 ? '.' : null;
        if (separator) {
            const occurrences = text.split(separator).length - 1;
            const trailingDigits = text.length - text.lastIndexOf(separator) - 1;
            const groupedAmount = isAmount && trailingDigits === 3;
            if (!groupedAmount && (occurrences === 1 || trailingDigits === 1 || trailingDigits === 2)) {
                decimalSeparator = separator;
            }
        }
    }

    if (!decimalSeparator) return Number(text.replace(/[,.]/g, ''));

    const decimalIndex = text.lastIndexOf(decimalSeparator);
    const integerPart = text.slice(0, decimalIndex).replace(/[,.]/g, '') || '0';
    const decimalPart = text.slice(decimalIndex + 1).replace(/[,.]/g, '');
    return Number(`${integerPart}.${decimalPart}`);
}

function parseInputValue(value, rules, locale = displayLocale) {
    const text = String(value).trim();
    if (text === '') return { value: null, error: translate('errorRequired') };

    const number = parseLocalizedNumber(text, rules.amount);
    if (!Number.isFinite(number)) return { value: null, error: translate('errorNumber') };
    if (rules.integer && !Number.isInteger(number)) {
        return { value: null, error: translate('errorInteger') };
    }
    if (number < rules.min) return { value: null, error: translate('errorMinimum', { value: rules.min }) };
    if (number > rules.max) return { value: null, error: translate('errorMaximum', { value: rules.max }) };
    return { value: number, error: null };
}

function buildShareUrl(baseUrl, values) {
    const url = new URL(baseUrl);
    url.search = '';
    url.hash = '';
    SCENARIO_CONTROL_IDS.forEach(id => {
        if (Object.hasOwn(values, id)) url.searchParams.set(id, String(values[id]));
    });
    return url.toString();
}

function parseScenarioSearch(search) {
    const query = new URLSearchParams(search);
    const values = {};
    const selectOptions = {
        savingsMode: ['percentage', 'fixed'],
        localeSelector: ['es-MX', 'es-ES', 'en-US', 'pt-BR'],
        currencySelector: ['EUR', 'MXN', 'ARS', 'BRL', 'USD', 'GBP', 'TRY']
    };

    Object.entries(selectOptions).forEach(([id, options]) => {
        const value = query.get(id);
        if (value !== null && options.includes(value)) values[id] = value;
    });
    SCENARIO_CONTROL_IDS.forEach(id => {
        if (!query.has(id) || Object.hasOwn(selectOptions, id)) return;
        const value = query.get(id);
        if (id === 'otherIncomeIndexed' || id === 'todaysMoneyToggle') {
            if (value === 'true' || value === 'false') values[id] = value === 'true';
            return;
        }
        const parsed = parseInputValue(value, INPUT_RULES[id], values.localeSelector || displayLocale);
        if (!parsed.error) values[id] = parsed.value;
    });
    return values;
}

function buildCsv(data, inTodaysMoney = true) {
    const balanceHeader = inTodaysMoney ? 'balance_today' : 'balance_future';
    const headers = ['age', 'income', 'contribution', 'withdrawal', balanceHeader];
    const escapeCell = value => {
        const text = String(value);
        return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const rows = data.map(row => [
        row.age,
        inTodaysMoney ? row.incomeToday : row.income,
        inTodaysMoney ? row.contributionToday : row.contribution,
        inTodaysMoney ? row.withdrawalToday : row.withdrawal,
        inTodaysMoney ? row.balanceToday : row.balance
    ]);
    return [headers, ...rows].map(row => row.map(escapeCell).join(',')).join('\r\n');
}

function formatCurrency(value, options = {}) {
    return new Intl.NumberFormat(options.locale || displayLocale, {
        style: 'currency',
        currency: options.currency || displayCurrency,
        maximumFractionDigits: 0
    }).format(value);
}

function formatCompactCurrency(value, options = {}) {
    return new Intl.NumberFormat(options.locale || displayLocale, {
        style: 'currency',
        currency: options.currency || displayCurrency,
        notation: 'compact',
        maximumFractionDigits: 1
    }).format(value);
}

function getRetirementStatus(finalBalance, finalBalanceGoal = 100000, depleted = finalBalance <= 0) {
    if (depleted) {
        return { text: translate('statusDanger'), class: 'danger' };
    }
    if (finalBalance > finalBalanceGoal) {
        return { text: translate('statusControlled'), class: 'success' };
    } else if (finalBalance > 0) {
        return { text: translate('statusCaution'), class: 'warning' };
    } else {
        return { text: translate('statusCaution'), class: 'warning' };
    }
}

function calculateRetirementData(params) {
    const {
        currentAge,
        retirementAge,
        currentIncome,
        incomeIncrease,
        currentSavings,
        savingsRate,
        retirementSpending,
        returnBeforeRetirement,
        returnDuringRetirement,
        inflationRate,
        endAge = 95,
        annualFeeRate = 0,
        withdrawalTaxRate = 0,
        annualReturns = {},
        otherRetirementIncome = [],
        savingsMode = 'percentage',
        fixedMonthlySavings = 0,
        contributionGrowth = 0,
        debts = [],
        events = [],
        marketShocks = []
    } = params;

    let balance = currentSavings;
    let income = currentIncome;
    let fixedAnnualContribution = fixedMonthlySavings * 12;
    let totalContributions = 0;
    let totalContributionsToday = 0;
    let totalInvestmentGrowth = 0;
    let totalInvestmentGrowthToday = 0;
    let totalWithdrawals = 0;
    let totalWithdrawalsToday = 0;
    let depletionAge = null;
    const data = [];
    const retirementStartAge = Math.max(currentAge, retirementAge);
    const finalAge = Math.max(endAge, retirementStartAge);

    for (let age = currentAge; age <= finalAge; age++) {
        const yearIndex = age - currentAge;
        const inflationFactor = Math.pow(1 + inflationRate, yearIndex);
        const shockFactor = marketShocks
            .filter(shock => shock.age === age)
            .reduce((factor, shock) => factor * (1 - shock.rate), 1);
        balance *= shockFactor;
        const debtPayment = debts
            .filter(debt => age < debt.untilAge)
            .reduce((total, debt) => total + debt.annualPayment, 0);
        const eventAmount = events
            .filter(event => event.age === age)
            .reduce((total, event) => total + event.amount, 0);
        const isRetired = age >= retirementStartAge;
        const yearIncome = isRetired ? 0 : income;
        let contribution = 0;
        let withdrawal = 0;
        let retirementIncome = 0;
        let investmentGrowth = 0;
        const sampledReturn = annualReturns[age] || {};

        if (!isRetired) {
            const plannedContribution = savingsMode === 'fixed'
                ? fixedAnnualContribution
                : yearIncome * savingsRate;
            contribution = Math.max(0, plannedContribution - debtPayment);
            const netReturn = (sampledReturn.before ?? returnBeforeRetirement) - annualFeeRate;
            investmentGrowth = balance * netReturn;
            balance = balance * (1 + netReturn) + contribution + eventAmount;
            totalContributions += contribution;
            income *= 1 + incomeIncrease;
            fixedAnnualContribution *= 1 + contributionGrowth;
        } else {
            retirementIncome = otherRetirementIncome
                .filter(source => age >= source.startAge)
                .reduce((total, source) => total + (source.indexed
                    ? source.amount * inflationFactor
                    : source.amount), 0);
            const spending = retirementSpending * inflationFactor;
            const taxableNeed = Math.max(0, spending + debtPayment - retirementIncome);
            withdrawal = taxableNeed / (1 - withdrawalTaxRate);
            const balanceBeforeReturn = balance - withdrawal + eventAmount;
            const netReturn = (sampledReturn.during ?? returnDuringRetirement) - annualFeeRate;
            investmentGrowth = balanceBeforeReturn * netReturn;
            balance = balanceBeforeReturn * (1 + netReturn);
            totalWithdrawals += withdrawal;
        }

        const deflator = Math.pow(1 + inflationRate, yearIndex + 1);
        totalContributionsToday += contribution / deflator;
        totalWithdrawalsToday += withdrawal / deflator;
        totalInvestmentGrowth += investmentGrowth;
        totalInvestmentGrowthToday += investmentGrowth / deflator;
        const row = {
            age,
            income: yearIncome,
            contribution,
            withdrawal,
            investmentGrowth,
            retirementIncome,
            balance: Math.max(0, balance),
            balanceToday: Math.max(0, balance) / deflator,
            incomeToday: yearIncome / deflator,
            contributionToday: contribution / deflator,
            withdrawalToday: withdrawal / deflator,
            investmentGrowthToday: investmentGrowth / deflator,
            isRetired
        };
        data.push(row);

        if (balance <= 0 && (withdrawal > 0 || eventAmount < 0)) {
            depletionAge = age;
            break;
        }
    }

    const finalRow = data[data.length - 1];
    return {
        data,
        finalBalance: finalRow.balance,
        finalBalanceToday: finalRow.balanceToday,
        totalContributions,
        totalContributionsToday,
        totalInvestmentGrowth,
        totalInvestmentGrowthToday,
        totalWithdrawals,
        totalWithdrawalsToday,
        depletionAge
    };
}

function calculateRequiredSavingsRate(params) {
    const goal = params.finalBalanceGoal ?? 100000;
    const meetsGoal = savingsRate => {
        const result = calculateRetirementData({ ...params, savingsMode: 'percentage', savingsRate });
        return result.depletionAge === null && result.finalBalanceToday > goal;
    };

    if (meetsGoal(0)) return 0;
    if (!meetsGoal(1)) return null;

    let lower = 0;
    let upper = 1;
    for (let iteration = 0; iteration < 40; iteration++) {
        const midpoint = (lower + upper) / 2;
        if (meetsGoal(midpoint)) {
            upper = midpoint;
        } else {
            lower = midpoint;
        }
    }
    return upper;
}

function calculateRequiredRetirementCapital(params) {
    const retirementAge = Math.max(params.currentAge, params.retirementAge);
    const yearsToRetirement = retirementAge - params.currentAge;
    const inflationFactor = Math.pow(1 + params.inflationRate, yearsToRetirement);
    const goal = params.finalBalanceGoal ?? 100000;
    const retirementParams = {
        ...params,
        currentAge: retirementAge,
        retirementAge,
        currentIncome: 0,
        incomeIncrease: 0,
        currentSavings: 0,
        savingsRate: 0,
        retirementSpending: params.retirementSpending * inflationFactor,
        otherRetirementIncome: (params.otherRetirementIncome || []).map(source => ({
            ...source,
            amount: source.indexed ? source.amount * inflationFactor : source.amount
        })),
        events: (params.events || []).filter(event => event.age >= retirementAge)
    };
    const meetsGoal = capital => {
        const result = calculateRetirementData({ ...retirementParams, currentSavings: capital });
        const finalAge = result.data[result.data.length - 1].age;
        const balanceToday = result.finalBalance / Math.pow(
            1 + params.inflationRate,
            finalAge - params.currentAge + 1
        );
        return result.depletionAge === null && balanceToday > goal;
    };

    if (meetsGoal(0)) return 0;

    let lower = 0;
    let upper = Math.max(1, retirementParams.retirementSpending, goal * inflationFactor);
    while (upper <= 1e15 && !meetsGoal(upper)) upper *= 2;
    if (upper > 1e15) return null;

    for (let iteration = 0; iteration < 40; iteration++) {
        const midpoint = (lower + upper) / 2;
        if (meetsGoal(midpoint)) {
            upper = midpoint;
        } else {
            lower = midpoint;
        }
    }
    return upper / inflationFactor;
}

function calculateMaximumSustainableSpending(params) {
    const goal = params.finalBalanceGoal ?? 100000;
    const meetsGoal = retirementSpending => {
        const result = calculateRetirementData({ ...params, retirementSpending });
        return result.depletionAge === null && result.finalBalanceToday > goal;
    };

    if (!meetsGoal(0)) return null;

    let lower = 0;
    let upper = Math.max(1, params.retirementSpending);
    for (let expansion = 0; expansion < 60 && meetsGoal(upper); expansion++) {
        lower = upper;
        upper *= 2;
    }
    if (meetsGoal(upper)) return null;

    for (let iteration = 0; iteration < 40; iteration++) {
        const midpoint = (lower + upper) / 2;
        if (meetsGoal(midpoint)) {
            lower = midpoint;
        } else {
            upper = midpoint;
        }
    }
    return lower;
}

function calculateEarliestSustainableRetirementAge(params) {
    const goal = params.finalBalanceGoal ?? 100000;
    const finalAge = Math.max(params.endAge ?? 95, params.currentAge);

    for (let retirementAge = params.currentAge; retirementAge <= finalAge; retirementAge++) {
        const result = calculateRetirementData({ ...params, retirementAge });
        if (result.depletionAge === null && result.finalBalanceToday > goal) {
            return retirementAge;
        }
    }
    return null;
}

function calculatePlanSensitivities(params) {
    const ageReached = result => result.depletionAge ?? result.data[result.data.length - 1].age;
    const baselineAge = ageReached(calculateRetirementData(params));
    const getYearsGained = variant => ageReached(calculateRetirementData(variant)) - baselineAge;

    return {
        savingsRate: params.savingsMode === 'fixed' || params.savingsRate >= 1
            ? null
            : getYearsGained({ ...params, savingsMode: 'percentage', savingsRate: Math.min(1, params.savingsRate + 0.01) }),
        extraWorkYear: params.retirementAge >= (params.endAge ?? 95)
            ? null
            : getYearsGained({ ...params, retirementAge: params.retirementAge + 1 }),
        lowerFees: (params.annualFeeRate ?? 0) < 0.01
            ? null
            : getYearsGained({ ...params, annualFeeRate: params.annualFeeRate - 0.01 })
    };
}

function createSeededRandom(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6D2B79F5) >>> 0;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}

function createNormalRandom(random) {
    let spare = null;
    return () => {
        if (spare !== null) {
            const value = spare;
            spare = null;
            return value;
        }
        const radius = Math.sqrt(-2 * Math.log(Math.max(Number.MIN_VALUE, 1 - random())));
        const angle = 2 * Math.PI * random();
        spare = radius * Math.sin(angle);
        return radius * Math.cos(angle);
    };
}

function calculateMonteCarloSuccessProbability(params, options = {}) {
    const simulations = options.simulations ?? 2000;
    const volatility = options.volatility ?? params.returnVolatility ?? 0.15;
    const seed = options.seed ?? 20261030;
    if (!Number.isInteger(simulations) || simulations < 1 || simulations > 10000) {
        throw new RangeError('simulations must be an integer between 1 and 10000');
    }
    if (!Number.isInteger(seed)) {
        throw new RangeError('seed must be an integer');
    }
    if (!Number.isFinite(volatility) || volatility < 0 || volatility > 1) {
        throw new RangeError('volatility must be between 0 and 1');
    }

    const normal = createNormalRandom(createSeededRandom(seed));
    const endAge = Math.max(params.endAge ?? 95, params.currentAge, params.retirementAge);
    const inheritanceGoal = params.finalBalanceGoal ?? 100000;
    let successes = 0;
    for (let simulation = 0; simulation < simulations; simulation++) {
        const annualReturns = {};
        for (let age = params.currentAge; age <= endAge; age++) {
            annualReturns[age] = {
                before: Math.max(-0.99, params.returnBeforeRetirement + volatility * normal()),
                during: Math.max(-0.99, params.returnDuringRetirement + volatility * normal())
            };
        }
        const result = calculateRetirementData({ ...params, annualReturns });
        if (result.depletionAge === null && result.finalBalanceToday > inheritanceGoal) {
            successes++;
        }
    }
    return { successes, simulations, probability: successes / simulations, volatility, seed };
}

function calculateRetirementStressTest(params, dropRate = 0.3) {
    const shockAge = Math.max(params.currentAge, params.retirementAge);
    const baseline = calculateRetirementData(params);
    const stressed = calculateRetirementData({
        ...params,
        marketShocks: [...(params.marketShocks || []), { age: shockAge, rate: dropRate }]
    });
    const baselineLastAge = baseline.depletionAge ?? baseline.data[baseline.data.length - 1].age;
    const stressedLastAge = stressed.depletionAge ?? stressed.data[stressed.data.length - 1].age;

    return {
        shockAge,
        baseline,
        stressed,
        yearsLost: Math.max(0, baselineLastAge - stressedLastAge)
    };
}

function compareScenarioProjections(paramsA, paramsB) {
    return {
        A: calculateRetirementData(paramsA),
        B: calculateRetirementData(paramsB)
    };
}

function renderTable(data, inTodaysMoney = true) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    data.forEach(row => {
        const tr = document.createElement('tr');
        if (row.isRetired) tr.classList.add('retirement-row');
        const income = inTodaysMoney ? row.incomeToday : row.income;
        const contribution = inTodaysMoney ? row.contributionToday : row.contribution;
        const withdrawal = inTodaysMoney ? row.withdrawalToday : row.withdrawal;
        const balance = inTodaysMoney ? row.balanceToday : row.balance;

        tr.innerHTML = `
            <td>${translate('age')} ${row.age}</td>
            <td>${income > 0 ? formatCurrency(income) : '-'}</td>
            <td>${contribution > 0 ? formatCurrency(contribution) : '-'}</td>
            <td>${withdrawal > 0 ? formatCurrency(withdrawal) : '-'}</td>
            <td ${balance <= 0 ? 'class="shortage"' : ''}>${formatCurrency(balance)}</td>
        `;
        tableBody.appendChild(tr);
    });
}

function updateStatusDisplay(result, finalBalanceGoal, inTodaysMoney, requiredSavingsRate, requiredCapital, maximumSpending, earliestRetirementAge, sensitivities) {
    const finalAge = result.data[result.data.length - 1].age;
    const finalBalance = inTodaysMoney ? result.finalBalanceToday : result.finalBalance;
    const totalContributions = inTodaysMoney ? result.totalContributionsToday : result.totalContributions;
    const totalWithdrawals = inTodaysMoney ? result.totalWithdrawalsToday : result.totalWithdrawals;
    const resultHeading = document.getElementById('finalBalanceHeading');
    const resultValue = document.getElementById('finalBalance');
    document.getElementById('balanceHeader').textContent =
        translate('balanceHeading', { mode: translate(inTodaysMoney ? 'moneyToday' : 'moneyFuture') });
    if (result.depletionAge !== null) {
        resultHeading.textContent = translate('depletionHeading');
        resultValue.textContent = translate('ageYears', { age: result.depletionAge });
    } else {
        resultHeading.textContent = translate('finalBalanceHeading', {
            age: finalAge,
            mode: translate(inTodaysMoney ? 'moneyToday' : 'moneyFuture')
        });
        resultValue.textContent = formatCurrency(finalBalance);
    }
    document.getElementById('mobileResultHeading').textContent = resultHeading.textContent;
    document.getElementById('mobileResultValue').textContent = resultValue.textContent;
    document.getElementById('totalContributions').textContent = formatCurrency(totalContributions);
    document.getElementById('totalWithdrawals').textContent = formatCurrency(totalWithdrawals);
    document.getElementById('investmentGrowth').textContent = formatCurrency(
        inTodaysMoney ? result.totalInvestmentGrowthToday : result.totalInvestmentGrowth
    );
    document.getElementById('requiredSavingsRate').textContent = requiredSavingsRate === null
        ? translate('unreachable')
        : new Intl.NumberFormat(displayLocale, { style: 'percent', maximumFractionDigits: 1 }).format(requiredSavingsRate);
    document.getElementById('requiredCapital').textContent = requiredCapital === null
        ? translate('unreachable')
        : formatCurrency(requiredCapital);
    document.getElementById('maximumSpending').textContent = maximumSpending === null
        ? translate('unreachable')
        : formatCurrency(maximumSpending);
    document.getElementById('earliestRetirementAge').textContent = earliestRetirementAge === null
        ? translate('unreachable')
        : translate('ageYears', { age: earliestRetirementAge });
    document.getElementById('sensitivitySavings').textContent = formatYearsGained(sensitivities.savingsRate);
    document.getElementById('sensitivityWork').textContent = formatYearsGained(sensitivities.extraWorkYear);
    document.getElementById('sensitivityFees').textContent = formatYearsGained(sensitivities.lowerFees);
    const status = getRetirementStatus(result.finalBalanceToday, finalBalanceGoal, result.depletionAge !== null);
    const statusCard = document.getElementById('statusCard');
    const statusElement = document.getElementById('status');
    const finalBalanceCard = document.getElementById('finalBalanceCard');
    
    statusElement.textContent = status.text;
    statusCard.classList.remove('success', 'warning', 'danger');
    statusCard.classList.add(status.class);
    finalBalanceCard.classList.remove('success', 'warning', 'danger');
    finalBalanceCard.classList.add(status.class);
    document.getElementById('resultAnnouncement').textContent = result.depletionAge !== null
        ? translate('announcementDepleted', { age: result.depletionAge, status: status.text })
        : translate('announcementBalance', { age: finalAge, balance: formatCurrency(finalBalance), status: status.text });
}

function formatYearsGained(value) {
    if (value === null) return translate('notAvailable');
    return translate(Math.abs(value) === 1 ? 'yearGained' : 'yearsGained', { years: value });
}

function calculate() {
    readPresentationSettings();
    const values = {};
    let hasInvalidInput = false;

    Object.entries(INPUT_RULES).forEach(([id, rules]) => {
        const input = document.getElementById(id);
        const errorElement = document.getElementById(`${id}Error`);
        const parsed = parseInputValue(input.value, rules, displayLocale);

        if (parsed.error) {
            input.setAttribute('aria-invalid', 'true');
            errorElement.textContent = parsed.error;
            errorElement.hidden = false;
            hasInvalidInput = true;
        } else {
            input.removeAttribute('aria-invalid');
            errorElement.textContent = '';
            errorElement.hidden = true;
            values[id] = parsed.value;
        }
    });

    formIsValid = !hasInvalidInput;
    if (!formIsValid) return;

    const currentAge = values.currentAge;
    const retirementAge = values.retirementAge;
    const currentIncome = values.currentIncome;
    const incomeIncrease = values.incomeIncrease / 100;
    const currentSavings = values.currentSavings;
    const savingsRate = values.savingsRate / 100;
    const retirementSpending = values.retirementSpending;
    const returnBeforeRetirement = values.returnBeforeRetirement / 100;
    const returnDuringRetirement = values.returnDuringRetirement / 100;
    const inflationRate = values.inflationRate / 100;
    const finalBalanceGoal = values.finalBalanceGoal;
    const savingsMode = document.getElementById('savingsMode').value;
    useTodaysMoney = document.getElementById('todaysMoneyToggle').checked;
    document.getElementById('savingsRate').disabled = savingsMode === 'fixed';
    document.getElementById('fixedMonthlySavings').disabled = savingsMode !== 'fixed';
    const otherRetirementIncome = values.otherIncomeAmount > 0
        ? [{
            amount: values.otherIncomeAmount,
            startAge: values.otherIncomeStartAge,
            indexed: document.getElementById('otherIncomeIndexed').checked
        }]
        : [];
    const debts = values.annualDebtPayment > 0
        ? [{ annualPayment: values.annualDebtPayment, untilAge: values.debtUntilAge }]
        : [];
    const events = values.eventAmount !== 0
        ? [{ age: values.eventAge, amount: values.eventAmount }]
        : [];

    const projectionParams = {
        currentAge,
        retirementAge,
        currentIncome,
        incomeIncrease,
        currentSavings,
        savingsRate,
        retirementSpending,
        returnBeforeRetirement,
        returnDuringRetirement,
        inflationRate,
        finalBalanceGoal,
        endAge: values.endAge,
        annualFeeRate: values.annualFeeRate / 100,
        withdrawalTaxRate: values.withdrawalTaxRate / 100,
        returnVolatility: values.returnVolatility / 100,
        otherRetirementIncome,
        savingsMode,
        fixedMonthlySavings: values.fixedMonthlySavings,
        contributionGrowth: values.contributionGrowth / 100,
        debts,
        events
    };
    lastProjectionParams = projectionParams;
    lastMonteCarloResult = null;
    document.getElementById('simulationResult').hidden = true;
    const stressResultElement = document.getElementById('stressTestResult');
    stressResultElement.hidden = true;
    stressResultElement.textContent = '';
    const result = calculateRetirementData(projectionParams);
    lastProjectionData = result.data;
    const requiredSavingsRate = calculateRequiredSavingsRate({ ...projectionParams, finalBalanceGoal });
    const requiredCapital = calculateRequiredRetirementCapital({ ...projectionParams, finalBalanceGoal });
    const maximumSpending = calculateMaximumSustainableSpending({ ...projectionParams, finalBalanceGoal });
    const earliestRetirementAge = calculateEarliestSustainableRetirementAge({ ...projectionParams, finalBalanceGoal });
    const sensitivities = calculatePlanSensitivities(projectionParams);
    lastProjectionResult = result;
    lastInverseResults = {
        savingsRate: requiredSavingsRate,
        capital: requiredCapital,
        spending: maximumSpending,
        retirementAge: earliestRetirementAge,
        sensitivities
    };
    renderProjectionResults();
}

function getScenarioValues() {
    return Object.fromEntries(SCENARIO_CONTROL_IDS.map(id => {
        const control = document.getElementById(id);
        return [id, control.type === 'checkbox' ? control.checked : control.value];
    }));
}

function loadScenarioFromUrl() {
    const values = parseScenarioSearch(window.location.search);
    if (Object.keys(values).length === 0) return false;

    Object.entries(values).forEach(([id, value]) => {
        const control = document.getElementById(id);
        if (control.type === 'checkbox') {
            control.checked = value;
        } else {
            control.value = value;
        }
    });
    return true;
}

function shareCurrentScenario() {
    calculate();
    const shareStatus = document.getElementById('shareStatus');
    if (!formIsValid) {
        shareStatus.textContent = translate('shareInvalid');
        shareStatus.hidden = false;
        return;
    }
    if (!window.confirm(translate('shareWarning'))) return;

    const shareUrl = buildShareUrl(window.location.href, getScenarioValues());
    const shareLink = document.getElementById('shareLink');
    shareLink.value = shareUrl;
    shareLink.hidden = false;
    shareStatus.textContent = translate('shareReady');
    shareStatus.hidden = false;
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(shareUrl).catch(() => {});
}

function savedScenarioKey(slot) {
    return `calculator.scenario.${slot}`;
}

function updateScenarioControls() {
    try {
        const hasScenarioA = Boolean(window.localStorage.getItem(savedScenarioKey('A')));
        const hasScenarioB = Boolean(window.localStorage.getItem(savedScenarioKey('B')));
        document.getElementById('compareScenariosButton').disabled = !(hasScenarioA && hasScenarioB);
    } catch {
        document.getElementById('compareScenariosButton').disabled = true;
    }
}

function clearSavedScenarios() {
    if (!window.confirm(translate('clearScenariosWarning'))) return false;
    try {
        window.localStorage.removeItem(savedScenarioKey('A'));
        window.localStorage.removeItem(savedScenarioKey('B'));
        document.getElementById('scenarioComparison').hidden = true;
        updateScenarioControls();
        const status = document.getElementById('scenarioStatus');
        status.textContent = translate('scenariosCleared');
        status.hidden = false;
        return true;
    } catch {
        const status = document.getElementById('scenarioStatus');
        status.textContent = translate('saveUnavailable');
        status.hidden = false;
        return false;
    }
}

function saveScenarioLocally(slot) {
    calculate();
    const status = document.getElementById('scenarioStatus');
    if (!formIsValid || !lastProjectionParams) {
        status.textContent = translate('fixBeforeSave');
        status.hidden = false;
        return;
    }
    try {
        window.localStorage.setItem(savedScenarioKey(slot), JSON.stringify(lastProjectionParams));
        status.textContent = translate('scenarioSaved', { slot });
        status.hidden = false;
        updateScenarioControls();
    } catch {
        status.textContent = translate('saveUnavailable');
        status.hidden = false;
    }
}

function describeScenarioOutcome(result) {
    const lastAge = result.data[result.data.length - 1].age;
    return result.depletionAge === null
        ? translate('survivesThrough', { age: lastAge })
        : translate('depletesAt', { age: result.depletionAge });
}

function compareSavedScenarios() {
    try {
        const paramsA = JSON.parse(window.localStorage.getItem(savedScenarioKey('A')));
        const paramsB = JSON.parse(window.localStorage.getItem(savedScenarioKey('B')));
        if (!paramsA || !paramsB) return;
        const results = compareScenarioProjections(paramsA, paramsB);
        document.getElementById('scenarioResultA').textContent = translate('scenarioOutcome', {
            outcome: describeScenarioOutcome(results.A),
            balance: formatCurrency(results.A.finalBalanceToday)
        });
        document.getElementById('scenarioResultB').textContent = translate('scenarioOutcome', {
            outcome: describeScenarioOutcome(results.B),
            balance: formatCurrency(results.B.finalBalanceToday)
        });
        document.getElementById('scenarioComparison').hidden = false;
    } catch {
        const status = document.getElementById('scenarioStatus');
        status.textContent = translate('saveUnavailable');
        status.hidden = false;
    }
}

function downloadCsv() {
    if (lastProjectionData.length === 0) return;
    const csv = buildCsv(lastProjectionData, useTodaysMoney);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    if (csvObjectUrl) URL.revokeObjectURL(csvObjectUrl);
    csvObjectUrl = URL.createObjectURL(blob);
    const link = document.getElementById('csvDownloadLink');
    link.href = csvObjectUrl;
    link.hidden = false;
    link.click();
    document.getElementById('csvExportStatus').textContent = translate('csvReady');
    document.getElementById('csvExportStatus').hidden = false;
}

function updateChart(data, inTodaysMoney = true) {
    const ctx = document.getElementById('retirementChart').getContext('2d');
    
    if (chart) {
        chart.destroy();
    }

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.age),
            datasets: [{
                label: translate(inTodaysMoney ? 'chartToday' : 'chartFuture'),
                data: data.map(d => inTodaysMoney ? d.balanceToday : d.balance),
                borderColor: '#1877F2',
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
                            return `${translate('chartBalance')}: ${formatCurrency(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCompactCurrency(value);
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                            text: translate('age')
                    }
                }
            }
        }
    });
}

if (typeof document !== 'undefined') {
    document.querySelectorAll('input:not([type="checkbox"]), #savingsMode').forEach(input => {
        input.addEventListener('input', scheduleCalculate);
        input.addEventListener('change', scheduleCalculate);
    });
    document.getElementById('localeSelector').addEventListener('change', updatePresentation);
    document.getElementById('currencySelector').addEventListener('change', updatePresentation);
    document.getElementById('todaysMoneyToggle').addEventListener('change', updatePresentation);
    document.querySelectorAll('input[type="checkbox"]:not(#todaysMoneyToggle)').forEach(input => {
        input.addEventListener('change', scheduleCalculate);
    });
    document.getElementById('stressTestButton').addEventListener('click', () => {
        if (!lastProjectionParams) return;
        const stress = calculateRetirementStressTest(lastProjectionParams);
        const outcome = result => result.depletionAge === null
            ? translate('survivesThrough', { age: result.data[result.data.length - 1].age })
            : translate('depletesAt', { age: result.depletionAge });
        const resultElement = document.getElementById('stressTestResult');
        resultElement.textContent = translate('stressResult', {
            baseline: outcome(stress.baseline),
            stressed: outcome(stress.stressed)
        });
        resultElement.hidden = false;
    });
    document.getElementById('shareScenarioButton').addEventListener('click', shareCurrentScenario);
    document.getElementById('saveScenarioAButton').addEventListener('click', () => saveScenarioLocally('A'));
    document.getElementById('saveScenarioBButton').addEventListener('click', () => saveScenarioLocally('B'));
    document.getElementById('compareScenariosButton').addEventListener('click', compareSavedScenarios);
    document.getElementById('clearScenariosButton').addEventListener('click', clearSavedScenarios);
    document.getElementById('downloadCsvButton').addEventListener('click', downloadCsv);
    document.getElementById('printReportButton').addEventListener('click', () => window.print());
    document.getElementById('runSimulationButton').addEventListener('click', event => {
        const button = event.currentTarget;
        const resultElement = document.getElementById('simulationResult');
        button.disabled = true;
        resultElement.textContent = translate('simulationRunning');
        resultElement.hidden = false;
        setTimeout(() => {
            try {
                lastMonteCarloResult = calculateMonteCarloSuccessProbability(lastProjectionParams, {
                    simulations: 2000,
                    volatility: lastProjectionParams.returnVolatility,
                    seed: 20261030
                });
                renderMonteCarloResult();
            } finally {
                button.disabled = false;
            }
        }, 0);
    });

    loadScenarioFromUrl();
    calculate();
    updateScenarioControls();
}

function resetValues() {
    clearTimeout(calculationTimer);
    calculationTimer = null;
    Object.entries(DEFAULT_VALUES).forEach(([id, value]) => {
        document.getElementById(id).value = value;
    });
    document.getElementById('otherIncomeIndexed').checked = true;
    document.getElementById('todaysMoneyToggle').checked = true;
    document.getElementById('shareLink').hidden = true;
    document.getElementById('shareStatus').hidden = true;
    calculate();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DEFAULT_VALUES,
        INPUT_RULES,
        SCENARIO_CONTROL_IDS,
        TRANSLATIONS,
        translate,
        parseLocalizedNumber,
        parseInputValue,
        buildShareUrl,
        parseScenarioSearch,
        buildCsv,
        calculate,
        resetValues,
        calculateRetirementData,
        calculateRequiredSavingsRate,
        calculateRequiredRetirementCapital,
        calculateMaximumSustainableSpending,
        calculateEarliestSustainableRetirementAge,
        calculatePlanSensitivities,
        calculateMonteCarloSuccessProbability,
        calculateRetirementStressTest,
        compareScenarioProjections,
        getScenarioValues,
        loadScenarioFromUrl,
        shareCurrentScenario,
        saveScenarioLocally,
        compareSavedScenarios,
        clearSavedScenarios,
        downloadCsv,
        getRetirementStatus,
        formatCurrency,
        formatCompactCurrency,
        renderTable,
        updateStatusDisplay
    };
}
