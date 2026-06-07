import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, getDocs, orderBy, query, doc, deleteDoc, updateDoc, setDoc, getDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA1ChJCaBHpAPnvdK7Z7dbST7bTViuBrWg",
  authDomain: "flatzyhomes.firebaseapp.com",
  projectId: "flatzyhomes",
  storageBucket: "flatzyhomes.firebasestorage.app",
  messagingSenderId: "519957313457",
  appId: "1:519957313457:web:1ffc1685819120edd7ef90"
};

const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

const ADMIN_EMAILS = ["ritz9690@gmail.com", "flatzyhomes@gmail.com"];
const SECRET_PASS  = "Flatzy@homes21";

window.allListings = [];
let editingId   = null;
let pendingDeleteId     = null;
let pendingDeleteImages = [];

// ─── Auth ──────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, user => {
  if (user && ADMIN_EMAILS.includes(user.email)) {
    showPanel();
    loadListings();
  } else if (user) {
    signOut(auth);
    showError("Access denied. Not an admin account.");
  } else {
    showLogin();
  }
});

// ─── Step 1: secret password ───────────────────────────────────────────────
window.checkSecret = function() {
  const val = document.getElementById('secretPass').value;
  const err = document.getElementById('secretError');
  if (!val) { err.textContent = 'Password daalo.'; return; }
  if (val !== SECRET_PASS) { err.textContent = 'Wrong password! ❌'; document.getElementById('secretPass').value = ''; return; }
  document.getElementById('step1').style.display = 'none';
  document.getElementById('step2').style.display = 'block';
};

window.backToStep1 = function() {
  document.getElementById('step2').style.display = 'none';
  document.getElementById('step1').style.display = 'block';
  document.getElementById('secretPass').value = '';
  document.getElementById('secretError').textContent = '';
};

// ─── Step 2: Google login ──────────────────────────────────────────────────
window.doGoogleLogin = async function() {
  const { GoogleAuthProvider, signInWithPopup } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
  const btn = document.getElementById('googleLoginBtn');
  const err = document.getElementById('loginError');
  btn.disabled = true; btn.textContent = '⏳ Signing in...'; err.textContent = '';
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ login_hint: ADMIN_EMAILS[0] });
    const result = await signInWithPopup(auth, provider);
    if (!ADMIN_EMAILS.includes(result.user.email)) {
      await signOut(auth);
      err.textContent = 'Yeh admin account nahi hai! ❌';
      btn.disabled = false; btn.textContent = 'Continue with Google';
    }
  } catch(e) {
    if (e.code === 'auth/popup-blocked') err.textContent = 'Popup blocked! Browser mein popup allow karo.';
    else if (e.code === 'auth/cancelled-popup-request' || e.code === 'auth/popup-closed-by-user') err.textContent = 'Login cancel ho gaya.';
    else err.textContent = 'Error: ' + e.message;
    btn.disabled = false; btn.textContent = 'Continue with Google';
  }
};

window.adminLogout = async function() {
  await signOut(auth);
  window.allListings = [];
  document.getElementById('step1').style.display = 'block';
  document.getElementById('step2').style.display = 'none';
  document.getElementById('secretPass').value = '';
};

// ─── Load listings ─────────────────────────────────────────────────────────
window.loadListings = async function loadListings() {
  try {
    const q = query(collection(db, 'properties'), orderBy('postedAt', 'desc'));
    const snap = await getDocs(q);
    window.allListings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderStats(window.allListings);
    renderListings(window.allListings);
    loadVisitorCount();
    updateSidebarBadges();
  } catch(e) {
    try {
      const snap2 = await getDocs(collection(db, 'properties'));
      window.allListings = snap2.docs.map(d => ({ id: d.id, ...d.data() }));
      window.allListings.sort((a,b) => (b.postedAt||'') > (a.postedAt||'') ? 1 : -1);
      renderStats(window.allListings);
      renderListings(window.allListings);
      loadVisitorCount();
      updateSidebarBadges();
    } catch(e2) {
      document.getElementById('listingsContainer').innerHTML =
        `<div class="empty-state"><div class="icon">⚠️</div><h3>Error loading listings</h3><p>${e2.message}</p></div>`;
    }
  }
}

// ─── Render stats ──────────────────────────────────────────────────────────
function renderStats(listings) {
  document.getElementById('statsRow').style.display = '';
  document.getElementById('statTotal').textContent = listings.length;
  const uniqueOwners = new Set(listings.map(p => p.ownerPhone || p.ownerUid)).size;
  document.getElementById('statOwners').textContent = uniqueOwners;
  const avgRent = listings.length ? Math.round(listings.reduce((a,p) => a + Number(p.rent||0), 0) / listings.length) : 0;
  document.getElementById('statRent').textContent = '₹' + avgRent.toLocaleString('en-IN');
  const totalPhotos = listings.reduce((a,p) => a + (p.photos?.length || 0), 0);
  document.getElementById('statPhotos').textContent = totalPhotos;
  document.getElementById('listingCount').textContent = `${listings.length} total listing${listings.length !== 1 ? 's' : ''} in database`;
}

