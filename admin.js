/* ═══════════════════════════════════════════════════════════════
   FINANCEHUB — admin.js
   File-based admin panel logic
   ═══════════════════════════════════════════════════════════════ */

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

let currentAdmin  = null;
let adminList     = [];
let allUsersCache = [];
let selectedUID   = null;

/* ══════════════════════════════════════════════════════════════
   LOAD ADMIN LIST FROM admins.json
   ══════════════════════════════════════════════════════════════ */
async function loadAdminList() {
    try {
        const res  = await fetch('admins.json?_=' + Date.now());
        const data = await res.json();
        adminList  = data.admins || [];
    } catch (e) {
        console.error('Could not load admins.json', e);
        adminList = [];
    }
}

/* ══════════════════════════════════════════════════════════════
   AUTH
   ══════════════════════════════════════════════════════════════ */
function toggleAdminPass() {
    const inp  = document.getElementById('adminPassword');
    const icon = document.getElementById('toggleAdminPass');
    if (inp.type === 'password') { inp.type = 'text'; icon.textContent = '🙈'; }
    else { inp.type = 'password'; icon.textContent = '👁️'; }
}

function showAdminAlert(msg, type = 'error') {
    const box = document.getElementById('adminAlertBox');
    box.innerHTML = `<div class="alert alert-${type}" style="margin-bottom:12px">${msg}</div>`;
    setTimeout(() => { box.innerHTML = ''; }, 5000);
}

async function handleAdminLogin() {
    const email = document.getElementById('adminEmail').value.trim();
    const pass  = document.getElementById('adminPassword').value;
    if (!email || !pass) { showAdminAlert('Please enter email and password.'); return; }

    const btn = document.getElementById('adminLoginBtn');
    btn.disabled = true;
    btn.querySelector('span').textContent = 'Verifying…';

    try {
        await loadAdminList();

        // Check if email is in admins.json BEFORE logging in
        if (!adminList.includes(email)) {
            showAdminAlert('❌ Access denied. This email is not an admin account.');
            btn.disabled = false;
            btn.querySelector('span').textContent = 'Access Admin Panel';
            return;
        }

        await auth.signInWithEmailAndPassword(email, pass);
    } catch (e) {
        const map = {
            'auth/invalid-credential': 'Incorrect email or password.',
            'auth/user-not-found':     'No account with this email.',
            'auth/wrong-password':     'Incorrect password.',
            'auth/too-many-requests':  'Too many attempts. Try later.',
        };
        showAdminAlert(map[e.code] || e.message);
        btn.disabled = false;
        btn.querySelector('span').textContent = 'Access Admin Panel';
    }
}

function handleAdminLogout() {
    auth.signOut();
}

// Enter key support
document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && document.getElementById('adminAuthGate').style.display !== 'none') {
        handleAdminLogin();
    }
});

auth.onAuthStateChanged(async user => {
    if (user) {
        await loadAdminList();
        if (!adminList.includes(user.email)) {
            // Logged in but not admin — sign out immediately
            await auth.signOut();
            showAdminAlert('❌ Access denied. Not an admin account.');
            return;
        }
        currentAdmin = user;
        document.getElementById('adminAuthGate').style.display    = 'none';
        document.getElementById('adminDashboard').classList.remove('hidden');
        document.getElementById('adminUserEmail').textContent = user.email;
        loadAllAdminData();
    } else {
        currentAdmin = null;
        document.getElementById('adminAuthGate').style.display    = 'flex';
        document.getElementById('adminDashboard').classList.add('hidden');
    }
});

/* ══════════════════════════════════════════════════════════════
   TAB SWITCHING
   ══════════════════════════════════════════════════════════════ */
function adminSwitchTab(name, btn) {
    document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(name + 'Tab').classList.add('active');
}

/* ══════════════════════════════════════════════════════════════
   LOAD ALL DATA
   ══════════════════════════════════════════════════════════════ */
