/* ============================================================
   FLATZY — Professional Photo Lightbox
   Features: Fullscreen, Zoom In/Out, Pan, Swipe, Keyboard Nav,
             Arrows, Thumbnails, Counter, Smooth Animations
   ============================================================ */

(function() {
'use strict';

// ── Inject CSS ────────────────────────────────────────────────────
const css = `
/* LIGHTBOX OVERLAY */
#flLightbox {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: rgba(5, 10, 20, 0.97);
  backdrop-filter: blur(12px);
  flex-direction: column;
  align-items: center;
  justify-content: center;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}
#flLightbox.active {
  display: flex;
  animation: flFadeIn 0.25s ease;
}
@keyframes flFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* TOP BAR */
#flTopBar {
  position: absolute;
  top: 0; left: 0; right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.2rem;
  background: linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%);
  z-index: 10;
  gap: 1rem;
}
#flCounter {
  font-family: 'Syne', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  color: rgba(255,255,255,0.85);
  letter-spacing: 1px;
  background: rgba(255,255,255,0.1);
  padding: 0.3rem 0.9rem;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.15);
}
#flTitle {
  font-family: 'DM Sans', sans-serif;
  font-size: 0.88rem;
  color: rgba(255,255,255,0.7);
  flex: 1;
  text-align: center;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
#flTopActions {
  display: flex;
  gap: 0.5rem;
}
.fl-icon-btn {
  width: 38px; height: 38px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  color: white;
  font-size: 1.1rem;
  flex-shrink: 0;
}
.fl-icon-btn:hover { background: rgba(255,255,255,0.22); border-color: rgba(255,255,255,0.3); }
.fl-icon-btn:active { transform: scale(0.92); }

/* MAIN IMAGE STAGE */
#flStage {
  width: 100%;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  cursor: grab;
}
#flStage.dragging { cursor: grabbing; }
#flStage.zoom-in-cursor { cursor: zoom-in; }
#flStage.zoom-out-cursor { cursor: zoom-out; }

#flImgWrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.08s linear;
  will-change: transform;
}
#flImg {
  max-width: min(90vw, 1200px);
  max-height: 72vh;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 8px;
  display: block;
  box-shadow: 0 20px 80px rgba(0,0,0,0.6);
  transition: opacity 0.22s ease, transform 0.22s ease;
  pointer-events: none;
  -webkit-user-drag: none;
}
#flImg.switching { opacity: 0; transform: scale(0.96); }
#flImg.switching-in { opacity: 1; transform: scale(1); }

/* EMOJI PLACEHOLDER */
#flEmoji {
  font-size: 8rem;
  display: none;
  filter: drop-shadow(0 8px 24px rgba(0,0,0,0.5));
}

/* NAV ARROWS */
.fl-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px; height: 48px;
  background: rgba(255,255,255,0.12);
  border: 1.5px solid rgba(255,255,255,0.2);
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  color: white;
  font-size: 1.3rem;
  z-index: 10;
  backdrop-filter: blur(4px);
}
.fl-arrow:hover { background: rgba(26,111,232,0.6); border-color: rgba(26,111,232,0.8); transform: translateY(-50%) scale(1.05); }
.fl-arrow:active { transform: translateY(-50%) scale(0.95); }
#flPrev { left: 1rem; }
#flNext { right: 1rem; }
.fl-arrow.hidden { opacity: 0; pointer-events: none; }

/* BOTTOM CONTROLS */
#flBottomBar {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  padding: 1.2rem 1.2rem 1.5rem;
  background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
}

/* ZOOM CONTROLS */
#flZoomBar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 12px;
  padding: 0.35rem 0.6rem;
}
.fl-zoom-btn {
  width: 32px; height: 32px;
  background: rgba(255,255,255,0.08);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.fl-zoom-btn:hover { background: rgba(255,255,255,0.2); }
.fl-zoom-btn:active { transform: scale(0.9); }
#flZoomLevel {
  font-family: 'Syne', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  color: rgba(255,255,255,0.8);
  min-width: 44px;
  text-align: center;
}

/* THUMBNAILS */
#flThumbs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  max-width: min(90vw, 600px);
  padding: 0 4px 2px;
  scrollbar-width: none;
}
#flThumbs::-webkit-scrollbar { display: none; }
.fl-thumb {
  width: 52px; height: 40px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
  opacity: 0.55;
  background: rgba(255,255,255,0.1);
  display: flex; align-items: center; justify-content: center;
}
.fl-thumb img { width: 100%; height: 100%; object-fit: cover; }
.fl-thumb span { font-size: 1.3rem; }
.fl-thumb.active { border-color: #1A6FE8; opacity: 1; transform: scale(1.06); }
.fl-thumb:hover { opacity: 0.9; }

/* LOADING SPINNER */
#flSpinner {
  position: absolute;
  width: 40px; height: 40px;
  border: 3px solid rgba(255,255,255,0.15);
  border-top-color: #1A6FE8;
  border-radius: 50%;
  animation: flSpin 0.7s linear infinite;
  display: none;
}
@keyframes flSpin { to { transform: rotate(360deg); } }

/* MOBILE TWEAKS */
@media (max-width: 600px) {
  #flImg { max-height: 65vh; max-width: 95vw; }
  #flPrev { left: 0.4rem; }
  #flNext { right: 0.4rem; }
  .fl-arrow { width: 40px; height: 40px; font-size: 1.1rem; border-radius: 10px; }
  #flTitle { display: none; }
  .fl-thumb { width: 44px; height: 34px; }
}
`;

const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);

// ── Build HTML ────────────────────────────────────────────────────
const html = `
<div id="flLightbox">
  <!-- Top Bar -->
  <div id="flTopBar">
    <span id="flCounter">1 / 1</span>
    <span id="flTitle"></span>
    <div id="flTopActions">
      <div class="fl-icon-btn" id="flResetBtn" title="Reset zoom">⊡</div>
      <div class="fl-icon-btn" id="flCloseBtn" title="Close (Esc)">✕</div>
    </div>
  </div>

  <!-- Stage -->
  <div id="flStage">
    <div id="flSpinner"></div>
    <div id="flImgWrap">
      <img id="flImg" src="" alt="Property photo">
      <div id="flEmoji"></div>
    </div>
    <div class="fl-arrow" id="flPrev">&#8249;</div>
    <div class="fl-arrow" id="flNext">&#8250;</div>
  </div>

  <!-- Bottom Bar -->
  <div id="flBottomBar">
    <div id="flZoomBar">
      <button class="fl-zoom-btn" id="flZoomOut">−</button>
      <span id="flZoomLevel">100%</span>
      <button class="fl-zoom-btn" id="flZoomIn">+</button>
    </div>
    <div id="flThumbs"></div>
  </div>
</div>
`;
document.body.insertAdjacentHTML('beforeend', html);

// ── State ─────────────────────────────────────────────────────────
let photos = [];
let current = 0;
let scale = 1;
let panX = 0, panY = 0;
let isDragging = false;
let dragStartX = 0, dragStartY = 0;
let lastPanX = 0, lastPanY = 0;
let lastTouchDist = 0;
let lastTouchMid = null;
let isOpen = false;

const lb = document.getElementById('flLightbox');
const img = document.getElementById('flImg');
const emoji = document.getElementById('flEmoji');
const wrap = document.getElementById('flImgWrap');
const stage = document.getElementById('flStage');
const counter = document.getElementById('flCounter');
const titleEl = document.getElementById('flTitle');
const thumbsEl = document.getElementById('flThumbs');
const spinner = document.getElementById('flSpinner');
const zoomLevelEl = document.getElementById('flZoomLevel');

// ── Open / Close ──────────────────────────────────────────────────
window.flOpen = function(photoList, index, title) {
  photos = Array.isArray(photoList) ? photoList : [photoList];
  current = index || 0;
  isOpen = true;
  document.body.style.overflow = 'hidden';
  lb.classList.add('active');
  titleEl.textContent = title || '';
  resetZoom();
  renderThumbs();
  loadPhoto(current);
};

window.flClose = function() {
  lb.classList.remove('active');
  document.body.style.overflow = '';
  isOpen = false;
  img.src = '';
};

document.getElementById('flCloseBtn').onclick = flClose;
document.getElementById('flResetBtn').onclick = resetZoom;

lb.addEventListener('click', function(e) {
  if (e.target === lb || e.target === stage) flClose();
});

// ── Navigation ────────────────────────────────────────────────────
function go(n) {
  const next = (current + n + photos.length) % photos.length;
  if (next === current) return;
  current = next;
  resetZoom();
  loadPhoto(current);
}

document.getElementById('flPrev').onclick = () => go(-1);
document.getElementById('flNext').onclick = () => go(1);

function updateArrows() {
  const prev = document.getElementById('flPrev');
  const next = document.getElementById('flNext');
  if (photos.length <= 1) { prev.classList.add('hidden'); next.classList.add('hidden'); }
  else { prev.classList.remove('hidden'); next.classList.remove('hidden'); }
}

// ── Load Photo ────────────────────────────────────────────────────
function loadPhoto(idx) {
  counter.textContent = (idx + 1) + ' / ' + photos.length;
  updateArrows();
  updateThumbs(idx);

  const p = photos[idx];
  const isUrl = p && (p.startsWith('http') || p.startsWith('/') || p.startsWith('data:'));

  img.classList.add('switching');
  setTimeout(() => {
    if (isUrl) {
      spinner.style.display = 'block';
      emoji.style.display = 'none';
      img.style.display = 'block';
      img.onload = () => { spinner.style.display = 'none'; img.classList.remove('switching'); };
      img.onerror = () => { spinner.style.display = 'none'; img.style.display = 'none'; emoji.textContent = '🏠'; emoji.style.display = 'block'; img.classList.remove('switching'); };
      img.src = p;
    } else {
      spinner.style.display = 'none';
      img.style.display = 'none';
      emoji.textContent = p || '🏠';
      emoji.style.display = 'block';
      img.classList.remove('switching');
    }
    applyTransform();
  }, 120);
}

// ── Zoom ──────────────────────────────────────────────────────────
const ZOOM_MIN = 0.5, ZOOM_MAX = 5, ZOOM_STEP = 0.35;

document.getElementById('flZoomIn').onclick = () => zoomBy(ZOOM_STEP);
document.getElementById('flZoomOut').onclick = () => zoomBy(-ZOOM_STEP);

function zoomBy(delta, cx, cy) {
  const stageRect = stage.getBoundingClientRect();
  const pivotX = cx ?? stageRect.width / 2;
  const pivotY = cy ?? stageRect.height / 2;
  const oldScale = scale;
  scale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale + delta));
  const ratio = scale / oldScale;
  panX = pivotX - ratio * (pivotX - panX);
  panY = pivotY - ratio * (pivotY - panY);
  clampPan();
  applyTransform();
  updateZoomUI();
}

