// BSW Calculate.js — all calculation logic

let _coefficients = null;

async function loadCoefficients() {
  if (_coefficients) return _coefficients;
  const res = await fetch('data/coefficients.json');
  _coefficients = await res.json();
  return _coefficients;
}

// Map form race label → coefficient race key
function getRaceCoeffKey(formRace) {
  const map = {
    'White': 'White',
    'White (Hispanic)': 'Hispanic/Latino',
    'Black': 'Black/African American',
    'Hispanic': 'Hispanic/Latino',
    'Asian': 'Asian',
    'Native American': 'American Indian/Alaska Native',
    'Two or more': 'Two or More Races',
    'Other': 'Other'
  };
  return map[formRace] || 'Other';
}

// Map form race + sex → annual income race_sex combined key
function getRaceSexIncomeKey(formRace, sex) {
  const racePrefix = {
    'White': 'White',
    'White (Hispanic)': 'Hispanic',
    'Black': 'Black',
    'Hispanic': 'Hispanic',
    'Asian': 'Asian',
    'Native American': 'AIAN',
    'Two or more': 'TwoOrMore',
    'Other': 'SomeOtherRace'
  };
  const prefix = racePrefix[formRace] || 'SomeOtherRace';
  if (sex === 'Male') return `${prefix}_Male`;
  if (sex === 'Female') return `${prefix}_Female`;
  return null;
}

// Map dollar amount → quintile key using SAT/IQ parent income brackets
function getParentIncomeQuintile(amount) {
  const n = parseFloat(amount) || 0;
  if (n <= 55667)  return 'Lowest Quintile';
  if (n <= 71991)  return '2nd Lowest Quintile';
  if (n <= 89465)  return 'Middle Quintile';
  if (n <= 117609) return '2nd Highest Quintile';
  return 'Highest Quintile';
}

// Map age (number) → age group key
function getAgeGroup(age) {
  if (age <= 24) return '15 to 24 years';
  if (age <= 34) return '25 to 34 years';
  if (age <= 44) return '35 to 44 years';
  if (age <= 54) return '45 to 54 years';
  if (age <= 64) return '55 to 64 years';
  return '65 years and older';
}

function getLifeExpectancyIncomeCoeff(income, percentiles) {
  let coeff = percentiles[0].value;
  for (const bracket of percentiles) {
    if (income >= bracket.threshold) coeff = bracket.value;
  }
  return coeff;
}

function getChildrenIncomeQuintile(income, quintiles) {
  for (const q of quintiles) {
    if (income >= q.min && income <= q.max) return q.value;
  }
  return quintiles[quintiles.length - 1].value;
}

// ── METRIC CALCULATORS ─────────────────────────────────────────────────────

function calculateAnnualIncome(userData, c) {
  const { sex, race, age, parentIncomeAmount, state } = userData;

  const quintile = getParentIncomeQuintile(parentIncomeAmount);
  const ageGroup = getAgeGroup(parseInt(age, 10));

  const raceSexKey = getRaceSexIncomeKey(race, sex);
  const raceSexCoeff    = raceSexKey ? (c.race_sex[raceSexKey] ?? 0) : 0;
  const parentCoeff     = c.parent_income_quintiles[quintile] ?? 0;
  const ageCoeff        = c.age_groups[ageGroup] ?? 0;
  const stateCoeff      = state ? (c.state[state] ?? 0) : 0;

  return Math.round(c.baseline + raceSexCoeff + parentCoeff + ageCoeff + stateCoeff);
}

function calculateSAT(userData, c) {
  const { sex, race, parentIncomeAmount, state } = userData;

  const raceKey  = getRaceCoeffKey(race);
  const quintile = getParentIncomeQuintile(parentIncomeAmount);

  const sexCoeff    = c.sex[sex] ?? 0;
  const raceCoeff   = c.race[raceKey] ?? 0;
  const parentCoeff = c.parent_income_quintiles[quintile] ?? 0;
  const stateCoeff  = state ? (c.state[state] ?? 0) : 0;

  const raw = c.baseline + sexCoeff + raceCoeff + parentCoeff + stateCoeff;
  return Math.round(raw / 10) * 10;
}

function calculateIQ(userData, c) {
  const { sex, race, parentIncomeAmount, state } = userData;

  const raceKey  = getRaceCoeffKey(race);
  const quintile = getParentIncomeQuintile(parentIncomeAmount);

  const sexCoeff    = c.sex[sex] ?? 0;
  const raceCoeff   = c.race[raceKey] ?? 0;
  const parentCoeff = c.parent_income_quintiles[quintile] ?? 0;
  const stateCoeff  = state ? (c.state[state] ?? 0) : 0;

  return Math.round(c.baseline + sexCoeff + raceCoeff + parentCoeff + stateCoeff);
}

function calculateCreditScore(userData, c) {
  const { sex, race, parentIncomeAmount, age, state } = userData;
  const raceKey  = getRaceCoeffKey(race);
  const quintile = getParentIncomeQuintile(parentIncomeAmount);
  const ageGroup = getAgeGroup(parseInt(age, 10));

  const sexCoeff    = c.sex[sex] ?? 0;
  const raceCoeff   = c.race[raceKey] ?? 0;
  const parentCoeff = c.parent_income_quintiles[quintile] ?? 0;
  const ageCoeff    = c.age_groups[ageGroup] ?? 0;
  const stateCoeff  = state ? (c.state[state] ?? 0) : 0;

  return Math.round(c.baseline + sexCoeff + raceCoeff + parentCoeff + ageCoeff + stateCoeff);
}