async function loadAllAdminData() {
    try {
        // Fetch all users
        const usersSnap = await db.collection('users').get();
        allUsersCache   = [];

        let totalIncome   = 0;
        let totalSavings  = 0;
        let totalExpenses = 0;
        let expRecordsCnt = 0;
        let healthScores  = [];

        for (const userDoc of usersSnap.docs) {
            const uid      = userDoc.id;
            const userData = userDoc.data();

            // Fetch sub-collections
            const [incSnap, expSnap, savSnap] = await Promise.all([
                db.collection('users').doc(uid).collection('income').orderBy('financial_year','desc').limit(1).get(),
                db.collection('users').doc(uid).collection('expenses').get(),
                db.collection('users').doc(uid).collection('savings').get()
            ]);

            const latestInc  = incSnap.empty  ? null : incSnap.docs[0].data();
            const expenses   = expSnap.docs.map(d => d.data());
            const savings    = savSnap.docs.map(d => d.data());
            const annualInc  = latestInc ? latestInc.total_income : 0;
            const avgExp     = expenses.length ? expenses.reduce((s,e)=>s+e.total_expenses,0)/expenses.length : 0;
            const totalSav   = savings.reduce((s,sv)=>s+sv.total_savings,0);

            // Calculate health score
            let health = 0;
            if (annualInc > 0) {
                const avgSav   = savings.length ? totalSav / savings.length : 0;
                const savRatio = (avgSav * 12 / annualInc) * 100;
                const expRatio = (avgExp * 12 / annualInc) * 100;
                const savScore = Math.min(40, savRatio * 2);
                const expScore = expRatio <= 50 ? 40 : Math.max(0, 40 - (expRatio - 50));
                health = Math.min(100, Math.round(savScore + expScore + 20));
            }

            totalIncome   += annualInc;
            totalSavings  += totalSav;
            totalExpenses += avgExp;
            expRecordsCnt += expenses.length;
            if (health > 0) healthScores.push(health);

            allUsersCache.push({
                uid, email: userData.email || user?.email || '—',
                name:       userData.full_name || '—',
                createdAt:  userData.created_at?.toDate?.() || null,
                annualInc, avgExp, totalSav, health,
                expRecords: expenses.length, savRecords: savings.length
            });
        }

        const avgHealth = healthScores.length
            ? Math.round(healthScores.reduce((a,b)=>a+b,0)/healthScores.length) : 0;
        const avgExpAll = allUsersCache.length
            ? Math.round(totalExpenses / allUsersCache.length) : 0;

        // Update stat cards
        document.getElementById('statTotalUsers').textContent     = allUsersCache.length;
        document.getElementById('statTotalIncome').textContent    = fmt(totalIncome);
        document.getElementById('statAvgExpense').textContent     = fmt(avgExpAll);
        document.getElementById('statAvgHealth').textContent      = avgHealth + ' / 100';
        document.getElementById('statTotalSavings').textContent   = fmt(totalSavings);
        document.getElementById('statTotalExpRecords').textContent = expRecordsCnt;

        // Render tables
        renderRecentUsers();
        renderUsersTable();
        renderFinancials();
        renderHealthLeaderboard();

    } catch(e) {
        toast('❌ Error loading data: ' + e.message, 'error');
        console.error(e);
    }
}

/* ── Recent Users ─────────────────────────────────────────── */
function renderRecentUsers() {
    const sorted = [...allUsersCache]
        .filter(u => u.createdAt)
        .sort((a,b) => b.createdAt - a.createdAt)
        .slice(0, 8);

    document.getElementById('recentUsersTable').innerHTML = sorted.length ? `
        <div class="table-wrap"><table>
            <thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Health Score</th><th>Annual Income</th></tr></thead>
            <tbody>
            ${sorted.map(u => `<tr>
                <td>${u.name}</td>
                <td style="color:var(--text-muted)">${u.email}</td>
                <td style="color:var(--text-muted)">${u.createdAt ? u.createdAt.toLocaleDateString('en-IN') : '—'}</td>
                <td><span class="health-pill ${u.health>=70?'good':u.health>=40?'fair':'low'}">${u.health}</span></td>
                <td>${fmt(u.annualInc)}</td>
            </tr>`).join('')}
            </tbody>
        </table></div>` : '<p style="color:var(--text-muted);font-size:.9rem">No users yet.</p>';
}

