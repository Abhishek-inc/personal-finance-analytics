/* ═══════════════════════════════════════════════════════════════
 FINANCEHUB — admin.js (with Active Users)
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
const db = firebase.firestore();

let adminUser = null;
let allUsersCache = [];
let activeUsersUnsubscribe = null;

/* ══════════════════════════════════════════════════════════════
 AUTH
 ══════════════════════════════════════════════════════════════ */
function showAdminAlert(msg, type = 'error') {
 const box = document.getElementById('adminAlertBox');
 box.innerHTML = `<div class="alert alert-${type}" style="text-align:left;margin-bottom:12px">${msg}</div>`;
 setTimeout(() => { box.innerHTML = ''; }, 5000);
}

function toggleAdminPass() {
 const inp = document.getElementById('adminPassword');
 const icon = document.getElementById('toggleAdminPass');
 if (inp.type === 'password') { inp.type = 'text'; }
 else { inp.type = 'password'; }
}

async function handleAdminLogin() {
 const email = document.getElementById('adminEmail').value.trim();
 const pass = document.getElementById('adminPassword').value;
 if (!email || !pass) { showAdminAlert('Enter email and password.'); return; }

 const btn = document.getElementById('adminLoginBtn');
 btn.disabled = true; btn.querySelector('span').textContent = 'Verifying…';

 try {
 await auth.signInWithEmailAndPassword(email, pass);
 } catch (e) {
 showAdminAlert(e.message);
 btn.disabled = false; btn.querySelector('span').textContent = 'Access Admin Panel';
 }
}

function handleAdminLogout() { auth.signOut(); }

