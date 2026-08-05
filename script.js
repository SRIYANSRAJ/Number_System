/* =========================================================================
   NUMBER SYSTEM TRAINER — AUTHENTICATION, ROUTE PROTECTION & POINTS ENGINE
   Author: Sriyans Raj
   Copyright © 2026 Sriyans Raj
   ========================================================================= */

// =========================================================================
// 1. FIREBASE CONFIGURATION
// =========================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDaF3Cd-Fw3GaHLuc2Aj7BDvwrd0ExyDW8",
  authDomain: "numbers-732c4.firebaseapp.com",
  projectId: "numbers-732c4",
  storageBucket: "numbers-732c4.firebasestorage.app",
  messagingSenderId: "149279859189",
  appId: "1:149279859189:web:c6ccf049d28d067d7500bc",
  measurementId: "G-XGS9406R8D"
};

let firebaseApp = null;
let isFirebaseReady = false;
let isFirestoreReady = false;

// Safe Firebase Initialization
if (typeof firebase !== 'undefined' && firebase.initializeApp) {
  try {
    if (!firebase.apps.length) {
      firebaseApp = firebase.initializeApp(firebaseConfig);
    } else {
      firebaseApp = firebase.app();
    }
    if (firebaseConfig.apiKey !== "YOUR_API_KEY_HERE") {
      isFirebaseReady = true;
    }
  } catch (err) {
    console.warn("Firebase Auth init notice:", err.message);
  }
}

// Safe Firestore Initialization (if SDK loaded)
if (isFirebaseReady && typeof firebase !== 'undefined' && firebase.firestore) {
  try {
    firebase.firestore(); // ensure it's accessible
    isFirestoreReady = true;
  } catch (err) {
    console.warn("Firestore init notice:", err.message);
  }
}

// =========================================================================
// 2. SESSION AUTH HELPERS
// =========================================================================
function isAuthenticated() {
  const localAuth = sessionStorage.getItem('numSysAuth') === 'true'
    || localStorage.getItem('numSysAuth') === 'true';
  if (isFirebaseReady && typeof firebase !== 'undefined' && firebase.auth) {
    const fbUser = firebase.auth().currentUser;
    return !!fbUser || localAuth;
  }
  return localAuth;
}

function setAuthSession(userEmail = 'user@sriyansraj.com', displayName = '') {
  sessionStorage.setItem('numSysAuth', 'true');
  localStorage.setItem('numSysAuth', 'true');
  sessionStorage.setItem('numSysUser', userEmail);
  if (displayName) localStorage.setItem('numSysName', displayName);
}

function clearAuthSession() {
  sessionStorage.removeItem('numSysAuth');
  localStorage.removeItem('numSysAuth');
  sessionStorage.removeItem('numSysUser');
  localStorage.removeItem('numSysName');
}

function getDisplayName() {
  if (!isAuthenticated()) return 'Learner';

  if (isFirebaseReady && typeof firebase !== 'undefined' && firebase.auth) {
    const user = firebase.auth().currentUser;
    if (user && user.displayName) return user.displayName;
  }

  const storedName = localStorage.getItem('numSysName');
  if (storedName) return storedName;

  if (isFirebaseReady && typeof firebase !== 'undefined' && firebase.auth) {
    const user = firebase.auth().currentUser;
    if (user && user.email) return user.email.split('@')[0];
  }

  const storedEmail = sessionStorage.getItem('numSysUser') || localStorage.getItem('numSysUser') || '';
  if (storedEmail && storedEmail.includes('@')) return storedEmail.split('@')[0];
  return 'Learner';
}

// =========================================================================
// 3. ROUTE PROTECTION
// =========================================================================
function checkIsLoginPage() {
  const currentPath = window.location.pathname.toLowerCase();
  if (currentPath.endsWith('index1.html')) return false;
  return currentPath.endsWith('index.html') || currentPath.endsWith('/') || currentPath === '';
}

function protectRoute() {
  const onLoginPage = checkIsLoginPage();
  if (!onLoginPage) {
    if (!isAuthenticated()) {
      document.documentElement.style.display = 'none';
      window.location.replace('index.html');
      return false;
    }
  } else {
    if (isAuthenticated()) {
      window.location.replace('index1.html');
      return false;
    }
  }
  return true;
}

