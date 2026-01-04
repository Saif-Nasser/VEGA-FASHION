
const firebaseConfig = {
  apiKey: "AIzaSyCCx2ScKjcjNwaCZ9dIogpfdXGIYmYl09U",
  authDomain: "vega-fashion-28ae3.firebaseapp.com",
  projectId: "vega-fashion-28ae3",
  storageBucket: "vega-fashion-28ae3.firebasestorage.app",
  messagingSenderId: "947458724452",
  appId: "1:947458724452:web:9b0063deba809758b8c571",
  measurementId: "G-SJG848PL26"
};

try {
  firebase.initializeApp(firebaseConfig);
  console.log("✅ Firebase initialized successfully");
} catch (error) {
  console.error("❌ Firebase initialization error:", error);
}

const db = firebase.firestore();
console.log("✅ Firestore initialized");

const auth = firebase.auth();
console.log("✅ Firebase Auth initialized");

const googleProvider = new firebase.auth.GoogleAuthProvider();
const facebookProvider = new firebase.auth.FacebookAuthProvider();

window.db = db;
window.auth = auth;
window.googleProvider = googleProvider;
window.facebookProvider = facebookProvider;
window.firebaseConfig = firebaseConfig;

console.log("🔥 Firebase configuration loaded and ready");

// IMPORTANT: admin provisioning must be performed securely (server-side).
// The previous client-side auto-creation of an admin account has been disabled
// to avoid leaking credentials and creating weak default passwords in production.
// Use the scripts in `scripts/` with the Firebase Admin SDK to create admin users
// or set custom claims for an existing user (see `scripts/README.md`).