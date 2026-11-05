/* Pure workbook scoring engine. Original Hock-adapted scoring; heuristic readiness is site-created. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MizanEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const TYPES = ['C', 'S', 'M', 'P'];
  const LETTERS = ['A', 'B', 'C', 'D'];
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);
  function pointsFor(question, answer) {
    if (!question || !answer || answer.skip) return null;
    const primary = answer.primary;
    const secondary = answer.secondary;
    if (!LETTERS.includes(primary)) return null;
    if (secondary && (!LETTERS.includes(secondary) || secondary === primary)) return null;
    const result = { C: 0, S: 0, M: 0, P: 0 };
    if (!secondary) result[question.key[primary]] = 1;
    else {
      const weight = answer.equal ? .5 : 2 / 3;
      result[question.key[primary]] += weight;
      result[question.key[secondary]] += 1 - weight;
    }
    return result;
  }
  function displayedPercents(raw) {
    // Largest-remainder allocation to 0.1%, so all four displayed figures sum to exactly 100.0.
    const floors = TYPES.map(t => Math.floor((raw[t] + 1e-9) * 10));
    let missing = 1000 - floors.reduce((a, b) => a + b, 0);
    const order = TYPES.map((t, i) => ({ i, fraction: raw[t] * 10 - floors[i] }))
      .sort((a, b) => b.fraction - a.fraction || a.i - b.i);
    for (let j = 0; j < missing; j++) floors[order[j % 4].i]++;
    return Object.fromEntries(TYPES.map((t, i) => [t, floors[i] / 10]));
  }
  function scoreTemperament(data, answers) {
    const pts = { C: 0, S: 0, M: 0, P: 0 };
    const byId = {};
    let answered = 0, visited = 0, secondCount = 0;
    data.questions.forEach(q => {
      const answer = (answers || {})[q.id];
      if (has(answers, q.id)) visited++;
      const v = pointsFor(q, answer);
      if (!v) return;
      answered++;
      if (answer.secondary) secondCount++;
      byId[q.id] = { ...v, primary: q.key[answer.primary] };
      TYPES.forEach(t => { pts[t] += v[t]; });
    });
    const raw = Object.fromEntries(TYPES.map(t => [t, answered ? pts[t] / answered * 100 : 0]));
    const display = answered ? displayedPercents(raw) : raw;
    const sorted = TYPES.slice().sort((a, b) => raw[b] - raw[a] || TYPES.indexOf(a) - TYPES.indexOf(b));
    const [top, second] = sorted;
    const delta = raw[top] - raw[second];
    const coLeading = answered > 0 && delta <= 3;
    const mixed = answered > 0 && raw[second] >= 20 && delta <= 10;
    let repeatDiff = 0, repeatCompared = 0;
    for (let i = 1; i <= 8; i++) {
      if (byId[i] && byId[i + 40]) {
        repeatCompared++;
        if (byId[i].primary !== byId[i + 40].primary) repeatDiff++;
      }
    }
    const last = data.questions.filter(q => byId[q.id]).slice(-8);
    const recentFit = last.length ? last.reduce((n, q) => n + byId[q.id][top], 0) / last.length : 0;
    const trend = answered >= 8 ? data.questions.filter(q => byId[q.id]).slice(-8)
      .reduce((totals, q) => { TYPES.forEach(t => totals[t] += byId[q.id][t]); return totals; }, {C:0,S:0,M:0,P:0}) : null;
    const trendLeader = trend ? TYPES.slice().sort((a,b) => trend[b]-trend[a])[0] : null;
    // An *interpretive readiness indicator*, NOT probability that a temperament is objectively true.
    // Revises downward when more recent answers challenge the leading result.
    let readiness = answered ? Math.round(12 + 26 * answered / 48 +
      42 * clamp(delta / 50, 0, 1) + 20 * recentFit -
      (repeatCompared ? 10 * repeatDiff / repeatCompared : 0) -
      (secondCount / answered > 0.72 ? 10 : 0)) : 0;
    readiness = clamp(readiness, 0, visited === 48 && answered >= 36 ? 100 : 97);
    if (answered < 24) readiness = Math.min(readiness, 79);
    if (visited === 48 && answered >= 36) readiness = 100; // FULL INSTRUMENT FINISHED; not validated true-type certainty.
    const earlyReady = answered >= 24 && visited < 48 && readiness >= 80 &&
      raw[top] >= 55 && delta >= 24 && recentFit >= .6 &&
      (secondCount / answered) < .72;
    return { points: pts, raw, display, sorted, top: answered ? top : null,
      second: answered ? second : null, answered, visited, delta, coLeading, mixed,
      readiness, earlyReady, recentFit, trendLeader, repeatDiff, repeatCompared,
      secondRate: answered ? secondCount / answered : 0,
      completion: 100 * visited / 48,
      adequacy: answered < 36 ? 'insufficient' : answered < 42 ? 'provisional' : 'adequate' };
  }
  function scoreBehaviors(data, answers) {
    const domains = [], byCode = {};
    Object.values(data.domains).forEach(domain => {
      const vals = domain.items.map(id => has(answers, id) ? answers[id] : null);
      const numeric = vals.filter(n => Number.isInteger(n) && n >= 0 && n <= 3);
      const active = numeric.some(n => n > 0);
      const status = active ? 'observed' : vals.length === 2 && vals.every(n => n === 0) ? 'not-observed' : 'unknown';
      const entry = { ...domain, values: vals, status,
        max: numeric.length ? Math.max(...numeric) : null,
        frequency: numeric.length ? 100 * numeric.reduce((a,b)=>a+b,0) / (3*numeric.length) : null };
      domains.push(entry); byCode[domain.code] = entry;
    });
    const observed = domains.filter(d => d.status === 'observed');
    const distress = observed.filter(d => d.kind === 'distress');
    const actionable = observed.filter(d => d.kind !== 'distress').sort((a,b) =>
      (a.kind === 'moral' ? 0 : 1) - (b.kind === 'moral' ? 0 : 1) ||
      b.max - a.max || b.frequency - a.frequency || a.code.localeCompare(b.code));
    const count = data.behaviors.filter(b => has(answers, b.id)).length;
    return { domains, byCode, observed, actionable, distress,
      excluded: domains.filter(d => d.status === 'not-observed'),
      unknown: domains.filter(d => d.status === 'unknown'),
      answered: count, completion: count / 44 * 100 };
  }
  function candidateRisks(data, temperament, behaviors) {
    const types = temperament.top ? [temperament.top] : [];
    if (temperament.mixed && temperament.second) types.push(temperament.second);
    const pool = [...new Set(types.flatMap(t => data.risks[t] || []))];
    return { possible: pool.map(c => behaviors.byCode[c]).filter(d => d && d.status === 'unknown'),
      ruledOut: pool.map(c => behaviors.byCode[c]).filter(d => d && d.status === 'not-observed'),
      reported: behaviors.observed };
  }
  function phaseForDay(data, day) {
    return data.schedule.find(p => day >= p.days[0] && day <= p.days[1]) || (day < 1 ? data.schedule[0] : data.schedule[3]);
  }
  return { TYPES, pointsFor, scoreTemperament, scoreBehaviors, candidateRisks, phaseForDay };
});