function resetZoom() {
  scale = 1; panX = 0; panY = 0;
  applyTransform();
  updateZoomUI();
}

function clampPan() {
  if (scale <= 1) { panX = 0; panY = 0; return; }
  const stageRect = stage.getBoundingClientRect();
  const imgW = (img.naturalWidth || 300) * scale;
  const imgH = (img.naturalHeight || 200) * scale;
  const maxPanX = Math.max(0, (imgW - stageRect.width) / 2);
  const maxPanY = Math.max(0, (imgH - stageRect.height) / 2);
  panX = Math.min(maxPanX, Math.max(-maxPanX, panX));
  panY = Math.min(maxPanY, Math.max(-maxPanY, panY));
}

function applyTransform() {
  wrap.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  wrap.style.transition = isDragging ? 'none' : 'transform 0.18s ease';
}

function updateZoomUI() {
  zoomLevelEl.textContent = Math.round(scale * 100) + '%';
}

// Double click to zoom
stage.addEventListener('dblclick', function(e) {
  if (scale > 1.1) {
    resetZoom();
  } else {
    const r = stage.getBoundingClientRect();
    zoomBy(1.5, e.clientX - r.left, e.clientY - r.top);
  }
});

// Mouse wheel zoom
stage.addEventListener('wheel', function(e) {
  e.preventDefault();
  const r = stage.getBoundingClientRect();
  const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
  zoomBy(delta, e.clientX - r.left, e.clientY - r.top);
}, { passive: false });