// ─── Render listings ────────────────────────────────────────────────────────
function renderListings(listings) {
  const container = document.getElementById('listingsContainer');
  if (!listings.length) {
    container.innerHTML = `<div class="empty-state"><div class="icon">🏠</div><h3>No listings found</h3><p>No properties match your search.</p></div>`;
    return;
  }
  container.innerHTML = `<div class="listings-grid">${listings.map((p, i) => {
    const thumb = p.photos && p.photos.length > 0 ? p.photos[0] : null;
    const photoCount = p.photos?.length || 0;
    const dateStr = p.postedAt
      ? new Date(p.postedAt).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'})
      : 'Unknown date';
    return `<div class="listing-card" style="animation-delay:${i*0.04}s">
      <div class="listing-thumb">
        ${thumb ? `<img src="${thumb}" alt="${p.title||''}" loading="lazy" onerror="this.style.display='none';this.parentNode.textContent='🏠'">` : '🏠'}
      </div>
      <div class="listing-info">
        <div class="listing-title">${p.title || 'Untitled Property'}</div>
        <div class="listing-meta">
          <span>📍 ${p.area || '—'}</span>
          <span>🛏 ${p.bhk || '—'}</span>
          <span>🏗 ${p.furnish || '—'}</span>
          <span>📋 ${p.type || '—'}</span>
        </div>
        <div class="owner-info">
          <span>👤</span>
          <span class="owner-name">${p.ownerName || 'Unknown Owner'}</span>
          ${p.ownerPhone
            ? `<a class="owner-phone" href="tel:${p.ownerPhone}">📞 ${p.ownerPhone}</a>
               <a class="owner-phone" href="https://wa.me/91${p.ownerPhone}" target="_blank">💬 WhatsApp</a>`
            : '<span style="color:var(--muted);font-size:0.75rem;">No phone</span>'}
          ${p.ownerEmail || p.userEmail
            ? `<a class="owner-phone" href="mailto:${p.ownerEmail||p.userEmail}" style="color:#6366f1;">✉️ ${p.ownerEmail||p.userEmail}</a>`
            : '<span style="color:var(--muted);font-size:0.72rem;">No email</span>'}
          ${p.lat && p.lng
            ? `<a class="owner-phone" href="https://www.google.com/maps?q=${p.lat},${p.lng}" target="_blank" style="color:#16a34a;">📍 View on Map</a>`
            : '<span style="color:var(--muted);font-size:0.72rem;">No location</span>'}
          ${p.lat && p.lng ? `
            <div style="margin-top:0.4rem;display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;">
              ${p.locationStatus === 'approved'
                ? `<span style="background:#dcfce7;color:#16a34a;border:1px solid #86efac;border-radius:6px;padding:0.2rem 0.6rem;font-size:0.72rem;font-weight:700;">✅ Location Approved</span>
                   <button onclick="setLocationStatus('${p.id}','rejected')" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:6px;padding:0.2rem 0.6rem;font-size:0.72rem;font-weight:700;cursor:pointer;">↩️ Reject</button>`
                : p.locationStatus === 'rejected'
                ? `<span style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:6px;padding:0.2rem 0.6rem;font-size:0.72rem;font-weight:700;">❌ Location Rejected</span>
                   <button onclick="setLocationStatus('${p.id}','approved')" style="background:#dcfce7;color:#16a34a;border:1px solid #86efac;border-radius:6px;padding:0.2rem 0.6rem;font-size:0.72rem;font-weight:700;cursor:pointer;">✅ Approve</button>`
                : `<span style="background:#fef9c3;color:#854d0e;border:1px solid #fde047;border-radius:6px;padding:0.2rem 0.6rem;font-size:0.72rem;font-weight:700;">⏳ Pending Verify</span>
                   <button onclick="setLocationStatus('${p.id}','approved')" style="background:#dcfce7;color:#16a34a;border:1px solid #86efac;border-radius:6px;padding:0.2rem 0.6rem;font-size:0.72rem;font-weight:700;cursor:pointer;">✅ Approve</button>
                   <button onclick="setLocationStatus('${p.id}','rejected')" style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:6px;padding:0.2rem 0.6rem;font-size:0.72rem;font-weight:700;cursor:pointer;">❌ Reject</button>`
              }
            </div>` : ''}
        </div>
      </div>
      <div class="listing-right">
        <div class="listing-rent">₹${Number(p.rent||0).toLocaleString('en-IN')}/mo</div>
        <div class="listing-type-badge">${p.type || 'Property'}</div>
        <div class="listing-date">${dateStr}</div>
        ${photoCount > 0
          ? `<br><button class="view-photos-btn" onclick='openPhotos(${JSON.stringify(p.photos)}, "${(p.title||'').replace(/"/g,'')}")'>📷 ${photoCount} photo${photoCount>1?'s':''}</button>`
          : '<div style="font-size:0.72rem;color:var(--muted);margin-top:0.3rem;">No photos</div>'}
        ${p.videoUrl
          ? `<br><button class="view-photos-btn" style="background:#fef3c7;color:#92400e;border-color:#fde68a;margin-top:0.3rem;" onclick='openVideo("${p.videoUrl}", "${(p.title||'').replace(/"/g,'')}")'>🎥 View Video</button>`
          : '<div style="font-size:0.72rem;color:var(--muted);margin-top:0.2rem;">No video</div>'}
        <div class="action-btns">
          <button class="edit-btn" onclick='openEdit(${JSON.stringify(p)})'>✏️ Edit</button>
          <button class="delete-btn" onclick='askDelete("${p.id}", "${(p.title||"Untitled").replace(/"/g,"")}", ${JSON.stringify(p.photos||[])})'>🗑️ Delete</button>
        </div>
      </div>
    </div>`;
  }).join('')}</div>`;
}

// ─── Location Verify ────────────────────────────────────────────────────────
window.setLocationStatus = async function(propId, status) {
  try {
    await updateDoc(doc(db, 'properties', propId), { locationStatus: status });
    const idx = window.allListings.findIndex(p => p.id === propId);
    if (idx !== -1) window.allListings[idx].locationStatus = status;
    renderListings(window.allListings);
    showToast(status === 'approved' ? '✅ Location Approved!' : '❌ Location Rejected');
  } catch(e) {
    showToast('Error: ' + e.message, 'error');
  }
};

// ─── Filter ─────────────────────────────────────────────────────────────────
window.filterListings = function() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const type   = document.getElementById('filterType').value;
  const bhk    = document.getElementById('filterBhk').value;
  const filtered = window.allListings.filter(p => {
    const matchSearch = !search || [p.title, p.area, p.ownerName, p.ownerPhone, p.address].some(v => (v||'').toLowerCase().includes(search));
    const matchType = !type || (p.type||'') === type;
    const matchBhk  = !bhk  || (p.bhk||'')  === bhk;
    return matchSearch && matchType && matchBhk;
  });
  renderListings(filtered);
};

// ─── Cloudinary delete ────────────────────────────────────────────────────
window.deleteFromCloudinary = async function(images) {
  if (!images || images.length === 0) return;
  for (const url of images) {
    try {
      const parts = url.split('/');
      const uploadIdx = parts.indexOf('upload');
      if (uploadIdx === -1) continue;
      let publicParts = parts.slice(uploadIdx + 1);
      if (publicParts[0] && /^v\d+$/.test(publicParts[0])) publicParts = publicParts.slice(1);
      const publicId = publicParts.join('/').replace(/\.[^/.]+$/, '');
      const timestamp = Math.round(Date.now() / 1000);
      const str = `public_id=${publicId}&timestamp=${timestamp}${CLOUD_API_SECRET}`;
      const msgBuffer = new TextEncoder().encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      const formData = new FormData();
      formData.append('public_id', publicId);
      formData.append('timestamp', timestamp);
      formData.append('api_key', CLOUD_API_KEY);
      formData.append('signature', signature);
      await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, { method: 'POST', body: formData });
    } catch(e) { console.warn('Cloudinary delete failed:', url, e.message); }
  }
}

// ─── Delete ──────────────────────────────────────────────────────────────────
window.askDelete = function(id, title, images) {
  pendingDeleteId = id;
  pendingDeleteImages = images || [];
  document.getElementById('confirmMsg').textContent = `"${title}" ko permanently delete karna chahte ho? Firestore + Cloudinary dono se delete hoga!`;
  document.getElementById('confirmModal').classList.add('open');
};

window.closeConfirm = function() {
  document.getElementById('confirmModal').classList.remove('open');
  pendingDeleteId = null; pendingDeleteImages = [];
};

window.confirmDelete = async function() {
  if (!pendingDeleteId) return;
  const btn = document.getElementById('confirmDeleteBtn');
  btn.disabled = true; btn.textContent = '🗑️ Deleting…';
  try {
    if (pendingDeleteImages.length > 0) { btn.textContent = '☁️ Cloudinary se delete…'; await deleteFromCloudinary(pendingDeleteImages); }
    btn.textContent = '🔥 Firestore se delete…';
    await deleteDoc(doc(db, 'properties', pendingDeleteId));
    window.allListings = window.allListings.filter(p => p.id !== pendingDeleteId);
    renderStats(window.allListings);
    filterListings();
    closeConfirm();
    showToast('Listing + photos sab delete ho gaye ✅');
  } catch(e) {
    showToast('Delete failed: ' + e.message, 'error');
    btn.disabled = false; btn.textContent = 'Delete Karo';
  }
};

// ─── Edit ─────────────────────────────────────────────────────────────────────
window.openEdit = function(p) {
  editingId = p.id;
  document.getElementById('e_title').value     = p.title || '';
  document.getElementById('e_area').value      = p.area || '';
  document.getElementById('e_rent').value      = p.rent || '';
  document.getElementById('e_ownerName').value = p.ownerName || '';
  document.getElementById('e_ownerPhone').value= p.ownerPhone || '';
  document.getElementById('e_address').value   = p.address || '';
  document.getElementById('e_desc').value      = p.desc || p.description || '';
  document.getElementById('e_lat').value        = p.lat || '';
  document.getElementById('e_lng').value        = p.lng || '';
  // Maps link
  const mapsDiv = document.getElementById('e_mapsLink');
  const mapsA   = document.getElementById('e_mapsAnchor');
  if (p.lat && p.lng) {
    mapsA.href = `https://www.google.com/maps?q=${p.lat},${p.lng}`;
    mapsDiv.style.display = 'block';
  } else {
    mapsDiv.style.display = 'none';
  }
  setSelect('e_bhk', p.bhk); setSelect('e_type', p.type); setSelect('e_furnish', p.furnish);
  document.getElementById('editModal').classList.add('open');
};

function setSelect(id, val) {
  const el = document.getElementById(id);
  for (let o of el.options) { if (o.value === val) { el.value = val; return; } }
}

window.closeEditModal = function() {
  document.getElementById('editModal').classList.remove('open');
  editingId = null;
};

window.saveEdit = async function() {
  if (!editingId) return;
  const btn = document.getElementById('saveEditBtn');
  btn.disabled = true; btn.textContent = 'Saving…';
  const updates = {
    title:      document.getElementById('e_title').value.trim(),
    area:       document.getElementById('e_area').value.trim(),
    rent:       Number(document.getElementById('e_rent').value) || 0,
    bhk:        document.getElementById('e_bhk').value,
    type:       document.getElementById('e_type').value,
    furnish:    document.getElementById('e_furnish').value,
    ownerName:  document.getElementById('e_ownerName').value.trim(),
    ownerPhone: document.getElementById('e_ownerPhone').value.trim(),
    address:    document.getElementById('e_address').value.trim(),
    desc:       document.getElementById('e_desc').value.trim(),
  };
  // Add lat/lng if provided
  const latVal = document.getElementById('e_lat').value.trim();
  const lngVal = document.getElementById('e_lng').value.trim();
  if (latVal && lngVal) {
    updates.lat = parseFloat(latVal);
    updates.lng = parseFloat(lngVal);
    updates.locationStatus = 'pending'; // Admin se verify hoga
  }
  try {
    await updateDoc(doc(db, 'properties', editingId), updates);
    const idx = window.allListings.findIndex(p => p.id === editingId);
    if (idx !== -1) window.allListings[idx] = { ...window.allListings[idx], ...updates };
    renderStats(window.allListings); filterListings(); closeEditModal();
    showToast('Listing update ho gayi ✅');
  } catch(e) {
    showToast('Save failed: ' + e.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = '💾 Save Changes';
  }
};

// ─── Photo modal ─────────────────────────────────────────────────────────────
window.openPhotos = function(images, title) {
  document.getElementById('photoModalTitle').textContent = title || 'Property Photos';
  document.getElementById('photoGrid').innerHTML = images.map(url =>
    `<img src="${url}" alt="Photo" onclick="window.open('${url}','_blank')" loading="lazy">`
  ).join('');
  document.getElementById('photoModal').classList.add('open');
};

window.closeModal = function() { document.getElementById('photoModal').classList.remove('open'); };
window.closePhotoModal = function(e) { if (e.target === document.getElementById('photoModal')) closeModal(); };

// ─── Visitor Counter ─────────────────────────────────────────────────────────
async function loadVisitorCount() {
  try {
    const ref = doc(db, 'siteStats', 'visitors');
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      // Document nahi hai — create karo with 0
      await setDoc(ref, { count: 0 }, { merge: true });
      document.getElementById('statVisitors').textContent = '0';
    } else {
      const count = snap.data().count || 0;
      document.getElementById('statVisitors').textContent = count.toLocaleString('en-IN');
      const sbv = document.getElementById('sbVisitorCount');
      if (sbv) sbv.textContent = count.toLocaleString('en-IN');
    }
  } catch(e) {
    console.warn('Visitor count fetch failed:', e.message);
    document.getElementById('statVisitors').textContent = '0';
  }
}

// ─── Video Modal ──────────────────────────────────────────────────────────────
window.openVideo = function(url, title) {
  document.getElementById('videoModalTitle').textContent = title || 'Property Video';
  const player = document.getElementById('videoPlayer');
  player.src = url;
  player.load();
  document.getElementById('videoModal').classList.add('open');
};

window.closeVideoModal = function() {
  const player = document.getElementById('videoPlayer');
  player.pause();
  player.src = '';
  document.getElementById('videoModal').classList.remove('open');
};