/* ── All Users Table ──────────────────────────────────────── */
function renderUsersTable(filter = '') {
    const filtered = allUsersCache.filter(u =>
        u.email.toLowerCase().includes(filter.toLowerCase()) ||
        u.name.toLowerCase().includes(filter.toLowerCase())
    );

    document.getElementById('usersTableWrap').innerHTML = filtered.length ? `
        <div class="table-wrap"><table>
            <thead><tr>
                <th>Name</th><th>Email</th><th>Joined</th>
                <th>Income</th><th>Avg Expense</th><th>Savings</th>
                <th>Health</th><th>Action</th>
            </tr></thead>
            <tbody>
            ${filtered.map(u => `<tr>
                <td><strong>${u.name}</strong></td>
                <td style="color:var(--text-muted);font-size:.8rem">${u.email}</td>
                <td style="color:var(--text-muted);font-size:.8rem">${u.createdAt ? u.createdAt.toLocaleDateString('en-IN') : '—'}</td>
                <td>${fmt(u.annualInc)}</td>
                <td>${fmt(Math.round(u.avgExp))}</td>
                <td>${fmt(u.totalSav)}</td>
                <td><span class="health-pill ${u.health>=70?'good':u.health>=40?'fair':'low'}">${u.health}</span></td>
                <td>
                    <button class="action-btn" onclick="openUserDetail('${u.uid}')">👁️ View</button>
                </td>
            </tr>`).join('')}
            </tbody>
        </table></div>` : '<p style="color:var(--text-muted);font-size:.9rem">No users found.</p>';
}

function filterUsers() {
    const q = document.getElementById('userSearchInput').value;
    renderUsersTable(q);
}

/* ── User Detail ──────────────────────────────────────────── */
function openUserDetail(uid) {
    const u = allUsersCache.find(x => x.uid === uid);
    if (!u) return;
    selectedUID = uid;

    document.getElementById('detailAvatar').textContent  = (u.name || u.email).charAt(0).toUpperCase();
    document.getElementById('detailName').textContent    = u.name;
    document.getElementById('detailEmail').textContent   = u.email;
    document.getElementById('detailJoined').textContent  = u.createdAt ? 'Joined: ' + u.createdAt.toLocaleDateString('en-IN') : '';
    document.getElementById('detailIncome').textContent  = fmt(u.annualInc);
    document.getElementById('detailExpense').textContent = fmt(Math.round(u.avgExp));
    document.getElementById('detailSavings').textContent = fmt(u.totalSav);
    document.getElementById('detailHealth').textContent  = u.health + ' / 100';

    document.getElementById('userDetailPanel').classList.remove('hidden');
    document.getElementById('userDetailPanel').scrollIntoView({ behavior: 'smooth' });
}

function closeUserDetail() {
    document.getElementById('userDetailPanel').classList.add('hidden');
    selectedUID = null;
}

async function deleteUserData() {
    if (!selectedUID) return;
    const u = allUsersCache.find(x => x.uid === selectedUID);
    if (!confirm(`⚠️ DELETE all financial data for ${u?.email}?\n\nThis cannot be undone!`)) return;

    try {
        const collections = ['income','deductions','expenses','savings'];
        for (const col of collections) {
            const snap = await db.collection('users').doc(selectedUID).collection(col).get();
            const batch = db.batch();
            snap.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
        }
        await db.collection('users').doc(selectedUID).delete();
        toast('🗑️ User data deleted.', 'success');
        closeUserDetail();
        allUsersCache = allUsersCache.filter(x => x.uid !== selectedUID);
        renderUsersTable();
        renderRecentUsers();
    } catch(e) {
        toast('❌ Error: ' + e.message, 'error');
    }
}

/* ── Financials ───────────────────────────────────────────── */
function renderFinancials() {
    const topEarners  = [...allUsersCache].sort((a,b) => b.annualInc - a.annualInc).slice(0,10);
    const topSpenders = [...allUsersCache].sort((a,b) => b.avgExp - a.avgExp).slice(0,10);
    const topSavers   = [...allUsersCache].sort((a,b) => b.totalSav - a.totalSav).slice(0,10);

    const makeTable = (data, valFn, label) => data.length ? `
        <div class="table-wrap"><table>
            <thead><tr><th>#</th><th>Name</th><th>Email</th><th>${label}</th></tr></thead>
            <tbody>
            ${data.map((u,i) => `<tr>
                <td><strong>#${i+1}</strong></td>
                <td>${u.name}</td>
                <td style="color:var(--text-muted);font-size:.8rem">${u.email}</td>
                <td><strong style="color:var(--green)">${valFn(u)}</strong></td>
            </tr>`).join('')}
            </tbody>
        </table></div>` : '<p style="color:var(--text-muted);font-size:.9rem">No data.</p>';

    document.getElementById('topEarnersTable').innerHTML  = makeTable(topEarners,  u => fmt(u.annualInc),          'Annual Income');
    document.getElementById('topSpendersTable').innerHTML = makeTable(topSpenders, u => fmt(Math.round(u.avgExp)), 'Avg Monthly Expense');
    document.getElementById('topSaversTable').innerHTML   = makeTable(topSavers,   u => fmt(u.totalSav),           'Total Savings');
}

