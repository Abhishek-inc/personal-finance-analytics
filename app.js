/* ═══════════════════════════════════════════════════════════════
   FINANCEHUB — app.js
   Firebase config + all logic
   ═══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
   FIREBASE CONFIG — Finance2 project
   ══════════════════════════════════════════════════════════════ */

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBD_h5vlzZlKsvACxYO4DgHCGlHBUtZ-Es",
  authDomain: "finance2-23040.firebaseapp.com",
  projectId: "finance2-23040",
  storageBucket: "finance2-23040.firebasestorage.app",
  messagingSenderId: "116457563366",
  appId: "1:116457563366:web:64e04929121d671b3b0727",
  measurementId: "G-2SWG2SBERN"
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
    overview: { title:'Overview',        subtitle:'Your financial summary at a glance' },
    income:   { title:'Income',          subtitle:'Manage income sources and tax deductions' },
    expenses: { title:'Expenses',        subtitle:'Track monthly spending patterns' },
    savings:  { title:'Savings',         subtitle:'Monitor your investment portfolio' },
    tax:      { title:'Tax Planner',     subtitle:'Compare old vs new tax regime' },
    health:   { title:'Health Score',    subtitle:'Analyse your financial fitness' },
    ai:       { title:'AI Predictions',  subtitle:'ML-powered forecasts & Claude AI deep analysis' },
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
        loadDeductionTable();
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

async function deleteDeduction(yr) {
    if (!confirm(`Delete deduction record for FY ${yr}?`)) return;
    try {
        await deductRef(yr).delete();
        toast('🗑️ Deleted!', 'success');
        loadDeductionTable();
    } catch (e) { toast('❌ ' + e.message, 'error'); }
}

/* ══════════════════════════════════════════════════════════════
   LOAD FUNCTIONS
   ══════════════════════════════════════════════════════════════ */
async function loadAllData() {
    await Promise.all([
        loadOverview(),
        loadIncomeTable(),
        loadDeductionTable(),
        loadExpenseTable(),
        loadSavingsTable()
    ]);
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

        animateCount('statIncome',  totalInc);
        animateCount('statExpense', Math.round(avgExp));
        animateCount('statSavings', totalSav);

        let healthScore = '—';
        if (totalInc > 0) {
            const avgSav   = savings.length ? totalSav / savings.length : 0;
            const savRatio = (avgSav * 12 / totalInc) * 100;
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
        if (snap.empty) {
            document.getElementById('incomeTable').innerHTML =
                '<p style="color:var(--text-muted);font-size:.9rem;">No income records yet.</p>';
            return;
        }
        document.getElementById('incomeTable').innerHTML = `
            <div class="table-wrap"><table>
                <thead><tr>
                    <th>Year</th>
                    <th>Salary <span class="th-badge badge-annual">Annual</span></th>
                    <th>Bonus <span class="th-badge badge-lumpsum">Lump-sum</span></th>
                    <th>Rental <span class="th-badge badge-annual">Annual</span></th>
                    <th>Capital Gains <span class="th-badge badge-lumpsum">Lump-sum</span></th>
                    <th>Other <span class="th-badge badge-annual">Annual</span></th>
                    <th>Total</th>
                </tr></thead>
                <tbody>
                ${snap.docs.map(d => {
                    const r = d.data();
                    return `<tr>
                        <td>${r.financial_year}</td>
                        <td>${fmt(r.salary)}</td>
                        <td>${fmt(r.bonus)}</td>
                        <td>${fmt(r.rental_income || 0)}</td>
                        <td>${fmt(r.capital_gains || 0)}</td>
                        <td>${fmt(r.other_income || 0)}</td>
                        <td><strong>${fmt(r.total_income)}</strong></td>
                    </tr>`;
                }).join('')}
                </tbody>
            </table></div>`;
    } catch (e) {
        document.getElementById('incomeTable').innerHTML = `<p style="color:var(--red);">${e.message}</p>`;
    }
}