// ── Mouse Drag ────────────────────────────────────────────────────
stage.addEventListener('mousedown', function(e) {
  if (e.target === stage || e.target === wrap || e.target === img) {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    lastPanX = panX;
    lastPanY = panY;
    stage.classList.add('dragging');
    wrap.style.transition = 'none';
  }
});

window.addEventListener('mousemove', function(e) {
  if (!isDragging) return;
  panX = lastPanX + (e.clientX - dragStartX);
  panY = lastPanY + (e.clientY - dragStartY);
  clampPan();
  applyTransform();
});

window.addEventListener('mouseup', function(e) {
  if (!isDragging) return;
  isDragging = false;
  stage.classList.remove('dragging');
  // Swipe gesture for navigation
  const dx = e.clientX - dragStartX;
  const dy = Math.abs(e.clientY - dragStartY);
  if (Math.abs(dx) > 60 && dy < 60 && scale <= 1.05) {
    go(dx < 0 ? 1 : -1);
  }
});

// ── Touch Events ──────────────────────────────────────────────────
let touchStartX = 0, touchStartY = 0;
let touchMoved = false;

stage.addEventListener('touchstart', function(e) {
  if (e.touches.length === 1) {
    isDragging = true;
    touchMoved = false;
    touchStartX = dragStartX = e.touches[0].clientX;
    touchStartY = dragStartY = e.touches[0].clientY;
    lastPanX = panX; lastPanY = panY;
    wrap.style.transition = 'none';
  } else if (e.touches.length === 2) {
    isDragging = false;
    lastTouchDist = getTouchDist(e.touches);
    lastTouchMid = getTouchMid(e.touches, stage.getBoundingClientRect());
  }
  e.preventDefault();
}, { passive: false });