/* ── Health Leaderboard ───────────────────────────────────── */
function renderHealthLeaderboard() {
    const sorted = [...allUsersCache].sort((a,b) => b.health - a.health);

    document.getElementById('healthLeaderboard').innerHTML = sorted.length ? `
        <div class="table-wrap"><table>
            <thead><tr><th>Rank</th><th>Name</th><th>Email</th><th>Health Score</th><th>Income</th><th>Savings</th></tr></thead>
            <tbody>
            ${sorted.map((u,i) => `<tr>
                <td><strong>${i===0?'🥇':i===1?'🥈':i===2?'🥉':'#'+(i+1)}</strong></td>
                <td>${u.name}</td>
                <td style="color:var(--text-muted);font-size:.8rem">${u.email}</td>
                <td>
                    <div style="display:flex;align-items:center;gap:10px">
                        <div style="flex:1;height:6px;background:var(--surface2);border-radius:4px;overflow:hidden">
                            <div style="width:${u.health}%;height:100%;background:${u.health>=70?'var(--green)':u.health>=40?'var(--yellow)':'var(--red)'};border-radius:4px"></div>
                        </div>
                        <span class="health-pill ${u.health>=70?'good':u.health>=40?'fair':'low'}">${u.health}</span>
                    </div>
                </td>
                <td>${fmt(u.annualInc)}</td>
                <td>${fmt(u.totalSav)}</td>
            </tr>`).join('')}
            </tbody>
        </table></div>` : '<p style="color:var(--text-muted);font-size:.9rem">No data.</p>';
}

/* ══════════════════════════════════════════════════════════════
   CSV EXPORT
   ══════════════════════════════════════════════════════════════ */
function exportCSV(type) {
    let csv = '';
    const now = new Date().toISOString().split('T')[0];

    if (type === 'users') {
        csv = 'Name,Email,Joined,Annual Income,Avg Monthly Expense,Total Savings,Health Score\n';
        csv += allUsersCache.map(u =>
            `"${u.name}","${u.email}","${u.createdAt?.toLocaleDateString('en-IN')||''}",${u.annualInc},${Math.round(u.avgExp)},${u.totalSav},${u.health}`
        ).join('\n');
        downloadCSV(csv, `financehub-users-${now}.csv`);

    } else if (type === 'income') {
        csv = 'User Email,User Name,Financial Year,Salary,Bonus,Rental,Capital Gains,Other,Total\n';
        allUsersCache.forEach(u => {
            // We show what we have cached
            csv += `"${u.email}","${u.name}","—",—,—,—,—,—,${u.annualInc}\n`;
        });
        downloadCSV(csv, `financehub-income-${now}.csv`);

    } else if (type === 'expenses') {
        csv = 'User Email,User Name,Expense Records Count,Avg Monthly Expense\n';
        csv += allUsersCache.map(u =>
            `"${u.email}","${u.name}",${u.expRecords},${Math.round(u.avgExp)}`
        ).join('\n');
        downloadCSV(csv, `financehub-expenses-${now}.csv`);

    } else if (type === 'savings') {
        csv = 'User Email,User Name,Savings Records Count,Total Savings\n';
        csv += allUsersCache.map(u =>
            `"${u.email}","${u.name}",${u.savRecords},${u.totalSav}`
        ).join('\n');
        downloadCSV(csv, `financehub-savings-${now}.csv`);

    } else if (type === 'full') {
        csv = 'Name,Email,Joined,Annual Income,Avg Monthly Expense,Total Savings,Health Score,Expense Records,Savings Records\n';
        csv += allUsersCache.map(u =>
            `"${u.name}","${u.email}","${u.createdAt?.toLocaleDateString('en-IN')||''}",${u.annualInc},${Math.round(u.avgExp)},${u.totalSav},${u.health},${u.expRecords},${u.savRecords}`
        ).join('\n');
        downloadCSV(csv, `financehub-full-report-${now}.csv`);
    }

    toast('✅ CSV downloaded!', 'success');
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/* ══════════════════════════════════════════════════════════════
   UTILITIES
   ══════════════════════════════════════════════════════════════ */
function fmt(n) {
    return '₹' + (n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

let toastTimer;
function toast(msg, type = 'success') {
    clearTimeout(toastTimer);
    const t   = document.getElementById('toast');
    t.textContent = msg;
    t.className   = `toast ${type} show`;
    toastTimer    = setTimeout(() => t.classList.remove('show'), 3200);
}