/* ── Deduction Table ──────────────────────────────────────── */
async function loadDeductionTable() {
    try {
        const snap = await userRef().collection('deductions').orderBy('financial_year', 'desc').get();
        if (snap.empty) {
            document.getElementById('deductionTable').innerHTML =
                '<p style="color:var(--text-muted);font-size:.9rem;">No deduction records yet. Fill in the Tax Deductions form above and click Save Deductions.</p>';
            return;
        }
        document.getElementById('deductionTable').innerHTML = `
            <div class="table-wrap"><table>
                <thead><tr>
                    <th>Year</th>
                    <th>80C <span class="th-badge badge-annual">Annual</span></th>
                    <th>80D <span class="th-badge badge-annual">Annual</span></th>
                    <th>80G <span class="th-badge badge-lumpsum">Lump-sum</span></th>
                    <th>Home Loan Int. <span class="th-badge badge-annual">Annual</span></th>
                    <th>NPS 80CCD <span class="th-badge badge-annual">Annual</span></th>
                    <th>HRA Exemption <span class="th-badge badge-annual">Annual</span></th>
                    <th>Total Deductions</th>
                    <th>Action</th>
                </tr></thead>
                <tbody>
                ${snap.docs.map(d => {
                    const r = d.data();
                    return `<tr>
                        <td>${r.financial_year}</td>
                        <td>${fmt(r.section_80c || 0)}</td>
                        <td>${fmt(r.section_80d || 0)}</td>
                        <td>${fmt(r.section_80g || 0)}</td>
                        <td>${fmt(r.section_24 || 0)}</td>
                        <td>${fmt(r.nps_80ccd || 0)}</td>
                        <td>${fmt(r.hra_exemption || 0)}</td>
                        <td><strong>${fmt(r.total_deductions || 0)}</strong></td>
                        <td><button class="action-btn del" onclick="deleteDeduction('${r.financial_year}')">🗑️ Delete</button></td>
                    </tr>`;
                }).join('')}
                </tbody>
            </table></div>`;
    } catch (e) {
        document.getElementById('deductionTable').innerHTML = `<p style="color:var(--red);">${e.message}</p>`;
    }
}

/* ── Expense Table ────────────────────────────────────────── */
async function loadExpenseTable() {
    try {
        const snap = await userRef().collection('expenses').orderBy('month_year', 'desc').get();
        if (snap.empty) {
            document.getElementById('expenseTable').innerHTML =
                '<p style="color:var(--text-muted);font-size:.9rem;">No expense records yet.</p>';
            return;
        }
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
        if (snap.empty) {
            document.getElementById('savingsTable').innerHTML =
                '<p style="color:var(--text-muted);font-size:.9rem;">No savings records yet.</p>';
            return;
        }
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

        const std      = 50000;
        const totalDed = Math.min(ded.section_80c  || 0, 150000)
                       + Math.min(ded.section_80d  || 0, 25000)
                       + (ded.section_80g  || 0)
                       + Math.min(ded.section_24   || 0, 200000)
                       + Math.min(ded.nps_80ccd    || 0, 50000)
                       + (ded.hra_exemption || 0);
        const oldTaxable = Math.max(0, gross - std - totalDed);
        const oldTax     = calcOldTax(oldTaxable);

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

        const avgSav    = savings.length ? totalSav / savings.length : 0;
        const annualSav = avgSav * 12;
        const savRatio  = annualInc > 0 ? (annualSav / annualInc) * 100 : 0;
        const expRatio  = annualInc > 0 ? (annualExp / annualInc) * 100 : 0;

        const response = await fetch("http://13.60.249.215:8000/score", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
            annual_income: annualInc,
            annual_expenses: annualExp,
            total_savings: totalSav,
            savings_ratio: savRatio,
            expense_ratio: expRatio
        })
    });