// ─── UI helpers ──────────────────────────────────────────────────────────────
function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('adminPanel').style.display  = 'none';
}
function showPanel() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminPanel').style.display  = 'block';
}
function showError(msg) { document.getElementById('loginError').textContent = msg; }

window.showToast = function(msg, type='') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type === 'error' ? ' error' : '');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
};

// ─── Tab Switching ────────────────────────────────────────────────────────────
// ─── Sidebar toggle (mobile) ─────────────────────────────────────────────────
window.toggleSidebar = function() {
  document.getElementById('adminSidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').style.display =
    document.getElementById('adminSidebar').classList.contains('open') ? 'block' : 'none';
};

// ─── Tab Switching ────────────────────────────────────────────────────────────
window._refFilter  = 'all';
window._userFilter = 'all';

const ALL_TABS = ['listings','owners','users','referrals','referrers','storage','areas','locverify','nolocation','push'];

window.switchTab = function(tab) {
  ALL_TABS.forEach(t => {
    const el = document.getElementById(t + 'Tab');
    if (el) el.style.display = t === tab ? '' : 'none';
    const nav = document.getElementById('nav-' + t);
    if (nav) nav.classList.toggle('active', t === tab);
  });
  // Close mobile sidebar
  document.getElementById('adminSidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').style.display = 'none';

  if (tab === 'referrals' && !window._refLoaded)        loadReferrals();
  if (tab === 'users'     && !window._usersLoaded)      loadUsers();
  if (tab === 'owners'    && !window._ownersLoaded)     loadOwners();
  if (tab === 'referrers' && !window._referrersLoaded)  loadReferrersList();
  if (tab === 'storage'   && !window._storageLoaded)    loadCloudinaryStats();
  if (tab === 'areas'     && !window._areasLoaded)      loadAreas();
  if (tab === 'locverify'   && !window._locverifyLoaded)  loadLocVerify();
  if (tab === 'nolocation'  && !window._nolocationLoaded) loadNoLocation();
  if (tab === 'push'        && !window._pushLoaded)       loadPushTab();
};

// ─── Load Users ───────────────────────────────────────────────────────────────
window._allUsers    = [];
window._usersLoaded = false;
window._userFilter  = 'all';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function isOnline(u) {
  if (!u.lastSeen) return false;
  return (Date.now() - new Date(u.lastSeen).getTime()) < 5 * 60 * 1000; // 5 min window
}
function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', {day:'numeric', month:'short'});
}
function activityIcon(type) {
  const map = { login:'🟢', logout:'⚪', page:'👁️', property_add:'➕', property_edit:'✏️',
    property_delete:'🗑️', photo_upload:'📸', error:'⚠️', blocked:'🚫', unblocked:'✅' };
  return map[type] || '📌';
}

// ─── Load Users ───────────────────────────────────────────────────────────────
window.loadUsers = async function() {
  try {
    const snap = await getDocs(collection(db, 'users'));
    window._allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    window._allUsers.sort((a, b) => (b.lastLogin || '') > (a.lastLogin || '') ? 1 : -1);
    window._usersLoaded = true;
    renderUserStats(window._allUsers);
    renderUsers(window._allUsers);
    renderSidebar(window._allUsers.slice(0, 10));
    updateSidebarBadges();
    loadLiveActivity();
  } catch(e) {
    document.getElementById('usersContainer').innerHTML =
      `<div class="empty-state"><div class="icon">⚠️</div><h3>Error</h3><p>${e.message}</p></div>`;
  }
};

// ─── Live Activity Feed ───────────────────────────────────────────────────────
window.loadLiveActivity = async function() {
  try {
    const snap = await getDocs(query(collection(db, 'activityLogs'), orderBy('timestamp', 'desc')));
    const logs = snap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 60);

    // Count online users (lastSeen < 5min)
    const onlineUsers = (window._allUsers || []).filter(isOnline);
    const onlineCount = onlineUsers.length;

    document.getElementById('liveCount').textContent = `${onlineCount} online`;
    document.getElementById('uStatOnline').textContent = onlineCount;
    const nbOnline = document.getElementById('nbOnline');
    if (nbOnline) { nbOnline.textContent = onlineCount; nbOnline.style.display = onlineCount > 0 ? 'inline-flex' : 'none'; }

    const feed = document.getElementById('liveActivityFeed');
    if (!logs.length) {
      feed.innerHTML = `<div style="color:var(--muted);font-size:0.82rem;text-align:center;padding:1.5rem">
        Koi activity nahi mili. <code>user-tracker.js</code> sab pages pe include karo.</div>`;
      return;
    }
    feed.innerHTML = logs.map(log => {
      const typeClass = `activity-type-${log.type === 'login' ? 'login' : log.type === 'logout' ? 'logout' : log.type === 'page' ? 'page' : log.type?.startsWith('property') ? 'property' : 'error'}`;
      return `<div class="activity-item ${typeClass}">
        <div class="activity-icon">${activityIcon(log.type)}</div>
        <div class="activity-text">
          <b>${log.userName || log.userEmail || 'Unknown'}</b>
          ${log.type === 'login' ? '🟢 logged in' :
            log.type === 'logout' ? '⚪ logged out' :
            log.type === 'page' ? `visited <b>${log.page || ''}</b>` :
            log.type === 'property_add' ? '➕ added a property' :
            log.type === 'property_edit' ? `✏️ edited property` :
            log.type === 'property_delete' ? '🗑️ deleted a property' :
            log.type === 'photo_upload' ? '📸 uploaded photos' :
            log.description || log.type}
          <div style="font-size:0.7rem;color:var(--muted);margin-top:0.15rem">
            ${log.userEmail || ''} ${log.device ? `• ${log.device}` : ''}
          </div>
        </div>
        <div class="activity-time">${timeAgo(log.timestamp)}</div>
      </div>`;
    }).join('');
  } catch(e) {
    document.getElementById('liveActivityFeed').innerHTML =
      `<div style="color:#ef4444;font-size:0.82rem;padding:1rem">⚠️ Activity load failed: ${e.message}</div>`;
  }
};

window.refreshLiveActivity = function() {
  document.getElementById('liveActivityFeed').innerHTML =
    `<div style="color:var(--muted);font-size:0.82rem;text-align:center;padding:1.5rem">Refreshing…</div>`;
  loadLiveActivity();
  // Also refresh online status
  if (window._allUsers) {
    renderUserStats(window._allUsers);
    renderUsers(window._allUsers);
  }
};

