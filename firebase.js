// 🔴 REPLACE THIS CONFIG WITH YOURS
const firebaseConfig = {
  apiKey: "AIzaSyA7H0pY3kBXSth9JEQPZ4BpWmUjuj1eHrM",
  authDomain: "exclusivedojo.firebaseapp.com",
  projectId: "exclusivedojo",
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();

// LOGIN
function loginWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();

  auth.signInWithPopup(provider)
    .then((result) => {
      const user = result.user;
      document.getElementById("user-name").textContent = user.displayName;
    })
    .catch((error) => {
      console.error(error);
    });
}

// AUTO LOGIN
auth.onAuthStateChanged(user => {
  if (user) {
    document.getElementById("user-name").textContent = user.displayName;
  }
});