const ml = await response.json();
const overall = ml.health_score;
        const cat = overall >= 80 ? '🌟 Excellent' : overall >= 60 ? '😊 Good' : overall >= 40 ? '😐 Fair' : '⚠️ Needs Attention';
        const catColor = overall >= 80 ? 'var(--green)' : overall >= 60 ? '#6C63FF' : overall >= 40 ? 'var(--yellow)' : 'var(--red)';

        const circumference = 2 * Math.PI * 70;
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
                    <div class="hm-label">Savings Ratio <span style="font-size:.65rem;color:var(--text-dim)">(annualised)</span>
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

let toastTimer;
function toast(msg, type = 'success') {
    clearTimeout(toastTimer);
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className   = `toast ${type} show`;
    toastTimer    = setTimeout(() => t.classList.remove('show'), 3200);
}

/* ══════════════════════════════════════════════════════════════
   AI PREDICTIONS ENGINE
   ══════════════════════════════════════════════════════════════ */

let forecastChartInstance = null;

function linearRegression(yArr) {
    const n = yArr.length;
    if (n < 2) return { slope: 0, intercept: yArr[0] || 0, r2: 0 };
    const xArr = yArr.map((_, i) => i);
    const xMean = xArr.reduce((a, b) => a + b, 0) / n;
    const yMean = yArr.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0, ssTot = 0, ssRes = 0;
    for (let i = 0; i < n; i++) {
        num += (xArr[i] - xMean) * (yArr[i] - yMean);
        den += (xArr[i] - xMean) ** 2;
    }
    const slope     = den !== 0 ? num / den : 0;
    const intercept = yMean - slope * xMean;
    for (let i = 0; i < n; i++) {
        const pred = slope * xArr[i] + intercept;
        ssRes += (yArr[i] - pred) ** 2;
        ssTot += (yArr[i] - yMean) ** 2;
    }
    const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
    return { slope, intercept, r2 };
}

function expSmoothForecast(data, steps, alpha = 0.3) {
    if (!data.length) return Array(steps).fill(0);
    let s = data[0];
    for (let i = 1; i < data.length; i++) s = alpha * data[i] + (1 - alpha) * s;
    const lr   = linearRegression(data);
    const preds = [];
    for (let i = 1; i <= steps; i++) {
        const trendVal = lr.slope * (data.length + i) + lr.intercept;
        preds.push(Math.max(0, Math.round(0.6 * s + 0.4 * trendVal)));
        s = alpha * s + (1 - alpha) * s;
    }
    return preds;
}

function weightedMA(arr, weights = null) {
    if (!arr.length) return 0;
    const n = arr.length;
    const w = weights || arr.map((_, i) => i + 1);
    const wSlice = w.slice(-n);
    const wSum   = wSlice.reduce((a, b) => a + b, 0);
    return arr.reduce((sum, val, i) => sum + val * wSlice[i], 0) / wSum;
}

function detectAnomalies(records, field, threshold = 1.8) {
    const vals  = records.map(r => r[field] || 0);
    const mean  = vals.reduce((a, b) => a + b, 0) / vals.length;
    const std   = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
    if (std === 0) return [];
    return records
        .map((r, i) => ({ month: r.month_year, value: vals[i], z: (vals[i] - mean) / std }))
        .filter(a => Math.abs(a.z) >= threshold && a.value > 0)
        .sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
}

function confidenceBand(data, forecasts) {
    const residuals = data.slice(-Math.min(data.length, 6));
    const mean = residuals.reduce((a, b) => a + b, 0) / residuals.length;
    const std  = Math.sqrt(residuals.reduce((s, v) => s + (v - mean) ** 2, 0) / residuals.length);
    return forecasts.map((f, i) => ({
        upper: Math.round(f + std * (1 + i * 0.1)),
        lower: Math.max(0, Math.round(f - std * (1 + i * 0.1)))
    }));
}

