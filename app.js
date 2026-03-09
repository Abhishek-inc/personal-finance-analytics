/* ═══════════════════════════════════════════════════════════════
   FINANCEHUB — app.js
   Firebase config + all logic
   ═══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
   FIREBASE CONFIG — replace with yours from Firebase Console
   ══════════════════════════════════════════════════════════════ */
const firebaseConfig = {
    apiKey:            "AIzaSyBEGOpuxZsbFLQIz8jxj5avVVGoz2ano_E",
    authDomain:        "project-2e9a4535-6825-484c-997.firebaseapp.com",
    projectId:         "project-2e9a4535-6825-484c-997",
    storageBucket:     "project-2e9a4535-6825-484c-997.firebasestorage.app",
    messagingSenderId: "398727607304",
    appId:             "1:398727607304:web:ed51a375fc80fd99accdbd"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

let currentUser = null;

/* ══════════════════════════════════════════════════════════════
   FIRESTORE REFS
   ══════════════════════════════════════════════════════════════ */
const userRef      = ()   => db.collection('users').doc(currentUser.uid);
const incomeRef    = (yr) => userRef().collection('income').doc(yr);
const deductRef    = (yr) => userRef().collection('deductions').doc(yr);
const expenseRef   = (mo) => userRef().collection('expenses').doc(mo);
const savingRef    = (mo) => userRef().collection('savings').doc(mo);

/* ══════════════════════════════════════════════════════════════
   PARTICLES INIT
   ══════════════════════════════════════════════════════════════ */
function initParticles() {
    const container = document.getElementById('particles');
    for (let i = 0; i < 30; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.cssText = `
            left: ${Math.random() * 100}%;
            --dur: ${6 + Math.random() * 8}s;
            --delay: ${Math.random() * 8}s;
            --drift: ${(Math.random() - 0.5) * 80}px;
            opacity: ${0.3 + Math.random() * 0.5};
        `;
        container.appendChild(p);
    }
}
initParticles();

/* ── Cursor Glow ──────────────────────────────────────────── */
document.addEventListener('mousemove', e => {
    const glow = document.getElementById('cursorGlow');
    if (glow) {
        glow.style.left = e.clientX + 'px';
        glow.style.top  = e.clientY + 'px';
    }
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
        loginF.classList.remove('active');
        registerF.classList.add('active');
    } else {
        registerF.classList.remove('active');
        loginF.classList.add('active');
    }
}

function setLoading(id, on) {
    const b = document.getElementById(id);
    if (!b) return;
    b.disabled = on;
    b.querySelector('span').textContent = on ? 'Please wait…' : (id === 'loginBtn' ? 'Sign In' : 'Create Account');
}

function fbErr(e) {
    const map = {
        'auth/email-already-in-use':  'Email already registered.',
        'auth/invalid-email':         'Invalid email address.',
        'auth/weak-password':         'Password must be ≥ 6 characters.',
        'auth/user-not-found':        'No account with this email.',
        'auth/wrong-password':        'Incorrect password.',
        'auth/invalid-credential':    'Email or password is incorrect.',
        'auth/too-many-requests':     'Too many attempts. Try later.',
        'auth/network-request-failed':'Network error — check your connection.',
    };
    return map[e.code] || e.message;
}

/* Password visibility toggle */
function togglePass(inputId, iconId) {
    const inp  = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (inp.type === 'password') {
        inp.type = 'text';
        icon.textContent = '🙈';
    } else {
        inp.type = 'password';
        icon.textContent = '👁️';
    }
}

/* Password strength meter */
document.getElementById('registerPassword')?.addEventListener('input', function () {
    const val = this.value;
    const fill  = document.getElementById('strengthFill');
    const label = document.getElementById('strengthLabel');
    let strength = 0;
    if (val.length >= 6)  strength++;
    if (val.length >= 10) strength++;
    if (/[A-Z]/.test(val)) strength++;
    if (/[0-9]/.test(val)) strength++;
    if (/[^A-Za-z0-9]/.test(val)) strength++;
    const configs = [
        { w:'0%',   label:'Enter a password', color:'#444' },
        { w:'20%',  label:'Very weak',         color:'#FF4F6B' },
        { w:'40%',  label:'Weak',              color:'#FF4F6B' },
        { w:'60%',  label:'Fair',              color:'#FFB344' },
        { w:'80%',  label:'Strong',            color:'#10D48E' },
        { w:'100%', label:'Very strong 💪',    color:'#10D48E' },
    ];
    const cfg = configs[Math.min(strength, 5)];
    fill.style.width      = cfg.w;
    fill.style.background = cfg.color;
    label.textContent     = cfg.label;
    label.style.color     = cfg.color;
});

/* ── Register ─────────────────────────────────────────────── */
async function handleRegister() {
    const name  = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const pass  = document.getElementById('registerPassword').value;
    if (!name || !email || !pass) { showAlert('Please fill in all fields.', 'error'); return; }
    if (pass.length < 6)          { showAlert('Password must be ≥ 6 characters.', 'error'); return; }

    setLoading('registerBtn', true);
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, pass);
        await cred.user.updateProfile({ displayName: name });
        await userRef().set({
            full_name:  name,
            email:      email,
            created_at: firebase.firestore.FieldValue.serverTimestamp(),
            updated_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        showAlert('Account created! Logging you in…', 'success');
    } catch (e) {
        showAlert(fbErr(e), 'error');
    } finally {
        setLoading('registerBtn', false);
    }
}

/* ── Login ────────────────────────────────────────────────── */
async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const pass  = document.getElementById('loginPassword').value;
    if (!email || !pass) { showAlert('Please enter email and password.', 'error'); return; }

    setLoading('loginBtn', true);
    try {
        await auth.signInWithEmailAndPassword(email, pass);
    } catch (e) {
        showAlert(fbErr(e), 'error');
    } finally {
        setLoading('loginBtn', false);
    }
}

