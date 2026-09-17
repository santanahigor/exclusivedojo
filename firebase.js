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
  auth.signInWithRedirect(provider).catch(console.error);
}

function logout() {
  auth.signOut().catch(console.error);
}

// Handle the redirect result (fires once, after returning from Google login)
auth.getRedirectResult()
  .then((result) => {
    console.log('getRedirectResult:', result);
    if (result.user) {
      console.log('✅ Redirect login success:', result.user.email);
    } else {
      console.log('ℹ️ No redirect result (normal on first load without redirect).');
    }
  })
  .catch((error) => {
    console.error('❌ Redirect login error:', error.code, error.message);
  });

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    if (typeof onUserLoggedOut === 'function') onUserLoggedOut();
    return;
  }

  document.getElementById("user-name").textContent = user.displayName;

  const roleRef = db.collection('roles').doc(user.uid);
  const roleSnap = await roleRef.get();

  if (!roleSnap.exists) {
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