// BSW Main.js — UI logic

// ── UTILITIES ─────────────────────────────────────────────────────────────

function generateCaseId() {
  return String(Math.floor(Math.random() * 900000 + 100000));
}

function getCaseId() {
  let id = sessionStorage.getItem('bsw_case_id');
  if (!id) {
    id = generateCaseId();
    sessionStorage.setItem('bsw_case_id', id);
  }
  return id;
}

function formatTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s} EST`;
}

function startClock(el) {
  if (!el) return;
  el.textContent = formatTime();
  setInterval(() => { el.textContent = formatTime(); }, 1000);
}

function formatCurrency(n) {
  if (n === null || n === undefined) return '–';
  return '$' + Math.round(n).toLocaleString('en-US');
}

function formatCurrencyShort(n) {
  if (n === null || n === undefined) return '–';
  const abs = Math.abs(n);
  if (abs >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
  if (abs >= 1000)    return '$' + Math.round(n / 1000) + 'K';
  return '$' + n;
}

function formatNumber(n) {
  if (n === null || n === undefined) return '–';
  return Math.round(n).toLocaleString('en-US');
}

// ── PAGE: index.html ───────────────────────────────────────────────────────

function initIndex() {
  const video = document.getElementById('intro-video');
  if (!video) return;
  video.addEventListener('ended', () => { window.location.href = 'intro.html'; });
  video.addEventListener('error', () => {
    setTimeout(() => { window.location.href = 'intro.html'; }, 2000);
  });
}

// ── PAGE: intro.html ───────────────────────────────────────────────────────

function initIntro() {
  startClock(document.getElementById('clock'));
  document.getElementById('case-id').textContent = 'CASE ID ' + getCaseId();

  const beginBtn = document.getElementById('begin-btn');
  const countdownEl = document.getElementById('countdown-overlay');

  function goToForm() {
    document.body.style.transition = 'opacity 0.55s ease';
    document.body.style.opacity = '0';
    setTimeout(() => { window.location.href = 'form.html'; }, 560);
  }
  beginBtn.addEventListener('click', goToForm);

  setTimeout(() => {
    countdownEl.style.display = 'flex';
    let count = 3;
    countdownEl.querySelector('.countdown-number').textContent = count;
    const interval = setInterval(() => {
      count--;
      if (count <= 0) { clearInterval(interval); window.location.href = 'form.html'; }
      else countdownEl.querySelector('.countdown-number').textContent = count;
    }, 1000);
  }, 120000);
}

// ── PAGE: form.html ────────────────────────────────────────────────────────

async function initForm() {
  // Fade in — opacity:0 is already set in CSS, so no flash
  setTimeout(() => {
    document.body.style.transition = 'opacity 0.55s ease';
    document.body.style.opacity = '1';
  }, 20);

  startClock(document.getElementById('clock'));
  document.getElementById('case-id').textContent = 'CASE ID ' + getCaseId();

  const form = document.getElementById('assessment-form');

  // ── AGE: digits only, max 3 chars ──
  const ageInput = form.querySelector('#age');
  if (ageInput) {
    ageInput.addEventListener('input', function() {
      const digits = this.value.replace(/[^0-9]/g, '').slice(0, 3);
      this.value = digits && parseInt(digits, 10) > 110 ? '110' : digits;
    });
  }

  // ── PARENTS' INCOME: support either free-text input or a select dropdown ──
  const incomeInput = form.querySelector('#parent-income');
  if (incomeInput) {
    const tag = incomeInput.tagName && incomeInput.tagName.toLowerCase();
    if (tag === 'input') {
      incomeInput.addEventListener('input', function() {
        const digits = this.value.replace(/[^0-9]/g, '');
        if (digits) {
          this.value = '$' + parseInt(digits, 10).toLocaleString('en-US');
        } else {
          this.value = '';
        }
      });
    } else if (tag === 'select') {
      // no live formatting needed for select; value stays as numeric "representative" amount
    }
  }

  // ── ZIP: digits only, max 5 chars ──
  const zipInput = form.querySelector('#zip');
  if (zipInput) {
    zipInput.addEventListener('input', function() {
      this.value = this.value.replace(/[^0-9]/g, '').slice(0, 5);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const sex              = form.querySelector('input[name="sex"]:checked')?.value || '';
    const race             = form.querySelector('input[name="race"]:checked')?.value || '';
    const age              = parseInt(form.querySelector('#age').value, 10);
    const parentIncomeRaw  = form.querySelector('#parent-income').value.trim();
    const zip              = form.querySelector('#zip').value.trim();

    if (!sex || !race || !age || !parentIncomeRaw || !zip) {
      showFormError('Please complete all fields.');
      return;
    }

    // strip non-numeric chars so user can type "$50,000" or "50000"
    const parentIncomeAmount = parseFloat(parentIncomeRaw.replace(/[^0-9.]/g, '')) || 0;

    // Resolve state from ZIP via Zippopotam.us
    let state = null;
    try {
      const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
      if (res.ok) {
        const data = await res.json();
        state = data.places?.[0]?.['state'] || null;
      }
    } catch (_) { state = null; }

    // Generate a fresh case ID for each new calculation
    const newId = generateCaseId();
    sessionStorage.setItem('bsw_case_id', newId);

    const userData = { sex, race, age, parentIncomeAmount, zip, state };
    localStorage.setItem('bsw_user_data', JSON.stringify(userData));
    window.location.href = 'loading.html';
  });
}

function showFormError(msg) {
  const el = document.getElementById('form-error');
  if (el) el.textContent = msg;
}

// ── PAGE: loading.html ─────────────────────────────────────────────────────

function initLoading() {
  const sub  = document.getElementById('loading-sub');
  const cnt3 = document.getElementById('cnt-3');
  const cnt2 = document.getElementById('cnt-2');
  const cnt1 = document.getElementById('cnt-1');
  const cnts = [cnt3, cnt2, cnt1];

  setTimeout(() => { if (sub) sub.classList.add('visible'); }, 200);

  function activate(i) {
    cnts.forEach(c => { if (c) c.classList.remove('active'); });
    if (i < cnts.length && cnts[i]) cnts[i].classList.add('active');
  }

  activate(0);
  setTimeout(() => activate(1), 1000);
  setTimeout(() => activate(2), 2000);
  setTimeout(() => {
    cnts.forEach(c => { if (c) c.classList.remove('active'); });
    setTimeout(() => { window.location.href = 'report.html'; }, 500);
  }, 3000);
}

// ── PAGE: report.html ──────────────────────────────────────────────────────

// Set a bar to pct% fill AND position the floating label above it.
// Label is clamped between 12–88% so it never overlaps the baked-in min/max labels.
function setRangeBar(barId, lblId, value, min, max, formatFn) {
  const bar = document.getElementById(barId);
  const lbl = document.getElementById(lblId);
  if (value === null) {
    if (bar) bar.style.width = '0%';
    if (lbl) { lbl.textContent = ''; lbl.style.left = '0%'; }
    return;
  }
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  if (bar) {
    if (value === 0) {
      bar.style.display = 'none';
    } else {
      bar.style.display = '';
      bar.style.width = pct.toFixed(1) + '%';
    }
  }
  if (lbl) {
    lbl.textContent = formatFn ? formatFn(value) : String(value);
    const clampedPct = Math.max(12, Math.min(88, pct));
    lbl.style.left = clampedPct.toFixed(1) + '%';
  }
}

function setEmoticon(worth) {
  const path = document.getElementById('emoticon-mouth');
  if (!path) return;
  if (worth >= 81) {
    // happy: 81–100
    path.setAttribute('d', 'M6.88 14.37 C7.41 15.37 8.79 17.35 11.13 17.35 C13.45 17.35 14.79 15.37 15.16 14.37');
  } else if (worth >= 51) {
    // neutral: 51–80
    path.setAttribute('d', 'M13.37 15.69 H8.54');
  } else {
    // sad: 0–50
    path.setAttribute('d', 'M6.83 16.56 C7.36 15.57 8.74 13.58 11.07 13.58 C13.41 13.58 14.75 15.57 15.11 16.56');
  }
}

async function initReport() {
  setTimeout(() => {
    document.body.style.transition = 'opacity 0.55s ease';
    document.body.style.opacity = '1';
  }, 20);

  startClock(document.getElementById('clock'));

  const raw = localStorage.getItem('bsw_user_data');
  if (!raw) {
    document.getElementById('report-content').innerHTML =
      '<p style="color:#76A9E8;padding:48px;">No assessment data found. Please complete the form first.</p>';
    return;
  }

  const userData = JSON.parse(raw);
  const results  = await runAllCalculations(userData);

  // Subject info
  document.getElementById('report-case-id').textContent = getCaseId();
  document.getElementById('report-race').textContent     = (userData.race || '—').toUpperCase();
  document.getElementById('report-age').textContent      = userData.age || '—';
  document.getElementById('report-sex').textContent      = (userData.sex || '—').toUpperCase();
  document.getElementById('report-zip').textContent      = userData.zip || '—';
  // No leading $ — the SVG template has "$" baked in; this value sits flush after it
  document.getElementById('report-parent-income').textContent =
    userData.parentIncomeAmount ? Math.round(userData.parentIncomeAmount).toLocaleString('en-US') : '—';

  // Worth score + emoticon — single unified string "62%"
  document.getElementById('val-worth').textContent = results.totalWorth + '%';
  setEmoticon(results.totalWorth);

  // Metric values (left column)
  document.getElementById('val-sat').textContent      = String(results.sat);
  document.getElementById('val-iq').textContent       = formatNumber(results.iq);
  document.getElementById('val-income').textContent   = formatCurrency(results.income);
  document.getElementById('val-credit').textContent   = formatNumber(results.credit);
  document.getElementById('val-crime').textContent    = results.crimeRisk;
  document.getElementById('val-life').textContent     = results.lifeExpectancy;
  document.getElementById('val-projected').textContent = formatCurrency(results.projectedIncome);
  document.getElementById('val-children').textContent  =
    results.children === null ? '–' : results.children;

  // Range bars (value, min, max, label formatter)
  setRangeBar('bar-sat',       'lbl-sat',       results.sat,            400,      1600,      v => String(v));
  setRangeBar('bar-iq',        'lbl-iq',        results.iq,             0,        140,       v => String(v));
  setRangeBar('bar-income',    'lbl-income',    results.income,         20000,    300000,    v => formatCurrencyShort(v));
  setRangeBar('bar-credit',    'lbl-credit',    results.credit,         0,        850,       v => String(v));
  setRangeBar('bar-crime',     'lbl-crime',     results.crimeRisk,      0,        100,       v => String(v));
  // Crime risk: shift label 6px left so it sits closer to the "0" baseline
  const lblCrime = document.getElementById('lbl-crime');
  if (lblCrime) {
    const curLeft = parseFloat(lblCrime.style.left);
    lblCrime.style.left = `calc(${curLeft.toFixed(1)}% - 6px)`;
  }
  setRangeBar('bar-life',      'lbl-life',      results.lifeExpectancy, 0,        100,       v => String(v));
  setRangeBar('bar-projected', 'lbl-projected', results.projectedIncome,500000,   30000000,  v => formatCurrencyShort(v));
  setRangeBar('bar-children',  'lbl-children',
    results.children === null ? null : results.children, 0, 5, v => String(v));

  // Receive Card button
  document.getElementById('receive-btn').addEventListener('click', receiveCard);
}

async function receiveCard() {
  const element = document.getElementById('report-card');
  const opt = {
    margin: 0,
    filename: 'BSW_Assessment_Card.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'in', format: [5.5, 8.5], orientation: 'portrait' }
  };
  await html2pdf().set(opt).from(element).save();
  setTimeout(() => { window.print(); }, 500);
}

// ── AUTO-INIT ──────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if      (page === 'index')   initIndex();
  else if (page === 'intro')   initIntro();
  else if (page === 'form')    initForm();
  else if (page === 'loading') initLoading();
  else if (page === 'report')  initReport();

  // Logo click → intro.html on all pages that have a header logo
  // (not intro itself — you're already there)
  if (page !== 'intro' && page !== 'index' && page !== 'loading') {
    // form.html uses .logo-img img, report.html uses .sc-brand div
    const logoImg = document.querySelector('.logo-img');
    const brand   = document.querySelector('.sc-brand, .bsw-header .brand');
    const target  = logoImg || brand;
    if (target) {
      target.style.cursor = 'pointer';
      target.addEventListener('click', () => { window.location.href = 'intro.html'; });
    }
  }
});