// ─── User Activity Modal ──────────────────────────────────────────────────────
window.openActivityModal = async function(uid, name) {
  document.getElementById('activityModalTitle').textContent = `📋 ${name} — Activity`;
  document.getElementById('activityModalContent').innerHTML =
    `<div class="loading-spinner"><div class="spinner"></div>Loading…</div>`;
  document.getElementById('userActivityModal').classList.add('open');
  try {
    const snap = await getDocs(query(collection(db, 'activityLogs'), orderBy('timestamp', 'desc')));
    const logs = snap.docs
      .map(d => d.data())
      .filter(l => l.uid === uid)
      .slice(0, 50);
    if (!logs.length) {
      document.getElementById('activityModalContent').innerHTML =
        `<div style="color:var(--muted);text-align:center;padding:2rem">Koi activity nahi mili is user ki.</div>`;
      return;
    }
    document.getElementById('activityModalContent').innerHTML =
      `<div class="activity-panel" style="max-height:none;border:none;padding:0">${
        logs.map(log => {
          const typeClass = `activity-type-${log.type === 'login' ? 'login' : log.type === 'logout' ? 'logout' : log.type === 'page' ? 'page' : log.type?.startsWith('property') ? 'property' : 'error'}`;
          return `<div class="activity-item ${typeClass}">
            <div class="activity-icon">${activityIcon(log.type)}</div>
            <div class="activity-text">
              ${log.type === 'login' ? '🟢 Logged in' :
                log.type === 'logout' ? '⚪ Logged out' :
                log.type === 'page' ? `👁️ Page: <b>${log.page || ''}</b>` :
                log.type === 'property_add' ? '➕ Added a property' :
                log.type === 'property_edit' ? '✏️ Edited a property' :
                log.type === 'property_delete' ? '🗑️ Deleted a property' :
                log.type === 'photo_upload' ? '📸 Uploaded photos' :
                log.description || log.type}
              ${log.device ? `<div style="font-size:0.7rem;color:var(--muted);margin-top:0.1rem">📱 ${log.device}</div>` : ''}
            </div>
            <div class="activity-time">${log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN') : '—'}</div>
          </div>`;
        }).join('')
      }</div>`;
  } catch(e) {
    document.getElementById('activityModalContent').innerHTML =
      `<div style="color:#ef4444;padding:1rem">Error: ${e.message}</div>`;
  }
};
window.closeActivityModal = function() {
  document.getElementById('userActivityModal').classList.remove('open');
};

// ─── Block / Unblock ──────────────────────────────────────────────────────────
window.blockUser = async function(uid, name) {
  if (!confirm(`Block "${name}"?\n\nWoh login nahi kar paayega aur agar abhi online hai toh force logout ho jaayega.`)) return;
  try {
    await updateDoc(doc(db, 'users', uid), { blocked: true, blockedAt: new Date().toISOString() });
    // Log the block action
    await setDoc(doc(collection(db, 'activityLogs')), {
      uid, userName: name, type: 'blocked',
      description: 'Admin ne block kiya',
      timestamp: new Date().toISOString()
    });
    showToast(`🚫 ${name} blocked!`);
    // Update local state
    const u = window._allUsers?.find(x => x.id === uid);
    if (u) u.blocked = true;
    renderUserStats(window._allUsers);
    renderUsers(window._allUsers);
    updateSidebarBadges();
  } catch(e) { showToast('Block failed: ' + e.message, true); }
};

window.unblockUser = async function(uid, name) {
  if (!confirm(`Unblock "${name}"?`)) return;
  try {
    await updateDoc(doc(db, 'users', uid), { blocked: false, blockedAt: null });
    await setDoc(doc(collection(db, 'activityLogs')), {
      uid, userName: name, type: 'unblocked',
      description: 'Admin ne unblock kiya',
      timestamp: new Date().toISOString()
    });
    showToast(`✅ ${name} unblocked!`);
    const u = window._allUsers?.find(x => x.id === uid);
    if (u) u.blocked = false;
    renderUserStats(window._allUsers);
    renderUsers(window._allUsers);
    updateSidebarBadges();
  } catch(e) { showToast('Unblock failed: ' + e.message, true); }
};

// ─── Render Stats ─────────────────────────────────────────────────────────────
function renderUserStats(users) {
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('uStatTotal').textContent   = users.length;
  document.getElementById('uStatTenants').textContent = users.filter(u => (u.role||'tenant') === 'tenant').length;
  document.getElementById('uStatOwners').textContent  = users.filter(u => u.role === 'owner').length;
  document.getElementById('uStatToday').textContent   = users.filter(u => (u.lastLogin||'').startsWith(today)).length;
  document.getElementById('uStatOnline').textContent  = users.filter(isOnline).length;
  document.getElementById('uStatBlocked').textContent = users.filter(u => u.blocked).length;
  document.getElementById('usersSubtitle').textContent = `${users.length} total users registered`;
}

// ─── Render User Cards ────────────────────────────────────────────────────────
function renderUsers(users) {
  const container = document.getElementById('usersContainer');
  if (!users.length) {
    container.innerHTML = `<div class="empty-state"><div class="icon">👥</div><h3>No users found</h3><p>Koi user nahi mila.</p></div>`;
    return;
  }
  container.innerHTML = `<div class="listings-grid">${users.map((u, i) => {
    const role     = u.role || 'tenant';
    const online   = isOnline(u);
    const blocked  = !!u.blocked;
    const loginDate = u.lastLogin
      ? new Date(u.lastLogin).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'})
      : '—';
    const joinDate = u.createdAt
      ? new Date(u.createdAt).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})
      : '—';
    return `<div class="user-card" style="animation-delay:${i*0.03}s;${blocked ? 'opacity:0.65;border-color:#fca5a5;' : ''}">
      <div class="user-avatar" style="${online ? 'border-color:#22c55e;box-shadow:0 0 0 3px #dcfce7' : ''}">
        ${u.photo
          ? `<img src="${u.photo}" alt="${u.name||''}" onerror="this.style.display='none';this.parentNode.textContent='👤'">`
          : '👤'}
      </div>
      <div class="user-info">
        <div class="user-name" style="display:flex;align-items:center;gap:0.4rem">
          ${u.name || 'Unknown'}
          ${online  ? `<span class="online-tag">🟢 Online</span>` : ''}
          ${blocked ? `<span class="blocked-tag">🚫 Blocked</span>` : ''}
        </div>
        <div class="user-email">✉️ ${u.email || '—'}</div>
        <div class="user-meta">
          <span class="role-tag ${role === 'owner' ? 'role-owner' : 'role-tenant'}">
            ${role === 'owner' ? '🔑 Owner' : '🏠 Tenant'}
          </span>
          <span>🕐 ${loginDate}</span>
          ${u.lastSeen && online ? `<span>👁️ Active ${timeAgo(u.lastSeen)}</span>` : ''}
          ${joinDate !== '—' ? `<span>📅 Joined: ${joinDate}</span>` : ''}
          ${u.phone ? `<span>📞 ${u.phone}</span>` : ''}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.4rem;flex-shrink:0">
        <button class="btn-outline" style="font-size:0.72rem;padding:0.3rem 0.7rem"
          onclick="openActivityModal('${u.id}','${(u.name||'User').replace(/'/g,"\\'")}')">
          📋 Activity
        </button>
        ${blocked
          ? `<button class="unblock-btn" onclick="unblockUser('${u.id}','${(u.name||'User').replace(/'/g,"\\'")}')">✅ Unblock</button>`
          : `<button class="block-btn" onclick="blockUser('${u.id}','${(u.name||'User').replace(/'/g,"\\'")}')">🚫 Block</button>`
        }
      </div>
    </div>`;
  }).join('')}</div>`;
}

function renderSidebar(users) {
  const el = document.getElementById('sidebarUsers');
  if (!users.length) { el.innerHTML = `<div style="color:var(--muted);font-size:0.82rem;text-align:center;padding:1rem">No users yet</div>`; return; }
  el.innerHTML = users.map(u => `
    <div class="sidebar-user">
      <div class="sidebar-avatar" style="${isOnline(u) ? 'border-color:#22c55e' : ''}">
        ${u.photo
          ? `<img src="${u.photo}" alt="${u.name||''}" onerror="this.style.display='none';this.parentNode.textContent='👤'">`
          : '👤'}
      </div>
      <div style="min-width:0;flex:1">
        <div class="sidebar-name">${u.name || 'Unknown'} ${isOnline(u) ? '<span class="live-dot" style="width:6px;height:6px"></span>' : ''}</div>
        <div class="sidebar-email">${u.email || '—'}</div>
      </div>
    </div>`).join('');
}

window.filterUsers = function(filter) {
  window._userFilter = filter;
  ['ufAll','ufTenant','ufOwner','ufOnline','ufBlocked'].forEach(id => {
    const el = document.getElementById(id); if (el) el.classList.remove('active');
  });
  const activeId = { all:'ufAll', tenant:'ufTenant', owner:'ufOwner', online:'ufOnline', blocked:'ufBlocked' }[filter] || 'ufAll';
  const activeEl = document.getElementById(activeId); if (activeEl) activeEl.classList.add('active');
  const search = (document.getElementById('userSearch').value || '').toLowerCase();
  let list = window._allUsers || [];
  if (filter === 'tenant')  list = list.filter(u => (u.role||'tenant') === 'tenant');
  if (filter === 'owner')   list = list.filter(u => u.role === 'owner');
  if (filter === 'online')  list = list.filter(u => isOnline(u));
  if (filter === 'blocked') list = list.filter(u => u.blocked);
  if (search) list = list.filter(u =>
    [u.name, u.email, u.phone].some(v => (v||'').toLowerCase().includes(search)));
  renderUsers(list);
};

// ─── Sidebar Badges ───────────────────────────────────────────────────────────
function updateSidebarBadges() {
  try {
    const nb = document.getElementById('nbListings');
    if (nb) nb.textContent = window.allListings?.length || 0;
    const nu = document.getElementById('nbUsers');
    if (nu) nu.textContent = window._allUsers?.length || 0;
    const nbOnline = document.getElementById('nbOnline');
    if (nbOnline) {
      const onlineCnt = (window._allUsers || []).filter(isOnline).length;
      nbOnline.textContent = onlineCnt;
      nbOnline.style.display = onlineCnt > 0 ? 'inline-flex' : 'none';
    }
    const np = document.getElementById('nbPending');
    if (np) np.textContent = window._allReferrals?.filter(r => r.status !== 'paid').length || 0;
    // Areas pending badge
    const na = document.getElementById('nbAreas');
    if (na) {
      const pendingCount = window._allAreas?.filter(a => a.status === 'pending').length || 0;
      na.textContent = pendingCount;
      na.style.display = pendingCount > 0 ? 'inline-flex' : 'none';
    }
    // Location verify pending badge
    const nlv = document.getElementById('nbLocVerify');
    if (nlv) {
      const lvPending = (window.allListings || []).filter(p => p.lat && p.lng && (!p.locationStatus || p.locationStatus === 'pending')).length;
      nlv.textContent = lvPending;
      nlv.style.display = lvPending > 0 ? 'inline-flex' : 'none';
    }
    // No location badge
    const nnl = document.getElementById('nbNoLocation');
    if (nnl) {
      const noLocCount = (window.allListings || []).filter(p => !p.lat || !p.lng).length;
      nnl.textContent = noLocCount;
      nnl.style.display = noLocCount > 0 ? 'inline-flex' : 'none';
    }
  } catch(e) {}
}

// ─── Owner Listings Tab ───────────────────────────────────────────────────────
window._ownersLoaded = false;

