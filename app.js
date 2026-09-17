let currentRole = 'allievo';

// ---------- STORAGE HELPERS ----------
const STORAGE_KEYS = {
  students: 'dojo-students',
  sessions: 'dojo-sessions',
  attendance: 'dojo-attendance'
};

function load(key) {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}
function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---------- ROLE SWITCH ----------
function toggleRole() {
  currentRole = currentRole === 'allievo' ? 'maestro' : 'allievo';
  document.getElementById('role-toggle-btn').textContent =
    currentRole === 'allievo' ? 'Allievo' : 'Maestro';
  document.body.classList.toggle('role-maestro', currentRole === 'maestro');
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
  if (name === 'home') {
    renderHome();
    populateManualSelects();
  }
}

// ---------- LOGIN STATE ----------
function onUserLoggedIn(user) {
  // Nascondi welcome, mostra header e contenuto
  document.getElementById('welcome-section').style.display = 'none';
  document.getElementById('home-content').style.display = 'block';
  document.getElementById('app-header').style.display = 'block';

  // Mostra bottom nav e aggiorna nome
  document.body.classList.add('logged-in');
  if (user) {
    document.getElementById('user-name').textContent = user.displayName || user.email || 'Utente';
  }

  renderHome();
  populateManualSelects();
}

function onUserLoggedOut() {
  document.getElementById('welcome-section').style.display = 'flex';
  document.getElementById('home-content').style.display = 'none';
  document.getElementById('app-header').style.display = 'none';
  document.body.classList.remove('logged-in');
}

// Chiamata dal firebase.js dopo login Google — stub locale per dev senza Firebase
function loginWithGoogle() {
  // In produzione: firebase.auth().signInWithPopup(provider)
  // Per sviluppo locale, simuliamo il login
  if (typeof firebase !== 'undefined' && firebase.auth) {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).catch(err => alert('Errore login: ' + err.message));
  } else {
    // Modalità sviluppo senza Firebase: simula utente
    onUserLoggedIn({ displayName: 'Marco Rossi', email: 'marco@dojo.it' });
  }
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

// ---------- STUDENTS ----------
function addStudent() {
  const name = document.getElementById('new-student-name').value.trim();
  const photo = document.getElementById('new-student-photo').value.trim();
  const belt = document.getElementById('new-student-belt').value.trim();
  const dob = document.getElementById('new-student-dob').value;

  if (!name) return alert('Inserisci un nome.');

  const students = load(STORAGE_KEYS.students);
  students.push({ id: uid(), name, photo, belt, dob });
  save(STORAGE_KEYS.students, students);

  document.getElementById('new-student-name').value = '';
  document.getElementById('new-student-photo').value = '';
  document.getElementById('new-student-belt').value = '';
  document.getElementById('new-student-dob').value = '';

  notify('Sei stato aggiunto', `${name} è stato aggiunto al Dojo.`);

  renderStudents();
  populateManualSelects();
}

function deleteStudent(id) {
  let students = load(STORAGE_KEYS.students);
  students = students.filter(s => s.id !== id);
  save(STORAGE_KEYS.students, students);
  renderStudents();
  populateManualSelects();
}

function updateStudentBelt(id, newBelt) {
  const students = load(STORAGE_KEYS.students);
  const s = students.find(s => s.id === id);
  if (s) {
    s.belt = newBelt;
    save(STORAGE_KEYS.students, students);
  }
}

