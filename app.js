let currentRole = 'allievo';
let currentUser = null;

let studentsCache = [];
let sessionsCache = [];
let attendanceCache = [];
let usersCache = [];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---------- CALLED WHEN USER LOGS IN (role fetched from Firestore) ----------
function onUserReady(user, role) {
  currentUser = user;
  currentRole = role;

  document.body.classList.remove('role-maestro', 'role-admin');
  if (role === 'maestro') document.body.classList.add('role-maestro');
  if (role === 'admin') document.body.classList.add('role-maestro', 'role-admin');

  attachFirestoreListeners();
}

// ---------- FIRESTORE LISTENERS ----------
function attachFirestoreListeners() {
  db.collection('students').onSnapshot(snap => {
    studentsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderStudents(); populateManualSelects(); renderProfile();
  });

  db.collection('sessions').onSnapshot(snap => {
    sessionsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderSessions(); populateManualSelects(); renderHome();
  });

  db.collection('attendance').onSnapshot(snap => {
    attendanceCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderHome(); renderLeaderboard(); renderProfile();
  });

  if (currentRole === 'admin') {
    db.collection('roles').onSnapshot(snap => {
      usersCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderAdminPanel();
    });
  }
}

// ---------- SCREEN NAV ----------
function showScreen(name, el) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');

  if (name === 'students') renderStudents();
  if (name === 'sessions') renderSessions();
  if (name === 'leaderboard') renderLeaderboard();
  if (name === 'profilo') renderProfile();
  if (name === 'admin') renderAdminPanel();
  if (name === 'home') renderHome();
}

// ---------- NOTIFICATIONS ----------
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}
function notify(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}

// ---------- ADMIN: MANAGE ROLES ----------
function renderAdminPanel() {
  const container = document.getElementById('admin-users-list');
  if (!container) return;

  if (usersCache.length === 0) {
    container.innerHTML = '<div class="list-item"><div class="list-item-info">Nessun utente registrato ancora.</div></div>';
    return;
  }

  container.innerHTML = usersCache.map(u => `
    <div class="list-item">
      <div class="list-item-info">
        <div class="list-item-title">${u.name || u.email}</div>
        <div class="list-item-sub">${u.email}</div>
      </div>
      <select onchange="changeUserRole('${u.id}', this.value)" style="width:auto;">
        <option value="allievo" ${u.role === 'allievo' ? 'selected' : ''}>Allievo</option>
        <option value="maestro" ${u.role === 'maestro' ? 'selected' : ''}>Maestro</option>
        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
      </select>
    </div>
  `).join('');
}

function changeUserRole(userId, newRole) {
  db.collection('roles').doc(userId).update({ role: newRole });
}

// ---------- STUDENTS ----------
function addStudent() {
  const name = document.getElementById('new-student-name').value.trim();
  const photo = document.getElementById('new-student-photo').value.trim();
  const belt = document.getElementById('new-student-belt').value.trim();
  const dob = document.getElementById('new-student-dob').value;

  if (!name) return alert('Inserisci un nome.');

  db.collection('students').add({
    name, photo, belt, dob,
    createdBy: currentUser?.uid || 'unknown',
    createdAt: Date.now()
  }).then(() => {
    document.getElementById('new-student-name').value = '';
    document.getElementById('new-student-photo').value = '';
    document.getElementById('new-student-belt').value = '';
    document.getElementById('new-student-dob').value = '';
    notify('Sei stato aggiunto', `${name} è stato aggiunto al Dojo.`);
  });
}

function deleteStudent(id) { db.collection('students').doc(id).delete(); }
function updateStudentBelt(id, newBelt) { db.collection('students').doc(id).update({ belt: newBelt }); }

function renderStudents() {
  const container = document.getElementById('students-list');
  if (!container) return;

  if (studentsCache.length === 0) {
    container.innerHTML = '<div class="list-item"><div class="list-item-info">Nessun allievo registrato.</div></div>';
    return;
  }

  container.innerHTML = studentsCache.map(s => `
    <div class="list-item">
      ${s.photo ? `<img src="${s.photo}" class="student-photo" alt="${s.name}">` : ''}
      <div class="list-item-info">
        <div class="list-item-title">${s.name}</div>
        <div class="list-item-sub">
          Cintura: <input type="text" value="${s.belt || ''}"
            style="width:80px;display:inline-block;padding:2px 6px;margin:0;"
            onchange="updateStudentBelt('${s.id}', this.value)">
        </div>
        <div class="list-item-sub">Nascita: ${s.dob || '—'}</div>
      </div>
      <button class="maestro-only" style="background:none;border:none;color:#c00;cursor:pointer;" onclick="deleteStudent('${s.id}')">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>
  `).join('');
}