async function runAIPredictions() {
    const btn   = document.getElementById('btnAILabel');
    btn.textContent = '⏳ Analysing…';
    document.getElementById('btnRunAI').disabled = true;

    try {
        const [incSnap, expSnap, savSnap] = await Promise.all([
            userRef().collection('income').orderBy('financial_year', 'desc').get(),
            userRef().collection('expenses').orderBy('month_year', 'asc').get(),
            userRef().collection('savings').orderBy('month_year', 'asc').get()
        ]);

        const incomes  = incSnap.docs.map(d => d.data());
        const expenses = expSnap.docs.map(d => d.data());
        const savings  = savSnap.docs.map(d => d.data());
        const latestInc = incomes[0] || null;

        if (!latestInc) {
            toast('⚠️ Add income data first to run AI predictions.', 'error');
            btn.textContent = '▶ Run Full Analysis';
            document.getElementById('btnRunAI').disabled = false;
            return;
        }

        const expTotals  = expenses.map(e => e.total_expenses);
        const savTotals  = savings.map(s => s.total_savings);
        const annualInc  = latestInc.total_income;
        const monthlyInc = annualInc / 12;

        const expLR  = linearRegression(expTotals);
        const savLR  = linearRegression(savTotals);

        const expWMA       = weightedMA(expTotals);
        const expExpSmooth = expSmoothForecast(expTotals, 1)[0];
        const expLRNext    = expLR.slope * expTotals.length + expLR.intercept;
        const nextExpense  = Math.max(0, Math.round(
            (expWMA * 0.3 + expExpSmooth * 0.4 + expLRNext * 0.3)
        ));

        const savWMA       = weightedMA(savTotals);
        const savExpSmooth = expSmoothForecast(savTotals, 1)[0];
        const savLRNext    = savLR.slope * savTotals.length + savLR.intercept;
        const nextSaving   = Math.max(0, Math.round(
            (savWMA * 0.3 + savExpSmooth * 0.4 + savLRNext * 0.3)
        ));

        const exp6  = expSmoothForecast(expTotals, 6);
        const sav6  = expSmoothForecast(savTotals, 6);
        const expCI = confidenceBand(expTotals, exp6);
        const savCI = confidenceBand(savTotals, sav6);

        const projAnnualSav = nextSaving * 12;

        const avgExp    = expTotals.length ? expTotals.reduce((a, b) => a + b, 0) / expTotals.length : monthlyInc * 0.4;
        const goalAmt   = avgExp * 6;
        const curSavTot = savTotals.reduce((a, b) => a + b, 0);
        const remaining = Math.max(0, goalAmt - curSavTot);
        const etaMonths = nextSaving > 0 ? Math.ceil(remaining / nextSaving) : null;

        const expAnomalies  = detectAnomalies(expenses, 'total_expenses');
        const rentAnom      = detectAnomalies(expenses, 'rent');
        const grocAnom      = detectAnomalies(expenses, 'groceries');
        const utilAnom      = detectAnomalies(expenses, 'utilities');
        const allAnomalies  = [
            ...expAnomalies.map(a  => ({ ...a, cat: 'Total Expenses' })),
            ...rentAnom.map(a      => ({ ...a, cat: 'Rent' })),
            ...grocAnom.map(a      => ({ ...a, cat: 'Groceries' })),
            ...utilAnom.map(a      => ({ ...a, cat: 'Utilities' })),
        ].sort((a, b) => Math.abs(b.z) - Math.abs(a.z)).slice(0, 6);

        const catFields = ['rent','groceries','utilities','transportation','entertainment','healthcare','education'];
        const catPreds  = catFields.map(f => {
            const vals  = expenses.map(e => e[f] || 0);
            const pred  = vals.length ? Math.max(0, Math.round(weightedMA(vals) * 0.5 + expSmoothForecast(vals, 1)[0] * 0.5)) : 0;
            return { name: f.charAt(0).toUpperCase() + f.slice(1), predicted: pred };
        }).filter(c => c.predicted > 0);

        updatePredCard('predExpense', fmt(nextExpense),
            `WMA·ExpSmooth·LR blend | R²=${expLR.r2.toFixed(2)}`,
            nextExpense > avgExp ? '↑ Above average' : '↓ Below average',
            nextExpense > avgExp ? 'warn' : 'good');

        updatePredCard('predSavings', fmt(projAnnualSav),
            `Projected from monthly avg ×12`,
            projAnnualSav >= annualInc * 0.2 ? '✅ On track ≥ 20%' : '⚠️ Below 20% target',
            projAnnualSav >= annualInc * 0.2 ? 'good' : 'warn');

        updatePredCard('predGoal', etaMonths !== null ? `${etaMonths} months` : 'Goal met!',
            `Emergency fund goal: ${fmt(Math.round(goalAmt))}`,
            etaMonths !== null ? `Remaining: ${fmt(Math.round(remaining))}` : '🎉 Emergency fund complete!',
            etaMonths !== null && etaMonths <= 6 ? 'good' : etaMonths === null ? 'good' : 'warn');

        updatePredCard('predAnomaly',
            allAnomalies.length === 0 ? 'None Found' : `${allAnomalies.length} detected`,
            allAnomalies.length === 0 ? 'All spending patterns normal' : 'Unusual spending detected',
            allAnomalies.length === 0 ? '✅ Healthy spending' : '⚠️ Review details below',
            allAnomalies.length === 0 ? 'good' : 'warn');

        renderForecastChart(expenses, savings, exp6, sav6, expCI, savCI);
        renderCategoryPred(catPreds, nextExpense);
        renderAnomalies(allAnomalies);

        ['forecastChartCard','categoryPredCard','anomalyCard','claudeAnalysisCard']
            .forEach(id => document.getElementById(id).style.display = 'block');

        runClaudeAnalysis({
            latestInc, expenses, savings,
            nextExpense, nextSaving, projAnnualSav,
            expLR, savLR, allAnomalies, etaMonths,
            goalAmt, avgExp, catPreds
        });

    } catch(e) {
        toast('❌ AI Error: ' + e.message, 'error');
        console.error(e);
    } finally {
        btn.textContent = '▶ Run Full Analysis';
        document.getElementById('btnRunAI').disabled = false;
    }
}

