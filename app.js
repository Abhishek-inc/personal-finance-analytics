/* ═══════════════════════════════════════════════════════════════
   FINANCEHUB — app.js
   Firebase config + all logic  (emoji-free, SVG icons via icons.js)
 ═══════════════════════════════════════════════════════════════ */

const firebaseConfig = {
  apiKey: "AIzaSyBEGOpuxZsbFLQIz8jxj5avVVGoz2ano_E",
  authDomain: "project-2e9a4535-6825-484c-997.firebaseapp.com",
  projectId: "project-2e9a4535-6825-484c-997",
  storageBucket: "project-2e9a4535-6825-484c-997.firebasestorage.app",
  messagingSenderId: "398727607304",
  appId: "1:398727607304:web:ed51a375fc80fd99accdbd"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

let currentUser = null;

const userRef    = ()   => db.collection('users').doc(currentUser.uid);
const incomeRef  = (yr) => userRef().collection('income').doc(yr);
const deductRef  = (yr) => userRef().collection('deductions').doc(yr);
const expenseRef = (mo) => userRef().collection('expenses').doc(mo);
const savingRef  = (mo) => userRef().collection('savings').doc(mo);

/* ══════════════════════════════════════════════════════════════
   PARTICLES
 ══════════════════════════════════════════════════════════════ */
function initParticles() {
  const container = document.getElementById('particles');
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.cssText = `
      left:${Math.random()*100}%;
      --dur:${6+Math.random()*8}s;
      --delay:${Math.random()*8}s;
      --drift:${(Math.random()-0.5)*80}px;
      opacity:${0.3+Math.random()*0.5};
    `;
    container.appendChild(p);
  }
}
initParticles();

document.addEventListener('mousemove', e => {
  const glow = document.getElementById('cursorGlow');
  if (glow) { glow.style.left = e.clientX + 'px'; glow.style.top = e.clientY + 'px'; }
});

/* ══════════════════════════════════════════════════════════════
   CLOCK
 ══════════════════════════════════════════════════════════════ */
function updateClock() {
  const el = document.getElementById('headerTime');
  if (!el) return;
  const now = new Date();
  el.innerHTML = `
    ${now.toLocaleDateString('en-IN', {weekday:'long', day:'numeric', month:'short', year:'numeric'})}<br>
    ${now.toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit', second:'2-digit'})}
  `;
}
setInterval(updateClock, 1000);
updateClock();

/* ══════════════════════════════════════════════════════════════
   AUTH HELPERS
 ══════════════════════════════════════════════════════════════ */
function showAlert(msg, type = 'success') {
  const box = document.getElementById('alertBox');
  box.innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
  setTimeout(() => { box.innerHTML = ''; }, 5000);
}

function toggleAuthForm() {
  const loginF    = document.getElementById('loginForm');
  const registerF = document.getElementById('registerForm');
  document.getElementById('alertBox').innerHTML = '';
  if (loginF.classList.contains('active')) {
    loginF.classList.remove('active'); registerF.classList.add('active');
  } else {
    registerF.classList.remove('active'); loginF.classList.add('active');
  }
}

function setLoading(id, on) {
  const b = document.getElementById(id);
  if (!b) return;
  b.disabled = on;
  b.querySelector('span').textContent = on ? 'Please wait...' : (id === 'loginBtn' ? 'Sign In' : 'Create Account');
}

function fbErr(e) {
  const map = {
    'auth/email-already-in-use':  'Email already registered.',
    'auth/invalid-email':         'Invalid email address.',
    'auth/weak-password':         'Password must be at least 6 characters.',
    'auth/user-not-found':        'No account with this email.',
    'auth/wrong-password':        'Incorrect password.',
    'auth/invalid-credential':    'Email or password is incorrect.',
    'auth/too-many-requests':     'Too many attempts. Try later.',
    'auth/network-request-failed':'Network error — check your connection.',
  };
  return map[e.code] || e.message;
}

function togglePass(inputId, iconId) {
  const inp  = document.getElementById(inputId);
  const icn  = document.getElementById(iconId);
  if (inp.type === 'password') { inp.type = 'text';     icn.textContent = ''; }
  else                         { inp.type = 'password'; icn.textContent = ''; }
}

document.getElementById('registerPassword')?.addEventListener('input', function () {
  const val  = this.value;
  const fill  = document.getElementById('strengthFill');
  const label = document.getElementById('strengthLabel');
  let strength = 0;
  if (val.length >= 6)           strength++;
  if (val.length >= 10)          strength++;
  if (/[A-Z]/.test(val))         strength++;
  if (/[0-9]/.test(val))         strength++;
  if (/[^A-Za-z0-9]/.test(val)) strength++;
  const configs = [
    { w:'0%',   label:'Enter a password', color:'#444'    },
    { w:'20%',  label:'Very weak',        color:'#FF4F6B' },
    { w:'40%',  label:'Weak',             color:'#FF4F6B' },
    { w:'60%',  label:'Fair',             color:'#FFB344' },
    { w:'80%',  label:'Strong',           color:'#10D48E' },
    { w:'100%', label:'Very strong',      color:'#10D48E' },
  ];
  const cfg = configs[Math.min(strength, 5)];
  fill.style.width      = cfg.w;
  fill.style.background = cfg.color;
  label.textContent     = cfg.label;
  label.style.color     = cfg.color;
});

async function handleRegister() {
  const name  = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const pass  = document.getElementById('registerPassword').value;
  if (!name || !email || !pass) { showAlert('Please fill in all fields.', 'error'); return; }
  if (pass.length < 6) { showAlert('Password must be at least 6 characters.', 'error'); return; }
  setLoading('registerBtn', true);
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, pass);
    await cred.user.updateProfile({ displayName: name });
    await userRef().set({
      full_name: name, email,
      created_at: firebase.firestore.FieldValue.serverTimestamp(),
      updated_at: firebase.firestore.FieldValue.serverTimestamp()
    });
    showAlert('Account created! Logging you in...', 'success');
  } catch (e) { showAlert(fbErr(e), 'error'); }
  finally     { setLoading('registerBtn', false); }
}

async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPassword').value;
  if (!email || !pass) { showAlert('Please enter email and password.', 'error'); return; }
  setLoading('loginBtn', true);
  try   { await auth.signInWithEmailAndPassword(email, pass); }
  catch (e) { showAlert(fbErr(e), 'error'); }
  finally   { setLoading('loginBtn', false); }
}