// Firebase Auth state listener
if (typeof firebase !== 'undefined' && firebase.auth) {
  firebase.auth().onAuthStateChanged((user) => {
    const onLoginPage = checkIsLoginPage();
    if (user) {
      setAuthSession(user.email, user.displayName || '');
      if (onLoginPage) window.location.replace('index1.html');
    } else if (isFirebaseReady && !onLoginPage) {
      clearAuthSession();
      window.location.replace('index.html');
    }
  });
}

// Global logout
function logoutUser() {
  clearAuthSession();
  if (isFirebaseReady && typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().signOut()
      .then(() => window.location.replace('index.html'))
      .catch(() => window.location.replace('index.html'));
  } else {
    window.location.replace('index.html');
  }
}

// Run protection immediately
protectRoute();

// =========================================================================
// 4. TIME-BASED GREETING
// =========================================================================
function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { emoji: '🌅', text: 'Good Morning' };
  if (hour >= 12 && hour < 17) return { emoji: '☀️', text: 'Good Afternoon' };
  if (hour >= 17 && hour < 21) return { emoji: '🌆', text: 'Good Evening' };
  return { emoji: '🌙', text: 'Good Night' };
}

function injectTimeGreeting(containerSelector) {
  const el = document.getElementById('timeGreeting');
  if (!el) return;
  const { emoji, text } = getTimeGreeting();
  const name = getDisplayName();
  const emojiEl = el.querySelector('#greetEmoji');
  const textEl = el.querySelector('#greetText');
  if (emojiEl) emojiEl.textContent = emoji;
  if (textEl) textEl.textContent = `${text}, ${name}!`;
}

// =========================================================================
// 5. DIGITAL POINTS ENGINE
// =========================================================================
const DIFFICULTY_MULTIPLIER = { easy: 1, medium: 2, hard: 3, extreme: 5 };
const STREAK_BONUSES = { 5: 25, 10: 75, 15: 100, 20: 150 };

const POINTS_KEY = 'numSysPoints';
const MAX_STREAK_KEY = 'numSysMaxStreak';
const TOTAL_SOLVED_KEY = 'numSysTotalSolved';
const ERRORS_KEY = 'numSysErrors';
const CONVERSIONS_KEY = 'numSysConversions';

function getStats() {
  return {
    points: parseInt(localStorage.getItem(POINTS_KEY) || '0', 10),
    maxStreak: parseInt(localStorage.getItem(MAX_STREAK_KEY) || '0', 10),
    totalSolved: parseInt(localStorage.getItem(TOTAL_SOLVED_KEY) || '0', 10),
    errors: parseInt(localStorage.getItem(ERRORS_KEY) || '0', 10),
    conversions: parseInt(localStorage.getItem(CONVERSIONS_KEY) || '0', 10),
  };
}

function saveStats(stats) {
  localStorage.setItem(POINTS_KEY, stats.points);
  localStorage.setItem(MAX_STREAK_KEY, stats.maxStreak);
  localStorage.setItem(TOTAL_SOLVED_KEY, stats.totalSolved);
  localStorage.setItem(ERRORS_KEY, stats.errors);
  localStorage.setItem(CONVERSIONS_KEY, stats.conversions);
}

/**
 * Award points for a solved arithmetic question.
 * @param {string} level     - 'easy'|'medium'|'hard'|'extreme'
 * @param {boolean} correct  - was the full answer correct?
 * @param {number}  streak   - current streak count (AFTER this question)
 * @returns {number} points awarded this round
 */
function awardArithmeticPoints(level, correct, streak) {
  const stats = getStats();
  stats.totalSolved++;

  let earned = 0;
  if (correct) {
    const mult = DIFFICULTY_MULTIPLIER[level] || 1;
    earned = 10 * mult;
    // Streak bonus
    const bonusKey = Object.keys(STREAK_BONUSES)
      .map(Number).filter(k => streak === k).pop();
    if (bonusKey) earned += STREAK_BONUSES[bonusKey];
    stats.points += earned;
    stats.maxStreak = Math.max(stats.maxStreak, streak);
  } else {
    stats.errors++;
  }

  saveStats(stats);
  syncStatsToFirestore(stats);
  return earned;
}