window.loadOwners = async function() {
  window._ownersLoaded = true;
  // Use already loaded listings
  const listings = window.allListings || [];
  if (!listings.length) {
    document.getElementById('ownersContainer').innerHTML =
      `<div class="empty-state"><div class="icon">🔑</div><h3>No listings yet</h3></div>`;
    return;
  }

  // Group by owner phone
  const ownerMap = {};
  listings.forEach(p => {
    const key = p.ownerPhone || p.ownerEmail || 'unknown';
    if (!ownerMap[key]) ownerMap[key] = { name: p.ownerName, phone: p.ownerPhone, email: p.ownerEmail||p.userEmail, listings: [] };
    ownerMap[key].listings.push(p);
  });
  const owners = Object.values(ownerMap);

  // Area breakdown
  const areaMap = {};
  listings.forEach(p => { const a = p.area||'Unknown'; areaMap[a] = (areaMap[a]||0)+1; });
  const areaSorted = Object.entries(areaMap).sort((a,b) => b[1]-a[1]);

  // Type breakdown
  const typeMap = {};
  listings.forEach(p => { const t = p.type||'Unknown'; typeMap[t] = (typeMap[t]||0)+1; });
  const typeSorted = Object.entries(typeMap).sort((a,b) => b[1]-a[1]);

  // Stats
  document.getElementById('owStatTotal').textContent = owners.length;
  document.getElementById('owStatAreas').textContent = areaSorted.length;
  document.getElementById('owStatAvg').textContent   = (listings.length / owners.length).toFixed(1);

  // Area breakdown render
  document.getElementById('areaBreakdown').innerHTML = areaSorted.map(([area, count]) =>
    `<div class="area-row"><span class="area-name">📍 ${area}</span><span class="area-count">${count}</span></div>`
  ).join('') || '<div style="color:var(--muted);font-size:0.82rem">No data</div>';

  document.getElementById('typeBreakdown').innerHTML = typeSorted.map(([type, count]) =>
    `<div class="area-row"><span class="area-name">🏗 ${type}</span><span class="area-count">${count}</span></div>`
  ).join('') || '<div style="color:var(--muted);font-size:0.82rem">No data</div>';

  // Owner cards
  document.getElementById('ownersContainer').innerHTML =
    `<div class="listings-grid">${owners.map((o, i) => `
      <div class="user-card" style="animation-delay:${i*0.03}s;flex-direction:column;align-items:stretch;gap:0.6rem">
        <div style="display:flex;align-items:center;gap:0.8rem">
          <div class="user-avatar">🔑</div>
          <div class="user-info">
            <div class="user-name">${o.name || 'Unknown Owner'}</div>
            <div class="user-meta" style="margin-top:0.2rem">
              ${o.phone ? `<span>📞 <a href="tel:${o.phone}" style="color:var(--primary)">${o.phone}</a></span>` : ''}
              ${o.email ? `<span>✉️ ${o.email}</span>` : ''}
            </div>
          </div>
          <div style="margin-left:auto;text-align:right">
            <div style="font-family:'Syne',sans-serif;font-weight:800;font-size:1.1rem;color:var(--primary)">${o.listings.length}</div>
            <div style="font-size:0.7rem;color:var(--muted)">listing${o.listings.length>1?'s':''}</div>
          </div>
        </div>
        <div style="background:var(--dark2);border-radius:8px;padding:0.6rem 0.8rem;font-size:0.78rem;display:flex;flex-wrap:wrap;gap:0.5rem">
          ${o.listings.map(p => `<span style="background:white;border:1px solid var(--border);border-radius:5px;padding:0.2rem 0.5rem">
            📍${p.area||'—'} · ${p.bhk||'—'} · ₹${Number(p.rent||0).toLocaleString('en-IN')}
          </span>`).join('')}
        </div>
      </div>`).join('')}</div>`;
};

// ─── Referrers List Tab ───────────────────────────────────────────────────────
window._referrersLoaded = false;
window._allReferrersList = [];

window.loadReferrersList = async function() {
  window._referrersLoaded = true;
  try {
    const snap = await getDocs(collection(db, 'referrers'));
    window._allReferrersList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderReferrersList(window._allReferrersList);
  } catch(e) {
    document.getElementById('referrersContainer').innerHTML =
      `<div class="empty-state"><div class="icon">⚠️</div><h3>Error</h3><p>${e.message}</p></div>`;
  }
};

function renderReferrersList(list) {
  const c = document.getElementById('referrersContainer');
  if (!list.length) {
    c.innerHTML = `<div class="empty-state"><div class="icon">🤝</div><h3>No referrers yet</h3></div>`; return;
  }
  c.innerHTML = `<div class="listings-grid">${list.map((r, i) => {
    const refCount = window._allReferrals?.filter(rf => rf.referrerPhone === r.phone || rf.referrerCode === r.code).length || r.totalReferrals || 0;
    const earned   = window._allReferrals?.filter(rf => (rf.referrerPhone===r.phone||rf.referrerCode===r.code) && rf.status==='paid').reduce((a,rf)=>a+Number(rf.amount||0),0) || 0;
    return `<div class="user-card" style="animation-delay:${i*0.03}s;flex-wrap:wrap;gap:0.8rem">
      <div class="user-avatar">🤝</div>
      <div class="user-info" style="flex:1">
        <div class="user-name">${r.name || '—'}</div>
        <div class="user-meta" style="margin-top:0.3rem;flex-direction:column;gap:0.2rem;align-items:flex-start">
          <span>✉️ ${r.gmail || r.email || '—'}</span>
          <span>📞 ${r.phone || '—'}</span>
          <span>📍 ${r.area  || '—'}</span>
          <span style="color:#0369a1;font-weight:600">💳 UPI: ${r.upi || '—'}</span>
          <span>🏷️ Code: <b>${r.code || '—'}</b></span>
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-family:'Syne',sans-serif;font-size:1.2rem;font-weight:800;color:var(--primary)">₹${earned.toLocaleString('en-IN')}</div>
        <div style="font-size:0.72rem;color:var(--muted)">earned</div>
        <div style="margin-top:0.4rem">
          <span class="area-count" style="font-size:0.75rem">${refCount} referral${refCount!==1?'s':''}</span>
        </div>
      </div>
    </div>`;
  }).join('')}</div>`;
}

window.filterReferrers = function() {
  const search = (document.getElementById('referrerSearch').value || '').toLowerCase();
  let list = window._allReferrersList;
  if (search) list = list.filter(r =>
    [r.name, r.gmail, r.email, r.phone, r.code, r.area].some(v => (v||'').toLowerCase().includes(search)));
  renderReferrersList(list);
};

// ─── Cloudinary Storage ───────────────────────────────────────────────────────
window._storageLoaded = false;
const CLOUDINARY_FREE_GB = 25;
const CLOUDINARY_FREE_BYTES = CLOUDINARY_FREE_GB * 1024 * 1024 * 1024;