function calculateCrimeRisk(userData, c) {
  const { sex, race, parentIncomeAmount, age, state } = userData;
  const raceKey  = getRaceCoeffKey(race);
  const quintile = getParentIncomeQuintile(parentIncomeAmount);
  const ageGroup = getAgeGroup(parseInt(age, 10));

  const sexCoeff    = c.sex[sex] ?? 0;
  const raceCoeff   = c.race[raceKey] ?? 0;
  const parentCoeff = c.parent_income_quintiles[quintile] ?? 0;
  const ageCoeff    = c.age_groups[ageGroup] ?? 0;
  const stateCoeff  = state ? (c.state[state] ?? 0) : 0;

  let result = c.baseline + sexCoeff + raceCoeff + parentCoeff + ageCoeff + stateCoeff;
  result = Math.max(1, Math.min(100, result));
  return Math.round(result);
}

function calculateLifeExpectancy(userData, c, calculatedIncome) {
  const raceKey    = getRaceCoeffKey(userData.race);
  const sexCoeff   = c.sex[userData.sex] ?? 0;
  const raceCoeff  = c.race[raceKey] ?? 0;
  const stateCoeff = userData.state ? (c.state[userData.state] ?? 0) : 0;
  const incomeCoeff = getLifeExpectancyIncomeCoeff(calculatedIncome, c.income_percentiles);

  return Math.round(c.baseline + sexCoeff + raceCoeff + incomeCoeff + stateCoeff);
}

function calculateChildren(userData, c, calculatedIncome) {
  if (userData.sex === 'Male') return null;

  const raceKey    = getRaceCoeffKey(userData.race);
  const sexCoeff   = c.sex[userData.sex] ?? 0;
  const raceCoeff  = c.race[raceKey] ?? 0;
  const stateCoeff = userData.state ? (c.state[userData.state] ?? 0) : 0;
  const incomeCoeff = getChildrenIncomeQuintile(calculatedIncome, c.income_quintiles);

  return Math.round(c.baseline + sexCoeff + raceCoeff + incomeCoeff + stateCoeff);
}

function calculateProjectedIncome(userData, currentIncome, lifeExpectancy) {
  const age = parseInt(userData.age, 10) || 0;
  const remainingWorkingYears = Math.min(65, lifeExpectancy) - age;
  if (remainingWorkingYears <= 0) {
    return { projectedIncome: 0, raiseAdjustedIncome: 0, remainingWorkingYears: 0 };
  }
  const projectedIncome = Math.round(currentIncome * remainingWorkingYears);
  return { projectedIncome, raiseAdjustedIncome: projectedIncome, remainingWorkingYears };
}

function calculateTotalWorth(sat, income, iq, credit, crimeRisk, lifeExpectancy, children, userData, coeffs) {
  const childrenValue = children === null ? 0 : children;

  // Parent income normalized (0..1) by quintile
  const quintile = getParentIncomeQuintile(userData.parentIncomeAmount);
  const quintileMap = {
    'Lowest Quintile': 0,
    '2nd Lowest Quintile': 0.25,
    'Middle Quintile': 0.5,
    '2nd Highest Quintile': 0.75,
    'Highest Quintile': 1
  };
  const parentNorm = quintileMap[quintile] ?? 0;

  // Race normalized using the SAT race coefficients (range-based normalization)
  const raceKey = getRaceCoeffKey(userData.race);
  const raceVals = Object.values(coeffs.sat.race || {});
  const raceMin = Math.min(...raceVals);
  const raceMax = Math.max(...raceVals);
  const raceRaw = (coeffs.sat.race && coeffs.sat.race[raceKey]) ? coeffs.sat.race[raceKey] : 0;
  const raceNorm = raceMax > raceMin ? (raceRaw - raceMin) / (raceMax - raceMin) : 0.5;

  // Small multipliers derived from parent/race to amplify life/crime contributions
  const parentMultiplier = 0.85 + 0.3 * parentNorm; // ~0.85–1.15
  const raceMultiplier = 0.9 + 0.2 * raceNorm;      // ~0.9–1.1
  const combinedMultiplier = parentMultiplier * raceMultiplier;

  const baseScore =
    (sat / 1600 * 2) +
    (income / 300000 * 20) +
    (iq / 140 * 2) +
    (credit / 850 * 15);

  const crimeTerm = ((100 - crimeRisk) / 100 * 40) * combinedMultiplier;
  const lifeTerm  = (lifeExpectancy / 100 * 20) * combinedMultiplier;
  const childrenTerm = (childrenValue / 5 * 1);

  const result = baseScore + crimeTerm + lifeTerm + childrenTerm;
  return Math.round(result);
}

// ── MAIN ENTRY POINT ───────────────────────────────────────────────────────

async function runAllCalculations(userData) {
  const coeffs = await loadCoefficients();

  const income       = calculateAnnualIncome(userData, coeffs.annual_income);
  const sat          = calculateSAT(userData, coeffs.sat);
  const iq           = calculateIQ(userData, coeffs.iq);
  const credit       = calculateCreditScore(userData, coeffs.credit_score);
  const crimeRisk    = calculateCrimeRisk(userData, coeffs.crime_risk);
  const lifeExpectancy = calculateLifeExpectancy(userData, coeffs.life_expectancy, income);
  const children     = calculateChildren(userData, coeffs.children, income);
  const { projectedIncome, raiseAdjustedIncome, remainingWorkingYears } =
    calculateProjectedIncome(userData, income, lifeExpectancy);
  const totalWorth   = calculateTotalWorth(sat, income, iq, credit, crimeRisk, lifeExpectancy, children, userData, coeffs);

  return {
    income, sat, iq, credit, crimeRisk, lifeExpectancy,
    children, projectedIncome, raiseAdjustedIncome, remainingWorkingYears, totalWorth
  };
}
