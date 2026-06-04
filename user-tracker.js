/**
 * user-tracker.js — Flatzy Activity Tracker
 * ─────────────────────────────────────────
 * Har user page pe include karo (owner.html, home.html, rent.html, etc.)
 * Yeh automatically track karta hai:
 *   • Login / Logout
 *   • Page visits
 *   • Property actions (add, edit, delete, photo upload)
 *   • lastSeen heartbeat (every 2 min) — online/offline detect ke liye
 *   • Block check — blocked user ko force logout karta hai
 *   • Auto cleanup — 1 din se purane activityLogs delete ho jaate hain
 *
 * Usage: <script type="module" src="user-tracker.js"></script>
 *        (config.js ke baad, baaki scripts ke pehle)
 */

import { initializeApp, getApps }                        from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut }           from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, updateDoc,
         collection, getDoc, getDocs,
         query, where, writeBatch }                       from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Init (reuse existing app if already initialized) ─────────────────────────
const app = getApps().length ? getApps()[0] : initializeApp(window.firebaseConfig || {
  apiKey: "AIzaSyA1ChJCaBHpAPnvdK7Z7dbST7bTViuBrWg",
  authDomain: "flatzyhomes.firebaseapp.com",
  projectId: "flatzyhomes",
  storageBucket: "flatzyhomes.firebasestorage.app",
  messagingSenderId: "519957313457",
  appId: "1:519957313457:web:1ffc1685819120edd7ef90"
});
const auth = getAuth(app);
const db   = getFirestore(app);

// ── Helpers ───────────────────────────────────────────────────────────────────
function getDevice() {
  const ua = navigator.userAgent;
  if (/mobile/i.test(ua))  return '📱 Mobile';
  if (/tablet/i.test(ua))  return '📱 Tablet';
  return '🖥️ Desktop';
}

function getPageName() {
  const path = location.pathname.split('/').pop() || 'index.html';
  const map  = {
    'index.html':'Home', 'home.html':'Dashboard', 'owner.html':'Owner Panel',
    'rent.html':'Rent Listings', 'login.html':'Login', 'faq.html':'FAQ',
    'services.html':'Services', 'whats-new.html':"What's New", '':'Home'
  };
  return map[path] || path;
}

let _currentUser = null;
let _heartbeatInterval = null;

// ── Auto Cleanup: 1 din se purane logs delete karo ───────────────────────────
async function cleanOldLogs() {
  try {
    // Sirf ek baar per session run karo
    if (window._cleanupDone) return;
    window._cleanupDone = true;

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const snap = await getDocs(
      query(collection(db, 'activityLogs'), where('timestamp', '<', oneDayAgo))
    );

    if (snap.empty) return;

    // Firestore batch delete (max 500 per batch)
    const batches = [];
    let batch = writeBatch(db);
    let count = 0;

    snap.docs.forEach(d => {
      batch.delete(d.ref);
      count++;
      if (count === 499) {
        batches.push(batch.commit());
        batch = writeBatch(db);
        count = 0;
      }
    });

    if (count > 0) batches.push(batch.commit());
    await Promise.all(batches);

    console.log(`[Tracker] ${snap.size} purane logs delete kiye ✅`);
  } catch(e) {
    console.warn('[Tracker] Cleanup failed:', e.message);
  }
}

// ── Core: Log activity to Firestore ──────────────────────────────────────────
async function logActivity(type, extra = {}) {
  if (!_currentUser) return;
  try {
    await setDoc(doc(collection(db, 'activityLogs')), {
      uid:       _currentUser.uid,
      userEmail: _currentUser.email,
      userName:  _currentUser.displayName || _currentUser.email,
      type,
      timestamp: new Date().toISOString(),
      device:    getDevice(),
      page:      getPageName(),
      ...extra
    });
  } catch(e) {
    console.warn('[Tracker] logActivity failed:', e.message);
  }
}

// ── Update lastSeen + lastLogin in users doc ──────────────────────────────────
async function updatePresence(isLogin = false) {
  if (!_currentUser) return;
  try {
    const data = { lastSeen: new Date().toISOString() };
    if (isLogin) {
      data.lastLogin  = new Date().toISOString();
      data.lastDevice = getDevice();
      data.lastPage   = getPageName();
    }
    await updateDoc(doc(db, 'users', _currentUser.uid), data);
  } catch(e) {
    // User doc might not exist yet — silently ignore
  }
}

// ── Block check: force logout if blocked ─────────────────────────────────────
async function checkBlocked() {
  if (!_currentUser) return;
  try {
    const snap = await getDoc(doc(db, 'users', _currentUser.uid));
    if (snap.exists() && snap.data().blocked === true) {
      clearInterval(_heartbeatInterval);
      await signOut(auth);
      document.body.innerHTML = `
        <div style="
          min-height:100vh;display:flex;align-items:center;justify-content:center;
          font-family:'DM Sans',sans-serif;background:#fff5f5;padding:2rem;text-align:center">
          <div>
            <div style="font-size:4rem;margin-bottom:1rem">🚫</div>
            <h2 style="color:#dc2626;font-size:1.6rem;margin-bottom:0.5rem">Account Blocked</h2>
            <p style="color:#64748b;max-width:340px;margin:0 auto 1.5rem">
              Tumhara account Flatzy admin ne block kar diya hai.<br>
              Agar galti lagi ho toh support se contact karo.
            </p>
            <a href="mailto:flatzyhomes@gmail.com"
               style="background:#dc2626;color:white;padding:0.7rem 1.5rem;border-radius:10px;
                      text-decoration:none;font-weight:700;font-size:0.9rem">
              📧 Contact Support
            </a>
          </div>
        </div>`;
    }
  } catch(e) {
    console.warn('[Tracker] Block check failed:', e.message);
  }
}

// ── Heartbeat: update lastSeen every 2 minutes ───────────────────────────────
function startHeartbeat() {
  clearInterval(_heartbeatInterval);
  _heartbeatInterval = setInterval(async () => {
    await updatePresence(false);
    await checkBlocked();
  }, 2 * 60 * 1000);
}

// ── Auth state listener ───────────────────────────────────────────────────────
onAuthStateChanged(auth, async user => {
  if (user) {
    const wasNull = !_currentUser;
    _currentUser = user;

    if (wasNull) {
      await checkBlocked();
      await updatePresence(true);
      await logActivity('login');
      startHeartbeat();
      // Login ke time purane logs cleanup karo
      cleanOldLogs();
    }

    // Log page visit
    await logActivity('page', { page: getPageName() });

  } else {
    if (_currentUser) {
      await logActivity('logout');
      clearInterval(_heartbeatInterval);
    }
    _currentUser = null;
  }
});

// ── Page visibility: update lastSeen when tab becomes active ─────────────────
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && _currentUser) {
    updatePresence(false);
  }
});

// ── Logout cleanup ────────────────────────────────────────────────────────────
window.trackerLogout = async function() {
  if (_currentUser) {
    await logActivity('logout');
    clearInterval(_heartbeatInterval);
  }
};

// ── Public API ────────────────────────────────────────────────────────────────
window.trackActivity = async function(type, extra = {}) {
  await logActivity(type, extra);
};