function handleLogout() { auth.signOut(); }

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const lf = document.getElementById('loginForm');
  const rf = document.getElementById('registerForm');
  if (lf && lf.classList.contains('active'))   handleLogin();
  else if (rf && rf.classList.contains('active')) handleRegister();
});

auth.onAuthStateChanged(async user => {
  currentUser = user;
  if (user) {
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('dashboardContainer').classList.remove('hidden');
    const name = user.displayName || user.email;
    document.getElementById('userName').textContent   = name;
    document.getElementById('userAvatar').textContent = name.charAt(0).toUpperCase();

    try {
      await userRef().set({
        online: true,
        last_seen: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      window.addEventListener('beforeunload', () => {
        userRef().set({ online: false, last_seen: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      });
    } catch(e) {}

    try {
      const res    = await fetch('admins.json?_=' + Date.now());
      const data   = await res.json();
      const isAdmin = (data.admins || []).includes(user.email);
      if (isAdmin) {
        document.getElementById('adminPanelLink').classList.remove('hidden');
        document.getElementById('userRole').textContent = 'Administrator';
        document.getElementById('userRole').style.color = 'var(--accent)';
      }
    } catch(e) {}

    loadAllData();
  } else {
    document.getElementById('authContainer').style.display  = 'flex';
    document.getElementById('dashboardContainer').classList.add('hidden');
  }
});

/* ══════════════════════════════════════════════════════════════
   SIDEBAR / MOBILE
 ══════════════════════════════════════════════════════════════ */
function toggleSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = getOrCreateOverlay();
  const ham      = document.getElementById('hamburger');
  const isOpen   = sidebar.classList.toggle('open');
  overlay.classList.toggle('show', isOpen);
  ham.classList.toggle('active', isOpen);
}

function getOrCreateOverlay() {
  let overlay = document.getElementById('sidebarOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id        = 'sidebarOverlay';
    overlay.className = 'sidebar-overlay';
    overlay.onclick   = toggleSidebar;
    document.body.appendChild(overlay);
  }
  return overlay;
}

/* ══════════════════════════════════════════════════════════════
   TAB SWITCHING
 ══════════════════════════════════════════════════════════════ */
const tabMeta = {
  overview: { title:'Overview',        subtitle:'Your financial summary at a glance' },
  income:   { title:'Income',          subtitle:'Manage income sources and tax deductions' },
  expenses: { title:'Expenses',        subtitle:'Track monthly spending patterns' },
  savings:  { title:'Savings',         subtitle:'Monitor your investment portfolio' },
  tax:      { title:'Tax Planner',     subtitle:'Compare old vs new tax regime' },
  health:   { title:'Health Score',    subtitle:'Analyse your financial fitness' },
  forecast: { title:'6-Month Forecast',subtitle:'AI-powered expense predictions for the next 6 months' },
};

function switchTab(name, btn) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (btn) btn.classList.add('active');
  else {
    const target = document.querySelector(`[data-tab="${name}"]`);
    if (target) target.classList.add('active');
  }
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById(name + 'Tab')?.classList.add('active');
  const meta = tabMeta[name] || {};
  document.getElementById('pageTitle').textContent    = meta.title    || name;
  document.getElementById('pageSubtitle').textContent = meta.subtitle || '';
  const sidebar = document.getElementById('sidebar');
  if (window.innerWidth <= 900 && sidebar.classList.contains('open')) toggleSidebar();
  if (name === 'forecast') { runForecast(); }
}

/* ══════════════════════════════════════════════════════════════
   SAVE FUNCTIONS
 ══════════════════════════════════════════════════════════════ */
async function saveIncome() {
  const yr  = v('incYear') || '2024-25';
  const doc = {
    financial_year: yr,
    salary:         num('salary'),
    bonus:          num('bonus'),
    rental_income:  num('rental'),
    capital_gains:  num('capgains'),
    other_income:   num('otherinc'),
    updated_at:     firebase.firestore.FieldValue.serverTimestamp()
  };
  doc.total_income = doc.salary + doc.bonus + doc.rental_income + doc.capital_gains + doc.other_income;
  try   { await incomeRef(yr).set(doc, { merge: true }); toast('Income saved!', 'success'); loadAllData(); }
  catch (e) { toast('Error: ' + e.message, 'error'); }
}

async function saveDeductions() {
  const yr  = v('incYear') || '2024-25';
  const doc = {
    financial_year: yr,
    section_80c:    num('d80c'),
    section_80d:    num('d80d'),
    section_80g:    num('d80g'),
    section_24:     num('d24'),
    nps_80ccd:      num('dnps'),
    hra_exemption:  num('dhra'),
    updated_at:     firebase.firestore.FieldValue.serverTimestamp()
  };
  doc.total_deductions = doc.section_80c + doc.section_80d + doc.section_80g + doc.section_24 + doc.nps_80ccd + doc.hra_exemption;
  try   { await deductRef(yr).set(doc, { merge: true }); toast('Deductions saved!', 'success'); loadDeductionTable(); }
  catch (e) { toast('Error: ' + e.message, 'error'); }
}

async function saveExpense() {
  const mo = v('expMonth');
  if (!mo) { toast('Enter Month-Year (e.g. 2024-12)', 'error'); return; }
  const doc = {
    month_year:     mo,
    rent:           num('eRent'),
    groceries:      num('eGrocery'),
    utilities:      num('eUtil'),
    transportation: num('eTrans'),
    entertainment:  num('eEnt'),
    healthcare:     num('eHealth'),
    education:      num('eEdu'),
    updated_at:     firebase.firestore.FieldValue.serverTimestamp()
  };
  doc.total_expenses = doc.rent + doc.groceries + doc.utilities + doc.transportation + doc.entertainment + doc.healthcare + doc.education;
  try   { await expenseRef(mo).set(doc, { merge: true }); toast('Expenses saved!', 'success'); loadAllData(); }
  catch (e) { toast('Error: ' + e.message, 'error'); }
}

async function saveSavings() {
  const mo = v('savMonth');
  if (!mo) { toast('Enter Month-Year (e.g. 2024-12)', 'error'); return; }
  const doc = {
    month_year:     mo,
    fixed_deposits: num('sFD'),
    mutual_funds:   num('sMF'),
    ppf:            num('sPPF'),
    stocks:         num('sStocks'),
    gold:           num('sGold'),
    emergency_fund: num('sEmerg'),
    updated_at:     firebase.firestore.FieldValue.serverTimestamp()
  };
  doc.total_savings = doc.fixed_deposits + doc.mutual_funds + doc.ppf + doc.stocks + doc.gold + doc.emergency_fund;
  try   { await savingRef(mo).set(doc, { merge: true }); toast('Savings saved!', 'success'); loadAllData(); }
  catch (e) { toast('Error: ' + e.message, 'error'); }
}

async function deleteExpense(mo) {
  if (!confirm(`Delete expense record for ${mo}?`)) return;
  try   { await expenseRef(mo).delete(); toast('Deleted!', 'success'); loadAllData(); }
  catch (e) { toast('Error: ' + e.message, 'error'); }
}

async function deleteSaving(mo) {
  if (!confirm(`Delete savings record for ${mo}?`)) return;
  try   { await savingRef(mo).delete(); toast('Deleted!', 'success'); loadAllData(); }
  catch (e) { toast('Error: ' + e.message, 'error'); }
}

async function deleteDeduction(yr) {
  if (!confirm(`Delete deduction record for FY ${yr}?`)) return;
  try   { await deductRef(yr).delete(); toast('Deleted!', 'success'); loadDeductionTable(); }
  catch (e) { toast('Error: ' + e.message, 'error'); }
}

/* ══════════════════════════════════════════════════════════════
   LOAD FUNCTIONS
 ══════════════════════════════════════════════════════════════ */
async function loadAllData() {
  await Promise.all([loadOverview(), loadIncomeTable(), loadDeductionTable(), loadExpenseTable(), loadSavingsTable()]);
}

async function loadOverview() {
  try {
    const [incSnap, expSnap, savSnap] = await Promise.all([
      userRef().collection('income').orderBy('financial_year','desc').limit(1).get(),
      userRef().collection('expenses').get(),
      userRef().collection('savings').get()
    ]);
    const inc      = incSnap.empty ? null : incSnap.docs[0].data();
    const expenses = expSnap.docs.map(d => d.data());
    const savings  = savSnap.docs.map(d => d.data());
    const totalInc = inc ? inc.total_income : 0;
    const avgExp   = expenses.length
      ? expenses.reduce((s, e) => s + e.total_expenses, 0) / expenses.length : 0;
    const totalSav = savings.reduce((s, sv) => s + sv.total_savings, 0);

    animateCount('statIncome',  totalInc);
    animateCount('statExpense', Math.round(avgExp));
    animateCount('statSavings', totalSav);

    let healthScore = '—';
    if (totalInc > 0) {
      const avgSav   = savings.length ? totalSav / savings.length : 0;
      const savRatio = (avgSav * 12 / totalInc) * 100;
      const expRatio = (avgExp * 12 / totalInc) * 100;
      healthScore = Math.min(100, Math.max(0, Math.round(
        (savRatio >= 20 ? 40 : savRatio * 2) +
        (expRatio <= 50 ? 40 : Math.max(0, 40 - (expRatio - 50))) + 20
      )));
    }
    document.getElementById('statHealth').textContent = healthScore;
    const hBadge = document.getElementById('statHealthBadge');
    if (typeof healthScore === 'number') {
      hBadge.textContent = '/ 100';
      hBadge.className   = 'stat-trend ' + (healthScore >= 70 ? 'up' : 'neutral');
    }

    document.getElementById('overviewContent').innerHTML = inc ? `
      <div class="overview-summary">
        <div class="section-label">Latest Record — FY ${inc.financial_year}</div>
        <div class="metric-row"><span>Salary</span><span class="metric-val">${fmt(inc.salary)}</span></div>
        <div class="metric-row"><span>Total Income</span><span class="metric-val">${fmt(inc.total_income)}</span></div>
        <div class="metric-row"><span>Avg Monthly Expense</span><span class="metric-val">${fmt(Math.round(avgExp))}</span></div>
        <div class="metric-row"><span>Expense Records</span><span class="metric-val">${expenses.length} months</span></div>
        <div class="metric-row"><span>Savings Records</span><span class="metric-val">${savings.length} months</span></div>
      </div>
    ` : `<p style="color:var(--text-muted);padding:12px 0;font-size:.9rem;">No data yet. Go to the <strong>Income</strong> tab to get started.</p>`;

    const recent = [...expenses].sort((a,b) => b.month_year.localeCompare(a.month_year)).slice(0, 5);
    document.getElementById('recentExpenses').innerHTML = recent.length ? `
      <div class="table-wrap"><table>
        <thead><tr><th>Month</th><th>Rent</th><th>Groceries</th><th>Utilities</th><th>Total</th></tr></thead>
        <tbody>${recent.map(e => `<tr>
          <td>${e.month_year}</td><td>${fmt(e.rent)}</td><td>${fmt(e.groceries)}</td><td>${fmt(e.utilities)}</td>
          <td><strong>${fmt(e.total_expenses)}</strong></td>
        </tr>`).join('')}</tbody>
      </table></div>
    ` : `<p style="color:var(--text-muted);font-size:.9rem;">No expense records yet.</p>`;
  } catch (e) {
    document.getElementById('overviewContent').innerHTML = `<p style="color:var(--red);">Error loading data: ${e.message}</p>`;
  }
}

async function loadIncomeTable() {
  try {
    const snap = await userRef().collection('income').orderBy('financial_year','desc').get();
    if (snap.empty) {
      document.getElementById('incomeTable').innerHTML = '<p style="color:var(--text-muted);font-size:.9rem;">No income records yet.</p>';
      return;
    }
    document.getElementById('incomeTable').innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>Year</th><th>Salary</th><th>Bonus</th><th>Rental</th><th>Capital Gains</th><th>Other</th><th>Total</th></tr></thead>
        <tbody>${snap.docs.map(d => {
          const r = d.data();
          return `<tr>
            <td>${r.financial_year}</td><td>${fmt(r.salary)}</td><td>${fmt(r.bonus)}</td>
            <td>${fmt(r.rental_income||0)}</td><td>${fmt(r.capital_gains||0)}</td>
            <td>${fmt(r.other_income||0)}</td><td><strong>${fmt(r.total_income)}</strong></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`;
  } catch (e) { document.getElementById('incomeTable').innerHTML = `<p style="color:var(--red);">${e.message}</p>`; }
}

async function loadDeductionTable() {
  try {
    const snap = await userRef().collection('deductions').orderBy('financial_year','desc').get();
    if (snap.empty) {
      document.getElementById('deductionTable').innerHTML = '<p style="color:var(--text-muted);font-size:.9rem;">No deduction records yet.</p>';
      return;
    }
    document.getElementById('deductionTable').innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>Year</th><th>80C</th><th>80D</th><th>80G</th><th>Home Loan</th><th>NPS</th><th>HRA</th><th>Total</th><th>Action</th></tr></thead>
        <tbody>${snap.docs.map(d => {
          const r = d.data();
          return `<tr>
            <td>${r.financial_year}</td><td>${fmt(r.section_80c||0)}</td><td>${fmt(r.section_80d||0)}</td>
            <td>${fmt(r.section_80g||0)}</td><td>${fmt(r.section_24||0)}</td><td>${fmt(r.nps_80ccd||0)}</td>
            <td>${fmt(r.hra_exemption||0)}</td><td><strong>${fmt(r.total_deductions||0)}</strong></td>
            <td><button class="action-btn del" onclick="deleteDeduction('${r.financial_year}')">Delete</button></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`;
  } catch (e) { document.getElementById('deductionTable').innerHTML = `<p style="color:var(--red);">${e.message}</p>`; }
}

async function loadExpenseTable() {
  try {
    const snap = await userRef().collection('expenses').orderBy('month_year','desc').get();
    if (snap.empty) {
      document.getElementById('expenseTable').innerHTML = '<p style="color:var(--text-muted);font-size:.9rem;">No expense records yet.</p>';
      return;
    }
    document.getElementById('expenseTable').innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>Month</th><th>Rent</th><th>Groceries</th><th>Utilities</th><th>Transport</th><th>Total</th><th>Action</th></tr></thead>
        <tbody>${snap.docs.map(d => {
          const r = d.data();
          return `<tr>
            <td>${r.month_year}</td><td>${fmt(r.rent)}</td><td>${fmt(r.groceries)}</td>
            <td>${fmt(r.utilities)}</td><td>${fmt(r.transportation)}</td>
            <td><strong>${fmt(r.total_expenses)}</strong></td>
            <td><button class="action-btn del" onclick="deleteExpense('${r.month_year}')">Delete</button></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`;
  } catch (e) { document.getElementById('expenseTable').innerHTML = `<p style="color:var(--red);">${e.message}</p>`; }
}

async function loadSavingsTable() {
  try {
    const snap = await userRef().collection('savings').orderBy('month_year','desc').get();
    if (snap.empty) {
      document.getElementById('savingsTable').innerHTML = '<p style="color:var(--text-muted);font-size:.9rem;">No savings records yet.</p>';
      return;
    }
    document.getElementById('savingsTable').innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr><th>Month</th><th>FDs</th><th>Mutual Funds</th><th>PPF</th><th>Stocks</th><th>Total</th><th>Action</th></tr></thead>
        <tbody>${snap.docs.map(d => {
          const r = d.data();
          return `<tr>
            <td>${r.month_year}</td><td>${fmt(r.fixed_deposits)}</td><td>${fmt(r.mutual_funds)}</td>
            <td>${fmt(r.ppf)}</td><td>${fmt(r.stocks)}</td>
            <td><strong>${fmt(r.total_savings)}</strong></td>
            <td><button class="action-btn del" onclick="deleteSaving('${r.month_year}')">Delete</button></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`;
  } catch (e) { document.getElementById('savingsTable').innerHTML = `<p style="color:var(--red);">${e.message}</p>`; }
}

/* ══════════════════════════════════════════════════════════════
   TAX CALCULATOR
 ══════════════════════════════════════════════════════════════ */
async function calculateTax() {
  const yr     = v('taxYear') || '2024-25';
  const result = document.getElementById('taxResult');
  result.innerHTML = '<div class="loading-state"><div class="skeleton"></div><div class="skeleton short"></div></div>';
  try {
    const [incSnap, dedSnap] = await Promise.all([incomeRef(yr).get(), deductRef(yr).get()]);
    if (!incSnap.exists) {
      result.innerHTML = `<p style="color:var(--red);">No income data for ${yr}. Add it in the Income tab first.</p>`;
      return;
    }
    const inc      = incSnap.data();
    const ded      = dedSnap.exists ? dedSnap.data() : {};
    const gross    = inc.total_income;
    const std      = 50000;
    const totalDed = Math.min(ded.section_80c||0, 150000) + Math.min(ded.section_80d||0, 25000)
                   + (ded.section_80g||0) + Math.min(ded.section_24||0, 200000)
                   + Math.min(ded.nps_80ccd||0, 50000) + (ded.hra_exemption||0);
    const oldTaxable  = Math.max(0, gross - std - totalDed);
    const oldTax      = calcOldTax(oldTaxable);
    const newStd      = 75000;
    const newTaxable  = Math.max(0, gross - newStd);
    const newTax      = calcNewTax(newTaxable);
    const recommended = oldTax <= newTax ? 'old' : 'new';
    const saved       = Math.abs(oldTax - newTax);
    result.innerHTML = `
      <div class="tax-grid">
        <div class="tax-panel ${recommended === 'old' ? 'winner' : ''}">
          <h3>Old Regime ${recommended === 'old' ? '(recommended)' : ''}</h3>
          <div class="metric-row"><span>Gross Income</span><span class="metric-val">${fmt(gross)}</span></div>
          <div class="metric-row"><span>Total Deductions</span><span class="metric-val">${fmt(std + totalDed)}</span></div>
          <div class="metric-row"><span>Taxable Income</span><span class="metric-val">${fmt(oldTaxable)}</span></div>
          <div class="metric-row"><span>Tax + Cess</span><span class="metric-val danger">${fmt(oldTax)}</span></div>
          <div class="metric-row"><span>Effective Rate</span><span class="metric-val">${gross ? ((oldTax/gross)*100).toFixed(2) : 0}%</span></div>
          <div class="metric-row"><span>Post-Tax Income</span><span class="metric-val">${fmt(gross-oldTax)}</span></div>
        </div>
        <div class="tax-panel ${recommended === 'new' ? 'winner' : ''}">
          <h3>New Regime ${recommended === 'new' ? '(recommended)' : ''}</h3>
          <div class="metric-row"><span>Gross Income</span><span class="metric-val">${fmt(gross)}</span></div>
          <div class="metric-row"><span>Standard Deduction</span><span class="metric-val">${fmt(newStd)}</span></div>
          <div class="metric-row"><span>Taxable Income</span><span class="metric-val">${fmt(newTaxable)}</span></div>
          <div class="metric-row"><span>Tax + Cess</span><span class="metric-val danger">${fmt(newTax)}</span></div>
          <div class="metric-row"><span>Effective Rate</span><span class="metric-val">${gross ? ((newTax/gross)*100).toFixed(2) : 0}%</span></div>
          <div class="metric-row"><span>Post-Tax Income</span><span class="metric-val">${fmt(gross-newTax)}</span></div>
        </div>
      </div>
      <div class="tax-reco">Choose the <strong>${recommended.toUpperCase()} REGIME</strong> and save <strong>${fmt(saved)}</strong> in taxes this year.</div>`;
  } catch (e) { result.innerHTML = `<p style="color:var(--red);">Error: ${e.message}</p>`; }
}

function calcOldTax(inc) {
  let t = 0;
  if      (inc <= 250000)  t = 0;
  else if (inc <= 500000)  t = (inc-250000)*0.05;
  else if (inc <= 750000)  t = 12500+(inc-500000)*0.10;
  else if (inc <= 1000000) t = 37500+(inc-750000)*0.15;
  else if (inc <= 1250000) t = 75000+(inc-1000000)*0.20;
  else if (inc <= 1500000) t = 125000+(inc-1250000)*0.25;
  else                     t = 187500+(inc-1500000)*0.30;
  return Math.round(t * 1.04);
}

function calcNewTax(inc) {
  let t = 0;
  if      (inc <= 300000)  t = 0;
  else if (inc <= 600000)  t = (inc-300000)*0.05;
  else if (inc <= 900000)  t = 15000+(inc-600000)*0.10;
  else if (inc <= 1200000) t = 45000+(inc-900000)*0.15;
  else if (inc <= 1500000) t = 90000+(inc-1200000)*0.20;
  else                     t = 150000+(inc-1500000)*0.30;
  if (inc <= 700000) t = 0;
  return Math.round(t * 1.04);
}

/* ══════════════════════════════════════════════════════════════
   HEALTH SCORE
 ══════════════════════════════════════════════════════════════ */
async function calcHealth() {
  const result = document.getElementById('healthResult');
  result.innerHTML = '<div class="loading-state"><div class="skeleton"></div><div class="skeleton short"></div><div class="skeleton"></div></div>';
  try {
    const [incSnap, expSnaps, savSnaps] = await Promise.all([
      userRef().collection('income').orderBy('financial_year','desc').limit(1).get(),
      userRef().collection('expenses').get(),
      userRef().collection('savings').get()
    ]);
    if (incSnap.empty) { result.innerHTML = '<p style="color:var(--text-muted);">Add income data first.</p>'; return; }
    const inc      = incSnap.docs[0].data();
    const expenses = expSnaps.docs.map(d => d.data());
    const savings  = savSnaps.docs.map(d => d.data());
    const annualInc = inc.total_income;
    const avgExp    = expenses.length ? expenses.reduce((s, e) => s + e.total_expenses, 0) / expenses.length : 0;
    const totalSav  = savings.reduce((s, sv) => s + sv.total_savings, 0);
    const annualExp = avgExp * 12;
    const avgSav    = savings.length ? totalSav / savings.length : 0;
    const annualSav = avgSav * 12;
    const savRatio  = annualInc > 0 ? (annualSav / annualInc) * 100 : 0;
    const expRatio  = annualInc > 0 ? (annualExp / annualInc) * 100 : 0;
    const savScore  = Math.min(40, savRatio * 2);
    const expScore  = expRatio <= 50 ? 40 : Math.max(0, 40 - (expRatio - 50));
    const divScore  = savings.length > 0 ? Math.min(20,
      [s=>s.fixed_deposits, s=>s.mutual_funds, s=>s.ppf, s=>s.stocks, s=>s.gold, s=>s.emergency_fund]
      .filter(fn => savings.some(s => fn(s) > 0)).length * (20/6)) : 0;
    const overall  = Math.min(100, Math.round(savScore + expScore + divScore));
    const cat      = overall >= 80 ? 'Excellent' : overall >= 60 ? 'Good' : overall >= 40 ? 'Fair' : 'Needs Attention';
    const catColor = overall >= 80 ? 'var(--green)' : overall >= 60 ? '#6C63FF' : overall >= 40 ? 'var(--yellow)' : 'var(--red)';
    const circumference = 2 * Math.PI * 70;
    const dash     = (overall / 100) * circumference;
    const recs = [];
    if (savRatio < 20) recs.push('Increase your savings — aim for at least 20% of annual income.');
    if (expRatio > 50) recs.push(`Reduce monthly expenses — currently ${expRatio.toFixed(0)}% of income.`);
    if (divScore < 15) recs.push('Diversify investments: add stocks, mutual funds, or gold.');
    if (overall >= 80) recs.push('You\'re doing great! Stay consistent and review your portfolio annually.');
    result.innerHTML = `
      <div class="health-score-circle">
        <div class="score-ring">
          <svg viewBox="0 0 160 160">
            <circle class="bg-ring" cx="80" cy="80" r="70"/>
            <circle class="fg-ring" id="healthRing" cx="80" cy="80" r="70" stroke="${catColor}" stroke-dasharray="0 ${circumference}"/>
          </svg>
          <div class="score-center">
            <div class="score-num" style="color:${catColor}">${overall}</div>
            <div class="score-label">Score</div>
          </div>
        </div>
        <div class="health-cat" style="color:${catColor}">${cat}</div>
      </div>
      <div class="health-metrics">
        <div class="hm-card">
          <div class="hm-val">${savRatio.toFixed(1)}%</div>
          <div class="hm-label">Savings Ratio<span class="hm-badge" style="color:${savRatio>=20?'var(--green)':'var(--red)'}">${savRatio>=20?' Good (above 20%)':' Low (below 20%)'}</span></div>
        </div>
        <div class="hm-card">
          <div class="hm-val">${expRatio.toFixed(1)}%</div>
          <div class="hm-label">Expense Ratio<span class="hm-badge" style="color:${expRatio<=50?'var(--green)':'var(--red)'}">${expRatio<=50?' Good (50% or less)':' High (above 50%)'}</span></div>
        </div>
        <div class="hm-card"><div class="hm-val">${fmt(totalSav)}</div><div class="hm-label">Total Accumulated Savings</div></div>
      </div>
      <div class="health-reco"><strong>Recommendations:</strong><ul style="margin-top:8px;">${recs.map(r=>`<li>${r}</li>`).join('')}</ul></div>`;
    setTimeout(() => {
      const ring = document.getElementById('healthRing');
      if (ring) ring.style.strokeDasharray = `${dash} ${circumference}`;
    }, 100);
  } catch (e) { result.innerHTML = `<p style="color:var(--red);">Error: ${e.message}</p>`; }
}

/* ══════════════════════════════════════════════════════════════
   6-MONTH FORECAST ENGINE
 ══════════════════════════════════════════════════════════════ */

/** Linear regression: given array of y values (index = x), returns { slope, intercept } */
function linearRegression(values) {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  const sumX  = values.reduce((s, _, i) => s + i,     0);
  const sumY  = values.reduce((s, v)    => s + v,     0);
  const sumXY = values.reduce((s, v, i) => s + i * v, 0);
  const sumX2 = values.reduce((s, _, i) => s + i * i, 0);
  const slope     = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

/** Add N months to a YYYY-MM string */
function addMonths(ym, n) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Friendly month label */
function monthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

const CATEGORIES = [
  { key: 'rent',           label: 'Rent'          },
  { key: 'groceries',      label: 'Groceries'     },
  { key: 'utilities',      label: 'Utilities'     },
  { key: 'transportation', label: 'Transport'     },
  { key: 'entertainment',  label: 'Entertainment' },
  { key: 'healthcare',     label: 'Healthcare'    },
  { key: 'education',      label: 'Education'     },
];

/* Chart instances (destroy before re-render) */
let _fLineChart = null, _fDonut = null, _fBar = null;
function destroyCharts() {
  [_fLineChart, _fDonut, _fBar].forEach(c => { try { c && c.destroy(); } catch(_) {} });
  _fLineChart = _fDonut = _fBar = null;
}

const CAT_COLORS = [
  '#a78bfa','#60a5fa','#34d399','#fbbf24','#f87171','#c084fc','#38bdf8','#fb923c'
];

async function runForecast() {
  const btn = document.getElementById('btnRunForecast');
  if (btn) {
    btn.disabled   = true;
    btn.innerHTML  = `<span style="display:inline-flex;align-items:center;gap:6px;">${icon('spinner')} Analysing...</span>`;
  }
  document.getElementById('forecastResult').style.display = 'none';
  document.getElementById('forecastEmpty').style.display  = 'none';
  destroyCharts();

  try {
    if (!currentUser) return;
    const snap       = await userRef().collection('expenses').orderBy('month_year','asc').get();
    const allExpenses = snap.docs.map(d => d.data());

    if (allExpenses.length === 0) {
      const empty = document.getElementById('forecastEmpty');
      empty.style.display = 'block';
      empty.innerHTML = `
        <div style="text-align:center;padding:50px 20px;">
          <div style="margin-bottom:16px;opacity:.6;color:var(--text-muted);">${icon('no_data', 52)}</div>
          <div style="font-size:1.1rem;font-weight:700;color:var(--text);margin-bottom:8px">No expense data yet</div>
          <div style="font-size:.88rem;color:var(--text-muted);line-height:1.7;margin-bottom:20px">
            Add monthly expenses in the <strong style="color:var(--accent)">Expenses</strong> tab.<br>
            Even 1 month is enough to generate a forecast!
          </div>
          <button class="btn-action" onclick="switchTab('expenses',document.querySelector('[data-tab=expenses]'))" style="font-size:.85rem;padding:10px 22px;">
            Go to Expenses
          </button>
        </div>`;
      return;
    }

    allExpenses.sort((a,b) => a.month_year.localeCompare(b.month_year));
    const latestMonth = allExpenses[allExpenses.length - 1].month_year;
    const avgExpense  = allExpenses.reduce((s,e) => s + (e.total_expenses||0), 0) / allExpenses.length;

    /* Per-category forecast */
    const catForecasts = {};
    CATEGORIES.forEach(cat => {
      const vals = allExpenses.map(e => e[cat.key]||0);
      if (vals.length === 1) {
        catForecasts[cat.key] = Array.from({length:6}, (_,i) => Math.round(vals[0]*Math.pow(1.02,i+1)));
      } else {
        const {slope, intercept} = linearRegression(vals);
        const n = vals.length;
        catForecasts[cat.key] = Array.from({length:6}, (_,i) =>
          Math.max(0, Math.round(intercept + slope*(n+i))));
      }
    });

    const forecastMonths = Array.from({length:6}, (_,i) => addMonths(latestMonth, i+1));
    const forecastTotals = forecastMonths.map((_,mi) =>
      CATEGORIES.reduce((s,cat) => s + catForecasts[cat.key][mi], 0));

    const avgForecast = Math.round(forecastTotals.reduce((a,b)=>a+b,0)/6);
    const trendDir    = forecastTotals[5] > forecastTotals[0];
    const trendPct    = forecastTotals[0] > 0
      ? Math.abs(((forecastTotals[5]-forecastTotals[0])/forecastTotals[0])*100).toFixed(1) : '0.0';
    const totalBudget = forecastTotals.reduce((a,b)=>a+b,0);

    /* KPI Cards */
    const kpiData = [
      { iconName:'chart_bars',                    label:'Historical Avg / Month', val:fmt(Math.round(avgExpense)), sub:`${allExpenses.length} month(s) of data`, color:'var(--accent2)' },
      { iconName:'target',                        label:'Projected Avg / Month',  val:fmt(avgForecast),            sub:'next 6 months',                          color:'var(--accent)'  },
      { iconName:'wallet',                        label:'Total 6-Month Budget',   val:fmt(totalBudget),            sub:'plan accordingly',                       color:'var(--yellow)'  },
      { iconName: trendDir ? 'trending_up' : 'trending_dn', label:'Spending Trend', val:`${trendDir?'+':'-'}${trendPct}%`, sub:trendDir?'expenses rising':'expenses falling', color:trendDir?'var(--red)':'var(--green)' },
    ];
    document.getElementById('forecastSummaryCards').innerHTML = kpiData.map(k => `
      <div class="fcast-kpi-card">
        <div class="fcast-kpi-icon">${icon(k.iconName)}</div>
        <div class="fcast-kpi-body">
          <div class="fcast-kpi-label">${k.label}</div>
          <div class="fcast-kpi-val" style="color:${k.color}">${k.val}</div>
          <div class="fcast-kpi-sub">${k.sub}</div>
        </div>
      </div>`).join('');

    document.getElementById('forecastResult').style.display = 'block';

    /* Chart labels */
    const histLabels = allExpenses.map(e => monthLabel(e.month_year));
    const fcastLabels = forecastMonths.map(m => monthLabel(m));
    const allLabels   = [...histLabels, ...fcastLabels];

    /* Chart defaults */
    Chart.defaults.color = 'rgba(238,240,255,.7)';
    Chart.defaults.font  = { family:"'DM Sans', sans-serif", size: 12 };
    const gridColor = 'rgba(255,255,255,.06)';
    const tickColor = 'rgba(238,240,255,.5)';

    /* LINE CHART */
    const histTotals   = allExpenses.map(e => e.total_expenses||0);
    const lineHistData = [...histTotals, ...Array(6).fill(null)];
    const lineFcastData = [...Array(histLabels.length-1).fill(null), histTotals[histTotals.length-1], ...forecastTotals];

    _fLineChart = new Chart(document.getElementById('forecastLineChart'), {
      type: 'line',
      data: {
        labels: allLabels,
        datasets: [
          {
            label: 'Historical',
            data: lineHistData,
            borderColor: '#60a5fa',
            backgroundColor: 'rgba(96,165,250,.12)',
            borderWidth: 2.5,
            pointRadius: 5,
            pointBackgroundColor: '#60a5fa',
            pointHoverRadius: 8,
            tension: 0.4,
            fill: true,
          },
          {
            label: 'Forecast',
            data: lineFcastData,
            borderColor: '#a78bfa',
            backgroundColor: 'rgba(167,139,250,.1)',
            borderWidth: 2.5,
            borderDash: [6,4],
            pointRadius: 5,
            pointBackgroundColor: '#a78bfa',
            pointHoverRadius: 8,
            tension: 0.4,
            fill: true,
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode:'index', intersect:false },
        plugins: {
          legend: { display:false },
          tooltip: {
            backgroundColor: '#0f1225',
            borderColor: 'rgba(167,139,250,.3)',
            borderWidth: 1,
            padding: 12,
            callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmt(ctx.parsed.y)}` }
          }
        },
        scales: {
          x: { grid:{ color:gridColor }, ticks:{ color:tickColor } },
          y: { grid:{ color:gridColor }, ticks:{ color:tickColor, callback: v => '\u20B9'+v.toLocaleString('en-IN') } }
        }
      }
    });

    document.getElementById('lineLegend').innerHTML = `
      <span class="fcast-legend-dot" style="background:#60a5fa"></span> Historical
      <span class="fcast-legend-dot" style="background:#a78bfa;margin-left:14px"></span> Forecast`;

    /* DONUT CHART */
    const avgPerCat = CATEGORIES.map((cat,i) => ({
      ...cat,
      hist:     Math.round(allExpenses.reduce((s,e) => s+(e[cat.key]||0), 0) / allExpenses.length),
      forecast: Math.round(catForecasts[cat.key].reduce((a,b)=>a+b,0)/6),
      color:    CAT_COLORS[i % CAT_COLORS.length]
    })).filter(c => c.forecast > 0);

    _fDonut = new Chart(document.getElementById('forecastDonutChart'), {
      type: 'doughnut',
      data: {
        labels: avgPerCat.map(c=>c.label),
        datasets:[{
          data: avgPerCat.map(c=>c.forecast),
          backgroundColor: avgPerCat.map(c=>c.color+'cc'),
          borderColor:     avgPerCat.map(c=>c.color),
          borderWidth: 2,
          hoverOffset: 10,
        }]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        cutout:'65%',
        plugins:{
          legend:{display:false},
          tooltip:{
            backgroundColor:'#0f1225',
            borderColor:'rgba(167,139,250,.3)',
            borderWidth:1,
            padding:12,
            callbacks:{ label: ctx => ` ${ctx.label}: ${fmt(ctx.parsed)} (${((ctx.parsed/avgForecast)*100).toFixed(1)}%)` }
          }
        }
      }
    });

    document.getElementById('donutLegend').innerHTML = avgPerCat.map(c=>`
      <div class="fcast-donut-row">
        <span class="fcast-donut-dot"  style="background:${c.color}"></span>
        <span class="fcast-donut-label">${c.label}</span>
        <span class="fcast-donut-val">${fmt(c.forecast)}</span>
      </div>`).join('');

    /* STACKED BAR CHART */
    const stackedDatasets = CATEGORIES.map((cat,i) => ({
      label: cat.label,
      data: forecastMonths.map((_,mi) => catForecasts[cat.key][mi]),
      backgroundColor: CAT_COLORS[i%CAT_COLORS.length]+'bb',
      borderColor:     CAT_COLORS[i%CAT_COLORS.length],
      borderWidth: 1,
      borderRadius: 4,
    }));

    _fBar = new Chart(document.getElementById('forecastStackedBar'), {
      type:'bar',
      data:{ labels:fcastLabels, datasets:stackedDatasets },
      options:{
        responsive:true, maintainAspectRatio:false,
        interaction:{ mode:'index', intersect:false },
        plugins:{
          legend:{ position:'bottom', labels:{ padding:16, boxWidth:12, usePointStyle:true } },
          tooltip:{
            backgroundColor:'#0f1225',
            borderColor:'rgba(167,139,250,.3)',
            borderWidth:1,
            padding:12,
            callbacks:{ label: ctx => ` ${ctx.dataset.label}: ${fmt(ctx.parsed.y)}` }
          }
        },
        scales:{
          x:{ stacked:true, grid:{color:gridColor}, ticks:{color:tickColor} },
          y:{ stacked:true, grid:{color:gridColor}, ticks:{color:tickColor,
            callback: v => '\u20B9'+v.toLocaleString('en-IN')
          }}
        }
      }
    });

    /* Category comparison bars */
    const maxCatVal = Math.max(1, ...avgPerCat.map(c=>Math.max(c.hist, c.forecast)));
    document.getElementById('forecastCategories').innerHTML = avgPerCat.map(cat=>{
      const histPct     = (cat.hist / maxCatVal * 100).toFixed(0);
      const forecastPct = (cat.forecast / maxCatVal * 100).toFixed(0);
      const rising      = cat.forecast > cat.hist;
      const changePct   = cat.hist > 0 ? (((cat.forecast-cat.hist)/cat.hist)*100).toFixed(1) : '—';
      return `<div class="fcat-row">
        <div class="fcat-label">${cat.label}</div>
        <div class="fcat-bars">
          <div class="fcat-bar-track"><div class="fcat-bar-fill hist" style="width:${histPct}%"></div></div>
          <div class="fcat-bar-track"><div class="fcat-bar-fill fore" style="width:${forecastPct}%;background:${cat.color}"></div></div>
        </div>
        <div class="fcat-vals">
          <span class="fcat-val-hist">${fmt(cat.hist)}</span>
          <span class="fcat-val-fore">${fmt(cat.forecast)}</span>
        </div>
        <span class="fcat-badge ${rising?'rise':'fall'}">${rising?'up':'dn'} ${changePct}%</span>
      </div>`;
    }).join('') + `
      <div class="fcat-legend">
        <span><span class="fcat-dot" style="background:#60a5fa"></span>Historical Avg</span>
        <span><span class="fcat-dot" style="background:#a78bfa"></span>Forecast Avg</span>
      </div>`;

    /* Insights */
    const topCats    = [...avgPerCat].sort((a,b)=>b.forecast-a.forecast).slice(0,3);
    const risingCats = avgPerCat.filter(c=>c.forecast>c.hist && c.hist>0);
    const savingOpp  = avgForecast <= avgExpense;

    const insights = [
      { iconName:'info', type:'info',
        title:`Based on ${allExpenses.length} month(s) of data`,
        body: allExpenses.length===1
          ? 'Using flat projection with 2% monthly inflation. More months of data improve accuracy.'
          : 'Linear regression trend analysis. Each additional month improves accuracy.' },
      { iconName:'trophy', type:'warn',
        title:'Top expense categories',
        body: topCats.map(c=>`<span class="ins-chip">${c.label} <strong>${fmt(c.forecast)}/mo</strong></span>`).join('') },
      ...(risingCats.length ? [{
        iconName:'alert', type:'warn',
        title:'Rising categories',
        body: risingCats.slice(0,3).map(c=>`<span class="ins-chip">${c.label}: ${fmt(c.hist)} &rarr; <strong>${fmt(c.forecast)}</strong></span>`).join('')
      }] : []),
      { iconName: savingOpp ? 'check_ok' : 'alert',
        type: savingOpp ? 'good' : 'bad',
        title: savingOpp ? 'Spending stable / improving' : 'Budget alert',
        body: savingOpp
          ? `Projected 6-month total: <strong>${fmt(totalBudget)}</strong>. You're on track!`
          : `Expenses trending up. Budget <strong>${fmt(totalBudget)}</strong> for next 6 months.` },
    ];

    document.getElementById('forecastInsights').innerHTML = insights.map(ins=>`
      <div class="fcast-insight ${ins.type}">
        <div class="fins-icon">${icon(ins.iconName)}</div>
        <div>
          <div class="fins-title">${ins.title}</div>
          <div class="fins-body">${ins.body}</div>
        </div>
      </div>`).join('');

    /* Data Table */
    document.getElementById('forecastTable').innerHTML = `
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Month</th>
          ${CATEGORIES.map(c=>`<th>${c.label}</th>`).join('')}
          <th>Total</th><th>vs Hist Avg</th>
        </tr></thead>
        <tbody>${forecastMonths.map((mo,mi)=>{
          const total   = forecastTotals[mi];
          const diff    = total - avgExpense;
          const diffPct = avgExpense > 0 ? ((diff/avgExpense)*100).toFixed(1) : '0.0';
          return `<tr>
            <td><strong>${monthLabel(mo)}</strong></td>
            ${CATEGORIES.map(cat=>`<td>${fmt(catForecasts[cat.key][mi])}</td>`).join('')}
            <td><strong style="color:var(--accent)">${fmt(total)}</strong></td>
            <td><span class="fcast-diff ${diff>0?'up':'down'}">${diff>0?'+':''}${diffPct}%</span></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>`;

  } catch(e) {
    console.error('Forecast error:', e);
    const empty = document.getElementById('forecastEmpty');
    empty.style.display = 'block';
    empty.innerHTML = `
      <div style="text-align:center;padding:30px;color:var(--red)">
        <div style="margin-bottom:8px">${icon('error_x', 32)}</div>
        <div>Error generating forecast: ${e.message}</div>
      </div>`;
  } finally {
    if (btn) {
      btn.disabled  = false;
      btn.innerHTML = `<span style="display:inline-flex;align-items:center;gap:6px;">${icon('refresh')} Regenerate Forecast</span>`;
    }
  }
}

/* ══════════════════════════════════════════════════════════════
   UI UTILITIES
 ══════════════════════════════════════════════════════════════ */
const v   = id => document.getElementById(id)?.value?.trim() || '';
const num = id => parseFloat(document.getElementById(id)?.value) || 0;

function fmt(n) {
  return '\u20B9' + (n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const duration = 800;
  const startT   = performance.now();
  const tick = now => {
    const progress = Math.min((now - startT) / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    el.textContent = fmt(Math.round(target * eased));
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

let toastTimer;
function toast(msg, type = 'success') {
  clearTimeout(toastTimer);
  const t       = document.getElementById('toast');
  t.textContent = msg;
  t.className   = `toast ${type} show`;
  toastTimer    = setTimeout(() => t.classList.remove('show'), 3200);
}