function showPermissionsError() {
    const rulesUrl = 'https://console.firebase.google.com/project/project-2e9a4535-6825-484c-997/firestore/rules';
    const adminEmail = adminUser ? adminUser.email : 'your-admin@email.com';
    const rulesCode = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null
        && request.auth.token.email in ["${adminEmail}"];
    }
    function isOwner(uid) {
      return request.auth != null && request.auth.uid == uid;
    }
    match /users/{uid} {
      allow read, write: if isOwner(uid) || isAdmin();
      match /{sub}/{doc} {
        allow read, write: if isOwner(uid) || isAdmin();
      }
    }
  }
}`;

    const msg = `
        <div style="padding:24px;background:rgba(255,79,107,.07);border:1px solid rgba(255,79,107,.25);border-radius:14px;margin-bottom:24px">
            <div style="font-family:'Syne',sans-serif;font-size:1.05rem;font-weight:800;color:var(--red);margin-bottom:10px">
                Firestore Permission Denied
            </div>
            <p style="font-size:.85rem;color:var(--text-muted);line-height:1.7;margin-bottom:14px">
                Your Firestore Security Rules are blocking the admin from reading all users data.
                Follow these steps to fix it:
            </p>
            <div style="font-size:.82rem;font-weight:700;color:var(--text);margin-bottom:6px">Step 1 — Open Firebase Console Rules</div>
            <a href="${rulesUrl}" target="_blank"
               style="display:inline-block;padding:8px 16px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:white;border-radius:8px;text-decoration:none;font-size:.8rem;font-weight:600;margin-bottom:14px">
               Open Firestore Rules in Firebase Console
            </a>
            <div style="font-size:.82rem;font-weight:700;color:var(--text);margin-bottom:6px">Step 2 — Replace rules with the code below, then click Publish</div>
            <pre style="background:rgba(0,0,0,.5);border:1px solid var(--border);border-radius:8px;padding:14px;font-size:.72rem;color:#10D48E;overflow-x:auto;line-height:1.7;white-space:pre">${rulesCode.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>
            <div style="font-size:.82rem;font-weight:700;color:var(--text);margin-top:12px">Step 3 — Refresh this admin page after publishing.</div>
        </div>`;

    ['recentUsersTable','usersTableWrap','topEarnersTable','topSpendersTable','topSaversTable','healthLeaderboard'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<p style="color:var(--red);font-size:.82rem;padding:8px 0;">Permission denied — update Firestore rules (see instructions above).</p>';
    });

    const overviewTab = document.getElementById('overviewTab');
    if (overviewTab && !overviewTab.querySelector('.perm-error-banner')) {
        const div = document.createElement('div');
        div.className = 'perm-error-banner';
        div.innerHTML = msg;
        overviewTab.insertBefore(div, overviewTab.firstChild);
    }
}


auth.onAuthStateChanged(async user => {
 if (!user) {
 document.getElementById('adminAuthGate').style.display = 'flex';
 document.getElementById('adminDashboard').classList.add('hidden');
 if (activeUsersUnsubscribe) { activeUsersUnsubscribe(); activeUsersUnsubscribe = null; }
 return;
 }

 // Verify admin status
 try {
 const res = await fetch('admins.json?_=' + Date.now());
 const data = await res.json();
 if (!(data.admins || []).includes(user.email)) {
 showAdminAlert('You are not authorised to access the admin panel.');
 auth.signOut();
 return;
 }
 } catch (e) {
 showAdminAlert('Could not verify admin status. Make sure admins.json exists.');
 auth.signOut();
 return;
 }

 adminUser = user;
 document.getElementById('adminAuthGate').style.display = 'none';
 document.getElementById('adminDashboard').classList.remove('hidden');
 document.getElementById('adminUserEmail').textContent = user.email;

 loadAllAdminData();
 startActiveUsersListener();
});

/* ══════════════════════════════════════════════════════════════
 TAB SWITCHING
 ══════════════════════════════════════════════════════════════ */
function adminSwitchTab(name, btn) {
 document.querySelectorAll('.admin-nav-item').forEach(n => n.classList.remove('active'));
 btn.classList.add('active');
 document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
 document.getElementById(name + 'Tab').classList.add('active');
}

/* ══════════════════════════════════════════════════════════════
 ACTIVE USERS (real-time listener)
 ══════════════════════════════════════════════════════════════ */
function startActiveUsersListener() {
 // Listen to users with online: true in Firestore
 activeUsersUnsubscribe = db.collection('users')
 .where('online', '==', true)
 .onSnapshot(snap => {
 const activeUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
 renderActiveUsers(activeUsers);
 // Update badge count
 const badge = document.getElementById('activeUserCount');
 if (badge) badge.textContent = activeUsers.length;
 }, err => {
 console.warn('Active users listener error:', err);
 if (err.code === 'permission-denied') {
     const el = document.getElementById('activeUsersContent');
     if (el) el.innerHTML = '<p style="color:var(--text-muted);font-size:.82rem;padding:8px 0;">Update Firestore rules to enable live user tracking.</p>';
 }
 });
}

function renderActiveUsers(users) {
 const el = document.getElementById('activeUsersContent');
 if (!el) return;

 if (users.length === 0) {
 el.innerHTML = `<p style="color:var(--text-muted);font-size:.85rem;padding:8px 0;">No users currently online.</p>`;
 return;
 }

 el.innerHTML = `<div class="active-users-list">
 ${users.map(u => {
 const name = u.full_name || u.email || 'Unknown';
 const initial = name.charAt(0).toUpperCase();
 const email = u.email || '';
 const lastSeen = u.last_seen ? new Date(u.last_seen.toDate()).toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'}) : '';
 return `<div class="active-user-pill">
 <div class="au-avatar">${initial}</div>
 <div class="au-info">
 <span class="au-name">${name}</span>
 <span class="au-email">${email}</span>
 </div>
 <div class="au-status">
 <span class="au-dot"></span>
 <span class="au-time">${lastSeen}</span>
 </div>
 </div>`;
 }).join('')}
 </div>`;
}

/* ══════════════════════════════════════════════════════════════
 LOAD ALL DATA
 ══════════════════════════════════════════════════════════════ */
async function loadAllAdminData() {
 try {
 let usersSnap;
 try {
     usersSnap = await db.collection('users').get();
 } catch (permErr) {
     // Firestore rules are blocking — show instructions
     showPermissionsError();
     return;
 }

 allUsersCache = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

 let totalIncome = 0, totalExpRecords = 0, totalSavings = 0;
 let allExpenses = [], allIncomes = [];

 for (const user of allUsersCache) {
 const [incSnap, expSnap, savSnap] = await Promise.all([
 db.collection('users').doc(user.id).collection('income').get(),
 db.collection('users').doc(user.id).collection('expenses').get(),
 db.collection('users').doc(user.id).collection('savings').get()
 ]);
 const userIncome = incSnap.docs.map(d => d.data());
 const userExpense = expSnap.docs.map(d => d.data());
 const userSavings = savSnap.docs.map(d => d.data());
 user._income = userIncome;
 user._expense = userExpense;
 user._savings = userSavings;
 userIncome.forEach(r => { totalIncome += r.total_income || 0; allIncomes.push({ ...r, userEmail: user.email, userName: user.full_name }); });
 userExpense.forEach(r => { totalExpRecords++; allExpenses.push({ ...r, userEmail: user.email }); });
 userSavings.forEach(r => { totalSavings += r.total_savings || 0; });
 }

 // Stat Cards
 document.getElementById('statTotalUsers').textContent = allUsersCache.length;
 document.getElementById('statTotalIncome').textContent = fmt(totalIncome);
 document.getElementById('statTotalSavings').textContent = fmt(totalSavings);
 document.getElementById('statTotalExpRecords').textContent = totalExpRecords;
 const avgExp = allExpenses.length ? allExpenses.reduce((s,e) => s + e.total_expenses, 0) / allExpenses.length : 0;
 document.getElementById('statAvgExpense').textContent = fmt(Math.round(avgExp));

 // Health Scores
 const healthScores = allUsersCache.map(u => {
 const inc = u._income.length ? u._income[0] : null;
 const annualInc = inc ? inc.total_income : 0;
 const expenses = u._expense;
 const savings = u._savings;
 const avgE = expenses.length ? expenses.reduce((s,e) => s+e.total_expenses,0)/expenses.length : 0;
 const avgS = savings.length ? savings.reduce((s,sv) => s+sv.total_savings,0)/savings.length : 0;
 if (!annualInc) return { user: u, score: 0 };
 const savR = (avgS*12/annualInc)*100;
 const expR = (avgE*12/annualInc)*100;
 const score = Math.min(100,Math.round(Math.min(40,savR*2)+(expR<=50?40:Math.max(0,40-(expR-50)))+20));
 return { user: u, score };
 });
 const avgHealth = healthScores.length ? Math.round(healthScores.reduce((s,h) => s+h.score,0)/healthScores.length) : 0;
 document.getElementById('statAvgHealth').textContent = avgHealth + ' / 100';

 renderRecentUsers();
 renderHealthLeaderboard(healthScores);
 renderTopEarners(allIncomes);
 renderTopSpenders(allExpenses);
 renderTopSavers();
 renderUsersTable();
 } catch (e) {
 console.error('Admin load error:', e);
 if (e.code === 'permission-denied' || (e.message && e.message.toLowerCase().includes('permission'))) {
     showPermissionsError();
 } else {
     adminToast('Error loading data: ' + e.message, 'error');
 }
 }
}

/* ══════════════════════════════════════════════════════════════
 RENDER FUNCTIONS
 ══════════════════════════════════════════════════════════════ */
function renderRecentUsers() {
 const sorted = [...allUsersCache].sort((a, b) => {
 const ta = a.created_at?.toDate?.() || 0;
 const tb = b.created_at?.toDate?.() || 0;
 return tb - ta;
 }).slice(0, 5);
 document.getElementById('recentUsersTable').innerHTML = sorted.length ? `
 <div class="table-wrap"><table>
 <thead><tr><th>Name</th><th>Email</th><th>Joined</th></tr></thead>
 <tbody>${sorted.map(u => `<tr>
 <td>${u.full_name || '—'}</td>
 <td>${u.email || '—'}</td>
 <td>${u.created_at ? new Date(u.created_at.toDate()).toLocaleDateString('en-IN') : '—'}</td>
 </tr>`).join('')}</tbody>
 </table></div>` : `<p style="color:var(--text-muted);font-size:.85rem;">No users yet.</p>`;
}

function renderHealthLeaderboard(healthScores) {
 const sorted = [...healthScores].sort((a,b) => b.score - a.score);
 document.getElementById('healthLeaderboard').innerHTML = `
 <div class="table-wrap"><table>
 <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Score</th><th>Status</th></tr></thead>
 <tbody>${sorted.map((h, i) => {
 const cls = h.score >= 70 ? 'good' : h.score >= 40 ? 'fair' : 'low';
 const medal = i === 0 ? '#1' : i === 1 ? '#2' : i === 2 ? '#3' : `${i+1}`;
 return `<tr>
 <td>${medal}</td>
 <td>${h.user.full_name || '—'}</td>
 <td>${h.user.email || '—'}</td>
 <td><span class="health-pill ${cls}">${h.score} / 100</span></td>
 <td>${h.score >= 70 ? 'Excellent' : h.score >= 40 ? 'Fair' : 'Needs Attention'}</td>
 </tr>`;
 }).join('')}</tbody>
 </table></div>`;
}

function renderTopEarners(allIncomes) {
 const sorted = [...allIncomes].sort((a,b) => (b.total_income||0)-(a.total_income||0)).slice(0,5);
 document.getElementById('topEarnersTable').innerHTML = sorted.length ? `
 <div class="table-wrap"><table>
 <thead><tr><th>User</th><th>FY</th><th>Annual Income</th></tr></thead>
 <tbody>${sorted.map(r => `<tr>
 <td>${r.userName||r.userEmail||'—'}</td>
 <td>${r.financial_year||'—'}</td>
 <td><strong>${fmt(r.total_income||0)}</strong></td>
 </tr>`).join('')}</tbody>
 </table></div>` : `<p style="color:var(--text-muted);font-size:.85rem;">No income data.</p>`;
}

function renderTopSpenders(allExpenses) {
 // Average per user
 const byUser = {};
 allExpenses.forEach(e => {
 if (!byUser[e.userEmail]) byUser[e.userEmail] = { total:0, count:0 };
 byUser[e.userEmail].total += e.total_expenses;
 byUser[e.userEmail].count++;
 });
 const sorted = Object.entries(byUser)
 .map(([email, d]) => ({ email, avg: Math.round(d.total/d.count) }))
 .sort((a,b) => b.avg-a.avg).slice(0,5);
 document.getElementById('topSpendersTable').innerHTML = sorted.length ? `
 <div class="table-wrap"><table>
 <thead><tr><th>User</th><th>Avg Monthly Expense</th></tr></thead>
 <tbody>${sorted.map(r => `<tr>
 <td>${r.email}</td>
 <td><strong style="color:var(--red)">${fmt(r.avg)}</strong></td>
 </tr>`).join('')}</tbody>
 </table></div>` : `<p style="color:var(--text-muted);font-size:.85rem;">No expense data.</p>`;
}

function renderTopSavers() {
 const scored = allUsersCache.map(u => {
 const total = (u._savings||[]).reduce((s,sv) => s+sv.total_savings,0);
 return { email: u.email, name: u.full_name, total };
 }).sort((a,b) => b.total-a.total).slice(0,5);
 document.getElementById('topSaversTable').innerHTML = scored.length ? `
 <div class="table-wrap"><table>
 <thead><tr><th>Name</th><th>Email</th><th>Total Savings</th></tr></thead>
 <tbody>${scored.map(r => `<tr>
 <td>${r.name||'—'}</td>
 <td>${r.email}</td>
 <td><strong style="color:var(--green)">${fmt(r.total)}</strong></td>
 </tr>`).join('')}</tbody>
 </table></div>` : `<p style="color:var(--text-muted);font-size:.85rem;">No savings data.</p>`;
}

function renderUsersTable() {
 if (!allUsersCache.length) {
 document.getElementById('usersTableWrap').innerHTML = '<p style="color:var(--text-muted);font-size:.85rem;">No users found.</p>';
 return;
 }
 buildUsersTable(allUsersCache);
}

function buildUsersTable(users) {
 document.getElementById('usersTableWrap').innerHTML = `
 <div class="table-wrap"><table>
 <thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Income Records</th><th>Expense Records</th><th>Action</th></tr></thead>
 <tbody>${users.map(u => `<tr>
 <td>${u.full_name||'—'}</td>
 <td>${u.email||'—'}</td>
 <td>${u.created_at ? new Date(u.created_at.toDate()).toLocaleDateString('en-IN') : '—'}</td>
 <td>${(u._income||[]).length}</td>
 <td>${(u._expense||[]).length}</td>
 <td><button class="action-btn" onclick="openUserDetail('${u.id}')">View</button></td>
 </tr>`).join('')}</tbody>
 </table></div>`;
}

function filterUsers() {
 const q = document.getElementById('userSearchInput').value.toLowerCase();
 const filtered = allUsersCache.filter(u =>
 (u.email||'').toLowerCase().includes(q) || (u.full_name||'').toLowerCase().includes(q)
 );
 buildUsersTable(filtered);
}

/* User detail panel */
let selectedUserId = null;
function openUserDetail(uid) {
 const u = allUsersCache.find(x => x.id === uid);
 if (!u) return;
 selectedUserId = uid;
 document.getElementById('detailAvatar').textContent = (u.full_name||u.email||'U').charAt(0).toUpperCase();
 document.getElementById('detailName').textContent = u.full_name || '—';
 document.getElementById('detailEmail').textContent = u.email || '—';
 document.getElementById('detailJoined').textContent = u.created_at ? 'Joined: ' + new Date(u.created_at.toDate()).toLocaleDateString('en-IN') : '';

 const inc = (u._income||[]).length ? u._income[0] : null;
 const expenses = u._expense || [];
 const savings = u._savings || [];
 const avgExp = expenses.length ? expenses.reduce((s,e) => s+e.total_expenses,0)/expenses.length : 0;
 const totalSav = savings.reduce((s,sv) => s+sv.total_savings,0);

 document.getElementById('detailIncome').textContent = inc ? fmt(inc.total_income) : '—';
 document.getElementById('detailExpense').textContent = fmt(Math.round(avgExp));
 document.getElementById('detailSavings').textContent = fmt(totalSav);

 let healthScore = '—';
 if (inc && inc.total_income > 0) {
 const avgS = savings.length ? totalSav/savings.length : 0;
 const savR = (avgS*12/inc.total_income)*100;
 const expR = (avgExp*12/inc.total_income)*100;
 healthScore = Math.min(100,Math.round(Math.min(40,savR*2)+(expR<=50?40:Math.max(0,40-(expR-50)))+20)) + ' / 100';
 }
 document.getElementById('detailHealth').textContent = healthScore;
 document.getElementById('userDetailPanel').classList.remove('hidden');
}

function closeUserDetail() {
 selectedUserId = null;
 document.getElementById('userDetailPanel').classList.add('hidden');
}

async function deleteUserData() {
 if (!selectedUserId) return;
 if (!confirm('Delete all financial data for this user? (Auth account is preserved)')) return;
 try {
 const userDocRef = db.collection('users').doc(selectedUserId);
 const cols = ['income','deductions','expenses','savings'];
 for (const col of cols) {
 const snap = await userDocRef.collection(col).get();
 for (const doc of snap.docs) await doc.ref.delete();
 }
 adminToast(' User data deleted!', 'success');
 closeUserDetail();
 loadAllAdminData();
 } catch (e) { adminToast(' ' + e.message, 'error'); }
}

/* ══════════════════════════════════════════════════════════════
 EXPORT
 ══════════════════════════════════════════════════════════════ */
async function exportCSV(type) {
 adminToast(' Preparing export…');
 try {
 let rows = [], headers = [];
 if (type === 'users') {
 headers = ['Name','Email','Joined'];
 rows = allUsersCache.map(u => [u.full_name||'', u.email||'', u.created_at ? new Date(u.created_at.toDate()).toLocaleDateString('en-IN') : '']);
 } else if (type === 'income') {
 headers = ['User','Email','FY','Salary','Bonus','Rental','CapGains','Other','Total'];
 for (const u of allUsersCache) {
 (u._income||[]).forEach(r => rows.push([u.full_name||'',u.email||'',r.financial_year,r.salary||0,r.bonus||0,r.rental_income||0,r.capital_gains||0,r.other_income||0,r.total_income||0]));
 }
 } else if (type === 'expenses') {
 headers = ['User','Email','Month','Rent','Groceries','Utilities','Transport','Entertainment','Healthcare','Education','Total'];
 for (const u of allUsersCache) {
 (u._expense||[]).forEach(r => rows.push([u.full_name||'',u.email||'',r.month_year,r.rent||0,r.groceries||0,r.utilities||0,r.transportation||0,r.entertainment||0,r.healthcare||0,r.education||0,r.total_expenses||0]));
 }
 } else if (type === 'savings') {
 headers = ['User','Email','Month','FD','MF','PPF','Stocks','Gold','Emergency','Total'];
 for (const u of allUsersCache) {
 (u._savings||[]).forEach(r => rows.push([u.full_name||'',u.email||'',r.month_year,r.fixed_deposits||0,r.mutual_funds||0,r.ppf||0,r.stocks||0,r.gold||0,r.emergency_fund||0,r.total_savings||0]));
 }
 } else if (type === 'full') {
 headers = ['Name','Email','Joined','Annual Income','Avg Monthly Exp','Total Savings'];
 rows = allUsersCache.map(u => {
 const inc = (u._income||[]).length ? u._income[0].total_income : 0;
 const avgE = (u._expense||[]).length ? (u._expense||[]).reduce((s,e)=>s+e.total_expenses,0)/(u._expense||[]).length : 0;
 const totS = (u._savings||[]).reduce((s,sv)=>s+sv.total_savings,0);
 return [u.full_name||'',u.email||'',u.created_at?new Date(u.created_at.toDate()).toLocaleDateString('en-IN'):'',inc,Math.round(avgE),totS];
 });
 }
 downloadCSV([headers, ...rows], `financehub_${type}_${Date.now()}.csv`);
 adminToast(' Export downloaded!', 'success');
 } catch (e) { adminToast(' ' + e.message, 'error'); }
}

function downloadCSV(data, filename) {
 const csv = data.map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
 const a = document.createElement('a');
 a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
 a.download = filename; a.click();
}

/* ══════════════════════════════════════════════════════════════
 UTILS
 ══════════════════════════════════════════════════════════════ */
function fmt(n) {
 return '₹' + (n||0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

let toastTimer;
function adminToast(msg, type = 'success') {
 clearTimeout(toastTimer);
 const t = document.getElementById('toast');
 t.textContent = msg; t.className = `toast ${type} show`;
 toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}