function updatePredCard(id, val, sub, trend, type) {
    document.getElementById(id + 'Val').textContent   = val;
    document.getElementById(id + 'Sub').textContent   = sub;
    const trendEl = document.getElementById(id + 'Trend');
    trendEl.textContent  = trend;
    trendEl.className    = 'ai-card-trend ' + type;
    document.getElementById(id).classList.add('loaded');
}

function renderForecastChart(expenses, savings, exp6, sav6, expCI, savCI) {
    if (forecastChartInstance) { forecastChartInstance.destroy(); }
    const ctx = document.getElementById('forecastChart').getContext('2d');

    const histMonths = expenses.slice(-6).map(e => e.month_year);
    const lastMonth  = histMonths[histMonths.length - 1] || '2024-12';
    const [yr, mo]   = lastMonth.split('-').map(Number);
    const forecastLabels = [];
    for (let i = 1; i <= 6; i++) {
        const d = new Date(yr, mo - 1 + i);
        forecastLabels.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
    }
    const allLabels = [...histMonths, ...forecastLabels];

    const histExp = expenses.slice(-6).map(e => e.total_expenses);
    const histSav = savings.slice(-6).map(s => s.total_savings);
    const nullPad = len => Array(len).fill(null);

    forecastChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: allLabels,
            datasets: [
                {
                    label: 'Historical Expenses',
                    data: [...histExp, ...nullPad(6)],
                    borderColor: '#FF4F6B', backgroundColor: 'rgba(255,79,107,.08)',
                    borderWidth: 2.5, pointRadius: 4, tension: 0.4, fill: false
                },
                {
                    label: 'Predicted Expenses',
                    data: [...nullPad(Math.max(0, histExp.length - 1)), histExp[histExp.length-1] || null, ...exp6],
                    borderColor: '#FF4F6B', borderDash: [6,4], backgroundColor: 'transparent',
                    borderWidth: 2, pointRadius: 3, tension: 0.4, fill: false
                },
                {
                    label: 'Historical Savings',
                    data: [...histSav, ...nullPad(6)],
                    borderColor: '#10D48E', backgroundColor: 'rgba(16,212,142,.08)',
                    borderWidth: 2.5, pointRadius: 4, tension: 0.4, fill: false
                },
                {
                    label: 'Predicted Savings',
                    data: [...nullPad(Math.max(0, histSav.length - 1)), histSav[histSav.length-1] || null, ...sav6],
                    borderColor: '#10D48E', borderDash: [6,4], backgroundColor: 'transparent',
                    borderWidth: 2, pointRadius: 3, tension: 0.4, fill: false
                },
                {
                    label: 'Exp Upper Band',
                    data: [...nullPad(histExp.length), ...expCI.map(c => c.upper)],
                    borderColor: 'transparent', backgroundColor: 'rgba(255,79,107,.07)',
                    fill: '+1', pointRadius: 0, tension: 0.4
                },
                {
                    label: 'Exp Lower Band',
                    data: [...nullPad(histExp.length), ...expCI.map(c => c.lower)],
                    borderColor: 'transparent', backgroundColor: 'rgba(255,79,107,.07)',
                    fill: false, pointRadius: 0, tension: 0.4
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { color: '#7B80A0', font: { size: 11 }, filter: i => !i.text.includes('Band') } },
                tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ₹${ctx.raw?.toLocaleString('en-IN') || '—'}` } }
            },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,.04)' }, ticks: { color: '#7B80A0', font: { size: 10 } } },
                y: {
                    grid: { color: 'rgba(255,255,255,.04)' },
                    ticks: { color: '#7B80A0', font: { size: 10 }, callback: v => '₹' + (v/1000).toFixed(0) + 'K' }
                }
            }
        }
    });
}

function renderCategoryPred(catPreds, totalPred) {
    const el = document.getElementById('categoryPredContent');
    el.innerHTML = `
        <div class="cat-pred-grid">
        ${catPreds.map(c => {
            const pct = totalPred > 0 ? ((c.predicted / totalPred) * 100).toFixed(1) : 0;
            const barW = Math.min(100, parseFloat(pct));
            return `
            <div class="cat-pred-row">
                <div class="cat-pred-label">${c.name}</div>
                <div class="cat-pred-bar-wrap">
                    <div class="cat-pred-bar" style="width:${barW}%"></div>
                </div>
                <div class="cat-pred-val">${fmt(c.predicted)}</div>
                <div class="cat-pred-pct">${pct}%</div>
            </div>`;
        }).join('')}
        </div>
        <p style="color:var(--text-muted);font-size:.78rem;margin-top:12px;">
            Predicted using Weighted Moving Average + Exponential Smoothing blend per category.
        </p>
    `;
}

function renderAnomalies(anomalies) {
    const el = document.getElementById('anomalyContent');
    if (!anomalies.length) {
        el.innerHTML = `<div class="anomaly-ok">✅ No spending anomalies detected — your spending patterns are consistent!</div>`;
        return;
    }
    el.innerHTML = `
        <p style="color:var(--text-muted);font-size:.82rem;margin-bottom:16px;">
            Detected using Z-Score analysis (threshold ≥ 1.8σ). These months had unusually high or low spending.
        </p>
        <div class="table-wrap"><table>
            <thead><tr><th>Month</th><th>Category</th><th>Amount</th><th>Z-Score</th><th>Severity</th></tr></thead>
            <tbody>
            ${anomalies.map(a => {
                const sev  = Math.abs(a.z) >= 2.5 ? '🔴 High' : Math.abs(a.z) >= 2 ? '🟡 Medium' : '🟢 Low';
                const dir  = a.z > 0 ? '↑ Spike' : '↓ Drop';
                return `<tr>
                    <td>${a.month}</td>
                    <td>${a.cat}</td>
                    <td>${fmt(Math.round(a.value))}</td>
                    <td style="color:${Math.abs(a.z)>=2?'var(--red)':'var(--yellow)'}">${dir} ${a.z.toFixed(2)}σ</td>
                    <td>${sev}</td>
                </tr>`;
            }).join('')}
            </tbody>
        </table></div>`;
}

async function runClaudeAnalysis(data) {
    const el = document.getElementById('claudeAnalysisContent');
    el.innerHTML = `<div class="claude-thinking"><div class="claude-pulse"></div><span>Claude is reading your financial profile securely…</span></div>`;

    const { latestInc, expenses, savings, nextExpense, nextSaving,
            projAnnualSav, expLR, savLR, allAnomalies, etaMonths,
            goalAmt, avgExp, catPreds } = data;

    const totalSav = savings.reduce((s, sv) => s + sv.total_savings, 0);
    const avgSavMo = savings.length ? totalSav / savings.length : 0;
    const savRatio = latestInc.total_income > 0
        ? ((avgSavMo * 12) / latestInc.total_income * 100).toFixed(1) : 0;
    const expRatio = latestInc.total_income > 0
        ? ((avgExp * 12) / latestInc.total_income * 100).toFixed(1) : 0;

    const incomeBracket =
        latestInc.total_income < 300000  ? 'Under ₹3L'  :
        latestInc.total_income < 500000  ? '₹3L–₹5L'   :
        latestInc.total_income < 700000  ? '₹5L–₹7L'   :
        latestInc.total_income < 1000000 ? '₹7L–₹10L'  :
        latestInc.total_income < 1500000 ? '₹10L–₹15L' :
        latestInc.total_income < 2500000 ? '₹15L–₹25L' : 'Above ₹25L';

    const hasBonus    = (latestInc.bonus || 0) > 0;
    const hasRental   = (latestInc.rental_income || 0) > 0;
    const hasCapGains = (latestInc.capital_gains || 0) > 0;

    const expTotal = catPreds.reduce((s, c) => s + c.predicted, 0);
    const catBreakdown = catPreds.slice(0, 5).map(c => ({
        name: c.name,
        pct:  expTotal > 0 ? ((c.predicted / expTotal) * 100).toFixed(1) : 0
    }));

    const prompt = `You are an expert Indian personal finance advisor. Analyse this ANONYMISED financial profile and give highly specific, actionable advice.

ANONYMISED FINANCIAL PROFILE (no identifying information):
- Income bracket: ${incomeBracket} per year (FY ${latestInc.financial_year})
- Income sources: Salary${hasBonus ? ' + Bonus' : ''}${hasRental ? ' + Rental' : ''}${hasCapGains ? ' + Capital Gains' : ''}
- Savings ratio: ${savRatio}% of annual income (annualised from monthly avg)
- Expense ratio: ${expRatio}% of annual income (annualised)
- Months of data: ${expenses.length} expense records, ${savings.length} savings records

ML MODEL RESULTS (anonymous):
- Expense trend: ${expLR.slope > 0 ? 'Increasing' : expLR.slope < 0 ? 'Decreasing' : 'Flat'} (R²=${expLR.r2.toFixed(2)}, model confidence: ${expLR.r2 >= 0.7 ? 'High' : expLR.r2 >= 0.4 ? 'Medium' : 'Low'})
- Savings trend: ${savLR.slope > 0 ? 'Growing' : savLR.slope < 0 ? 'Declining' : 'Flat'} (R²=${savLR.r2.toFixed(2)}, model confidence: ${savLR.r2 >= 0.7 ? 'High' : savLR.r2 >= 0.4 ? 'Medium' : 'Low'})
- Predicted next-month expenses vs average: ${nextExpense > avgExp ? Math.round((nextExpense/avgExp-1)*100) + '% above average' : Math.round((1-nextExpense/avgExp)*100) + '% below average'}
- Projected annual savings vs income: ${((projAnnualSav / latestInc.total_income) * 100).toFixed(1)}% of income
- Emergency fund ETA: ${etaMonths !== null ? etaMonths + ' months away' : 'Already achieved'}
- Spending anomalies: ${allAnomalies.length} detected ${allAnomalies.length > 0 ? '(categories: ' + [...new Set(allAnomalies.map(a => a.cat))].join(', ') + ')' : ''}

EXPENSE CATEGORY BREAKDOWN (% of total, no amounts):
${catBreakdown.map(c => `- ${c.name}: ${c.pct}%`).join('\n')}

Provide analysis in these exact sections using markdown:

## 🔍 Financial Health Assessment
[2-3 sentences on overall health. Use % ratios, not rupee amounts.]

## 📈 Trend Analysis
[What the ML R² scores and slopes mean for this person's trajectory.]

## ⚠️ Key Risk Areas
[Top 2-3 specific risks based on their ratios and trends.]

## 🎯 Top 5 Action Items
[Numbered, specific actions for this income bracket. Use % targets, not exact amounts.]

## 💡 Smart Investment Suggestions
[Specific Indian investment options suited to this income bracket — PPF, ELSS, NPS, SGB, etc.]

## 🔮 12-Month Financial Forecast
[Projected milestones based on current trends and ratios.]

Be specific and actionable. Reference their actual ratios. Max 550 words.`;

    try {
        const claudeProxy = firebase.functions().httpsCallable('claudeProxy', { timeout: 60000 });
        const result      = await claudeProxy({ prompt });
        const text        = result.data?.text || 'Analysis unavailable.';

        el.innerHTML = `
            <div class="privacy-notice">
                🔒 <strong>Privacy protected</strong> — Analysis generated from anonymised ratios only.
                No exact income, expense amounts, or personal data was sent externally.
            </div>
            <div class="claude-output">${markdownToHtml(text)}</div>`;

    } catch(e) {
        el.innerHTML = `
            <div class="claude-setup-guide">
                <h4>🔧 One-time Setup Required</h4>
                <p>The Claude AI analysis uses a secure Firebase Cloud Function to protect your privacy.
                To enable it, deploy the included <code>functions/index.js</code> to your Firebase project:</p>
                <div class="setup-steps">
                    <div class="setup-step"><span class="step-num">1</span>
                        <code>npm install -g firebase-tools</code>
                    </div>
                    <div class="setup-step"><span class="step-num">2</span>
                        <code>firebase login</code>
                    </div>
                    <div class="setup-step"><span class="step-num">3</span>
                        <code>firebase functions:config:set anthropic.key="YOUR_API_KEY"</code>
                    </div>
                    <div class="setup-step"><span class="step-num">4</span>
                        <code>firebase deploy --only functions</code>
                    </div>
                </div>
                <p class="setup-note">✅ All 5 ML predictions above are fully working and 100% private — they run entirely in your browser.</p>
                <p class="setup-error">Error: ${e.message}</p>
            </div>`;
    }
}

/* ── BUG FIX: Corrected regex (was a literal newline, now proper escape) ── */
function markdownToHtml(md) {
    return md
        .replace(/^## (.+)$/gm, '<h3 class="claude-h3">$1</h3>')
        .replace(/^### (.+)$/gm, '<h4 class="claude-h4">$1</h4>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/^\d+\. (.+)$/gm, '<div class="claude-list-item"><span class="claude-num"></span>$1</div>')
        .replace(/^- (.+)$/gm, '<div class="claude-bullet">$1</div>')
        .replace(/\n\n/g, '<br>')
        .replace(/₹([\d,]+)/g, '<span class="claude-rupee">₹$1</span>');
}
