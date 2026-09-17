// 🔴 REPLACE THIS CONFIG WITH YOURS
const firebaseConfig = {
  apiKey: "AIzaSyA7H0pY3kBXSth9JEQPZ4BpWmUjuj1eHrM",
  authDomain: "exclusivedojo.firebaseapp.com",
  projectId: "exclusivedojo",
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

function loginWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(console.error);
}

auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  document.getElementById("user-name").textContent = user.displayName;

  const roleRef = db.collection('roles').doc(user.uid);
  const roleSnap = await roleRef.get();

  if (!roleSnap.exists) {
    // First login → auto-register as 'allievo'
    await roleRef.set({
      role: 'allievo',
      email: user.email,
      name: user.displayName
    });
  }

  const finalSnap = await roleRef.get();
  const role = finalSnap.data().role;

  if (typeof onUserReady === 'function') onUserReady(user, role);
});

function logout() {
  auth.signOut().then(() => {
    window.location.reload();
  }).catch(console.error);
}