window.loadCloudinaryStats = async function() {
  window._storageLoaded = true;
  const note = document.getElementById('cldNote');
  const apiStatus = document.getElementById('cldApiStatus');
  note.textContent = '⏳ Calculating from Firestore data…';

  // Calculate from stored listings (count photos + videos)
  const listings = window.allListings || [];
  let totalPhotos = 0, totalVideos = 0, totalEstBytes = 0;

  listings.forEach(p => {
    const photos = p.photos || [];
    totalPhotos += photos.length;
    // Estimate avg photo ~800KB based on typical mobile uploads
    totalEstBytes += photos.length * 800 * 1024;
    if (p.videoUrl) {
      totalVideos++;
      // Estimate avg video ~15MB
      totalEstBytes += 15 * 1024 * 1024;
    }
  });

  const usedMB  = (totalEstBytes / (1024*1024)).toFixed(1);
  const usedGB  = totalEstBytes / (1024*1024*1024);
  const freeMB  = Math.max(0, CLOUDINARY_FREE_GB * 1024 - usedMB).toFixed(1);
  const pct     = Math.min(100, (usedGB / CLOUDINARY_FREE_GB) * 100).toFixed(1);
  const avgKB   = totalPhotos ? ((totalEstBytes / totalPhotos) / 1024).toFixed(0) : 0;

  document.getElementById('cldPhotos').textContent    = totalPhotos;
  document.getElementById('cldVideos').textContent    = totalVideos;
  document.getElementById('cldAvgSize').textContent   = avgKB + ' KB';
  document.getElementById('cldUsedMB').textContent    = usedMB > 1024 ? (usedMB/1024).toFixed(2)+' GB' : usedMB+' MB';
  document.getElementById('cldFreeMB').textContent    = freeMB > 1024 ? (freeMB/1024).toFixed(2)+' GB' : freeMB+' MB';
  document.getElementById('cldPct').textContent       = `${pct}% used`;
  document.getElementById('cldTransform').textContent = '—';

  const bar = document.getElementById('cldBar');
  bar.style.width = pct + '%';
  bar.className = 'storage-bar' + (pct > 80 ? ' danger' : pct > 60 ? ' warn' : '');

  note.textContent = '✅ Estimated from Firestore data (actual may vary)';

  // Try Cloudinary Admin API if CLOUD_NAME is available
  try {
    if (typeof CLOUD_NAME !== 'undefined' && typeof CLOUD_API_KEY !== 'undefined' && typeof CLOUD_API_SECRET !== 'undefined') {
      apiStatus.textContent = '✅ API config found — fetching real data…';
      apiStatus.style.color = '#16a34a';
      // Cloudinary usage API
      const timestamp = Math.round(Date.now()/1000);
      const str = `timestamp=${timestamp}${CLOUD_API_SECRET}`;
      const hashBuffer = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(str));
      const sig = Array.from(new Uint8Array(hashBuffer)).map(b=>b.toString(16).padStart(2,'0')).join('');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/usage?api_key=${CLOUD_API_KEY}&timestamp=${timestamp}&signature=${sig}`);
      if (res.ok) {
        const data = await res.json();
        const realBytes = data.storage?.usage || 0;
        const realMB    = (realBytes/(1024*1024)).toFixed(1);
        const realGB    = realBytes/(1024*1024*1024);
        const realPct   = Math.min(100,(realGB/CLOUDINARY_FREE_GB)*100).toFixed(1);
        const realFree  = Math.max(0, CLOUDINARY_FREE_GB*1024 - realMB).toFixed(1);
        document.getElementById('cldUsedMB').textContent  = realMB > 1024 ? (realMB/1024).toFixed(2)+' GB' : realMB+' MB';
        document.getElementById('cldFreeMB').textContent  = realFree > 1024 ? (realFree/1024).toFixed(2)+' GB' : realFree+' MB';
        document.getElementById('cldPct').textContent     = `${realPct}% used (real data)`;
        document.getElementById('cldPhotos').textContent  = data.resources?.derived?.usage || totalPhotos;
        document.getElementById('cldTransform').textContent = data.transformations?.usage?.toLocaleString('en-IN') || '—';
        bar.style.width = realPct + '%';
        bar.className = 'storage-bar' + (realPct>80?' danger':realPct>60?' warn':'');
        note.textContent = '✅ Real data from Cloudinary API';
        apiStatus.textContent = '✅ Cloudinary API connected — showing real data';
      } else {
        apiStatus.textContent = '⚠️ API call failed — showing estimated data';
        apiStatus.style.color = '#d97706';
      }
    } else {
      apiStatus.textContent = '⚠️ CLOUD_API_SECRET not in config.js — showing estimated data';
      apiStatus.style.color = '#d97706';
    }
  } catch(e) {
    apiStatus.textContent = '⚠️ Estimated data only (CORS/API error: ' + e.message + ')';
    apiStatus.style.color = '#d97706';
  }
};

// ─── Load Referrals ───────────────────────────────────────────────────────────
window._allReferrals = [];
window._refLoaded    = false;

window.loadReferrals = async function() {
  try {
    // Load both referrals + referrers in parallel
    const [refSnap, rrSnap] = await Promise.all([
      getDocs(query(collection(db, 'referrals'), orderBy('createdAt', 'desc'))).catch(() => getDocs(collection(db, 'referrals'))),
      getDocs(collection(db, 'referrers')).catch(() => null)
    ]);

    // Build referrers map keyed by phone
    window._referrersMap = {};
    if (rrSnap) {
      rrSnap.docs.forEach(d => {
        const data = d.data();
        if (data.phone) window._referrersMap[data.phone] = data;
      });
    }

    window._allReferrals = refSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    window._allReferrals.sort((a,b) => (b.createdAt||'') > (a.createdAt||'') ? 1 : -1);
    window._refLoaded = true;
    renderRefStats(window._allReferrals);
    renderReferrals(window._allReferrals);
    updateSidebarBadges();
  } catch(e) {
    document.getElementById('refContainer').innerHTML =
      `<div class="empty-state"><div class="icon">⚠️</div><h3>Error</h3><p>${e.message}</p></div>`;
  }
};

function renderRefStats(refs) {
  const pending = refs.filter(r => r.status !== 'paid');
  const paid    = refs.filter(r => r.status === 'paid');
  const totalPaid = paid.reduce((a, r) => a + Number(r.amount || 0), 0);
  document.getElementById('refStatTotal').textContent   = refs.length;
  document.getElementById('refStatPending').textContent = pending.length;
  document.getElementById('refStatPaid').textContent    = paid.length;
  document.getElementById('refStatAmount').textContent  = '₹' + totalPaid.toLocaleString('en-IN');
}

function renderReferrals(refs) {
  const container = document.getElementById('refContainer');
  if (!refs.length) {
    container.innerHTML = `<div class="empty-state"><div class="icon">💸</div><h3>No referrals found</h3><p>Koi referral nahi mila.</p></div>`;
    return;
  }
  container.innerHTML = `<div class="listings-grid">${refs.map((r, i) => {
    const isPaid = r.status === 'paid';
    const date   = r.createdAt
      ? new Date(r.createdAt).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'})
      : '—';
    // fetch referrer extra details from referrers collection cache
    const rr = window._referrersMap ? window._referrersMap[r.referrerPhone] : null;
    const rrGmail = rr?.gmail || r.referrerEmail || '—';
    const rrArea  = rr?.area  || r.referrerArea  || '—';
    const rrUpi   = rr?.upi   || r.upi           || '—';
    return `<div class="ref-card" style="animation-delay:${i*0.04}s;flex-direction:column;align-items:stretch;gap:0.8rem">
      <!-- Top row: status + amount + action -->
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.6rem">
        <div>
          <span class="status-badge ${isPaid ? 'status-paid' : 'status-pending'}" style="font-size:0.85rem">
            ${isPaid ? '✅ Paid' : '⏳ Pending'}
          </span>
          <span style="margin-left:0.6rem;font-size:0.78rem;color:var(--muted)">📅 ${date}</span>
        </div>
        <div style="display:flex;align-items:center;gap:0.6rem">
          <span class="ref-amount">₹${Number(r.amount||0).toLocaleString('en-IN')}</span>
          ${!isPaid
            ? `<button class="pay-btn" id="paybtn_${r.id}" onclick="markPaid('${r.id}')">💰 Mark as Paid</button>`
            : `<button class="unpay-btn" onclick="markUnpaid('${r.id}')">↩️ Undo</button>`}
        </div>
      </div>

      <!-- Two columns: Referee + Referrer -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.8rem">

        <!-- Referee (jo aaya) -->
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:0.8rem">
          <div style="font-size:0.68rem;font-weight:800;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.5rem">🏠 Referee (jo aaya)</div>
          <div style="font-weight:700;font-size:0.95rem;margin-bottom:0.4rem">${r.refereeName || '—'}</div>
          <div style="font-size:0.78rem;color:var(--muted);display:flex;flex-direction:column;gap:0.25rem">
            <span>✉️ ${r.refereeEmail || '—'}</span>
            <span>📞 ${r.refereePhone || '—'}</span>
            <span>📍 ${r.refereeArea || '—'}</span>
          </div>
        </div>

        <!-- Referrer (jisne refer kiya) -->
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:0.8rem">
          <div style="font-size:0.68rem;font-weight:800;color:#166534;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.5rem">💼 Referrer (jisne refer kiya)</div>
          <div style="font-weight:700;font-size:0.95rem;margin-bottom:0.4rem">${r.referrerName || '—'}</div>
          <div style="font-size:0.78rem;color:var(--muted);display:flex;flex-direction:column;gap:0.25rem">
            <span>✉️ ${rrGmail}</span>
            <span>📞 ${r.referrerPhone || '—'}</span>
            <span>📍 ${rrArea}</span>
            <span style="color:#0369a1;font-weight:600">💳 UPI: ${rrUpi}</span>
            ${r.referrerCode ? `<span>🏷️ Code: <b>${r.referrerCode}</b></span>` : ''}
          </div>
        </div>

      </div>
    </div>`;
  }).join('')}</div>`;
}

window.filterRefs = function(filter) {
  window._refFilter = filter;
  ['rfAll','rfPending','rfPaid'].forEach(id => document.getElementById(id).classList.remove('active'));
  document.getElementById(filter === 'all' ? 'rfAll' : filter === 'pending' ? 'rfPending' : 'rfPaid').classList.add('active');
  const search = (document.getElementById('refSearch').value || '').toLowerCase();
  let list = window._allReferrals;
  if (filter === 'pending') list = list.filter(r => r.status !== 'paid');
  if (filter === 'paid')    list = list.filter(r => r.status === 'paid');
  if (search) list = list.filter(r =>
    [r.refereeName, r.refereeEmail, r.referrerName, r.referrerPhone, r.referrerCode]
      .some(v => (v||'').toLowerCase().includes(search)));
  renderReferrals(list);
};

window.markPaid = async function(id) {
  const btn = document.getElementById('paybtn_' + id);
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving…'; }
  try {
    await updateDoc(doc(db, 'referrals', id), { status: 'paid' });
    const idx = window._allReferrals.findIndex(r => r.id === id);
    if (idx !== -1) window._allReferrals[idx].status = 'paid';
    renderRefStats(window._allReferrals);
    filterRefs(window._refFilter || 'all');
    showToast('✅ Referral paid mark ho gaya!');
  } catch(e) {
    showToast('Error: ' + e.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = '💰 Mark as Paid'; }
  }
};

window.markUnpaid = async function(id) {
  try {
    await updateDoc(doc(db, 'referrals', id), { status: 'pending' });
    const idx = window._allReferrals.findIndex(r => r.id === id);
    if (idx !== -1) window._allReferrals[idx].status = 'pending';
    renderRefStats(window._allReferrals);
    filterRefs(window._refFilter || 'all');
    showToast('↩️ Status pending pe wapas ho gaya');
  } catch(e) {
    showToast('Error: ' + e.message, 'error');
  }
};

// ─── Areas Management ────────────────────────────────────────────────────────
window._allAreas   = [];
window._areasLoaded = false;
window._areaFilter  = 'all';

window.loadAreas = async function() {
  window._areasLoaded = true;
  const container = document.getElementById('areasContainer');
  container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div>Loading areas…</div>';
  try {
    const snap = await getDocs(collection(db, 'pending_areas'));
    window._allAreas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    window._allAreas.sort((a, b) => (b.submittedAt || '') > (a.submittedAt || '') ? 1 : -1);
    renderAreaStats();
    renderAreas(window._allAreas);
    updateSidebarBadges();
  } catch(e) {
    container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><h3>Error</h3><p>${e.message}</p></div>`;
  }
};

function renderAreaStats() {
  document.getElementById('areaStatPending').textContent  = window._allAreas.filter(a => a.status === 'pending').length;
  document.getElementById('areaStatApproved').textContent = window._allAreas.filter(a => a.status === 'approved').length;
  document.getElementById('areaStatRejected').textContent = window._allAreas.filter(a => a.status === 'rejected').length;
}

window.filterAreas = function(filter) {
  window._areaFilter = filter;
  ['afAll','afPending','afApproved','afRejected'].forEach(id => document.getElementById(id).classList.remove('active'));
  const map = { all:'afAll', pending:'afPending', approved:'afApproved', rejected:'afRejected' };
  document.getElementById(map[filter]).classList.add('active');
  let list = window._allAreas;
  if (filter !== 'all') list = list.filter(a => a.status === filter);
  renderAreas(list);
};