stage.addEventListener('touchmove', function(e) {
  e.preventDefault();
  if (e.touches.length === 2) {
    // Pinch zoom
    const dist = getTouchDist(e.touches);
    const mid = getTouchMid(e.touches, stage.getBoundingClientRect());
    const delta = (dist - lastTouchDist) * 0.012;
    zoomBy(delta, mid.x, mid.y);
    lastTouchDist = dist;
    lastTouchMid = mid;
  } else if (e.touches.length === 1 && isDragging) {
    touchMoved = true;
    panX = lastPanX + (e.touches[0].clientX - dragStartX);
    panY = lastPanY + (e.touches[0].clientY - dragStartY);
    clampPan();
    applyTransform();
  }
}, { passive: false });

stage.addEventListener('touchend', function(e) {
  if (!isDragging) return;
  isDragging = false;
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
  if (touchMoved && Math.abs(dx) > 55 && dy < 70 && scale <= 1.05) {
    go(dx < 0 ? 1 : -1);
  }
});

function getTouchDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx*dx + dy*dy);
}
function getTouchMid(touches, rect) {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2 - rect.left,
    y: (touches[0].clientY + touches[1].clientY) / 2 - rect.top
  };
}

// ── Keyboard ──────────────────────────────────────────────────────
document.addEventListener('keydown', function(e) {
  if (!isOpen) return;
  if (e.key === 'Escape') flClose();
  else if (e.key === 'ArrowLeft') go(-1);
  else if (e.key === 'ArrowRight') go(1);
  else if (e.key === '+' || e.key === '=') zoomBy(ZOOM_STEP);
  else if (e.key === '-') zoomBy(-ZOOM_STEP);
  else if (e.key === '0') resetZoom();
});

// ── Thumbnails ────────────────────────────────────────────────────
function renderThumbs() {
  thumbsEl.innerHTML = photos.map((p, i) => {
    const isUrl = p && (p.startsWith('http') || p.startsWith('/') || p.startsWith('data:'));
    return `<div class="fl-thumb${i === current ? ' active' : ''}" onclick="window.flGoTo(${i})" data-idx="${i}">
      ${isUrl ? `<img src="${p}" alt="thumb ${i+1}">` : `<span>${p || '🏠'}</span>`}
    </div>`;
  }).join('');
}

function updateThumbs(idx) {
  document.querySelectorAll('.fl-thumb').forEach((t, i) => {
    t.classList.toggle('active', i === idx);
  });
  const active = document.querySelector('.fl-thumb.active');
  if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

window.flGoTo = function(idx) {
  current = idx;
  resetZoom();
  loadPhoto(current);
};

})(); // end IIFE
