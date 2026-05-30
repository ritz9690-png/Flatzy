/* ============================================================
   FLATZY — Lightbox
   LAPTOP : hover pe arrows + zoom aate hain
   MOBILE : tap pe arrows + zoom aate hain (2.5 sec baad hide)
            swipe left/right for navigation
            pinch to zoom in/out
   ============================================================ */

(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════
     CSS
  ═══════════════════════════════════════════════════════════ */
  const css = `
  /* ── BASE LIGHTBOX ── */
  #flLightbox {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 99999;
    background: rgba(0,0,0,0.93);
    align-items: center;
    justify-content: center;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
    font-family: sans-serif;
  }
  #flLightbox.active {
    display: flex;
    animation: flFadeIn 0.22s ease;
  }
  @keyframes flFadeIn { from { opacity:0 } to { opacity:1 } }

  /* ── CLOSE BTN — always visible ── */
  #flClose {
    position: absolute;
    top: 14px; right: 14px;
    width: 44px; height: 44px;
    background: rgba(255,255,255,0.14);
    border: 1.5px solid rgba(255,255,255,0.28);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    color: #fff;
    font-size: 1.2rem;
    z-index: 30;
    backdrop-filter: blur(6px);
    transition: background 0.2s;
  }
  #flClose:hover  { background: rgba(220,50,50,0.75); }
  #flClose:active { transform: scale(0.9); }

  /* ── COUNTER — always visible ── */
  #flCounter {
    position: absolute;
    top: 18px; left: 18px;
    background: rgba(0,0,0,0.55);
    color: rgba(255,255,255,0.88);
    font-size: 0.82rem;
    font-weight: 700;
    padding: 5px 14px;
    border-radius: 20px;
    letter-spacing: 1px;
    z-index: 30;
    border: 1px solid rgba(255,255,255,0.15);
  }

  /* ── STAGE ── */
  #flStage {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
    position: relative;
    cursor: grab;
  }
  #flStage.dragging { cursor: grabbing; }

  #flImgWrap {
    display: flex; align-items: center; justify-content: center;
    will-change: transform;
    transition: transform 0.18s ease;
  }
  #flImg {
    max-width: min(88vw, 1100px);
    max-height: 82vh;
    width: auto; height: auto;
    object-fit: contain;
    border-radius: 8px;
    pointer-events: none;
    -webkit-user-drag: none;
    box-shadow: 0 20px 80px rgba(0,0,0,0.7);
    transition: opacity 0.2s ease;
    display: block;
  }
  #flImg.fade { opacity: 0; }

  /* ── SPINNER ── */
  #flSpinner {
    position: absolute;
    width: 44px; height: 44px;
    border: 3px solid rgba(255,255,255,0.15);
    border-top-color: #1A6FE8;
    border-radius: 50%;
    animation: flSpin 0.7s linear infinite;
    display: none;
    pointer-events: none;
  }
  @keyframes flSpin { to { transform: rotate(360deg) } }

  /* ══════════════════════════════════════════════════
     LAPTOP — hover se sab dikhta hai
  ══════════════════════════════════════════════════ */

  /* arrows */
  .fl-arrow {
    position: absolute;
    top: 50%; transform: translateY(-50%);
    width: 54px; height: 54px;
    background: rgba(255,255,255,0.13);
    border: 2px solid rgba(255,255,255,0.26);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    color: #fff;
    font-size: 1.7rem;
    z-index: 20;
    backdrop-filter: blur(6px);
    transition: opacity 0.22s, background 0.2s, transform 0.18s;
    opacity: 0;           /* hidden by default */
  }
  .fl-arrow.hidden { display: none !important; }
  #flPrev { left: 16px; }
  #flNext { right: 16px; }

  /* show on desktop hover */
  @media (hover: hover) {
    .fl-arrow { opacity: 0.7; }
    #flLightbox:hover .fl-arrow { opacity: 1; }
    .fl-arrow:hover {
      background: rgba(26,111,232,0.75);
      border-color: #1A6FE8;
      transform: translateY(-50%) scale(1.08);
    }
    .fl-arrow:active { transform: translateY(-50%) scale(0.94); }
  }

  /* zoom group */
  #flZoomGroup {
    position: absolute;
    top: 68px; right: 14px;
    display: flex; flex-direction: column;
    gap: 6px;
    z-index: 30;
    opacity: 0;           /* hidden by default */
    transition: opacity 0.25s ease;
    pointer-events: none;
  }
  @media (hover: hover) {
    #flLightbox:hover #flZoomGroup {
      opacity: 1;
      pointer-events: all;
    }
  }
  .fl-zbtn {
    width: 44px; height: 44px;
    background: rgba(255,255,255,0.13);
    border: 1.5px solid rgba(255,255,255,0.26);
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    color: #fff;
    font-size: 1.35rem;
    font-weight: bold;
    backdrop-filter: blur(6px);
    transition: background 0.2s;
    line-height: 1;
  }
  .fl-zbtn:hover  { background: rgba(26,111,232,0.75); border-color: #1A6FE8; }
  .fl-zbtn:active { transform: scale(0.91); }
  #flZoomLabel {
    background: rgba(0,0,0,0.55);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 10px;
    color: rgba(255,255,255,0.85);
    font-size: 0.72rem;
    font-weight: 700;
    text-align: center;
    padding: 4px 2px;
    letter-spacing: 0.5px;
  }

  /* thumbnails */
  #flThumbs {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    display: flex; justify-content: center;
    gap: 7px;
    padding: 16px 16px 20px;
    background: linear-gradient(to top, rgba(0,0,0,0.78) 0%, transparent 100%);
    overflow-x: auto;
    scrollbar-width: none;
    opacity: 0;
    transition: opacity 0.25s ease;
    pointer-events: none;
  }
  #flThumbs::-webkit-scrollbar { display: none; }
  @media (hover: hover) {
    #flLightbox:hover #flThumbs {
      opacity: 1;
      pointer-events: all;
    }
  }
  .fl-thumb {
    width: 58px; height: 44px;
    border-radius: 6px;
    overflow: hidden;
    flex-shrink: 0;
    cursor: pointer;
    border: 2.5px solid transparent;
    transition: all 0.18s;
    opacity: 0.5;
    background: rgba(255,255,255,0.1);
  }
  .fl-thumb img { width:100%; height:100%; object-fit:cover; display:block; }
  .fl-thumb.active { border-color: #1A6FE8; opacity: 1; transform: scale(1.08); }
  .fl-thumb:hover  { opacity: 0.88; }

  /* ── VIDEO THUMB ── */
  .fl-thumb-video {
    width: 58px; height: 44px;
    border-radius: 6px;
    flex-shrink: 0;
    cursor: pointer;
    border: 2.5px solid transparent;
    transition: all 0.18s;
    opacity: 0.6;
    background: rgba(255,100,0,0.25);
    display: flex; align-items: center; justify-content: center;
    font-size: 1.4rem;
    position: relative;
  }
  .fl-thumb-video:hover { opacity: 1; border-color: #ff6600; }
  .fl-thumb-video.active { border-color: #ff6600; opacity: 1; transform: scale(1.08); }
  .fl-thumb-video span { font-size: 0.55rem; position: absolute; bottom: 3px; color: rgba(255,255,255,0.85); font-weight:700; letter-spacing:0.3px; }

  /* ── VIDEO PLAYER in lightbox ── */
  #flVideo {
    max-width: min(88vw, 1100px);
    max-height: 82vh;
    width: auto; height: auto;
    border-radius: 8px;
    box-shadow: 0 20px 80px rgba(0,0,0,0.7);
    display: none;
    outline: none;
    background: #000;
  }
  #flVideo.active { display: block; }
  #flImg.hidden   { display: none; }

  /* ══════════════════════════════════════════════════
     MOBILE — tap se dikhta hai (touch-show-ui class)
  ══════════════════════════════════════════════════ */
  @media (hover: none) {
    /* arrows — default thoda visible rakho taaki pata chale */
    .fl-arrow {
      opacity: 0.35;
      width: 48px; height: 48px;
      font-size: 1.4rem;
    }
    #flPrev { left: 8px; }
    #flNext { right: 8px; }

    /* tap se puri tarah dikhao */
    #flLightbox.touch-show-ui .fl-arrow {
      opacity: 1;
    }
    #flLightbox.touch-show-ui #flZoomGroup {
      opacity: 1;
      pointer-events: all;
    }
    #flLightbox.touch-show-ui #flThumbs {
    
      opacity: 1;
      pointer-events: all;
    }

    /* zoom group mobile size */
    #flZoomGroup { top: 62px; right: 10px; }
    .fl-zbtn { width: 40px; height: 40px; font-size: 1.2rem; }

    /* image size mobile */
    #flImg { max-height: 76vh; max-width: 96vw; }

    /* thumbs mobile */
    .fl-thumb { width: 48px; height: 37px; }

    /* no hover effect on mobile arrows */
    .fl-arrow:hover {
      background: rgba(255,255,255,0.13);
      border-color: rgba(255,255,255,0.26);
      transform: translateY(-50%);
    }
    .fl-arrow:active {
      background: rgba(26,111,232,0.75);
      transform: translateY(-50%) scale(0.94);
    }
  }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ═══════════════════════════════════════════════════════════
     HTML
  ═══════════════════════════════════════════════════════════ */
  document.body.insertAdjacentHTML('beforeend', `
  <div id="flLightbox">
    <span id="flCounter">1 / 1</span>
    <div id="flClose">✕</div>

    <div id="flZoomGroup">
      <div class="fl-zbtn" id="flZIn">+</div>
      <div id="flZoomLabel">100%</div>
      <div class="fl-zbtn" id="flZOut">−</div>
      <div class="fl-zbtn" id="flZReset">⊡</div>
    </div>

    <div id="flStage">
      <div id="flSpinner"></div>
      <div id="flImgWrap">
        <img id="flImg" src="" alt="photo">
        <video id="flVideo" controls playsinline></video>
      </div>
      <div class="fl-arrow" id="flPrev">&#8249;</div>
      <div class="fl-arrow" id="flNext">&#8250;</div>
    </div>

    <div id="flThumbs"></div>
  </div>
  `);

  /* ═══════════════════════════════════════════════════════════
     STATE
  ═══════════════════════════════════════════════════════════ */
  let photos = [], current = 0, isOpen = false, videoUrl = null, showingVideo = false;
  let scale = 1, panX = 0, panY = 0;
  let isDragging = false, dragStartX = 0, dragStartY = 0;
  let lastPanX = 0, lastPanY = 0;
  let isPinching = false, lastPinchDist = 0;
  let touchStartX = 0, touchStartY = 0, touchMoved = false;
  let uiTimer = null;

  const lb      = document.getElementById('flLightbox');
  const img     = document.getElementById('flImg');
  const wrap    = document.getElementById('flImgWrap');
  const stage   = document.getElementById('flStage');
  const counter = document.getElementById('flCounter');
  const spinner = document.getElementById('flSpinner');
  const zoomLbl = document.getElementById('flZoomLabel');
  const thumbEl = document.getElementById('flThumbs');

  const ZOOM_MIN = 0.5, ZOOM_MAX = 4, ZOOM_STEP = 0.4;
  const isMobile = () => window.matchMedia('(hover: none)').matches;

  /* ═══════════════════════════════════════════════════════════
     OPEN / CLOSE
  ═══════════════════════════════════════════════════════════ */
  window.flOpen = function (list, idx, title, vidUrl) {
    photos   = Array.isArray(list) ? list : [list];
    current  = idx || 0;
    videoUrl = vidUrl || null;
    isOpen   = true;
    showingVideo = false;
    document.body.style.overflow = 'hidden';
    document.body.appendChild(lb);
    lb.classList.add('active');
    resetZoom();
    renderThumbs();
    loadPhoto(current);
    showUI();
  };

  window.flClose = function () {
    lb.classList.remove('active', 'touch-show-ui');
    document.body.style.overflow = '';
    isOpen = false;
    img.src = '';
    clearTimeout(uiTimer);
    // stop video if playing
    const vid = document.getElementById('flVideo');
    vid.pause(); vid.src = '';
    vid.classList.remove('active');
    img.classList.remove('hidden');
    showingVideo = false;
  };

  document.getElementById('flClose').onclick = flClose;
  lb.addEventListener('click', e => { if (e.target === lb) flClose(); });

  /* ═══════════════════════════════════════════════════════════
     MOBILE UI SHOW / HIDE
  ═══════════════════════════════════════════════════════════ */
  function showUI() {
    lb.classList.add('touch-show-ui');
    clearTimeout(uiTimer);
    uiTimer = setTimeout(() => lb.classList.remove('touch-show-ui'), 4000);
  }

  /* ═══════════════════════════════════════════════════════════
     NAVIGATION
  ═══════════════════════════════════════════════════════════ */
  function go(dir) {
    const next = (current + dir + photos.length) % photos.length;
    if (next === current) return;
    current = next;
    resetZoom();
    loadPhoto(current);
  }

  document.getElementById('flPrev').onclick = e => { e.stopPropagation(); go(-1); };
  document.getElementById('flNext').onclick = e => { e.stopPropagation(); go(1); };

  function updateArrows() {
    const hide = photos.length <= 1;
    document.getElementById('flPrev').classList.toggle('hidden', hide);
    document.getElementById('flNext').classList.toggle('hidden', hide);
  }

  /* ═══════════════════════════════════════════════════════════
     LOAD PHOTO
  ═══════════════════════════════════════════════════════════ */
  function loadPhoto(idx) {
    counter.textContent = (idx + 1) + ' / ' + photos.length;
    updateArrows();
    updateThumbs(idx);

    img.classList.add('fade');
    spinner.style.display = 'block';

    setTimeout(() => {
      img.onload  = () => { spinner.style.display = 'none'; img.classList.remove('fade'); };
      img.onerror = () => { spinner.style.display = 'none'; img.classList.remove('fade'); };
      img.src = photos[idx];
      applyTransform();
    }, 120);
  }

  /* ═══════════════════════════════════════════════════════════
     ZOOM
  ═══════════════════════════════════════════════════════════ */
  document.getElementById('flZIn').onclick    = e => { e.stopPropagation(); zoomBy(ZOOM_STEP); };
  document.getElementById('flZOut').onclick   = e => { e.stopPropagation(); zoomBy(-ZOOM_STEP); };
  document.getElementById('flZReset').onclick = e => { e.stopPropagation(); resetZoom(); };

  function zoomBy(delta, cx, cy) {
    const r  = stage.getBoundingClientRect();
    const px = cx ?? r.width / 2;
    const py = cy ?? r.height / 2;
    const old = scale;
    scale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale + delta));
    const ratio = scale / old;
    panX = px - ratio * (px - panX);
    panY = py - ratio * (py - panY);
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
    if (scale <= 1.05) { panX = 0; panY = 0; return; }
    const r    = stage.getBoundingClientRect();
    const maxX = Math.max(0, (img.naturalWidth  * scale - r.width)  / 2);
    const maxY = Math.max(0, (img.naturalHeight * scale - r.height) / 2);
    panX = Math.min(maxX, Math.max(-maxX, panX));
    panY = Math.min(maxY, Math.max(-maxY, panY));
  }

  function applyTransform() {
    wrap.style.transition = isDragging ? 'none' : 'transform 0.18s ease';
    wrap.style.transform  = `translate(${panX}px,${panY}px) scale(${scale})`;
  }

  function updateZoomUI() {
    zoomLbl.textContent = Math.round(scale * 100) + '%';
  }

  /* wheel zoom — laptop only */
  stage.addEventListener('wheel', e => {
    e.preventDefault();
    const r = stage.getBoundingClientRect();
    zoomBy(e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP, e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });

  /* double click zoom — laptop */
  stage.addEventListener('dblclick', e => {
    if (scale > 1.05) { resetZoom(); return; }
    const r = stage.getBoundingClientRect();
    zoomBy(1.5, e.clientX - r.left, e.clientY - r.top);
  });

  /* ═══════════════════════════════════════════════════════════
     MOUSE DRAG — LAPTOP
  ═══════════════════════════════════════════════════════════ */
  stage.addEventListener('mousedown', e => {
    if (e.target === stage || e.target === wrap || e.target === img) {
      isDragging = true;
      dragStartX = e.clientX; dragStartY = e.clientY;
      lastPanX = panX; lastPanY = panY;
      stage.classList.add('dragging');
    }
  });

  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    panX = lastPanX + (e.clientX - dragStartX);
    panY = lastPanY + (e.clientY - dragStartY);
    clampPan(); applyTransform();
  });

  window.addEventListener('mouseup', e => {
    if (!isDragging) return;
    isDragging = false;
    stage.classList.remove('dragging');
    const dx = e.clientX - dragStartX;
    const dy = Math.abs(e.clientY - dragStartY);
    if (scale <= 1.05 && Math.abs(dx) > 50 && dy < 60) go(dx < 0 ? 1 : -1);
  });

  /* ═══════════════════════════════════════════════════════════
     TOUCH — MOBILE
  ═══════════════════════════════════════════════════════════ */
  stage.addEventListener('touchstart', e => {
    e.preventDefault();

    if (e.touches.length === 1) {
      // Single finger — show UI on tap, prepare swipe/drag
      isPinching  = false;
      touchMoved  = false;
      isDragging  = true;
      touchStartX = dragStartX = e.touches[0].clientX;
      touchStartY = dragStartY = e.touches[0].clientY;
      lastPanX = panX; lastPanY = panY;
      wrap.style.transition = 'none';

    } else if (e.touches.length === 2) {
      isDragging = false;
      isPinching = true;
      lastPinchDist = pinchDist(e.touches);
    }

  }, { passive: false });

  stage.addEventListener('touchmove', e => {
    e.preventDefault();

    if (e.touches.length === 2 && isPinching) {
      /* ── Pinch zoom ── */
      const d   = pinchDist(e.touches);
      const r   = stage.getBoundingClientRect();
      const mid = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top
      };
      zoomBy((d - lastPinchDist) * 0.013, mid.x, mid.y);
      lastPinchDist = d;

    } else if (e.touches.length === 1 && isDragging) {
      touchMoved    = true;
      const dx = e.touches[0].clientX - dragStartX;
      const dy = e.touches[0].clientY - dragStartY;

      if (scale <= 1.05) {
        /* rubber-band horizontal feedback while swiping */
        wrap.style.transform = `translate(${dx * 0.28}px,0px) scale(1)`;
      } else {
        /* zoomed — pan freely */
        panX = lastPanX + dx;
        panY = lastPanY + dy;
        clampPan(); applyTransform();
      }
    }

  }, { passive: false });

  stage.addEventListener('touchend', e => {
    /* ── After pinch ── */
    if (isPinching) {
      isPinching = false;
      if (scale <= 1.05) resetZoom();
      return;
    }

    if (!isDragging) return;
    isDragging = false;

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx   = endX - touchStartX;
    const dy   = Math.abs(endY - touchStartY);

    if (!touchMoved) {
      /* TAP — show UI (arrows + zoom + thumbs) */
      showUI();
      panX = 0; panY = 0; applyTransform();
      return;
    }

    if (scale <= 1.05 && Math.abs(dx) > 40 && dy < 85) {
      /* ── Swipe left/right → navigate ── */
      go(dx < 0 ? 1 : -1);
    } else {
      /* snap back */
      panX = 0; panY = 0; applyTransform();
    }
  });

  /* double-tap to zoom — mobile */
  let lastTap = 0;
  stage.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - lastTap < 280 && e.changedTouches.length === 1) {
      if (scale > 1.05) { resetZoom(); }
      else {
        const r  = stage.getBoundingClientRect();
        const cx = e.changedTouches[0].clientX - r.left;
        const cy = e.changedTouches[0].clientY - r.top;
        zoomBy(1.5, cx, cy);
      }
    }
    lastTap = now;
  });

  function pinchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /* ═══════════════════════════════════════════════════════════
     KEYBOARD — laptop
  ═══════════════════════════════════════════════════════════ */
  document.addEventListener('keydown', e => {
    if (!isOpen) return;
    if      (e.key === 'Escape')              flClose();
    else if (e.key === 'ArrowLeft')           go(-1);
    else if (e.key === 'ArrowRight')          go(1);
    else if (e.key === '+' || e.key === '=')  zoomBy(ZOOM_STEP);
    else if (e.key === '-')                   zoomBy(-ZOOM_STEP);
    else if (e.key === '0')                   resetZoom();
  });

  /* ═══════════════════════════════════════════════════════════
     THUMBNAILS
  ═══════════════════════════════════════════════════════════ */
  function renderThumbs() {
    const photoThumbs = photos.map((p, i) =>
      `<div class="fl-thumb${i === current ? ' active' : ''}" onclick="window.flGoTo(${i})">
         <img src="${p}" alt="thumb ${i+1}" loading="lazy">
       </div>`
    ).join('');
    const videoThumb = videoUrl
      ? `<div class="fl-thumb-video" id="flVideoThumb" onclick="window.flOpenVideo()">▶️<span>VIDEO</span></div>`
      : '';
    thumbEl.innerHTML = photoThumbs + videoThumb;
  }

  function updateThumbs(idx) {
    document.querySelectorAll('.fl-thumb').forEach((t, i) =>
      t.classList.toggle('active', i === idx));
    const vt = document.getElementById('flVideoThumb');
    if (vt) vt.classList.remove('active');
    const a = document.querySelector('.fl-thumb.active');
    if (a) a.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  window.flGoTo = function (idx) {
    // switch back from video to photo if needed
    const vid = document.getElementById('flVideo');
    if (showingVideo) {
      vid.pause(); vid.src = '';
      vid.classList.remove('active');
      img.classList.remove('hidden');
      showingVideo = false;
      document.getElementById('flClose').style.zIndex = '';
    }
    current = idx; resetZoom(); loadPhoto(idx);
  };

  window.flOpenVideo = function () {
    if (!videoUrl) return;
    showingVideo = true;
    // hide photo, show video
    img.classList.add('hidden');
    resetZoom();
    const vid = document.getElementById('flVideo');
    vid.src = videoUrl;
    vid.classList.add('active');
    vid.play().catch(()=>{});
    // update thumb highlight
    document.querySelectorAll('.fl-thumb').forEach(t => t.classList.remove('active'));
    const vt = document.getElementById('flVideoThumb');
    if (vt) { vt.classList.add('active'); vt.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); }
    // update counter
    counter.textContent = '🎬 Video Tour';
    // hide prev/next arrows
    document.getElementById('flPrev').classList.add('hidden');
    document.getElementById('flNext').classList.add('hidden');
    showUI();
  };

})();
