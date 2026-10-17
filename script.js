/* ==========================================================
   LoanWise AI — frontend logic
   Talks to the FastAPI service:  POST {API_BASE}/predict
   Request fields and limits mirror the Pydantic LoanRequest model.
   Response used: { prediction, approved_probability, status }
   ========================================================== */
(() => {
  'use strict';

  /* ---------- Configuration (edit in index.html <meta> tags) ---------- */
  const meta = (name, fallback) => document.querySelector(`meta[name="${name}"]`)?.content?.trim() || fallback;
  const API_BASE = meta('api-base-url', 'http://127.0.0.1:8000').replace(/\/+$/, '');
  const PRODUCT_NAME = meta('product-name', 'LoanWise AI');
  const REQUEST_TIMEOUT_MS = 20000;
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Icons (Lucide-style, inlined: no network dependency) ---------- */
  const ICONS = {
    'shield-check': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    'menu': '<path d="M4 12h16M4 6h16M4 18h16"/>',
    'x': '<path d="M18 6 6 18M6 6l12 12"/>',
    'user': '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    'wallet': '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
    'home': '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    'clipboard-check': '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
    'circle-check': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    'circle-x': '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>',
    'arrow-right': '<path d="M5 12h14M12 5l7 7-7 7"/>',
    'arrow-left': '<path d="m12 19-7-7 7-7M19 12H5"/>',
    'rotate-ccw': '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    'sparkles': '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
    'cpu': '<rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2"/>',
    'chart': '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
    'lock': '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    'info': '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    'alert': '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
    'pencil': '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
    'activity': '<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>',
    'check': '<path d="M20 6 9 17l-5-5"/>'
  };

  function hydrateIcons(root = document) {
    root.querySelectorAll('i[data-icon]').forEach((el) => {
      const path = ICONS[el.dataset.icon];
      if (!path || el.firstChild) return;
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
    });
  }

  /* ---------- Schema (mirrors the Pydantic LoanRequest exactly) ---------- */
  const FIELDS = [
    { name: 'no_of_dependents', label: 'Number of dependents', hint: 'People who depend financially on the applicant (0 to 20).',
      kind: 'int', min: 0, max: 20, placeholder: 'e.g. 2', example: 2, group: 'applicant' },
    { name: 'education', label: 'Education', hint: 'The applicant\u2019s education status.',
      kind: 'select', options: ['Graduate', 'Not Graduate'], example: 'Graduate', group: 'applicant' },
    { name: 'self_employed', label: 'Self-employed', hint: 'Whether the applicant is self-employed.',
      kind: 'select', options: ['Yes', 'No'], example: 'No', group: 'applicant' },

    { name: 'income_annum', label: 'Annual income', hint: 'Total income per year, before the loan.',
      kind: 'money', min: 0, exclusiveMin: true, placeholder: 'e.g. 9600000', example: 9600000, group: 'finance' },
    { name: 'cibil_score', label: 'CIBIL score', hint: 'Credit score between 300 and 900.',
      kind: 'int', min: 300, max: 900, placeholder: 'e.g. 778', example: 778, group: 'finance', slider: true },
    { name: 'loan_amount', label: 'Loan amount', hint: 'The amount being requested.',
      kind: 'money', min: 0, exclusiveMin: true, placeholder: 'e.g. 29900000', example: 29900000, group: 'finance' },
    { name: 'loan_term', label: 'Loan term', hint: 'Repayment period in years (1 to 40).',
      kind: 'int', min: 1, max: 40, suffix: 'years', placeholder: 'e.g. 12', example: 12, group: 'finance' },

    { name: 'residential_assets_value', label: 'Residential assets value', hint: 'Value of homes and residential property. Enter 0 if none.',
      kind: 'money', min: 0, placeholder: 'e.g. 2400000', example: 2400000, group: 'assets' },
    { name: 'commercial_assets_value', label: 'Commercial assets value', hint: 'Value of commercial property. Enter 0 if none.',
      kind: 'money', min: 0, placeholder: 'e.g. 17600000', example: 17600000, group: 'assets' },
    { name: 'luxury_assets_value', label: 'Luxury assets value', hint: 'Value of luxury items such as vehicles or jewellery. Enter 0 if none.',
      kind: 'money', min: 0, placeholder: 'e.g. 22700000', example: 22700000, group: 'assets' },
    { name: 'bank_asset_value', label: 'Bank asset value', hint: 'Balances in bank accounts and deposits. Enter 0 if none.',
      kind: 'money', min: 0, placeholder: 'e.g. 8000000', example: 8000000, group: 'assets' }
  ];
  const FIELD_BY_NAME = Object.fromEntries(FIELDS.map((f) => [f.name, f]));

  const STEPS = [
    { id: 'applicant', label: 'Applicant', icon: 'user', title: 'Applicant information', desc: 'A few details about the applicant.' },
    { id: 'finance', label: 'Finances', icon: 'wallet', title: 'Income, credit and loan', desc: 'Income, credit score and the loan being requested.' },
    { id: 'assets', label: 'Assets', icon: 'home', title: 'Asset values', desc: 'Approximate value of the applicant\u2019s assets. Use 0 where there is none.' },
    { id: 'review', label: 'Review', icon: 'clipboard-check', title: 'Review application', desc: 'Check everything, then ask the model for a prediction.' }
  ];
  const REVIEW = STEPS.length - 1;

  /* ---------- State ---------- */
  const values = Object.fromEntries(FIELDS.map((f) => [f.name, '']));
  const touched = new Set();
  const errors = {};
  let currentStep = 0;
  let busy = false;
  let submittedSnapshot = null;

  /* ---------- DOM ---------- */
  const $ = (id) => document.getElementById(id);
  const form = $('loanForm'), panelsEl = $('stepPanels'), stepperEl = $('stepper');
  const backBtn = $('backBtn'), nextBtn = $('nextBtn'), submitBtn = $('submitBtn');
  const resetBtn = $('resetBtn'), exampleBtn = $('exampleBtn');
  const formCard = $('formCard'), formView = $('formView'), resultsView = $('resultsView');
  const formError = $('formError'), liveRegion = $('liveRegion');

  /* ---------- Formatting helpers ---------- */
  const rupees = (n) => '\u20B9' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const trim2 = (x) => String(Math.round(x * 100) / 100);
  function inrWords(n) {
    if (n >= 1e7) return `\u20B9${trim2(n / 1e7)} Crore`;
    if (n >= 1e5) return `\u20B9${trim2(n / 1e5)} Lakh`;
    return rupees(n);
  }
  function display(f, v) {
    if (v === '' || v == null) return '';
    if (f.kind === 'money') return rupees(v);
    if (f.name === 'loan_term') return `${v} ${Number(v) === 1 ? 'year' : 'years'}`;
    return String(v);
  }
  const announce = (msg) => { liveRegion.textContent = ''; setTimeout(() => { liveRegion.textContent = msg; }, 30); };
  const scrollTo = (el) => el.scrollIntoView({ behavior: REDUCED_MOTION ? 'auto' : 'smooth', block: 'start' });

  /* ---------- Validation (same limits as the backend) ---------- */
  function validate(f, raw) {
    const v = String(raw ?? '').trim();
    if (v === '') return 'This field is required.';
    if (f.kind === 'select') return f.options.includes(v) ? '' : 'Choose one of the listed options.';
    const n = Number(v);
    if (!Number.isFinite(n)) return 'Enter a valid number.';
    if (f.kind === 'int' && !Number.isInteger(n)) return 'Enter a whole number.';
    if (f.exclusiveMin && n <= f.min) return `Enter a value greater than ${f.min}.`;
    if (!f.exclusiveMin && f.min !== undefined && n < f.min) return `Enter a value of at least ${f.min}.`;
    if (f.max !== undefined && n > f.max) return `Enter a value of at most ${f.max}.`;
    return '';
  }
  const isValid = (f) => validate(f, values[f.name]) === '';
  const fieldsOf = (stepId) => FIELDS.filter((f) => f.group === stepId);
  const stepValid = (i) => i >= REVIEW || fieldsOf(STEPS[i].id).every(isValid);
  const canEnter = (i) => STEPS.slice(0, i).every((_, j) => stepValid(j));

  function setFieldError(name, msg) {
    const wrap = $(`field-${name}`);
    if (!wrap) return;
    const input = $(name);
    errors[name] = msg;
    $(`${name}-error`).textContent = msg;
    wrap.classList.toggle('invalid', !!msg);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  function checkField(name) {
    setFieldError(name, validate(FIELD_BY_NAME[name], values[name]));
  }
  function checkStep(i) {
    let first = null;
    fieldsOf(STEPS[i].id).forEach((f) => {
      touched.add(f.name);
      checkField(f.name);
      if (!first && errors[f.name]) first = f.name;
    });
    return first;
  }

  /* ---------- Build the form from the schema ---------- */
  function buildField(f) {
    const wrap = document.createElement('div');
    wrap.className = 'field' + (f.slider ? ' span-2' : '');
    wrap.id = `field-${f.name}`;

    const label = document.createElement('label');
    label.htmlFor = f.name;
    label.innerHTML = `${f.label}<span class="req" aria-hidden="true">*</span>`;
    wrap.appendChild(label);

    const control = document.createElement('div');
    control.className = 'control' + (f.kind === 'money' ? ' has-prefix' : '') + (f.suffix ? ' has-suffix' : '');
    let input;
    if (f.kind === 'select') {
      input = document.createElement('select');
      input.innerHTML = '<option value="">Select an option</option>' + f.options.map((o) => `<option value="${o}">${o}</option>`).join('');
    } else {
      input = document.createElement('input');
      input.type = 'number';
      input.inputMode = f.kind === 'int' ? 'numeric' : 'decimal';
      input.step = f.kind === 'int' ? '1' : 'any';
      if (f.min !== undefined) input.min = f.min;
      if (f.max !== undefined) input.max = f.max;
      input.placeholder = f.placeholder || '';
      input.autocomplete = 'off';
    }
    input.id = f.name;
    input.name = f.name;
    input.required = true;
    input.setAttribute('aria-describedby', `${f.name}-hint ${f.name}-error`);
    control.appendChild(input);
    if (f.kind === 'money') control.insertAdjacentHTML('afterbegin', '<span class="adorn pre" aria-hidden="true">\u20B9</span>');
    if (f.suffix) control.insertAdjacentHTML('beforeend', `<span class="adorn suf" aria-hidden="true">${f.suffix}</span>`);
    wrap.appendChild(control);

    if (f.slider) {
      wrap.insertAdjacentHTML('beforeend', `
        <div class="slider">
          <input type="range" id="${f.name}-range" min="${f.min}" max="${f.max}" step="1" value="${f.min}" aria-label="${f.label} slider" tabindex="-1">
          <div class="slider-scale" aria-hidden="true"><span>${f.min}</span><span>${f.max}</span></div>
        </div>`);
    }

    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.id = `${f.name}-hint`;
    hint.innerHTML = `<span>${f.hint}</span> <span class="human" id="${f.name}-human"></span>`;
    wrap.appendChild(hint);

    const err = document.createElement('p');
    err.className = 'error';
    err.id = `${f.name}-error`;
    wrap.appendChild(err);
    return wrap;
  }

  function buildPanels() {
    STEPS.forEach((s, i) => {
      const panel = document.createElement('section');
      panel.className = 'step-panel';
      panel.id = `step-${s.id}`;
      panel.hidden = true;
      panel.setAttribute('aria-labelledby', `step-title-${s.id}`);
      panel.innerHTML = `<h3 class="step-title" id="step-title-${s.id}">${s.title}</h3><p class="step-desc">${s.desc}</p>`;
      if (i < REVIEW) {
        const grid = document.createElement('div');
        grid.className = 'fields';
        fieldsOf(s.id).forEach((f) => grid.appendChild(buildField(f)));
        panel.appendChild(grid);
      } else {
        const holder = document.createElement('div');
        holder.id = 'reviewHolder';
        panel.appendChild(holder);
      }
      panelsEl.appendChild(panel);
    });
  }

  function buildStepper() {
    stepperEl.innerHTML = '';
    STEPS.forEach((s, i) => {
      const li = document.createElement('li');
      li.innerHTML = `<button type="button" class="step-btn" data-step="${i}">
        <span class="step-meta"><span class="step-ico"></span><span class="step-label">${s.label}</span></span></button>`;
      stepperEl.appendChild(li);
    });
    stepperEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.step-btn');
      if (!btn || busy) return;
      const target = Number(btn.dataset.step);
      if (target > currentStep && !canEnter(target)) return;
      goToStep(target);
    });
  }

  function updateStepper() {
    stepperEl.querySelectorAll('.step-btn').forEach((btn, i) => {
      const done = i < currentStep && stepValid(i);
      btn.classList.toggle('done', done);
      if (i === currentStep) btn.setAttribute('aria-current', 'step'); else btn.removeAttribute('aria-current');
      btn.disabled = busy || (i > currentStep && !canEnter(i));
      const ico = btn.querySelector('.step-ico');
      if (done) ico.innerHTML = `<i data-icon="check"></i>`; else ico.textContent = String(i + 1);
      btn.setAttribute('aria-label', `Step ${i + 1}: ${STEPS[i].label}${done ? ', completed' : ''}`);
    });
    hydrateIcons(stepperEl);
  }

  /* ---------- Wizard navigation ---------- */
  function goToStep(i, { focus = true } = {}) {
    currentStep = i;
    STEPS.forEach((s, idx) => { $(`step-${s.id}`).hidden = idx !== i; });
    if (i === REVIEW) renderReview();
    backBtn.hidden = i === 0;
    nextBtn.hidden = i === REVIEW;
    submitBtn.hidden = i !== REVIEW;
    if (i < REVIEW - 1) nextBtn.innerHTML = 'Continue <i data-icon="arrow-right"></i>';
    else nextBtn.innerHTML = 'Review Application <i data-icon="arrow-right"></i>';
    hydrateIcons(form);
    updateStepper();
    hideBanner();
    if (focus) {
      const first = i < REVIEW ? panelsEl.querySelector(`#step-${STEPS[i].id} input, #step-${STEPS[i].id} select`) : submitBtn;
      first?.focus({ preventScroll: true });
    }
  }

  function focusFirstInvalid(name) {
    const el = $(name);
    if (!el) return;
    el.focus();
    el.scrollIntoView({ behavior: REDUCED_MOTION ? 'auto' : 'smooth', block: 'center' });
  }

  function goNext() {
    const firstBad = checkStep(currentStep);
    updateAll();
    if (firstBad) { focusFirstInvalid(firstBad); return; }
    goToStep(currentStep + 1);
  }

  function renderReview() {
    const holder = $('reviewHolder');
    holder.innerHTML = '';
    STEPS.slice(0, REVIEW).forEach((s, i) => {
      const group = document.createElement('div');
      group.className = 'review-group';
      group.innerHTML = `<div class="review-head"><h4>${s.title}</h4>
        <button type="button" class="edit-link" data-edit="${i}"><i data-icon="pencil"></i> Edit</button></div>`;
      const dl = document.createElement('dl');
      dl.className = 'kv';
      fieldsOf(s.id).forEach((f) => {
        const row = document.createElement('div');
        const dt = document.createElement('dt'); dt.textContent = f.label;
        const dd = document.createElement('dd'); dd.textContent = display(f, values[f.name]) || '\u2014';
        row.append(dt, dd);
        dl.appendChild(row);
      });
      group.appendChild(dl);
      holder.appendChild(group);
    });
    hydrateIcons(holder);
  }

  /* ---------- Live updates ---------- */
  function updateHuman(f) {
    const el = $(`${f.name}-human`);
    if (!el || f.kind !== 'money') return;
    const n = Number(values[f.name]);
    el.textContent = values[f.name] !== '' && Number.isFinite(n) && n >= 0 ? `= ${inrWords(n)}` : '';
  }

  const PROGRESS_C = 2 * Math.PI * 34;
  function updateSide() {
    const done = FIELDS.filter(isValid).length;
    const ringEl = $('progressRing'), val = $('progressValue');
    val.style.strokeDasharray = PROGRESS_C;
    val.style.strokeDashoffset = PROGRESS_C * (1 - done / FIELDS.length);
    $('progressNum').textContent = `${done}/${FIELDS.length}`;
    ringEl.classList.toggle('complete', done === FIELDS.length);
    ringEl.setAttribute('aria-label', `${done} of ${FIELDS.length} fields completed`);
    $('progressText').textContent = done === FIELDS.length
      ? 'Everything is filled in and valid. Review and predict.'
      : `${FIELDS.length - done} ${FIELDS.length - done === 1 ? 'field' : 'fields'} left to complete.`;

    const list = $('liveList');
    list.innerHTML = '';
    FIELDS.forEach((f) => {
      const row = document.createElement('div');
      const dt = document.createElement('dt'); dt.textContent = f.label;
      const dd = document.createElement('dd');
      const shown = isValid(f) ? display(f, values[f.name]) : '';
      dd.textContent = shown || 'Not set';
      if (!shown) dd.className = 'empty';
      row.append(dt, dd);
      list.appendChild(row);
    });

    const inc = Number(values.income_annum), loan = Number(values.loan_amount);
    const ok = isValid(FIELD_BY_NAME.income_annum) && isValid(FIELD_BY_NAME.loan_amount);
    $('ratioBlock').hidden = !ok;
    if (ok) {
      const r = loan / inc;
      $('ratioNum').textContent = `${r.toFixed(2)}\u00D7 annual income`;
      $('ratioFill').style.width = `${Math.min(r, 10) / 10 * 100}%`;
    }
  }

  function updateAll() {
    FIELDS.forEach(updateHuman);
    updateSide();
    updateStepper();
  }

  function syncSlider() {
    const range = $('cibil_score-range');
    const f = FIELD_BY_NAME.cibil_score;
    const n = Number(values.cibil_score);
    const valid = isValid(f);
    range.value = valid ? n : f.min;
    range.style.setProperty('--fill', valid ? `${((n - f.min) / (f.max - f.min)) * 100}%` : '0%');
  }

  function onFieldInput(e) {
    const t = e.target;
    if (t.id === 'cibil_score-range') {
      values.cibil_score = t.value;
      $('cibil_score').value = t.value;
      touched.add('cibil_score');
      checkField('cibil_score');
      syncSlider(); updateAll();
      return;
    }
    const f = FIELD_BY_NAME[t.name];
    if (!f) return;
    values[f.name] = t.value;
    if (touched.has(f.name) || errors[f.name]) checkField(f.name);
    if (f.name === 'cibil_score') syncSlider();
    updateAll();
  }

  /* ---------- Reset / example ---------- */
  function applyValuesToInputs() {
    FIELDS.forEach((f) => { $(f.name).value = values[f.name]; });
    syncSlider();
  }
  function resetAll() {
    FIELDS.forEach((f) => { values[f.name] = ''; setFieldError(f.name, ''); });
    touched.clear();
    applyValuesToInputs();
    submittedSnapshot = null;
    hideBanner();
    updateAll();
    goToStep(0, { focus: false });
  }
  function fillExample() {
    FIELDS.forEach((f) => { values[f.name] = String(f.example); setFieldError(f.name, ''); });
    applyValuesToInputs();
    hideBanner();
    updateAll();
    if (currentStep === REVIEW) renderReview();
    announce('Example values filled in. Review them before predicting.');
  }

  /* ---------- Error banner ---------- */
  function hideBanner() { formError.hidden = true; formError.textContent = ''; }
  function showBanner(title, message, items = []) {
    formError.textContent = '';
    const strong = document.createElement('strong'); strong.textContent = title;
    const p = document.createElement('span'); p.textContent = message;
    formError.append(strong, p);
    if (items.length) {
      const ul = document.createElement('ul');
      items.forEach((t) => { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
      formError.appendChild(ul);
    }
    formError.hidden = false;
  }

  /* ---------- API ---------- */
  class ApiError extends Error {
    constructor(kind, details = {}) { super(kind); this.kind = kind; Object.assign(this, details); }
  }

  function buildPayload() {
    const payload = {};
    FIELDS.forEach((f) => {
      const v = String(values[f.name]).trim();
      payload[f.name] = f.kind === 'select' ? v : Number(v);
    });
    return payload;
  }

  async function requestPrediction(payload) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    let res, text;
    try {
      res = await fetch(`${API_BASE}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: ctrl.signal
      });
      text = await res.text();
    } catch (err) {
      throw new ApiError(err && err.name === 'AbortError' ? 'timeout' : 'network');
    } finally {
      clearTimeout(timer);
    }
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch (_) { /* non-JSON body */ }
    if (!res.ok) throw new ApiError('http', { status: res.status, body });
    if (!body || typeof body !== 'object') throw new ApiError('bad-response');
    return body;
  }

  function normaliseResult(body) {
    const pick = [body.status, body.prediction].find((s) => s === 'Approved' || s === 'Rejected');
    if (!pick) throw new ApiError('bad-response');
    const p = body.approved_probability;
    const probability = typeof p === 'number' && p >= 0 && p <= 1 ? p : null;
    return { status: pick, probability };
  }

  function handleApiError(err) {
    if (!(err instanceof ApiError)) { console.error(err); err = new ApiError('unknown'); }
    switch (err.kind) {
      case 'network':
        setPill('offline');
        showBanner('Can\u2019t reach the prediction service', `Check that the FastAPI server is running at ${API_BASE}, then try again. Your entries are still here.`);
        break;
      case 'timeout':
        showBanner('The request timed out', 'The prediction service took too long to answer. Try again in a moment. Your entries are still here.');
        break;
      case 'bad-response':
        showBanner('Unexpected response', 'The service replied, but not in the format this page expects. Check the API response and try again.');
        break;
      case 'http':
        handleHttpError(err);
        break;
      default:
        showBanner('Something went wrong', 'We couldn\u2019t process your assessment right now. Please try again.');
    }
    formError.scrollIntoView({ behavior: REDUCED_MOTION ? 'auto' : 'smooth', block: 'nearest' });
  }

  function handleHttpError(err) {
    const detail = err.body && err.body.detail;
    if (err.status === 422 && Array.isArray(detail)) {
      const lines = [];
      let firstField = null;
      detail.forEach((d) => {
        const name = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : null;
        const msg = typeof d.msg === 'string' ? d.msg : 'Invalid value.';
        const f = FIELD_BY_NAME[name];
        if (f) {
          touched.add(name);
          setFieldError(name, msg);
          lines.push(`${f.label}: ${msg}`);
          if (!firstField) firstField = name;
        } else {
          lines.push(msg);
        }
      });
      showBanner('Some values were rejected', 'The service could not accept these entries. Fix them and try again.', lines);
      if (firstField) {
        goToStep(STEPS.findIndex((s) => s.id === FIELD_BY_NAME[firstField].group), { focus: false });
        showBanner('Some values were rejected', 'The service could not accept these entries. Fix them and try again.', lines);
        focusFirstInvalid(firstField);
      }
      return;
    }
    if (err.status === 400 && typeof detail === 'string' && detail.length < 200) {
      showBanner('The request was not accepted', detail);
      return;
    }
    showBanner('We couldn\u2019t process your assessment right now', 'Please try again. If the problem continues, check the backend logs.');
  }

  /* ---------- Submit ---------- */
  function setBusy(on) {
    busy = on;
    submitBtn.disabled = on;
    submitBtn.classList.toggle('busy', on);
    formCard.classList.toggle('loading', on);
    formCard.setAttribute('aria-busy', String(on));
    [backBtn, resetBtn, exampleBtn].forEach((b) => { b.disabled = on; });
    updateStepper();
    if (on) announce('Analyzing application...');
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (busy) return;
    if (currentStep < REVIEW) { goNext(); return; }

    for (let i = 0; i < REVIEW; i++) {
      const bad = checkStep(i);
      if (bad) {
        updateAll();
        goToStep(i, { focus: false });
        showBanner('Complete the highlighted fields', 'Some entries are missing or out of range.');
        focusFirstInvalid(bad);
        return;
      }
    }

    hideBanner();
    setBusy(true);
    const payload = buildPayload();
    try {
      const body = await requestPrediction(payload);
      const result = normaliseResult(body);
      setPill('online');
      submittedSnapshot = { ...payload };
      showResult(result);
    } catch (err) {
      handleApiError(err);
    } finally {
      setBusy(false);
    }
  }

  /* ---------- Results ---------- */
  function countUp(el, to, ms, fmt) {
    if (REDUCED_MOTION) { el.textContent = fmt(to); return; }
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / ms, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = fmt(to * eased);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function showResult({ status, probability }) {
    const approved = status === 'Approved';
    const result = $('result');
    result.classList.toggle('rejected', !approved);

    $('resultIcon').innerHTML = `<i data-icon="${approved ? 'circle-check' : 'circle-x'}"></i>`;
    const title = $('resultTitle');
    title.textContent = 'Predicted: ';
    const span = document.createElement('span'); span.textContent = status;
    title.appendChild(span);
    $('resultText').textContent = approved
      ? 'Based on the details you submitted, the model predicts this application would be approved.'
      : 'Based on the details you submitted, the model predicts this application would be rejected.';

    const block = $('probBlock');
    if (probability === null) {
      block.hidden = true;
    } else {
      block.hidden = false;
      const C = 2 * Math.PI * 52;
      const ringValue = $('ringValue');
      ringValue.style.stroke = 'var(--accent-2)';
      ringValue.style.strokeDasharray = C;
      ringValue.style.strokeDashoffset = C;
      const pct = probability * 100;
      $('ring').setAttribute('aria-label', `Model-estimated approval probability: ${pct.toFixed(1)} percent`);
      requestAnimationFrame(() => requestAnimationFrame(() => { ringValue.style.strokeDashoffset = C * (1 - probability); }));
      countUp($('ringNum'), pct, 1300, (v) => `${v.toFixed(1)}%`);
    }

    const dl = $('resultSummary');
    dl.innerHTML = '';
    FIELDS.forEach((f) => {
      const wrap = document.createElement('div');
      const dt = document.createElement('dt'); dt.textContent = f.label;
      const dd = document.createElement('dd'); dd.textContent = display(f, submittedSnapshot[f.name]);
      wrap.append(dt, dd);
      dl.appendChild(wrap);
    });

    hydrateIcons(resultsView);
    formView.hidden = true;
    resultsView.hidden = false;
    scrollTo(formCard);
    result.focus({ preventScroll: true });
    announce(probability === null
      ? `Prediction ready: ${status}.`
      : `Prediction ready: ${status}. Model-estimated approval probability ${(probability * 100).toFixed(1)} percent.`);
  }

  function backToForm(step) {
    resultsView.hidden = true;
    formView.hidden = false;
    goToStep(step, { focus: true });
    scrollTo(formCard);
  }

  /* ---------- API status pill ---------- */
  const pill = $('apiPill'), pillText = $('apiPillText');
  function setPill(state) {
    pill.dataset.state = state;
    pillText.textContent = { online: 'API online', offline: 'API offline', checking: 'Checking API' }[state];
    pill.title = state === 'offline' ? `Can\u2019t reach ${API_BASE}. Click to retry.` : `Prediction API: ${API_BASE}`;
  }
  async function checkApi() {
    setPill('checking');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    try {
      const res = await fetch(`${API_BASE}/`, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
      setPill(res.ok ? 'online' : 'offline');
    } catch (_) {
      setPill('offline');
    } finally {
      clearTimeout(timer);
    }
  }

  /* ---------- Page chrome: nav, hero parallax, scroll spy ---------- */
  function initNav() {
    const toggle = $('navToggle'), links = $('navLinks');
    const setOpen = (open) => {
      links.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      toggle.innerHTML = `<i data-icon="${open ? 'x' : 'menu'}"></i>`;
      hydrateIcons(toggle);
    };
    toggle.addEventListener('click', () => setOpen(!links.classList.contains('open')));
    links.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && links.classList.contains('open')) { setOpen(false); toggle.focus(); } });
    window.matchMedia('(min-width: 821px)').addEventListener('change', () => setOpen(false));

    if ('IntersectionObserver' in window) {
      const map = new Map();
      links.querySelectorAll('a[href^="#"]').forEach((a) => map.set(a.getAttribute('href').slice(1), a));
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          map.forEach((a) => a.classList.remove('active'));
          map.get(en.target.id)?.classList.add('active');
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      map.forEach((_, id) => { const s = $(id); if (s) io.observe(s); });
    }
  }

  function initParallax() {
    const art = $('heroArt');
    const layers = art.querySelectorAll('.art-layer');
    layers.forEach((l) => l.style.setProperty('--d', l.dataset.depth || 0));
    if (REDUCED_MOTION || !window.matchMedia('(hover: hover)').matches) return;
    art.addEventListener('pointermove', (e) => {
      const r = art.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width - .5) * 2;
      const py = ((e.clientY - r.top) / r.height - .5) * 2;
      layers.forEach((l) => { l.style.setProperty('--px', px.toFixed(3)); l.style.setProperty('--py', py.toFixed(3)); });
    });
    art.addEventListener('pointerleave', () => layers.forEach((l) => { l.style.setProperty('--px', 0); l.style.setProperty('--py', 0); }));
  }

  /* ---------- Init ---------- */
  function init() {
    document.querySelectorAll('[data-product]').forEach((el) => { el.textContent = PRODUCT_NAME; });
    document.title = `${PRODUCT_NAME} | Loan Approval Prediction`;

    buildStepper();
    buildPanels();
    hydrateIcons();

    form.addEventListener('input', onFieldInput);
    form.addEventListener('change', onFieldInput);
    form.addEventListener('focusout', (e) => {
      const f = FIELD_BY_NAME[e.target.name];
      if (!f) return;
      touched.add(f.name);
      checkField(f.name);
      updateStepper();
    });
    form.addEventListener('submit', onSubmit);
    form.addEventListener('click', (e) => {
      const edit = e.target.closest('[data-edit]');
      if (edit) goToStep(Number(edit.dataset.edit));
    });

    backBtn.addEventListener('click', () => goToStep(currentStep - 1));
    nextBtn.addEventListener('click', goNext);
    resetBtn.addEventListener('click', () => { resetAll(); announce('Form reset.'); });
    exampleBtn.addEventListener('click', fillExample);
    $('newBtn').addEventListener('click', () => { resetAll(); resultsView.hidden = true; formView.hidden = false; goToStep(0); scrollTo(formCard); });
    $('reviewBtn').addEventListener('click', () => backToForm(REVIEW));

    pill.addEventListener('click', checkApi);
    setPill('checking');
    checkApi();

    initNav();
    initParallax();
    goToStep(0, { focus: false });
    updateAll();
  }

  init();
})();