/* ── Logout ───────────────────────────────────────────────── */
function handleLogout() { auth.signOut(); }

/* Enter key support on auth forms */
document.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const lf = document.getElementById('loginForm');
    const rf = document.getElementById('registerForm');
    if (lf && lf.classList.contains('active')) handleLogin();
    else if (rf && rf.classList.contains('active')) handleRegister();
});

/* ── Auth State ───────────────────────────────────────────── */
auth.onAuthStateChanged(user => {
    currentUser = user;
    if (user) {
        document.getElementById('authContainer').style.display = 'none';
        document.getElementById('dashboardContainer').classList.remove('hidden');

        const name = user.displayName || user.email;
        document.getElementById('userName').textContent    = name;
        document.getElementById('userAvatar').textContent  = name.charAt(0).toUpperCase();
        loadAllData();
    } else {
        document.getElementById('authContainer').style.display = 'flex';
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
    overview: { title:'Overview',      subtitle:'Your financial summary at a glance' },
    income:   { title:'Income',        subtitle:'Manage income sources and tax deductions' },
    expenses: { title:'Expenses',      subtitle:'Track monthly spending patterns' },
    savings:  { title:'Savings',       subtitle:'Monitor your investment portfolio' },
    tax:      { title:'Tax Planner',   subtitle:'Compare old vs new tax regime' },
    health:   { title:'Health Score',  subtitle:'Analyse your financial fitness' },
};

function switchTab(name, btn) {
    /* Nav items */
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (btn) btn.classList.add('active');
    else {
        const target = document.querySelector(`[data-tab="${name}"]`);
        if (target) target.classList.add('active');
    }

    /* Content */
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(name + 'Tab')?.classList.add('active');

    /* Header */
    const meta = tabMeta[name] || {};
    document.getElementById('pageTitle').textContent    = meta.title    || name;
    document.getElementById('pageSubtitle').textContent = meta.subtitle || '';

    /* Close sidebar on mobile */
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth <= 900 && sidebar.classList.contains('open')) {
        toggleSidebar();
    }
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
    try {
        await incomeRef(yr).set(doc, { merge: true });
        toast('✅ Income saved!', 'success');
        loadAllData();
    } catch (e) { toast('❌ ' + e.message, 'error'); }
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
    doc.total_deductions = doc.section_80c + doc.section_80d + doc.section_80g
                         + doc.section_24  + doc.nps_80ccd  + doc.hra_exemption;
    try {
        await deductRef(yr).set(doc, { merge: true });
        toast('✅ Deductions saved!', 'success');
    } catch (e) { toast('❌ ' + e.message, 'error'); }
}

async function saveExpense() {
    const mo = v('expMonth');
    if (!mo) { toast('⚠️ Enter Month-Year (e.g. 2024-12)', 'error'); return; }
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
    doc.total_expenses = doc.rent + doc.groceries + doc.utilities
                       + doc.transportation + doc.entertainment + doc.healthcare + doc.education;
    try {
        await expenseRef(mo).set(doc, { merge: true });
        toast('✅ Expenses saved!', 'success');
        loadAllData();
    } catch (e) { toast('❌ ' + e.message, 'error'); }
}

async function saveSavings() {
    const mo = v('savMonth');
    if (!mo) { toast('⚠️ Enter Month-Year (e.g. 2024-12)', 'error'); return; }
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
    doc.total_savings = doc.fixed_deposits + doc.mutual_funds + doc.ppf
                      + doc.stocks + doc.gold + doc.emergency_fund;
    try {
        await savingRef(mo).set(doc, { merge: true });
        toast('✅ Savings saved!', 'success');
        loadAllData();
    } catch (e) { toast('❌ ' + e.message, 'error'); }
}

async function deleteExpense(mo) {
    if (!confirm(`Delete expense record for ${mo}?`)) return;
    try {
        await expenseRef(mo).delete();
        toast('🗑️ Deleted!', 'success');
        loadAllData();
    } catch (e) { toast('❌ ' + e.message, 'error'); }
}

async function deleteSaving(mo) {
    if (!confirm(`Delete savings record for ${mo}?`)) return;
    try {
        await savingRef(mo).delete();
        toast('🗑️ Deleted!', 'success');
        loadAllData();
    } catch (e) { toast('❌ ' + e.message, 'error'); }
}

/* ══════════════════════════════════════════════════════════════
   LOAD FUNCTIONS
   ══════════════════════════════════════════════════════════════ */
async function loadAllData() {
    await Promise.all([loadOverview(), loadIncomeTable(), loadExpenseTable(), loadSavingsTable()]);
}

/* ── Overview ─────────────────────────────────────────────── */
async function loadOverview() {
    try {
        const [incSnap, expSnap, savSnap] = await Promise.all([
            userRef().collection('income').orderBy('financial_year', 'desc').limit(1).get(),
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

        /* Stat cards */
        animateCount('statIncome',  totalInc);
        animateCount('statExpense', Math.round(avgExp));
        animateCount('statSavings', totalSav);

        let healthScore = '—';
        if (totalInc > 0) {
            const savRatio = (totalSav / totalInc) * 100;
            const expRatio = (avgExp * 12 / totalInc) * 100;
            healthScore = Math.min(100, Math.max(0,
                Math.round((savRatio >= 20 ? 40 : savRatio * 2) +
                           (expRatio <= 50 ? 40 : Math.max(0, 40 - (expRatio - 50))) + 20)
            ));
        }
        document.getElementById('statHealth').textContent = healthScore;
        const hBadge = document.getElementById('statHealthBadge');
        if (typeof healthScore === 'number') {
            hBadge.textContent = '/ 100';
            hBadge.className = 'stat-trend ' + (healthScore >= 70 ? 'up' : 'neutral');
        }

        /* Summary card */
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

        /* Recent expenses */
        const recent = [...expenses].sort((a, b) => b.month_year.localeCompare(a.month_year)).slice(0, 5);
        document.getElementById('recentExpenses').innerHTML = recent.length ? `
            <div class="table-wrap">
            <table>
                <thead><tr><th>Month</th><th>Rent</th><th>Groceries</th><th>Utilities</th><th>Total</th></tr></thead>
                <tbody>
                ${recent.map(e => `<tr>
                    <td>${e.month_year}</td>
                    <td>${fmt(e.rent)}</td>
                    <td>${fmt(e.groceries)}</td>
                    <td>${fmt(e.utilities)}</td>
                    <td><strong>${fmt(e.total_expenses)}</strong></td>
                </tr>`).join('')}
                </tbody>
            </table></div>
        ` : `<p style="color:var(--text-muted);font-size:.9rem;">No expense records yet.</p>`;
    } catch (e) {
        document.getElementById('overviewContent').innerHTML =
            `<p style="color:var(--red);">Error loading data: ${e.message}</p>`;
    }
}

/* ── Income Table ─────────────────────────────────────────── */
async function loadIncomeTable() {
    try {
        const snap = await userRef().collection('income').orderBy('financial_year', 'desc').get();
        if (snap.empty) { document.getElementById('incomeTable').innerHTML = '<p style="color:var(--text-muted);font-size:.9rem;">No income records yet.</p>'; return; }
        document.getElementById('incomeTable').innerHTML = `
            <div class="table-wrap"><table>
                <thead><tr><th>Year</th><th>Salary</th><th>Bonus</th><th>Other</th><th>Total</th></tr></thead>
                <tbody>
                ${snap.docs.map(d => {
                    const r = d.data();
                    return `<tr>
                        <td>${r.financial_year}</td>
                        <td>${fmt(r.salary)}</td>
                        <td>${fmt(r.bonus)}</td>
                        <td>${fmt((r.rental_income||0)+(r.capital_gains||0)+(r.other_income||0))}</td>
                        <td><strong>${fmt(r.total_income)}</strong></td>
                    </tr>`;
                }).join('')}
                </tbody>
            </table></div>`;
    } catch (e) {
        document.getElementById('incomeTable').innerHTML = `<p style="color:var(--red);">${e.message}</p>`;
    }
}

/* ── Expense Table ────────────────────────────────────────── */
async function loadExpenseTable() {
    try {
        const snap = await userRef().collection('expenses').orderBy('month_year', 'desc').get();
        if (snap.empty) { document.getElementById('expenseTable').innerHTML = '<p style="color:var(--text-muted);font-size:.9rem;">No expense records yet.</p>'; return; }
        document.getElementById('expenseTable').innerHTML = `
            <div class="table-wrap"><table>
                <thead><tr><th>Month</th><th>Rent</th><th>Groceries</th><th>Utilities</th><th>Transport</th><th>Total</th><th>Action</th></tr></thead>
                <tbody>
                ${snap.docs.map(d => {
                    const r = d.data();
                    return `<tr>
                        <td>${r.month_year}</td>
                        <td>${fmt(r.rent)}</td>
                        <td>${fmt(r.groceries)}</td>
                        <td>${fmt(r.utilities)}</td>
                        <td>${fmt(r.transportation)}</td>
                        <td><strong>${fmt(r.total_expenses)}</strong></td>
                        <td><button class="action-btn del" onclick="deleteExpense('${r.month_year}')">🗑️ Delete</button></td>
                    </tr>`;
                }).join('')}
                </tbody>
            </table></div>`;
    } catch (e) {
        document.getElementById('expenseTable').innerHTML = `<p style="color:var(--red);">${e.message}</p>`;
    }
}

/* ── Savings Table ────────────────────────────────────────── */
async function loadSavingsTable() {
    try {
        const snap = await userRef().collection('savings').orderBy('month_year', 'desc').get();
        if (snap.empty) { document.getElementById('savingsTable').innerHTML = '<p style="color:var(--text-muted);font-size:.9rem;">No savings records yet.</p>'; return; }
        document.getElementById('savingsTable').innerHTML = `
            <div class="table-wrap"><table>
                <thead><tr><th>Month</th><th>FDs</th><th>Mutual Funds</th><th>PPF</th><th>Stocks</th><th>Total</th><th>Action</th></tr></thead>
                <tbody>
                ${snap.docs.map(d => {
                    const r = d.data();
                    return `<tr>
                        <td>${r.month_year}</td>
                        <td>${fmt(r.fixed_deposits)}</td>
                        <td>${fmt(r.mutual_funds)}</td>
                        <td>${fmt(r.ppf)}</td>
                        <td>${fmt(r.stocks)}</td>
                        <td><strong>${fmt(r.total_savings)}</strong></td>
                        <td><button class="action-btn del" onclick="deleteSaving('${r.month_year}')">🗑️ Delete</button></td>
                    </tr>`;
                }).join('')}
                </tbody>
            </table></div>`;
    } catch (e) {
        document.getElementById('savingsTable').innerHTML = `<p style="color:var(--red);">${e.message}</p>`;
    }
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
        const inc   = incSnap.data();
        const ded   = dedSnap.exists ? dedSnap.data() : {};
        const gross = inc.total_income;

        /* Old Regime */
        const std      = 50000;
        const totalDed = Math.min(ded.section_80c  || 0, 150000)
                       + Math.min(ded.section_80d  || 0, 25000)
                       + (ded.section_80g  || 0)
                       + Math.min(ded.section_24   || 0, 200000)
                       + Math.min(ded.nps_80ccd    || 0, 50000)
                       + (ded.hra_exemption || 0);
        const oldTaxable = Math.max(0, gross - std - totalDed);
        const oldTax     = calcOldTax(oldTaxable);

        /* New Regime */
        const newStd     = 75000;
        const newTaxable = Math.max(0, gross - newStd);
        const newTax     = calcNewTax(newTaxable);

        const recommended = oldTax <= newTax ? 'old' : 'new';
        const saved       = Math.abs(oldTax - newTax);

        result.innerHTML = `
            <div class="tax-grid">
                <div class="tax-panel ${recommended === 'old' ? 'winner' : ''}">
                    <h3>Old Regime ${recommended === 'old' ? '✅' : ''}</h3>
                    <div class="metric-row"><span>Gross Income</span><span class="metric-val">${fmt(gross)}</span></div>
                    <div class="metric-row"><span>Total Deductions</span><span class="metric-val">${fmt(std + totalDed)}</span></div>
                    <div class="metric-row"><span>Taxable Income</span><span class="metric-val">${fmt(oldTaxable)}</span></div>
                    <div class="metric-row"><span>Tax + Cess</span><span class="metric-val danger">${fmt(oldTax)}</span></div>
                    <div class="metric-row"><span>Effective Rate</span><span class="metric-val">${gross ? ((oldTax / gross) * 100).toFixed(2) : 0}%</span></div>
                    <div class="metric-row"><span>Post-Tax Income</span><span class="metric-val">${fmt(gross - oldTax)}</span></div>
                </div>
                <div class="tax-panel ${recommended === 'new' ? 'winner' : ''}">
                    <h3>New Regime ${recommended === 'new' ? '✅' : ''}</h3>
                    <div class="metric-row"><span>Gross Income</span><span class="metric-val">${fmt(gross)}</span></div>
                    <div class="metric-row"><span>Standard Deduction</span><span class="metric-val">${fmt(newStd)}</span></div>
                    <div class="metric-row"><span>Taxable Income</span><span class="metric-val">${fmt(newTaxable)}</span></div>
                    <div class="metric-row"><span>Tax + Cess</span><span class="metric-val danger">${fmt(newTax)}</span></div>
                    <div class="metric-row"><span>Effective Rate</span><span class="metric-val">${gross ? ((newTax / gross) * 100).toFixed(2) : 0}%</span></div>
                    <div class="metric-row"><span>Post-Tax Income</span><span class="metric-val">${fmt(gross - newTax)}</span></div>
                </div>
            </div>
            <div class="tax-reco">
                💡 Choose the <strong>${recommended.toUpperCase()} REGIME</strong> and save <strong>${fmt(saved)}</strong> in taxes this year.
            </div>`;
    } catch (e) {
        result.innerHTML = `<p style="color:var(--red);">Error: ${e.message}</p>`;
    }
}

function calcOldTax(inc) {
    let t = 0;
    if      (inc <= 250000)  t = 0;
    else if (inc <= 500000)  t = (inc - 250000) * 0.05;
    else if (inc <= 750000)  t = 12500 + (inc - 500000) * 0.10;
    else if (inc <= 1000000) t = 37500 + (inc - 750000) * 0.15;
    else if (inc <= 1250000) t = 75000 + (inc - 1000000) * 0.20;
    else if (inc <= 1500000) t = 125000 + (inc - 1250000) * 0.25;
    else                     t = 187500 + (inc - 1500000) * 0.30;
    return Math.round(t * 1.04);
}
function calcNewTax(inc) {
    let t = 0;
    if      (inc <= 300000)  t = 0;
    else if (inc <= 600000)  t = (inc - 300000) * 0.05;
    else if (inc <= 900000)  t = 15000 + (inc - 600000) * 0.10;
    else if (inc <= 1200000) t = 45000 + (inc - 900000) * 0.15;
    else if (inc <= 1500000) t = 90000 + (inc - 1200000) * 0.20;
    else                     t = 150000 + (inc - 1500000) * 0.30;
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
            userRef().collection('income').orderBy('financial_year', 'desc').limit(1).get(),
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
        const savRatio  = annualInc > 0 ? (totalSav / annualInc) * 100 : 0;
        const expRatio  = annualInc > 0 ? (annualExp / annualInc) * 100 : 0;

        const savScore = Math.min(40, savRatio * 2);
        const expScore = expRatio <= 50 ? 40 : Math.max(0, 40 - (expRatio - 50));
        const divScore = savings.length > 0 ? Math.min(20,
            [s => s.fixed_deposits, s => s.mutual_funds, s => s.ppf,
             s => s.stocks, s => s.gold, s => s.emergency_fund]
            .filter(fn => savings.some(s => fn(s) > 0)).length * (20 / 6)
        ) : 0;

        const overall = Math.min(100, Math.round(savScore + expScore + divScore));
        const cat = overall >= 80 ? '🌟 Excellent' : overall >= 60 ? '😊 Good' : overall >= 40 ? '😐 Fair' : '⚠️ Needs Attention';
        const catColor = overall >= 80 ? 'var(--green)' : overall >= 60 ? '#6C63FF' : overall >= 40 ? 'var(--yellow)' : 'var(--red)';

        const circumference = 2 * Math.PI * 70; // r=70
        const dash          = (overall / 100) * circumference;

        const recs = [];
        if (savRatio < 20) recs.push('Increase your savings — aim for ≥ 20% of annual income.');
        if (expRatio > 50) recs.push(`Reduce monthly expenses — currently ${expRatio.toFixed(0)}% of income.`);
        if (divScore < 15) recs.push('Diversify investments: add stocks, mutual funds, or gold.');
        if (overall >= 80) recs.push('You\'re doing great! Stay consistent and review your portfolio annually.');

        result.innerHTML = `
            <div class="health-score-circle">
                <div class="score-ring">
                    <svg viewBox="0 0 160 160">
                        <circle class="bg-ring" cx="80" cy="80" r="70"/>
                        <circle class="fg-ring" id="healthRing" cx="80" cy="80" r="70"
                            stroke="${catColor}"
                            stroke-dasharray="0 ${circumference}"/>
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
                    <div class="hm-label">Savings Ratio
                        <span class="hm-badge" style="color:${savRatio >= 20 ? 'var(--green)' : 'var(--red)'}">
                            ${savRatio >= 20 ? '✅ Good ≥ 20%' : '⚠️ Low < 20%'}
                        </span>
                    </div>
                </div>
                <div class="hm-card">
                    <div class="hm-val">${expRatio.toFixed(1)}%</div>
                    <div class="hm-label">Expense Ratio
                        <span class="hm-badge" style="color:${expRatio <= 50 ? 'var(--green)' : 'var(--red)'}">
                            ${expRatio <= 50 ? '✅ Good ≤ 50%' : '⚠️ High > 50%'}
                        </span>
                    </div>
                </div>
                <div class="hm-card">
                    <div class="hm-val">${fmt(totalSav)}</div>
                    <div class="hm-label">Total Accumulated Savings</div>
                </div>
            </div>

            <div class="health-reco">
                <strong>💡 Recommendations:</strong>
                <ul style="margin-top:8px;">
                    ${recs.map(r => `<li>${r}</li>`).join('')}
                </ul>
            </div>
        `;

        /* Animate ring */
        setTimeout(() => {
            const ring = document.getElementById('healthRing');
            if (ring) ring.style.strokeDasharray = `${dash} ${circumference}`;
        }, 100);
    } catch (e) {
        result.innerHTML = `<p style="color:var(--red);">Error: ${e.message}</p>`;
    }
}

/* ══════════════════════════════════════════════════════════════
   UI UTILITIES
   ══════════════════════════════════════════════════════════════ */
const v   = id => document.getElementById(id)?.value?.trim() || '';
const num = id => parseFloat(document.getElementById(id)?.value) || 0;

function fmt(n) {
    return '₹' + (n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

/* Animated counter */
function animateCount(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const start    = 0;
    const duration = 800;
    const startT   = performance.now();
    const tick = now => {
        const progress = Math.min((now - startT) / duration, 1);
        const eased    = 1 - Math.pow(1 - progress, 3);
        el.textContent = fmt(Math.round(start + (target - start) * eased));
        if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}

/* Toast */
let toastTimer;
function toast(msg, type = 'success') {
    clearTimeout(toastTimer);
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className   = `toast ${type} show`;
    toastTimer    = setTimeout(() => t.classList.remove('show'), 3200);
}