function renderStudents() {
  const students = load(STORAGE_KEYS.students);
  const container = document.getElementById('students-list');
  if (!container) return;

  if (students.length === 0) {
    container.innerHTML = '<div class="list-item"><div class="list-item-info">Nessun allievo registrato.</div></div>';
    return;
  }

  container.innerHTML = students.map(s => `
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

  const sessions = load(STORAGE_KEYS.sessions);
  sessions.push({ id: uid(), name, date, time });
  save(STORAGE_KEYS.sessions, sessions);

  document.getElementById('new-session-name').value = '';
  document.getElementById('new-session-date').value = '';
  document.getElementById('new-session-time').value = '';

  const today = new Date().toISOString().slice(0, 10);
  if (date === today) {
    notify('Sessione iniziata', `${name} è iniziata oggi.`);
  }

  renderSessions();
  populateManualSelects();
  renderHome();
}

function deleteSession(id) {
  let sessions = load(STORAGE_KEYS.sessions);
  sessions = sessions.filter(s => s.id !== id);
  save(STORAGE_KEYS.sessions, sessions);

  let attendance = load(STORAGE_KEYS.attendance);
  attendance = attendance.filter(a => a.sessionId !== id);
  save(STORAGE_KEYS.attendance, attendance);

  renderSessions();
  populateManualSelects();
}

function renderSessions() {
  const sessions = load(STORAGE_KEYS.sessions).sort((a, b) => a.date.localeCompare(b.date));
  const students = load(STORAGE_KEYS.students);
  const attendance = load(STORAGE_KEYS.attendance);
  const container = document.getElementById('sessions-list');
  if (!container) return;

  if (sessions.length === 0) {
    container.innerHTML = '<div class="list-item"><div class="list-item-info">Nessuna sessione pianificata.</div></div>';
    return;
  }

  container.innerHTML = sessions.map(s => {
    const attendees = attendance
      .filter(a => a.sessionId === s.id)
      .map(a => students.find(st => st.id === a.studentId)?.name || 'Sconosciuto');

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
  const students = load(STORAGE_KEYS.students);
  const sessions = load(STORAGE_KEYS.sessions);

  const studentSelect = document.getElementById('manual-student-select');
  const sessionSelect = document.getElementById('manual-session-select');
  if (!studentSelect || !sessionSelect) return;

  studentSelect.innerHTML = students
    .map(s => `<option value="${s.id}">${s.name}</option>`)
    .join('');

  sessionSelect.innerHTML = sessions
    .map(s => `<option value="${s.id}">${s.name} (${s.date})</option>`)
    .join('');
}

function maestroAddAttendance() {
  const studentId = document.getElementById('manual-student-select').value;
  const sessionId = document.getElementById('manual-session-select').value;

  if (!studentId || !sessionId) return alert('Seleziona allievo e sessione.');

  const attendance = load(STORAGE_KEYS.attendance);
  attendance.push({
    id: uid(),
    studentId,
    sessionId,
    date: new Date().toISOString().slice(0, 10),
    timestamp: Date.now()
  });
  save(STORAGE_KEYS.attendance, attendance);

  renderHome();
  renderSessions();
  renderLeaderboard();
}

function deleteAttendance(id) {
  let attendance = load(STORAGE_KEYS.attendance);
  attendance = attendance.filter(a => a.id !== id);
  save(STORAGE_KEYS.attendance, attendance);
  renderHome();
  renderSessions();
  renderLeaderboard();
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
  const months = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

function renderAttendanceHistory() {
  const attendance = load(STORAGE_KEYS.attendance).sort((a, b) => b.timestamp - a.timestamp);
  const sessions = load(STORAGE_KEYS.sessions);
  const container = document.getElementById('attendance-history');
  if (!container) return;

  if (attendance.length === 0) {
    container.innerHTML = '<div class="list-item"><div class="list-item-info">Nessuna presenza registrata.</div></div>';
    return;
  }

  container.innerHTML = attendance.slice(0, 8).map(a => {
    const session = sessions.find(s => s.id === a.sessionId);
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

// ---------- CHECK-IN (self, allievo) ----------
function doCheckin() {
  const attendance = load(STORAGE_KEYS.attendance);
  attendance.push({
    id: uid(),
    studentId: 'self',
    sessionId: getTodaySession()?.id || 'generic',
    date: new Date().toISOString().slice(0, 10),
    timestamp: Date.now()
  });
  save(STORAGE_KEYS.attendance, attendance);

  const btn = document.getElementById('checkin-btn');
  btn.innerHTML = '<i class="fa-solid fa-check"></i> Check-in effettuato';

  renderHome();
  renderLeaderboard();
}

// ---------- HOME (today's session + stats + history) ----------
function getTodaySession() {
  const sessions = load(STORAGE_KEYS.sessions);
  const today = new Date().toISOString().slice(0, 10);
  return sessions.find(s => s.date === today);
}

function renderHome() {
  const attendance = load(STORAGE_KEYS.attendance);
  const today = new Date();
  const todaySession = getTodaySession();

  document.getElementById('today-session-name').textContent =
    todaySession ? todaySession.name : 'Nessuna sessione oggi';
  document.getElementById('today-session-time').textContent =
    todaySession ? `${formatDate(todaySession.date)} · ${todaySession.time || ''}` : '';

  document.getElementById('att-count').textContent = attendance.length;
  localStorage.setItem('att-count', attendance.length);

  const monthAttendance = attendance.filter(a => {
    const d = new Date(a.date);
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  });
  const monthSessions = load(STORAGE_KEYS.sessions).filter(s => {
    const d = new Date(s.date);
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  });
  document.getElementById('month-count').textContent = monthAttendance.length;
  document.getElementById('month-sub').textContent = `di ${monthSessions.length} sessioni`;
  document.getElementById('att-since').textContent =
    attendance.length ? `dal ${formatDate(attendance[0].date)}` : '—';

  renderAttendanceHistory();
}

// ---------- LEADERBOARD ----------
function renderLeaderboard() {
  const students = load(STORAGE_KEYS.students);
  const attendance = load(STORAGE_KEYS.attendance);
  const container = document.getElementById('leaderboard-list');
  if (!container) return;

  const counts = students.map(s => ({
    name: s.name,
    photo: s.photo,
    count: attendance.filter(a => a.studentId === s.id).length
  })).sort((a, b) => b.count - a.count);

  if (counts.length === 0) {
    container.innerHTML = '<div class="list-item"><div class="list-item-info">Nessun dato disponibile.</div></div>';
    return;
  }

  container.innerHTML = counts.map((c, i) => `
    <div class="list-item">
      ${c.photo ? `<img src="${c.photo}" class="student-photo">` : `<div class="student-photo" style="background:#eee;display:flex;align-items:center;justify-content:center;font-weight:700;">${i+1}</div>`}
      <div class="list-item-info">
        <div class="list-item-title">#${i + 1} ${c.name}</div>
        <div class="list-item-sub">${c.count} presenze</div>
      </div>
    </div>
  `).join('');
}

// ---------- PROFILE / DASHBOARD ----------
function renderProfile() {
  const students = load(STORAGE_KEYS.students);
  const sessions = load(STORAGE_KEYS.sessions);
  const attendance = load(STORAGE_KEYS.attendance);
  const today = new Date().toISOString().slice(0, 10);

  const detailsEl = document.getElementById('profile-details');
  const dobEl = document.getElementById('dashboard-dob');
  const summaryEl = document.getElementById('dashboard-summary');
  if (!detailsEl) return;

  const name = document.getElementById('user-name').textContent;
  detailsEl.innerHTML = `
    <div class="list-item-title">${name}</div>
    <div class="list-item-sub">Presenze totali: ${attendance.length}</div>
  `;

  dobEl.innerHTML = students.length
    ? students.map(s => `
        <div class="list-item">
          <div class="list-item-info">
            <div class="list-item-title">${s.name}</div>
            <div class="list-item-sub">${s.dob || '—'}</div>
          </div>
        </div>
      `).join('')
    : '<div class="list-item"><div class="list-item-info">Nessun allievo registrato.</div></div>';

  const todaySessions = sessions.filter(s => s.date === today);
  const todayAttendance = attendance.filter(a => a.date === today);

  summaryEl.innerHTML = `
    <div class="list-item"><div class="list-item-info">Allievi totali</div><strong>${students.length}</strong></div>
    <div class="list-item"><div class="list-item-info">Sessioni totali</div><strong>${sessions.length}</strong></div>
    <div class="list-item"><div class="list-item-info">Sessioni oggi</div><strong>${todaySessions.length}</strong></div>
    <div class="list-item"><div class="list-item-info">Presenze oggi</div><strong>${todayAttendance.length}</strong></div>
  `;
}

// ---------- BELT BADGE (header) ----------
function updateBeltBadge() {
  const students = load(STORAGE_KEYS.students);
  const beltText = document.getElementById('belt-text');
  if (students.length > 0 && students[0].belt) {
    beltText.textContent = students[0].belt;
  }
}

// ---------- INIT ----------
window.onload = () => {
  requestNotificationPermission();

  // Stato iniziale: welcome visibile, header e home-content nascosti
  document.getElementById('welcome-section').style.display = 'flex';
  document.getElementById('home-content').style.display = 'none';
  document.getElementById('app-header').style.display = 'none';

  // Se Firebase è disponibile, ascolta lo stato auth
  if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        onUserLoggedIn(user);
      } else {
        onUserLoggedOut();
      }
    });
  }

  // Render che non dipendono dal login
  renderStudents();
  renderSessions();
  renderLeaderboard();
  renderProfile();
  updateBeltBadge();
};