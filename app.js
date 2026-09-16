let checkedIn = false;

// ROLE SWITCH
function setRole(role, el) {
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

// CHECK-IN
function doCheckin() {
  if (checkedIn) return;

  checkedIn = true;

  const btn = document.getElementById('checkin-btn');
  btn.textContent = "Check-in effettuato";

  const countEl = document.getElementById('att-count');
  countEl.textContent = parseInt(countEl.textContent) + 1;

  localStorage.setItem("att-count", countEl.textContent);
}

// LOAD DATA
window.onload = () => {
  const saved = localStorage.getItem("att-count");
  if (saved) {
    document.getElementById('att-count').textContent = saved;
  }
};