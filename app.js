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
function setRole(role, el) {
  currentRole = role;
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');

  document.querySelectorAll('.maestro-only').forEach(node => {
    node.style.display = role === 'maestro' ? 'block' : 'none';
  });
}

// ---------- SCREEN NAV ----------
function showScreen(name, el) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');

  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');

  if (name === 'students') renderStudents();
  if (name === 'sessions') renderSessions();
  if (name === 'leaderboard') renderLeaderboard();
  if (name === 'dashboard') renderDashboard();
  if (name === 'home') {
    renderAttendanceHistory();
    populateManualSelects();
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
    container.innerHTML = '<p>Nessun allievo registrato.</p>';
    return;
  }

  container.innerHTML = students.map(s => `
    <div class="list-item">
      ${s.photo ? `<img src="${s.photo}" class="student-photo" alt="${s.name}">` : ''}
      <div class="list-item-info">
        <strong>${s.name}</strong>
        <div>Cintura: <input type="text" value="${s.belt || ''}"
          onchange="updateStudentBelt('${s.id}', this.value)"></div>
        <div>Data di nascita: ${s.dob || '—'}</div>
      </div>
      <button class="maestro-only" onclick="deleteStudent('${s.id}')">
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
    container.innerHTML = '<p>Nessuna sessione pianificata.</p>';
    return;
  }

  container.innerHTML = sessions.map(s => {
    const attendees = attendance
      .filter(a => a.sessionId === s.id)
      .map(a => students.find(st => st.id === a.studentId)?.name || 'Sconosciuto');

    return `
      <div class="list-item">
        <div class="list-item-info">
          <strong>${s.name}</strong>
          <div>${s.date} ${s.time || ''}</div>
          <div>Presenti: ${attendees.length ? attendees.join(', ') : 'Nessuno'}</div>
        </div>
        <button class="maestro-only" onclick="deleteSession('${s.id}')">
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

  renderAttendanceHistory();
  renderSessions();
  renderLeaderboard();
}

function deleteAttendance(id) {
  let attendance = load(STORAGE_KEYS.attendance);
  attendance = attendance.filter(a => a.id !== id);
  save(STORAGE_KEYS.attendance, attendance);
  renderAttendanceHistory();
  renderSessions();
  renderLeaderboard();
}

function renderAttendanceHistory() {
  const attendance = load(STORAGE_KEYS.attendance)
    .sort((a, b) => b.timestamp - a.timestamp);
  const students = load(STORAGE_KEYS.students);
  const sessions = load(STORAGE_KEYS.sessions);
  const container = document.getElementById('attendance-history');
  if (!container) return;

  if (attendance.length === 0) {
    container.innerHTML = '<p>Nessuna presenza registrata.</p>';
    return;
  }

  container.innerHTML = attendance.map(a => {
    const student = students.find(s => s.id === a.studentId);
    const session = sessions.find(s => s.id === a.sessionId);
    return `
      <div class="list-item">
        <div class="list-item-info">
          <strong>${student ? student.name : 'Allievo generico'}</strong>
          <div>${session ? session.name : ''} — ${a.date}</div>
        </div>
        <button class="maestro-only" onclick="deleteAttendance('${a.id}')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
  }).join('');
}

// ---------- CHECK-IN (self, allievo) ----------
function doCheckin() {
  const btn = document.getElementById('checkin-btn');
  btn.textContent = "Check-in effettuato";

  const countEl = document.getElementById('att-count');
  const newCount = parseInt(countEl.textContent) + 1;
  countEl.textContent = newCount;
  localStorage.setItem("att-count", newCount);

  const attendance = load(STORAGE_KEYS.attendance);
  attendance.push({
    id: uid(),
    studentId: 'self',
    sessionId: 'generic',
    date: new Date().toISOString().slice(0, 10),
    timestamp: Date.now()
  });
  save(STORAGE_KEYS.attendance, attendance);

  renderAttendanceHistory();
  renderLeaderboard();
}

// ---------- LEADERBOARD ----------
function renderLeaderboard() {
  const students = load(STORAGE_KEYS.students);
  const attendance = load(STORAGE_KEYS.attendance);
  const container = document.getElementById('leaderboard-list');
  if (!container) return;

  const counts = students.map(s => ({
    name: s.name,
    count: attendance.filter(a => a.studentId === s.id).length
  })).sort((a, b) => b.count - a.count);

  if (counts.length === 0) {
    container.innerHTML = '<p>Nessun dato disponibile.</p>';
    return;
  }

  container.innerHTML = counts.map((c, i) => `
    <div class="list-item">
      <div class="list-item-info">
        <strong>#${i + 1} ${c.name}</strong>
        <div>${c.count} presenze</div>
      </div>
    </div>
  `).join('');
}

// ---------- DASHBOARD ----------
function renderDashboard() {
  const students = load(STORAGE_KEYS.students);
  const sessions = load(STORAGE_KEYS.sessions);
  const attendance = load(STORAGE_KEYS.attendance);
  const today = new Date().toISOString().slice(0, 10);

  const summaryEl = document.getElementById('dashboard-summary');
  const dobEl = document.getElementById('dashboard-dob');
  if (!summaryEl || !dobEl) return;

  const todaySessions = sessions.filter(s => s.date === today);
  const todayAttendance = attendance.filter(a => a.date === today);

  summaryEl.innerHTML = `
    <p>Allievi totali: ${students.length}</p>
    <p>Sessioni totali: ${sessions.length}</p>
    <p>Sessioni oggi: ${todaySessions.length}</p>
    <p>Presenze oggi: ${todayAttendance.length}</p>
  `;

  dobEl.innerHTML = students.length
    ? students.map(s => `<div>${s.name}: ${s.dob || '—'}</div>`).join('')
    : '<p>Nessun allievo registrato.</p>';
}

// ---------- INIT ----------
window.onload = () => {
  const saved = localStorage.getItem("att-count");
  if (saved) {
    document.getElementById('att-count').textContent = saved;
  }

  requestNotificationPermission();
  setRole('allievo', document.querySelector('.role-btn.active'));

  renderAttendanceHistory();
  populateManualSelects();
  renderStudents();
  renderSessions();
  renderLeaderboard();
  renderDashboard();
};