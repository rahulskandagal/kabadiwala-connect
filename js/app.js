// Kabadiwala Connect — collector app (PWA). Offline-first: datasets cached by the service worker,
// state in IndexedDB, sync to a backend when configured (window.KC_API).
(() => {
  const $ = (s, r = document) => r.querySelector(s)
  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild }
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
  const inr = (n) => '₹ ' + Math.round(n).toLocaleString('en-IN')
  const state = { tab: 'snap', cats: [], prices: null, recyclers: [], safety: [], items: [], photo: null, sugg: [], cat: null, kg: 1, loc: null, selRec: null, view: null, handover: null, profile: null }

  // ---------- data
  async function loadData() {
    const [cats, prices, recs, safety] = await Promise.all(['data/categories.json', 'data/prices.json', 'data/recyclers.json', 'data/safety.json'].map((u) => fetch(u).then((r) => r.json())))
    Object.assign(state, { cats, prices, recyclers: recs, safety })
    state.items = await DB.all('items')
    state.selRec = await DB.kvGet('selRec', null)
    state.profile = await DB.kvGet('profile', null)
    state.loc = await DB.kvGet('loc', null)
  }
  const cat = (id) => state.cats.find((c) => c.id === id)
  const cname = (id) => { const c = cat(id); return c ? (c.name[LANG] || c.name.en) : id }
  const price = (id) => state.prices.categories[id]

  // ---------- voice
  function speak(text) {
    if (!('speechSynthesis' in window)) return toast('🔇')
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = speakLang()
    const v = speechSynthesis.getVoices().find((x) => x.lang.replace('_', '-').toLowerCase().startsWith(speakLang().toLowerCase().slice(0, 2)))
    if (v) u.voice = v
    u.rate = 0.95
    speechSynthesis.speak(u)
  }
  const priceSentence = (id) => {
    const p = price(id), n = cname(id), v = Math.round(p.today)
    return LANG === 'hi' ? `${n} का आज का दाम ${v} रुपये प्रति किलो है।` : LANG === 'mr' ? `${n} चा आजचा भाव ${v} रुपये प्रति किलो आहे.` : `Today's price for ${n} is ${v} rupees per kilogram.`
  }

  // ---------- helpers
  let toastT
  function toast(msg) { let t = $('.toast'); if (!t) { t = el('<div class="toast"></div>'); document.body.appendChild(t) } t.textContent = msg; clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 2600) }
  function spark(hist, w = 70, h = 28) {
    const v = hist.map((x) => x[1]), mn = Math.min(...v), mx = Math.max(...v)
    const pts = v.map((y, i) => `${(i / (v.length - 1)) * w},${h - 2 - ((y - mn) / (mx - mn || 1)) * (h - 4)}`).join(' ')
    const up = v[v.length - 1] >= v[0]
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline fill="none" stroke="${up ? '#16a34a' : '#dc2626'}" stroke-width="2" points="${pts}"/></svg>`
  }
  const hav = (a, b) => { const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLon = (b.lon - a.lon) * Math.PI / 180; const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)) }
  const itemsTotal = (items = state.items) => items.reduce((s, i) => s + i.kg * i.price, 0)
  const itemsKg = (items = state.items) => items.reduce((s, i) => s + i.kg, 0)

  // ---------- header / status
  function renderHeader() {
    $('.title').innerHTML = `${esc(t('app'))}<small>${esc(t('tagline'))}</small>`
    const on = navigator.onLine
    $('#net').className = 'pill ' + (on ? 'on' : '')
    $('#net').innerHTML = `<span class="dot"></span>${esc(on ? t('online') : t('offline'))}`
    DB.all('handovers').then((h) => { const pend = h.filter((x) => !x.synced).length; $('#pend').textContent = pend ? `${pend} ${t('pending')}` : ''; $('#pend').style.display = pend ? '' : 'none' })
    document.querySelectorAll('.tabs button').forEach((b) => { b.querySelector('span:last-child').textContent = t('tab_' + b.dataset.tab); b.classList.toggle('on', b.dataset.tab === state.tab) })
    $('#lang').value = LANG
  }

  // ---------- views
  function render() {
    renderHeader()
    const m = $('main'); m.innerHTML = ''
    if (state.view === 'handover') return renderHandover(m)
    if (state.view === 'receipt') return renderReceipt(m, state.handover)
    const views = { snap: renderSnap, board: renderBoard, recyclers: renderRecyclers, ledger: renderLedger, safety: renderSafety }
    views[state.tab](m)
    window.scrollTo(0, 0)
  }

  // ===== Snap & Value
  function renderSnap(m) {
    const p = state.cat ? price(state.cat) : null
    m.appendChild(el(`<h2>${esc(t('snap_title'))}</h2><p class="hint">${esc(t('snap_hint'))}</p>`))
    const card = el(`<div class="card">
      <div class="photo" id="photo">${state.photo ? `<img src="${state.photo}">` : '📷'}${state.cat ? `<span class="tag">${cat(state.cat).icon} ${esc(cname(state.cat))}</span>` : ''}${state.sugg[0] && state.cat === state.sugg[0].id ? `<span class="conf">AI ${Math.round(Math.min(99, state.sugg[0].score * 100))}% ${esc(t('confidence'))}</span>` : ''}</div>
      <div class="row" style="margin-top:10px"><label class="btn g grow" style="margin:0">📷 ${esc(t('take_photo'))}<input type="file" accept="image/*" capture="environment" hidden id="cam"></label><label class="btn o" style="margin:0;width:auto;padding:14px 16px">🖼️<input type="file" accept="image/*" hidden id="gal"></label></div>
      <div id="ai" class="muted" style="margin-top:8px"></div>
      <div id="sugg" class="sugg"></div>
      <h4 style="margin-top:12px">${esc(t('pick_category'))}</h4>
      <div class="grid">${state.cats.map((c) => `<div class="cat ${state.cat === c.id ? 'sel' : ''}" data-id="${c.id}"><span class="ic">${c.icon}</span>${esc(c.name[LANG] || c.name.en)}</div>`).join('')}</div>
    </div>`)
    m.appendChild(card)
    card.querySelectorAll('.cat').forEach((c) => c.onclick = () => { state.cat = c.dataset.id; render(); speak(priceSentence(state.cat)) })
    card.querySelector('#cam').onchange = (e) => onPhoto(e.target.files[0])
    card.querySelector('#gal').onchange = (e) => onPhoto(e.target.files[0])
    if (state.sugg.length) {
      $('#sugg').innerHTML = `<span class="muted" style="align-self:center">${esc(t('ai_suggests'))}:</span>` + state.sugg.map((s, i) => `<button class="${i === 0 ? 'top' : ''}" data-id="${s.id}">${cat(s.id).icon} ${esc(cname(s.id))} ${Math.round(s.score * 100)}%</button>`).join('')
      $('#sugg').querySelectorAll('button').forEach((b) => b.onclick = () => { state.cat = b.dataset.id; render() })
    }
    if (p) {
      const ch = p.change_30d_pct
      const pc = el(`<div class="card">
        <h4>${esc(t('fair_price_today'))} — ${esc(cname(state.cat))}</h4>
        <div class="price">${inr(p.today)} <small>${esc(t('per_kg'))}</small></div>
        <div class="band"><span>${esc(t('low'))} ${inr(p.low)}</span><span>${esc(t('market'))} ${inr(p.low * 1.05)}–${inr(p.high * 0.97)}</span><span>${esc(t('high'))} ${inr(p.high)}</span></div>
        <div style="margin-top:6px">${spark(p.history, 300, 44).replace('class="spark"', 'style="width:100%;height:44px"')}</div>
        <div class="band"><span>${esc(t('last30'))}</span><span class="${ch >= 0 ? 'up' : 'down'}">${ch >= 0 ? '▲' : '▼'} ${Math.abs(ch)} %</span></div>
        <button class="btn blue" id="say">🔊 ${esc(t('listen'))}</button>
        <h4 style="margin-top:14px">${esc(t('weight'))}</h4>
        <div class="stepper"><button id="minus">−</button><input id="kg" type="number" inputmode="decimal" step="0.5" min="0.1" value="${state.kg}"><button id="plus">+</button></div>
        <div class="row" style="margin-top:10px"><span class="muted">${esc(t('estimated_value'))}</span><span class="value grow" style="text-align:right" id="val">${inr(p.today * state.kg)}</span></div>
        <button class="btn g" id="add">➕ ${esc(t('save_item'))}</button>
        ${hazardTip(state.cat)}
      </div>`)
      m.appendChild(pc)
      const kgI = pc.querySelector('#kg'), upd = () => { state.kg = Math.max(0.1, parseFloat(kgI.value) || 0.1); pc.querySelector('#val').textContent = inr(p.today * state.kg) }
      kgI.oninput = upd
      pc.querySelector('#minus').onclick = () => { kgI.value = Math.max(0.5, (parseFloat(kgI.value) || 1) - 0.5); upd() }
      pc.querySelector('#plus').onclick = () => { kgI.value = (parseFloat(kgI.value) || 0) + 0.5; upd() }
      pc.querySelector('#say').onclick = () => speak(priceSentence(state.cat))
      pc.querySelector('#add').onclick = async () => {
        const it = { id: uid(), cat: state.cat, kg: state.kg, price: p.today, ts: Date.now(), photo: state.photo && state.photo.length < 200000 ? state.photo : null }
        await DB.put('items', it); state.items.push(it); state.photo = null; state.sugg = []; state.cat = null; state.kg = 1; toast('✔ ' + t('saved_items')); render()
      }
    }
    renderItems(m, true)
  }
  function hazardTip(cid) {
    const c = cat(cid), s = state.safety.find((x) => x.for.includes(cid))
    if (!s || c.hazard === 'none') return ''
    return `<div class="warn">${s.icon} <b>${esc(t('hazard_tip'))}:</b> ${esc(s[LANG][0])} <a class="link" href="#" data-safety>${esc(t('listen_tip'))} 🔊</a></div>`
  }
  function renderItems(m, withNext) {
    const c = el(`<div class="card"><h4>${esc(t('saved_items'))} (${state.items.length})</h4><div class="list" id="items"></div></div>`)
    m.appendChild(c)
    const list = c.querySelector('#items')
    if (!state.items.length) list.innerHTML = `<div class="muted">${esc(t('no_items'))}</div>`
    state.items.forEach((it) => {
      const r = el(`<div class="item"><div class="ic">${cat(it.cat).icon}</div><div><b>${esc(cname(it.cat))}</b><span>${it.kg} ${esc(t('kg'))} × ${inr(it.price)}</span></div><div class="amt">${inr(it.kg * it.price)}</div><button class="x" title="${esc(t('remove'))}">✕</button></div>`)
      r.querySelector('.x').onclick = async () => { await DB.del('items', it.id); state.items = state.items.filter((x) => x.id !== it.id); render() }
      list.appendChild(r)
    })
    if (state.items.length) {
      c.appendChild(el(`<div class="row" style="margin-top:10px"><b>${esc(t('total'))}: ${itemsKg().toFixed(1)} ${esc(t('kg'))}</b><b class="grow" style="text-align:right;color:var(--g);font-size:20px">${inr(itemsTotal())}</b></div>`))
      if (withNext) { const b = el(`<button class="btn">♻️ ${esc(t('find_recycler'))} →</button>`); b.onclick = () => { state.tab = 'recyclers'; render() }; c.appendChild(b) }
    }
    m.querySelectorAll('[data-safety]').forEach((a) => a.onclick = (e) => { e.preventDefault(); const s = state.safety.find((x) => x.for.includes(state.cat)); speak(s[LANG].join(' ')) })
  }
  async function onPhoto(file) {
    if (!file) return
    const url = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(file) })
    // downscale for storage + inference
    const img = new Image(); img.src = url; await img.decode()
    const cv = document.createElement('canvas'), sc = Math.min(1, 640 / Math.max(img.width, img.height)); cv.width = img.width * sc; cv.height = img.height * sc
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height)
    state.photo = cv.toDataURL('image/jpeg', 0.7); state.sugg = []; state.cat = null; render()
    const ai = $('#ai'); ai.textContent = AI.ready ? t('analysing') : t('model_loading')
    try {
      const { suggestions } = await AI.classify(cv)
      state.sugg = suggestions
      if (suggestions[0] && suggestions[0].score > 0.15) state.cat = suggestions[0].id
      render(); $('#ai').textContent = suggestions.length ? t('model_ready') : t('not_sure')
      if (state.cat) speak(priceSentence(state.cat))
    } catch (e) { console.warn(e); $('#ai').textContent = t('model_failed') }
  }

  // ===== Price board
  function renderBoard(m) {
    m.appendChild(el(`<h2>${esc(t('board_title'))}</h2><p class="hint">${esc(t('board_hint'))}</p>`))
    const c = el(`<div class="card"></div>`)
    state.cats.forEach((cc) => {
      const p = price(cc.id), ch = p.change_30d_pct
      const r = el(`<div class="boardrow"><div style="font-size:26px">${cc.icon}</div><div><div class="nm">${esc(cc.name[LANG] || cc.name.en)}</div><div class="sub"><span class="${ch >= 0 ? 'up' : 'down'}">${ch >= 0 ? '▲' : '▼'} ${Math.abs(ch)}%</span> · ${inr(p.low)}–${inr(p.high)}</div></div><div class="pr">${inr(p.today)}</div>${spark(p.history)}</div>`)
      r.onclick = () => speak(priceSentence(cc.id))
      c.appendChild(r)
    })
    c.appendChild(el(`<p class="muted" style="margin:10px 0 0">${esc(t('sources'))}: ${esc(state.prices.categories.pcb.sources.join(' · '))} · ${esc(state.prices.generated)}</p>`))
    m.appendChild(c)
  }

  // ===== Recyclers + matching
  function matchScore(r, loc) {
    const cats = state.items.length ? [...new Set(state.items.map((i) => i.cat))] : [state.cat].filter(Boolean)
    const cover = cats.length ? cats.filter((c) => r.materials.includes(c)).length / cats.length : 1
    const dist = loc ? hav(loc, r) : 25
    const dScore = Math.max(0, 1 - dist / 60)
    const pScore = (r.price_factor - 0.94) / 0.14
    return { score: Math.round(100 * (0.4 * cover + 0.25 * dScore + 0.2 * pScore + 0.1 * (r.rating / 5) + 0.05 * (r.pickup ? 1 : 0))), dist, cover }
  }
  function renderRecyclers(m) {
    m.appendChild(el(`<h2>${esc(t('rec_title'))}</h2><p class="hint">${esc(t('rec_hint'))}</p>`))
    const top = el(`<div class="row" style="margin-bottom:10px"><button class="btn o sm grow" id="loc">📍 ${esc(state.loc ? `${state.loc.lat.toFixed(3)}, ${state.loc.lon.toFixed(3)}` : t('locate'))}</button></div>`)
    m.appendChild(top)
    top.querySelector('#loc').onclick = () => getLoc(true)
    if (!state.loc) m.appendChild(el(`<div class="warn">${esc(t('no_location'))}</div>`))
    m.appendChild(el('<div id="map"></div>'))
    const ranked = state.recyclers.map((r) => ({ r, ...matchScore(r, state.loc) })).sort((a, b) => b.score - a.score)
    ranked.forEach(({ r, score, dist, cover }, i) => {
      const cats = state.items.length ? [...new Set(state.items.map((x) => x.cat))] : []
      const est = cats.length ? state.items.reduce((s, it) => s + (r.materials.includes(it.cat) ? it.kg * it.price * r.price_factor : 0), 0) : null
      const c = el(`<div class="rec ${i === 0 ? 'best' : ''}">
        <div class="top"><div style="font-size:30px">${r.type === 'aggregator' ? '🚚' : '🏭'}</div><div><div class="nm">${esc(r.name)}</div><div class="meta">${esc(r.epr_id)} · ${esc(r.address)}</div><div class="meta">★ ${r.rating} · ${state.loc ? dist.toFixed(1) + ' ' + t('km') : '—'} · ${r.hours}</div></div>
        <div class="pr">${est != null ? inr(est) : Math.round(r.price_factor * 100) + '%'}<small>${est != null ? esc(t('estimated_value')) : esc(t('market'))}</small></div></div>
        <div>${i === 0 ? `<span class="badge best">🏆 ${esc(t('best'))} · ${score}% ${esc(t('match_score'))}</span>` : `<span class="badge">${score}% ${esc(t('match_score'))}</span>`}<span class="badge">${r.pickup ? '🚚 ' + esc(t('pickup')) : '📍 ' + esc(t('dropoff'))}</span><span class="badge">${r.pays.map((p) => p === 'cash' ? '💵' : '📲').join(' ')}</span>${cover < 1 ? `<span class="badge" style="background:#fee2e2;color:#b91c1c">${Math.round(cover * 100)}% ${esc(t('accepts'))}</span>` : ''}</div>
        <div class="chips">${r.materials.map((mm) => `<span title="${esc(cname(mm))}">${cat(mm).icon}</span>`).join('')}</div>
        <button class="btn ${i === 0 ? 'g' : 'o'} sm" style="margin-top:10px;width:100%">${r.pickup ? '🚚 ' + esc(t('book_pickup')) : '🤝 ' + esc(t('book_dropoff'))}</button></div>`)
      c.querySelector('button').onclick = async () => {
        if (!state.items.length) return toast(t('add_items_first'))
        state.selRec = r.id; await DB.kvSet('selRec', r.id); state.view = 'handover'; render()
      }
      m.appendChild(c)
    })
    if (window.L && navigator.onLine) setTimeout(() => {
      try {
        const center = state.loc ? [state.loc.lat, state.loc.lon] : [21.146, 79.088]
        const map = L.map('map', { zoomControl: false, attributionControl: false }).setView(center, state.loc ? 11 : 6)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map)
        if (state.loc) L.circleMarker(center, { radius: 8, color: '#dc2626', fillOpacity: 0.9 }).addTo(map)
        state.recyclers.forEach((r) => L.circleMarker([r.lat, r.lon], { radius: 7, color: '#166534', fillColor: '#4ade80', fillOpacity: 0.9 }).addTo(map).bindTooltip(r.name))
      } catch (e) { $('#map').style.display = 'none' }
    }, 0); else $('#map').style.display = 'none'
  }
  function getLoc(interactive) {
    return new Promise((res) => {
      if (!navigator.geolocation) return res(null)
      if (interactive) toast(t('locating'))
      navigator.geolocation.getCurrentPosition(async (p) => { state.loc = { lat: p.coords.latitude, lon: p.coords.longitude, acc: Math.round(p.coords.accuracy) }; await DB.kvSet('loc', state.loc); if (interactive) render(); res(state.loc) },
        () => { if (interactive) toast(t('gps_fail')); res(null) }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 })
    })
  }

  // ===== Handover
  function renderHandover(m) {
    const r = state.recyclers.find((x) => x.id === state.selRec)
    if (!r) { state.view = null; state.tab = 'recyclers'; return render() }
    let pay = r.pays[0]
    m.appendChild(el(`<h2>${esc(t('handover_title'))}</h2><p class="hint">${esc(t('handover_hint'))}</p>`))
    const c = el(`<div class="card">
      <div class="kv"><span>${esc(t('recycler'))}</span><b>${esc(r.name)}<br><span class="muted">${esc(r.epr_id)}</span></b></div>
      ${state.items.map((it) => `<div class="kv"><span>${cat(it.cat).icon} ${esc(cname(it.cat))} · ${it.kg} ${esc(t('kg'))}</span><b>${inr(it.kg * it.price * r.price_factor)}</b></div>`).join('')}
      <div class="kv" style="border:0"><span><b>${esc(t('total'))}</b> · ${itemsKg().toFixed(1)} ${esc(t('kg'))}</span><b style="color:var(--g);font-size:20px">${inr(itemsTotal() * r.price_factor)}</b></div>
      <h4 style="margin-top:12px">${esc(t('payment'))}</h4>
      <div class="radio">${r.pays.map((p, i) => `<label class="${i === 0 ? 'sel' : ''}" data-p="${p}"><input type="radio" name="pay">${p === 'cash' ? '💵 ' + esc(t('cash')) : '📲 ' + esc(t('upi'))}</label>`).join('')}</div>
      <h4 style="margin-top:12px">${esc(t('gps'))}</h4><div id="gps" class="muted">${esc(t('capturing_gps'))}</div>
      <button class="btn g" id="go">🧾 ${esc(t('create_handover'))}</button>
      <button class="btn o" id="back">←</button></div>`)
    m.appendChild(c)
    c.querySelectorAll('.radio label').forEach((l) => l.onclick = () => { c.querySelectorAll('.radio label').forEach((x) => x.classList.remove('sel')); l.classList.add('sel'); pay = l.dataset.p })
    c.querySelector('#back').onclick = () => { state.view = null; render() }
    let gps = null
    getLoc(false).then((g) => { gps = g; c.querySelector('#gps').innerHTML = g ? `✔ ${esc(t('gps_ok'))} · ${g.lat.toFixed(5)}, ${g.lon.toFixed(5)} (±${g.acc} m)` : `⚠ ${esc(t('gps_fail'))}` })
    c.querySelector('#go').onclick = async () => {
      c.querySelector('#go').disabled = true
      const prev = await DB.kvGet('lastHash', '0'.repeat(64))
      const rec = { id: uid(), ts: Date.now(), collector: state.profile || {}, recycler: { id: r.id, name: r.name, epr_id: r.epr_id }, items: state.items.map(({ cat, kg, price }) => ({ cat, kg, price: +(price * r.price_factor).toFixed(1) })),
        kg: +itemsKg().toFixed(2), amount: Math.round(itemsTotal() * r.price_factor), payment: pay, gps, otp: String(Math.floor(1000 + Math.random() * 9000)), status: 'created', prev_hash: prev, synced: false, lang: LANG }
      rec.hash = await sha256(JSON.stringify({ ...rec, hash: undefined }))
      rec.trace_id = 'KC-' + rec.hash.slice(0, 10).toUpperCase()
      await DB.put('handovers', rec); await DB.kvSet('lastHash', rec.hash)
      await DB.clear('items'); state.items = []
      state.handover = rec; state.view = 'receipt'; render(); sync()
    }
  }
  function renderReceipt(m, h) {
    const st = { created: t('status_created'), confirmed: t('status_confirmed'), paid: t('status_paid') }[h.status]
    m.appendChild(el(`<h2>${esc(t('receipt'))}</h2>`))
    const c = el(`<div class="card">
      ${h.status === 'created' ? `<h4>${esc(t('otp_title'))}</h4><div class="otp">${h.otp}</div><p class="muted">${esc(t('otp_hint'))}</p>` : ''}
      <div class="qr" id="qr"></div>
      <div class="center muted">${esc(t('trace_id'))} · <b>${h.trace_id}</b></div>
      <div class="kv"><span>${esc(t('recycler'))}</span><b>${esc(h.recycler.name)}<br><span class="muted">${esc(h.recycler.epr_id)}</span></b></div>
      <div class="kv"><span>${esc(t('items'))}</span><b>${h.items.map((i) => `${cat(i.cat).icon} ${i.kg} ${t('kg')}`).join(' · ')}</b></div>
      <div class="kv"><span>${esc(t('gps'))}</span><b>${h.gps ? `${h.gps.lat.toFixed(5)}° N, ${h.gps.lon.toFixed(5)}° E` : '—'}</b></div>
      <div class="kv"><span>${esc(t('time'))}</span><b>${new Date(h.ts).toLocaleString('en-IN')}</b></div>
      <div class="kv"><span>${esc(t('payment'))}</span><b>${h.payment === 'cash' ? '💵 ' + t('cash') : '📲 ' + t('upi')}</b></div>
      <div class="kv"><span>${esc(t('amount'))}</span><b style="color:var(--g);font-size:18px">${inr(h.amount)}</b></div>
      <div class="ok">${esc(st)}</div>
      <a class="btn g" target="_blank" href="https://wa.me/?text=${encodeURIComponent(`${t('receipt')} ${h.trace_id}\n${h.recycler.name} (${h.recycler.epr_id})\n${h.kg} kg · ${inr(h.amount)} · ${h.payment.toUpperCase()}\n${new Date(h.ts).toLocaleString('en-IN')}${h.gps ? `\nGPS ${h.gps.lat.toFixed(5)},${h.gps.lon.toFixed(5)}` : ''}`)}">📤 ${esc(t('share_whatsapp'))}</a>
      <button class="btn o" id="done">${esc(t('done'))}</button></div>`)
    m.appendChild(c)
    if (window.QRCode) new QRCode(c.querySelector('#qr'), { text: JSON.stringify({ t: h.trace_id, r: h.recycler.epr_id, kg: h.kg, a: h.amount, h: h.hash.slice(0, 16) }), width: 150, height: 150 })
    c.querySelector('#done').onclick = () => { state.view = null; state.tab = 'ledger'; render() }
  }

  // ===== Ledger
  async function renderLedger(m) {
    const hs = (await DB.all('handovers')).sort((a, b) => b.ts - a.ts)
    m.appendChild(el(`<h2>${esc(t('ledger_title'))}</h2><p class="hint">${esc(t('ledger_hint'))}</p>`))
    const now = new Date(), mon = hs.filter((h) => new Date(h.ts).getMonth() === now.getMonth() && new Date(h.ts).getFullYear() === now.getFullYear())
    const sum = (a) => a.reduce((s, h) => s + h.amount, 0), kg = (a) => a.reduce((s, h) => s + h.kg, 0)
    m.appendChild(el(`<div class="kpis"><div class="kpi"><div class="v">${inr(sum(mon))}</div><div class="l">${esc(t('this_month'))} · ${mon.length} ${esc(t('deals'))} · ${kg(mon).toFixed(1)} ${esc(t('kg'))}</div></div><div class="kpi"><div class="v">${inr(sum(hs))}</div><div class="l">${esc(t('all_time'))} · ${hs.length} ${esc(t('deals'))} · ${kg(hs).toFixed(1)} ${esc(t('kg'))}</div></div></div>`))
    // monthly bars (last 6 months)
    const months = [...Array(6)].map((_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1); return { k: `${d.getFullYear()}-${d.getMonth()}`, l: d.toLocaleString('en-IN', { month: 'short' }), v: 0 } })
    hs.forEach((h) => { const d = new Date(h.ts), k = `${d.getFullYear()}-${d.getMonth()}`; const mm = months.find((x) => x.k === k); if (mm) mm.v += h.amount })
    const mx = Math.max(1, ...months.map((x) => x.v))
    m.appendChild(el(`<div class="card"><h4>${esc(t('monthly'))}</h4><div class="bars">${months.map((x) => `<div style="height:${Math.max(2, (x.v / mx) * 100)}%" title="${inr(x.v)}"><span>${x.l}</span></div>`).join('')}</div><div style="height:14px"></div></div>`))
    const profile = el(`<div class="card"><h4>${esc(t('profile'))}</h4><div class="row"><input class="txt" id="pn" placeholder="${esc(t('name'))}" value="${esc(state.profile?.name || '')}"><input class="txt" id="pp" placeholder="${esc(t('phone'))}" inputmode="tel" value="${esc(state.profile?.phone || '')}"><button class="btn g sm" id="ps">${esc(t('save'))}</button></div><div class="muted" style="margin-top:6px">${esc(t('collector_id'))}: <b>${esc(state.profile?.cid || '—')}</b></div></div>`)
    m.appendChild(profile)
    profile.querySelector('#ps').onclick = async () => { const p = { name: $('#pn').value.trim(), phone: $('#pp').value.trim() }; p.cid = 'KC-C-' + (await sha256(p.phone || p.name || uid())).slice(0, 6).toUpperCase(); state.profile = p; await DB.kvSet('profile', p); toast('✔'); render() }
    const list = el(`<div class="card"><div class="list"></div></div>`)
    if (!hs.length) list.querySelector('.list').innerHTML = `<div class="muted">${esc(t('no_ledger'))}</div>`
    hs.forEach((h) => {
      const r = el(`<div class="item" style="cursor:pointer"><div class="ic">🧾</div><div><b>${esc(h.recycler.name)}</b><span>${new Date(h.ts).toLocaleDateString('en-IN')} · ${h.kg} ${esc(t('kg'))} · ${h.payment === 'cash' ? '💵' : '📲'} · ${esc({ created: t('status_created'), confirmed: t('status_confirmed'), paid: t('status_paid') }[h.status])}${h.synced ? '' : ' · ⏳'}</span></div><div class="amt">${inr(h.amount)}</div></div>`)
      r.onclick = () => { state.handover = h; state.view = 'receipt'; render() }
      list.querySelector('.list').appendChild(r)
    })
    if (hs.length) { const b = el(`<button class="btn o">⬇ ${esc(t('export_csv'))}</button>`); b.onclick = () => exportCsv(hs); list.appendChild(b) }
    m.appendChild(list)
  }
  function exportCsv(hs) {
    const rows = [['trace_id', 'date', 'recycler', 'epr_id', 'kg', 'amount_inr', 'payment', 'status', 'lat', 'lon', 'hash']].concat(hs.map((h) => [h.trace_id, new Date(h.ts).toISOString(), h.recycler.name, h.recycler.epr_id, h.kg, h.amount, h.payment, h.status, h.gps?.lat ?? '', h.gps?.lon ?? '', h.hash]))
    const blob = new Blob([rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'kabadiwala_connect_statement.csv'; a.click()
  }

  // ===== Safety
  function renderSafety(m) {
    m.appendChild(el(`<h2>${esc(t('safety_title'))}</h2><p class="hint">${esc(t('safety_hint'))}</p>`))
    state.safety.forEach((s) => {
      const c = el(`<div class="safety"><div class="h"><span class="ic">${s.icon}</span><span class="grow">${s.for.map((f) => esc(cname(f))).join(' · ')}</span><button class="btn blue sm">🔊 ${esc(t('listen_tip'))}</button></div><ul>${s[LANG].map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`)
      c.querySelector('button').onclick = () => speak(s[LANG].join(' '))
      m.appendChild(c)
    })
  }

  // ---------- sync (optional backend)
  async function sync() {
    if (!window.KC_API || !navigator.onLine) return
    const hs = (await DB.all('handovers')).filter((h) => !h.synced)
    for (const h of hs) {
      try { const r = await fetch(KC_API + '/handovers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(h) }); if (r.ok) { h.synced = true; await DB.put('handovers', h) } } catch (e) { break }
    }
    renderHeader()
  }
  // recycler console (same device demo) updates status via localStorage event
  window.addEventListener('storage', async (e) => { if (e.key === 'kc_status_update') { const { id, status } = JSON.parse(e.newValue); const h = await DB.get('handovers', id); if (h) { h.status = status; await DB.put('handovers', h); if (state.handover && state.handover.id === id) state.handover = h; render(); toast(status === 'paid' ? '✔ ' + t('status_paid') : '✔ ' + t('status_confirmed')) } } })

  // ---------- boot
  async function boot() {
    document.documentElement.lang = LANG === 'en' ? 'en' : LANG + '-IN'
    await loadData()
    $('#lang').onchange = (e) => { setLang(e.target.value); render() }
    document.querySelectorAll('.tabs button').forEach((b) => b.onclick = () => { state.tab = b.dataset.tab; state.view = null; render() })
    $('#mic').onclick = () => voiceAsk()
    window.addEventListener('online', () => { renderHeader(); sync() }); window.addEventListener('offline', renderHeader)
    render()
    AI.load(state.cats).catch(() => {})   // warm the model in the background
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {})
    let deferred; window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; $('#install').style.display = ''; $('#install').onclick = () => deferred.prompt() })
    if (speechSynthesis) speechSynthesis.onvoiceschanged = () => {}
  }
  // voice query: "PCB ka daam?" → speaks the price of the best-matching category
  function voiceAsk() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return toast('🎤 ✖')
    const r = new SR(); r.lang = speakLang(); r.interimResults = false
    toast('🎤 …')
    r.onresult = (e) => {
      const q = e.results[0][0].transcript.toLowerCase()
      const hit = state.cats.find((c) => [c.name.en, c.name.hi, c.name.mr, c.id, ...c.hints].some((n) => q.includes(String(n).toLowerCase().split(' ')[0])))
      if (hit) { state.cat = hit.id; state.tab = 'snap'; state.view = null; render(); speak(priceSentence(hit.id)) } else speak(LANG === 'hi' ? 'माफ़ कीजिए, समझ नहीं आया। सामग्री चुनें।' : LANG === 'mr' ? 'माफ करा, समजले नाही. साहित्य निवडा.' : 'Sorry, I did not catch that. Please pick the material.')
    }
    r.onerror = () => toast('🎤 ✖'); r.start()
  }
  boot()
})()