// ---------- SESSIONS ----------
function addSession() {
  const name = document.getElementById('new-session-name').value.trim();
  const date = document.getElementById('new-session-date').value;
  const time = document.getElementById('new-session-time').value;

  if (!name || !date) return alert('Inserisci nome e data della sessione.');

  db.collection('sessions').add({
    name, date, time,
    createdBy: currentUser?.uid || 'unknown',
    createdAt: Date.now()
  }).then(() => {
    document.getElementById('new-session-name').value = '';
    document.getElementById('new-session-date').value = '';
    document.getElementById('new-session-time').value = '';

    const today = new Date().toISOString().slice(0, 10);
    if (date === today) notify('Sessione iniziata', `${name} è iniziata oggi.`);
  });
}

function deleteSession(id) {
  db.collection('sessions').doc(id).delete();
  db.collection('attendance').where('sessionId', '==', id).get().then(snap => {
    snap.forEach(doc => doc.ref.delete());
  });
}

function renderSessions() {
  const sessions = [...sessionsCache].sort((a, b) => a.date.localeCompare(b.date));
  const container = document.getElementById('sessions-list');
  if (!container) return;

  if (sessions.length === 0) {
    container.innerHTML = '<div class="list-item"><div class="list-item-info">Nessuna sessione pianificata.</div></div>';
    return;
  }

  container.innerHTML = sessions.map(s => {
    const attendees = attendanceCache
      .filter(a => a.sessionId === s.id)
      .map(a => studentsCache.find(st => st.id === a.studentId)?.name || 'Sconosciuto');

    return `
      <div class="list-item">
        <div class="list-item-info">
          <div class="list-item-title">${s.name}</div>
          <div class="list-item-sub">${formatDate(s.date)} · ${s.time || ''}</div>
          <div class="list-item-sub">Presenti: ${attendees.length ? attendees.join(', ') : 'Nessuno'}</div>
        </div>
        <button class="maestro-only" style="background:none;border:none;color:#c00;cursor:pointer;" onclick="deleteSession('${s.id}')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
  }).join('');
}

// ---------- ATTENDANCE ----------
function populateManualSelects() {
  const studentSelect = document.getElementById('manual-student-select');
  const sessionSelect = document.getElementById('manual-session-select');
  if (!studentSelect || !sessionSelect) return;

  studentSelect.innerHTML = studentsCache.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  sessionSelect.innerHTML = sessionsCache.map(s => `<option value="${s.id}">${s.name} (${s.date})</option>`).join('');
}

function maestroAddAttendance() {
  const studentId = document.getElementById('manual-student-select').value;
  const sessionId = document.getElementById('manual-session-select').value;
  if (!studentId || !sessionId) return alert('Seleziona allievo e sessione.');

  db.collection('attendance').add({
    studentId, sessionId,
    date: new Date().toISOString().slice(0, 10),
    timestamp: Date.now(),
    addedBy: currentUser?.uid || 'unknown'
  });
}

function deleteAttendance(id) { db.collection('attendance').doc(id).delete(); }

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
  const months = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

function renderAttendanceHistory() {
  const attendance = [...attendanceCache].sort((a, b) => b.timestamp - a.timestamp);
  const container = document.getElementById('attendance-history');
  if (!container) return;

  if (attendance.length === 0) {
    container.innerHTML = '<div class="list-item"><div class="list-item-info">Nessuna presenza registrata.</div></div>';
    return;
  }

  container.innerHTML = attendance.slice(0, 8).map(a => {
    const session = sessionsCache.find(s => s.id === a.sessionId);
    return `
      <div class="list-item">
        <div class="list-item-info">
          <div class="list-item-title">${session ? session.name : 'Sessione libera'}</div>
          <div class="list-item-sub">${formatDate(a.date)}</div>
        </div>
        <span class="pill present">Presente</span>
        <button class="maestro-only" style="background:none;border:none;color:#c00;cursor:pointer;" onclick="deleteAttendance('${a.id}')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
  }).join('');
}

// ---------- CHECK-IN ----------
function doCheckin() {
  if (!currentUser) return alert('Accedi con Google prima di fare check-in.');

  db.collection('attendance').add({
    studentId: currentUser.uid,
    sessionId: getTodaySession()?.id || 'generic',
    date: new Date().toISOString().slice(0, 10),
    timestamp: Date.now()
  }).then(() => {
    const btn = document.getElementById('checkin-btn');
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Check-in effettuato';
  });
}