function renderAreas(areas) {
  const container = document.getElementById('areasContainer');
  if (!areas.length) {
    container.innerHTML = `<div class="empty-state"><div class="icon">📍</div><h3>Koi area nahi mila</h3><p>Is filter mein koi pending area nahi hai.</p></div>`;
    return;
  }
  container.innerHTML = `<div class="listings-grid">${areas.map((a, i) => {
    const date = a.submittedAt
      ? new Date(a.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : '—';
    const isPending  = !a.status || a.status === 'pending';
    const isApproved = a.status === 'approved';
    const isRejected = a.status === 'rejected';
    return `<div class="listing-card" style="animation-delay:${i*0.04}s;grid-template-columns:auto 1fr auto;">
      <div style="font-size:2rem;width:48px;text-align:center;">📍</div>
      <div class="listing-info">
        <div class="listing-title">${a.name}</div>
        <div class="listing-meta">
          <span>📅 Submitted: ${date}</span>
          <span class="status-badge ${isApproved ? 'status-paid' : isRejected ? '' : 'status-pending'}"
            style="${isRejected ? 'background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;' : ''}">
            ${isApproved ? '✅ Approved' : isRejected ? '❌ Rejected' : '⏳ Pending'}
          </span>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.5rem;flex-shrink:0;">
        ${isPending ? `
          <button class="pay-btn" onclick="approveArea('${a.id}','${a.name.replace(/'/g,"\\'")}')">✅ Approve</button>
          <button class="unpay-btn" onclick="rejectArea('${a.id}')">❌ Reject</button>
        ` : isApproved ? `
          <button class="unpay-btn" onclick="rejectArea('${a.id}')">↩️ Undo</button>
        ` : `
          <button class="pay-btn" style="background:#16a34a;" onclick="approveArea('${a.id}','${a.name.replace(/'/g,"\\'")}')">✅ Approve</button>
        `}
      </div>
    </div>`;
  }).join('')}</div>`;
}

window.approveArea = async function(id, name) {
  try {
    await updateDoc(doc(db, 'pending_areas', id), { status: 'approved' });
    const idx = window._allAreas.findIndex(a => a.id === id);
    if (idx !== -1) window._allAreas[idx].status = 'approved';
    renderAreaStats();
    filterAreas(window._areaFilter || 'all');
    updateSidebarBadges();
    showToast(`✅ "${name}" approved! Owner.html mein manually add karo.`);
    // Show copy prompt so admin knows what to add to AREA_LIST
    setTimeout(() => showToast(`📋 Add "${name}" to owner.html AREA_LIST`, ''), 3500);
  } catch(e) {
    showToast('Error: ' + e.message, 'error');
  }
};

window.rejectArea = async function(id) {
  try {
    await updateDoc(doc(db, 'pending_areas', id), { status: 'rejected' });
    const idx = window._allAreas.findIndex(a => a.id === id);
    if (idx !== -1) window._allAreas[idx].status = 'rejected';
    renderAreaStats();
    filterAreas(window._areaFilter || 'all');
    updateSidebarBadges();
    showToast('❌ Area rejected');
  } catch(e) {
    showToast('Error: ' + e.message, 'error');
  }
};

// ─── Location Verify Tab ─────────────────────────────────────────────────────
window._locverifyLoaded = false;
window._lvFilter = 'all';
window._lvList = [];

window.loadLocVerify = function() {
  window._locverifyLoaded = true;
  // Use already-loaded listings (has lat/lng)
  window._lvList = (window.allListings || []).filter(p => p.lat && p.lng);
  renderLocVerifyStats();
  renderLocVerify(window._lvList);
  updateSidebarBadges();
};

function renderLocVerifyStats() {
  const list = window._lvList;
  document.getElementById('lvStatTotal').textContent    = list.length;
  document.getElementById('lvStatPending').textContent  = list.filter(p => !p.locationStatus || p.locationStatus === 'pending').length;
  document.getElementById('lvStatApproved').textContent = list.filter(p => p.locationStatus === 'approved').length;
  document.getElementById('lvStatRejected').textContent = list.filter(p => p.locationStatus === 'rejected').length;
}

window.filterLocVerify = function(filter) {
  window._lvFilter = filter;
  ['lvfAll','lvfPending','lvfApproved','lvfRejected'].forEach(id => document.getElementById(id).classList.remove('active'));
  const map = { all:'lvfAll', pending:'lvfPending', approved:'lvfApproved', rejected:'lvfRejected' };
  document.getElementById(map[filter]).classList.add('active');
  const search = (document.getElementById('lvSearch').value || '').toLowerCase();
  let list = window._lvList;
  if (filter === 'pending')  list = list.filter(p => !p.locationStatus || p.locationStatus === 'pending');
  if (filter === 'approved') list = list.filter(p => p.locationStatus === 'approved');
  if (filter === 'rejected') list = list.filter(p => p.locationStatus === 'rejected');
  if (search) list = list.filter(p =>
    [p.title, p.area, p.ownerName, p.ownerPhone, p.address].some(v => (v||'').toLowerCase().includes(search)));
  renderLocVerify(list);
};

function renderLocVerify(list) {
  const container = document.getElementById('locverifyContainer');
  if (!list.length) {
    container.innerHTML = `<div class="empty-state"><div class="icon">🗺️</div><h3>Koi property nahi mili</h3><p>Is filter mein koi location-wali property nahi hai.</p></div>`;
    return;
  }
  container.innerHTML = `<div class="listings-grid">${list.map((p, i) => {
    const isApproved = p.locationStatus === 'approved';
    const isRejected = p.locationStatus === 'rejected';
    const isPending  = !isApproved && !isRejected;
    const thumb = p.photos && p.photos.length > 0 ? p.photos[0] : null;
    const dateStr = p.postedAt
      ? new Date(p.postedAt).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'})
      : '—';
    return `<div class="listing-card" style="animation-delay:${i*0.04}s">
      <div class="listing-thumb">
        ${thumb ? `<img src="${thumb}" alt="${p.title||''}" loading="lazy" onerror="this.style.display='none';this.parentNode.textContent='🏠'">` : '🏠'}
      </div>
      <div class="listing-info">
        <div class="listing-title">${p.title || 'Untitled Property'}</div>
        <div class="listing-meta">
          <span>📍 ${p.area || '—'}</span>
          <span>🏗 ${p.type || '—'}</span>
          <span>📅 ${dateStr}</span>
        </div>
        <div class="owner-info">
          <span>👤</span>
          <span class="owner-name">${p.ownerName || 'Unknown'}</span>
          ${p.ownerPhone ? `<a class="owner-phone" href="tel:${p.ownerPhone}">📞 ${p.ownerPhone}</a>` : ''}
        </div>
        <div style="margin-top:0.5rem;font-size:0.78rem;color:var(--muted)">
          📌 Lat: <b>${Number(p.lat).toFixed(5)}</b> &nbsp; Lng: <b>${Number(p.lng).toFixed(5)}</b>
        </div>
        <div style="margin-top:0.4rem;display:flex;gap:0.4rem;flex-wrap:wrap;align-items:center">
          <span class="status-badge ${isApproved ? 'status-paid' : isPending ? 'status-pending' : ''}"
            style="${isRejected ? 'background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;' : ''}">
            ${isApproved ? '✅ Approved' : isRejected ? '❌ Rejected' : '⏳ Pending Verify'}
          </span>
          <a href="https://www.google.com/maps?q=${p.lat},${p.lng}" target="_blank"
            style="font-size:0.75rem;color:var(--primary);font-weight:600;text-decoration:none;">
            🗺️ Open in Maps
          </a>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.5rem;flex-shrink:0;align-items:flex-end">
        <div class="listing-rent">₹${Number(p.rent||0).toLocaleString('en-IN')}/mo</div>
        ${isPending ? `
          <button class="pay-btn" onclick="lvSetStatus('${p.id}','approved')">✅ Approve</button>
          <button class="unpay-btn" onclick="lvSetStatus('${p.id}','rejected')">❌ Reject</button>
        ` : isApproved ? `
          <button class="unpay-btn" onclick="lvSetStatus('${p.id}','rejected')">❌ Reject</button>
        ` : `
          <button class="pay-btn" style="background:#16a34a;" onclick="lvSetStatus('${p.id}','approved')">✅ Approve</button>
        `}
      </div>
    </div>`;
  }).join('')}</div>`;
}

window.lvSetStatus = async function(propId, status) {
  try {
    await updateDoc(doc(db, 'properties', propId), { locationStatus: status });
    // Update in-memory
    const idx = window.allListings.findIndex(p => p.id === propId);
    if (idx !== -1) window.allListings[idx].locationStatus = status;
    const lvIdx = window._lvList.findIndex(p => p.id === propId);
    if (lvIdx !== -1) window._lvList[lvIdx].locationStatus = status;
    renderLocVerifyStats();
    filterLocVerify(window._lvFilter || 'all');
    updateSidebarBadges();
    showToast(status === 'approved' ? '✅ Location Approved!' : '❌ Location Rejected');
  } catch(e) {
    showToast('Error: ' + e.message, 'error');
  }
};


// ─── No Location Tab ─────────────────────────────────────────────────────────
window._nolocationLoaded = false;
window._nlList = [];

window.loadNoLocation = function() {
  window._nolocationLoaded = true;
  window._nlList = (window.allListings || []).filter(p => !p.lat || !p.lng);
  renderNoLocationStats();
  renderNoLocation(window._nlList);
};

function renderNoLocationStats() {
  const all = window.allListings || [];
  document.getElementById('nlStatTotal').textContent       = all.filter(p => !p.lat || !p.lng).length;
  document.getElementById('nlStatWithLocation').textContent = all.filter(p => p.lat && p.lng).length;
  document.getElementById('nlStatAll').textContent         = all.length;
}

window.filterNoLocation = function() {
  const search = (document.getElementById('nlSearch').value || '').toLowerCase();
  let list = window._nlList;
  if (search) list = list.filter(p =>
    [p.title, p.area, p.ownerName, p.ownerPhone, p.address].some(v => (v||'').toLowerCase().includes(search)));
  renderNoLocation(list);
};