/**
 * Award points for a correct conversion quiz answer.
 * @returns {number} points awarded
 */
function awardConversionPoints() {
  const stats = getStats();
  stats.points += 15;
  stats.conversions += 1;
  stats.totalSolved += 1;
  saveStats(stats);
  syncStatsToFirestore(stats);
  return 15;
}

/**
 * Sync stats to Firestore under userStats/{uid}
 */
function syncStatsToFirestore(stats) {
  if (!isFirestoreReady || !isFirebaseReady) return;
  try {
    const user = firebase.auth().currentUser;
    if (!user) return;
    const db = firebase.firestore();
    const name = getDisplayName();
    db.collection('userStats').doc(user.uid).set({
      uid: user.uid,
      name: name,
      email: user.email,
      points: stats.points,
      maxStreak: stats.maxStreak,
      totalSolved: stats.totalSolved,
      errors: stats.errors,
      conversions: stats.conversions,
      accuracy: stats.totalSolved > 0
        ? Math.round(((stats.totalSolved - stats.errors) / stats.totalSolved) * 100)
        : 0,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(e => console.warn('Firestore sync:', e.message));
  } catch (e) {
    console.warn('Firestore sync error:', e.message);
  }
}

/**
 * Fetch top-10 leaderboard from Firestore.
 * @returns {Promise<Array>}
 */
async function fetchLeaderboard() {
  if (!isFirestoreReady) return [];
  try {
    const db = firebase.firestore();
    const snap = await db.collection('userStats')
      .orderBy('points', 'desc')
      .limit(10)
      .get();
    return snap.docs.map(d => d.data());
  } catch (e) {
    console.warn('Leaderboard fetch:', e.message);
    return [];
  }
}

// Expose globally so index.html and number-system-quiz.html can call these
window.NST = {
  getStats,
  awardArithmeticPoints,
  awardConversionPoints,
  fetchLeaderboard,
  getDisplayName,
  getTimeGreeting,
  injectTimeGreeting,
};

// =========================================================================
// 6. LOGIN PAGE LOGIC (index.html)
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {

  // Inject time greeting immediately
  injectTimeGreeting();

  // Toggle panels
  const container = document.getElementById('container');
  const registerBtn = document.getElementById('register');
  const loginBtn = document.getElementById('login');

  if (registerBtn && container) {
    registerBtn.addEventListener('click', () => container.classList.add('active'));
  }
  if (loginBtn && container) {
    loginBtn.addEventListener('click', () => container.classList.remove('active'));
  }

  // ── SIGN IN (email/password) ──────────────────────────────────────────
  const signInForm = document.getElementById('signInForm');
  if (signInForm) {
    signInForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = (document.getElementById('signInEmail')?.value || '').trim();
      const password = document.getElementById('signInPassword')?.value || '';

      if (!email || !password) {
        showToast('Please enter both email and password.', 'error');
        return;
      }

      if (isFirebaseReady && typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().signInWithEmailAndPassword(email, password)
          .then((cred) => cred.user.reload().then(() => cred.user))
          .then((user) => {
            setAuthSession(user.email, user.displayName || '');
            showToast('Welcome back! Loading trainer…', 'success');
            setTimeout(() => window.location.replace('index1.html'), 700);
          })
          .catch(handleAuthError);
      } else {
        setAuthSession(email);
        showToast('Login successful! Redirecting…', 'success');
        setTimeout(() => window.location.replace('index1.html'), 700);
      }
    });
  }

  // ── SIGN UP (email/password) ──────────────────────────────────────────
  const signUpForm = document.getElementById('signUpForm');
  if (signUpForm) {
    signUpForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = (document.getElementById('signUpName')?.value || '').trim();
      const email = (document.getElementById('signUpEmail')?.value || '').trim();
      const password = document.getElementById('signUpPassword')?.value || '';

      if (!name) {
        showToast('Please enter your full name.', 'error');
        return;
      }
      if (!email || !password) {
        showToast('Please provide a valid email and password.', 'error');
        return;
      }
      if (password.length < 6) {
        showToast('Password must be at least 6 characters.', 'error');
        return;
      }

      if (isFirebaseReady && typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().createUserWithEmailAndPassword(email, password)
          .then((cred) => {
            // Save display name to Firebase Auth profile
            return cred.user.updateProfile({ displayName: name })
              .then(() => cred.user.reload())
              .then(() => cred.user);
          })
          .then((user) => {
            setAuthSession(user.email, name);
            showToast(`Account created! Welcome, ${name} 🎉`, 'success');
            setTimeout(() => window.location.replace('index1.html'), 800);
          })
          .catch(handleAuthError);
      } else {
        setAuthSession(email, name);
        showToast(`Registration successful! Welcome, ${name}!`, 'success');
        setTimeout(() => window.location.replace('index1.html'), 700);
      }
    });
  }

  // ── GOOGLE SIGN-IN (both buttons) ────────────────────────────────────
  function handleGoogleSignIn(e) {
    e.preventDefault();
    if (isFirebaseReady && typeof firebase !== 'undefined' && firebase.auth) {
      const provider = new firebase.auth.GoogleAuthProvider();
      firebase.auth().signInWithPopup(provider)
        .then((result) => {
          const user = result.user;
          setAuthSession(user.email, user.displayName || '');
          showToast(`Signed in as ${user.displayName || user.email} 🎉`, 'success');
          setTimeout(() => window.location.replace('index1.html'), 700);
        })
        .catch(handleAuthError);
    } else {
      setAuthSession('google_user@example.com', 'Google User');
      showToast('Google Auth Success! Redirecting…', 'success');
      setTimeout(() => window.location.replace('index1.html'), 700);
    }
  }

  const googleSignInBtn = document.getElementById('googleSignInBtn');
  const googleSignUpBtn = document.getElementById('googleSignUpBtn');
  if (googleSignInBtn) googleSignInBtn.addEventListener('click', handleGoogleSignIn);
  if (googleSignUpBtn) googleSignUpBtn.addEventListener('click', handleGoogleSignIn);

});