// ---------- HOME ----------
function getTodaySession() {
  const today = new Date().toISOString().slice(0, 10);
  return sessionsCache.find(s => s.date === today);
}

function renderHome() {
  const today = new Date();
  const todaySession = getTodaySession();

  const nameEl = document.getElementById('today-session-name');
  const timeEl = document.getElementById('today-session-time');
  if (nameEl) nameEl.textContent = todaySession ? todaySession.name : 'Nessuna sessione oggi';
  if (timeEl) timeEl.textContent = todaySession ? `${formatDate(todaySession.date)} · ${todaySession.time || ''}` : '';

  const attCountEl = document.getElementById('att-count');
  if (attCountEl) attCountEl.textContent = attendanceCache.length;

  const monthAttendance = attendanceCache.filter(a => {
    const d = new Date(a.date);
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  });
  const monthSessions = sessionsCache.filter(s => {
    const d = new Date(s.date);
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  });

  const monthCountEl = document.getElementById('month-count');
  const monthSubEl = document.getElementById('month-sub');
  if (monthCountEl) monthCountEl.textContent = monthAttendance.length;
  if (monthSubEl) monthSubEl.textContent = `di ${monthSessions.length} sessioni`;

  const attSinceEl = document.getElementById('att-since');
  if (attSinceEl) {
    const sorted = [...attendanceCache].sort((a, b) => a.timestamp - b.timestamp);
    attSinceEl.textContent = sorted.length ? `dal ${formatDate(sorted[0].date)}` : '—';
  }

  renderAttendanceHistory();
}

// ---------- LEADERBOARD ----------
function renderLeaderboard() {
  const container = document.getElementById('leaderboard-list');
  if (!container) return;

  const counts = studentsCache.map(s => ({
    name: s.name,
    photo: s.photo,
    count: attendanceCache.filter(a => a.studentId === s.id).length
  })).sort((a, b) => b.count - a.count);

  if (counts.length === 0) {
    container.innerHTML = '<div class="list-item"><div class="list-item-info">Nessun dato disponibile.</div></div>';
    return;
  }

  container.innerHTML = counts.map((c, i) => `
    <div class="list-item">
      ${c.photo ? `<img src="${c.photo}" class="student-photo">` : `<div class="student-photo" style="background:#333;display:flex;align-items:center;justify-content:center;font-weight:700;">${i+1}</div>`}
      <div class="list-item-info">
        <div class="list-item-title">#${i + 1} ${c.name}</div>
        <div class="list-item-sub">${c.count} presenze</div>
      </div>
    </div>
  `).join('');
}

// ---------- PROFILE ----------
function renderProfile() {
  const detailsEl = document.getElementById('profile-details');
  const dobEl = document.getElementById('dashboard-dob');
  const summaryEl = document.getElementById('dashboard-summary');
  if (!detailsEl) return;

  const name = document.getElementById('user-name').textContent;
  const myAttendance = attendanceCache.filter(a => a.studentId === currentUser?.uid);

  detailsEl.innerHTML = `
    <div class="list-item-title">${name}</div>
    <div class="list-item-sub">Ruolo: ${currentRole}</div>
    <div class="list-item-sub">Presenze totali: ${myAttendance.length}</div>
  `;

  dobEl.innerHTML = studentsCache.length
    ? studentsCache.map(s => `
        <div class="list-item">
          <div class="list-item-info">
            <div class="list-item-title">${s.name}</div>
            <div class="list-item-sub">${s.dob || '—'}</div>
          </div>
        </div>
      `).join('')
    : '<div class="list-item"><div class="list-item-info">Nessun allievo registrato.</div></div>';

  const today = new Date().toISOString().slice(0, 10);
  const todaySessions = sessionsCache.filter(s => s.date === today);
  const todayAttendance = attendanceCache.filter(a => a.date === today);

  summaryEl.innerHTML = `
    <div class="list-item"><div class="list-item-info">Allievi totali</div><strong>${studentsCache.length}</strong></div>
    <div class="list-item"><div class="list-item-info">Sessioni totali</div><strong>${sessionsCache.length}</strong></div>
    <div class="list-item"><div class="list-item-info">Sessioni oggi</div><strong>${todaySessions.length}</strong></div>
    <div class="list-item"><div class="list-item-info">Presenze oggi</div><strong>${todayAttendance.length}</strong></div>
  `;
}

// ---------- INIT ----------
window.onload = () => {
  requestNotificationPermission();
};