function renderNoLocation(list) {
  const container = document.getElementById('nolocationContainer');
  if (!list.length) {
    container.innerHTML = `<div class="empty-state"><div class="icon">✅</div><h3>Sab owners ne location add kar diya!</h3><p>Koi property without location nahi hai.</p></div>`;
    return;
  }
  const msg = encodeURIComponent("Dear Sir, your property is listed on Flatzy. Please provide your property location at the earliest, otherwise your listing will be rejected soon. Thank you.");
  container.innerHTML = `<div class="listings-grid">${list.map((p, i) => {
    const thumb = p.photos && p.photos.length > 0 ? p.photos[0] : null;
    const dateStr = p.postedAt
      ? new Date(p.postedAt).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'})
      : '—';
    const phone = p.ownerPhone || '';
    const email = p.ownerEmail || p.userEmail || '';
    const waMsg = encodeURIComponent(`Dear ${p.ownerName||'Sir'}, your property "${p.title||'your listing'}" is on Flatzy. Please add your property location at the earliest, otherwise your listing will be rejected soon. Thank you.`);
    return `<div class="listing-card" style="animation-delay:${i*0.04}s;border-left:3px solid #ef4444;">
      <div class="listing-thumb">
        ${thumb ? `<img src="${thumb}" alt="${p.title||''}" loading="lazy" onerror="this.style.display='none';this.parentNode.textContent='🏠'">` : '🏠'}
      </div>
      <div class="listing-info">
        <div class="listing-title">${p.title || 'Untitled Property'}</div>
        <div class="listing-meta">
          <span>📍 ${p.area || '—'}</span>
          <span>🏗 ${p.type || '—'}</span>
          <span>🛏 ${p.bhk || '—'}</span>
          <span>📅 ${dateStr}</span>
        </div>
        <div class="owner-info" style="margin-top:0.5rem">
          <span>👤</span>
          <span class="owner-name">${p.ownerName || 'Unknown Owner'}</span>
        </div>
        <!-- Warning -->
        <div style="margin-top:0.6rem;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:0.5rem 0.8rem;font-size:0.78rem;color:#7f1d1d;line-height:1.5">
          ⚠️ <b>No location provided.</b> Owner ko remind karo — "Dear Sir, please provide location otherwise your property will be rejected soon."
        </div>
        <!-- Contact Buttons -->
        <div style="margin-top:0.7rem;display:flex;gap:0.5rem;flex-wrap:wrap;">
          ${phone ? `
            <a href="tel:${phone}" style="display:inline-flex;align-items:center;gap:0.3rem;background:#eff6ff;border:1.5px solid #bfdbfe;color:#1d4ed8;border-radius:8px;padding:0.35rem 0.75rem;font-size:0.78rem;font-weight:700;text-decoration:none;cursor:pointer;">
              📞 Call
            </a>
            <a href="https://wa.me/91${phone}?text=${waMsg}" target="_blank" style="display:inline-flex;align-items:center;gap:0.3rem;background:#f0fdf4;border:1.5px solid #86efac;color:#15803d;border-radius:8px;padding:0.35rem 0.75rem;font-size:0.78rem;font-weight:700;text-decoration:none;cursor:pointer;">
              💬 WhatsApp
            </a>` : '<span style="font-size:0.75rem;color:var(--muted)">No phone</span>'}
          ${email ? `
            <a href="mailto:${email}?subject=Flatzy%20-%20Location%20Missing&body=${msg}" style="display:inline-flex;align-items:center;gap:0.3rem;background:#faf5ff;border:1.5px solid #d8b4fe;color:#7c3aed;border-radius:8px;padding:0.35rem 0.75rem;font-size:0.78rem;font-weight:700;text-decoration:none;cursor:pointer;">
              ✉️ Email
            </a>` : '<span style="font-size:0.75rem;color:var(--muted)">No email</span>'}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.4rem;flex-shrink:0;align-items:flex-end">
        <div class="listing-rent">₹${Number(p.rent||0).toLocaleString('en-IN')}/mo</div>
        <span style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:6px;padding:0.25rem 0.6rem;font-size:0.72rem;font-weight:700;white-space:nowrap;">📵 No Location</span>
      </div>
    </div>`;
  }).join('')}</div>`;
}

async function preloadAreasBadge() {
  try {
    const snap = await getDocs(collection(db, 'pending_areas'));
    window._allAreas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    updateSidebarBadges();
  } catch(e) {}
}
// Call after listings load
const _origLoadListings = window.loadListings;
window.loadListings = async function() {
  await _origLoadListings();
  preloadAreasBadge();
  // Refresh locverify list if tab was already visited
  if (window._locverifyLoaded) {
    window._lvList = (window.allListings || []).filter(p => p.lat && p.lng);
    renderLocVerifyStats();
    filterLocVerify(window._lvFilter || 'all');
  }
  if (window._nolocationLoaded) {
    window._nlList = (window.allListings || []).filter(p => !p.lat || !p.lng);
    renderNoLocationStats();
    filterNoLocation();
  }
};

// ─── meta/lastPropertyAdded updater ─────────────────────────────────────────
// Call this any time a property is added or goes live (from owner.html or when
// admin approves). Also exposed as window.updateLastPropertyAdded for use in
// owner.html after successful submit.
window.updateLastPropertyAdded = async function() {
  try {
    await setDoc(doc(db, 'meta', 'lastPropertyAdded'), {
      timestamp: new Date().toISOString()
    }, { merge: true });
  } catch(e) { console.warn('meta update failed', e.message); }
};

// Hook: when admin location-approves a property, update lastPropertyAdded
// so the bell badge fires for users
const _origSetLocationStatus = window.setLocationStatus;
if (_origSetLocationStatus) {
  window.setLocationStatus = async function(propId, status) {
    await _origSetLocationStatus(propId, status);
    if (status === 'approved') window.updateLastPropertyAdded();
  };
}
const _origLvSetStatus = window.lvSetStatus;
if (_origLvSetStatus) {
  window.lvSetStatus = async function(propId, status) {
    await _origLvSetStatus(propId, status);
    if (status === 'approved') window.updateLastPropertyAdded();
  };
}

// ─── Push Notifications Tab ───────────────────────────────────────────────────
window._pushLoaded = false;

window.loadPushTab = async function() {
  window._pushLoaded = true;
  const container = document.getElementById('pushTabStats');
  if (!container) return;
  container.innerHTML = '<p style="color:var(--muted);font-size:0.9rem;">⏳ FCM tokens load ho rahe hain…</p>';
  try {
    const snap = await getDocs(collection(db, 'fcmTokens'));
    const tokens = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    container.innerHTML = `
      <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1.5rem;">
        <div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:12px;padding:1rem 1.5rem;flex:1;min-width:140px;">
          <div style="font-size:1.6rem;font-weight:800;color:var(--primary)">${tokens.length}</div>
          <div style="font-size:0.78rem;color:var(--muted);font-weight:600;">Total FCM Tokens</div>
        </div>
        <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:1rem 1.5rem;flex:1;min-width:140px;">
          <div style="font-size:1.6rem;font-weight:800;color:#16a34a">${tokens.filter(t=>t.subscribedAt && (Date.now()-new Date(t.subscribedAt).getTime()) < 30*24*60*60*1000).length}</div>
          <div style="font-size:0.78rem;color:var(--muted);font-weight:600;">Active (30-day)</div>
        </div>
      </div>
      <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:0.8rem 1rem;font-size:0.8rem;color:#92400e;margin-bottom:1rem;line-height:1.6;">
        ⚠️ <b>FCM push notifications ke liye Firebase Cloud Function ya server-side API chahiye.</b>
        Browser se directly push nahi bhej sakte (security restriction). Niche wala button ek
        <b>Firestore broadcast document</b> create karta hai — service worker ya Cloud Function
        use kar ke actual push bhej sakte ho.
      </div>`;
    window._pushTokens = tokens;
  } catch(e) {
    container.innerHTML = `<p style="color:red;font-size:0.85rem;">Error: ${e.message}</p>`;
  }
};

window.sendPushToAll = async function() {
  const title = document.getElementById('pushTitle').value.trim();
  const body  = document.getElementById('pushBody').value.trim();
  if (!title || !body) { showToast('Title aur body dono bharo ❌', 'error'); return; }

  const btn = document.getElementById('sendPushBtn');
  btn.disabled = true; btn.textContent = '⏳ Bhej raha hai…';

  try {
    // 1. Write broadcast doc to Firestore (service worker / Cloud Function picks this up)
    const broadcastRef = await addDoc(collection(db, 'broadcasts'), {
      title,
      body,
      link: 'whats-new.html',
      sentAt: new Date().toISOString(),
      sentBy: auth.currentUser?.email || 'admin',
      tokenCount: window._pushTokens?.length || 0
    });

    // 2. Also write a notification entry for all users (notifications collection)
    await addDoc(collection(db, 'notifications'), {
      title,
      body,
      link: 'whats-new.html',
      timestamp: new Date().toISOString(),
      read: false,
      global: true   // visible to all users
    });

    // 3. Update meta/lastPropertyAdded so bell badge fires
    await window.updateLastPropertyAdded();

    showToast(`✅ Broadcast bheja! ${window._pushTokens?.length || 0} tokens ko.`);
    document.getElementById('pushTitle').value = '';
    document.getElementById('pushBody').value = '';
    document.getElementById('pushPreview').style.display = 'none';
  } catch(e) {
    showToast('Send failed: ' + e.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = '📡 Send Push to All Users';
  }
};

window.previewPush = function() {
  const title = document.getElementById('pushTitle').value.trim();
  const body  = document.getElementById('pushBody').value.trim();
  const preview = document.getElementById('pushPreview');
  if (!title && !body) { preview.style.display = 'none'; return; }
  preview.style.display = 'block';
  document.getElementById('ppTitle').textContent = title || '(no title)';
  document.getElementById('ppBody').textContent  = body  || '(no body)';
};