// =========================================================================
// 7. AUTH ERROR HANDLER (human-readable messages)
// =========================================================================
function handleAuthError(error) {
  console.error("Firebase Auth Error:", error);
  const code = error && error.code;
  if (code === 'auth/unauthorized-domain') {
    const host = window.location.hostname;
    if (window.location.protocol === 'file:') {
      const fileHint = window.NST_LOCAL_DEV
        ? 'Open via http://localhost:8000 — file:// is not allowed by Firebase.'
        : 'Serve this site over HTTPS (e.g. GitHub Pages) — file:// is not allowed by Firebase.';
      showToast(fileHint, 'error');
    } else if (host === '127.0.0.1' && window.NST_LOCAL_DEV) {
      showToast('Replace "127.0.0.1" with "localhost" in your URL bar, or add 127.0.0.1 in Firebase Console → Auth → Authorized Domains.', 'error');
    } else {
      showToast(`Domain "${host}" not authorized. Add it in Firebase Console → Authentication → Settings → Authorized Domains.`, 'error');
    }
  } else if (code === 'auth/email-already-in-use') {
    showToast('That email is already registered. Try signing in instead.', 'error');
  } else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    showToast('Incorrect email or password. Please try again.', 'error');
  } else if (code === 'auth/user-not-found') {
    showToast('No account found with that email. Sign up first!', 'error');
  } else if (code === 'auth/weak-password') {
    showToast('Password is too weak. Use at least 6 characters.', 'error');
  } else if (code === 'auth/popup-closed-by-user') {
    showToast('Sign-in popup was closed. Please try again.', 'info');
  } else {
    showToast(error.message || 'Authentication error. Please try again.', 'error');
  }
}

// =========================================================================
// 8. TOAST NOTIFICATION
// =========================================================================
function showToast(msg, type = 'info') {
  let toast = document.getElementById('auth-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'auth-toast';
    document.body.appendChild(toast);
  }
  toast.className = `auth-toast ${type}`;
  toast.textContent = msg;
  // Force reflow so animation re-triggers
  void toast.offsetWidth;
  toast.classList.add('show');
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => toast.classList.remove('show'), 3800);
}
