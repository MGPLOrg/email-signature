// Arth email signature generator: page logic for generator.html (kept in its own file so the
// Google Apps Script helper serves it unchanged).
const BASE = 'https://mgplorg.github.io/email-signature/assets/email/';
const W = 700, H = 200, S = 2; // design size; images are exported at 2x
const f = document.getElementById('f');
const st = { assets: {}, photo: null, photoIsCutout: false };

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = s => s.trim().toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'person';
const digits = s => s.replace(/[^0-9]/g, '');
const load = src => new Promise((ok, err) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = () => err(new Error(src)); i.src = src; });

// Image pieces of the 700×200 signature. Person-specific pieces live in people/<slug>/, the rest are shared.
const PIECES = {
  top:    { x: 0,   y: 0,   w: 700, h: 106, own: true },
  left:   { x: 0,   y: 106, w: 492, h: 84,  own: true },
  phone:  { x: 492, y: 106, w: 208, h: 20,  own: true, file: 'phone-row' },
  email:  { x: 492, y: 126, w: 208, h: 20,  own: true, file: 'email-row' },
  web:    { x: 492, y: 146, w: 208, h: 20,  file: 'web-row' },
  ig:     { x: 492, y: 166, w: 22,  h: 24 },
  fb:     { x: 514, y: 166, w: 20,  h: 24 },
  li:     { x: 534, y: 166, w: 21,  h: 24 },
  wa:     { x: 555, y: 166, w: 145, h: 24, file: 'wa-row' }, // runs to the right edge: no separate filler piece
  bottom: { x: 0,   y: 190, w: 700, h: 10 },
};
const pieceFile = key => (PIECES[key].file || key) + '.png';
const ownPieces = () => Object.keys(PIECES).filter(k => PIECES[k].own);
// Person pieces carry a hash of their pixels, so every new photo or detail gets a new URL and Gmail never shows a cached old copy.
const pieceUrl = (key, p) => PIECES[key].own ? `${BASE}people/${slug(p.name)}/${pieceFile(key)}?v=${st.version}` : `${BASE}shared/${pieceFile(key)}`;
const hash = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };

// Email-safe markup: only linked <img> pieces in a fixed table, no colours or text for dark mode to invert.
function signatureHtml(p, src = pieceUrl) {
  const img = (key, alt = '') => { const c = PIECES[key]; return `<img src="${src(key, p)}" alt="${esc(alt)}" width="${c.w}" height="${c.h}" style="display:block; width:${c.w}px; height:${c.h}px; border:0;">`; };
  const td = (inner, attrs = '') => `<td${attrs} style="padding:0; font-size:0; line-height:0;">${inner}</td>`;
  const link = (href, inner) => `<a href="${href}" target="_blank" style="text-decoration:none;">${inner}</a>`;
  const tel = 'tel:+' + digits(p.phone);
  return `<table cellpadding="0" cellspacing="0" border="0" width="700" style="width:700px; border-collapse:collapse; mso-table-lspace:0; mso-table-rspace:0;">
  <tr>${td(link('https://arthproject.com', img('top', 'arth — Making Property Click')), ' colspan="2"')}</tr>
  <tr>
    ${td(img('left', `${p.name} — ${p.role}. Manpho Stambh, 1st Main Rd, opposite Shri Vasupujya Swami Jain Temple, Hebbal, Bengaluru, Karnataka 560032`), ' rowspan="4" width="492"')}
    ${td(link(tel, img('phone', p.phone)), ' width="208"')}
  </tr>
  <tr>${td(link('mailto:' + p.email, img('email', p.email)))}</tr>
  <tr>${td(link('https://arthproject.com', img('web', 'arthproject.com')))}</tr>
  <tr>
    <td style="padding:0; font-size:0; line-height:0;">
      <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr>
          ${td(link('https://www.instagram.com/the.arth.project/', img('ig', 'Instagram')))}
          ${td(link('https://www.facebook.com/share/1G9WyW885T/', img('fb', 'Facebook')))}
          ${td(link('https://www.linkedin.com/company/arthproject/', img('li', 'LinkedIn')))}
          ${td(link('https://wa.me/' + digits(p.phone), img('wa', 'WhatsApp')))}        </tr>
      </table>
    </td>
  </tr>
  <tr>${td(img('bottom', ' '), ' colspan="2"')}</tr>
</table>`;
}

// Baseline of a text line as the browser lays it out (Figma "normal" line height for Poppins).
function baseline(font, lineHeight) {
  const d = document.createElement('div');
  d.style.cssText = `position:absolute; visibility:hidden; font:${font}; line-height:${lineHeight};`;
  d.innerHTML = 'Hg<span style="display:inline-block; width:0; height:0;"></span>';
  document.body.appendChild(d);
  const b = d.lastChild.offsetTop; d.remove(); return b;
}
function wrap(x, text, width) {
  const lines = []; let line = '';
  for (const word of text.split(' ')) {
    const t = line ? line + ' ' + word : word;
    if (x.measureText(t).width > width && line) { lines.push(line); line = word; } else line = t;
  }
  return lines.concat(line);
}

// Full 700×200 render at 2x, reassembled from the shared decoration pieces plus this person's content.
function renderFull(p) {
  const a = st.assets;
  const c = document.createElement('canvas'); c.width = W * S; c.height = H * S;
  const x = c.getContext('2d'); x.scale(S, S); x.imageSmoothingQuality = 'high';
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H); // card area behind the text
  x.drawImage(a.topLeft, 0, 0, 297, 104);
  x.drawImage(a.topRight, 403, 0, 297, 104);
  x.drawImage(a.photoBg, 297, 0, 106, 200);
  x.drawImage(a.left, 0, 104, 26, 96);
  x.drawImage(a.midA, 262, 104, 35, 50);
  x.drawImage(a.midD, 403, 104, 89, 96);
  x.drawImage(a.right, 656, 104, 44, 96);

  // photo: round cut-outs (with their own white ring) are placed as is, other photos are cropped with a 2.5px white ring
  const ph = st.photo || a.defaultPhoto;
  if (st.photo && !st.photoIsCutout) {
    const zoom = +f.zoom.value, dx = +f.dx.value, dy = +f.dy.value, d = 101;
    const s = Math.min(ph.naturalWidth, ph.naturalHeight) / zoom;
    const sx = Math.max(0, Math.min((ph.naturalWidth - s) / 2 - dx / 100 * s, ph.naturalWidth - s));
    const sy = Math.max(0, Math.min((ph.naturalHeight - s) / 2 - dy / 100 * s, ph.naturalHeight - s));
    x.fillStyle = '#ffffff'; x.beginPath(); x.arc(350, 72, 53, 0, Math.PI * 2); x.fill();
    x.save(); x.beginPath(); x.arc(350, 72, d / 2, 0, Math.PI * 2); x.clip();
    x.drawImage(ph, sx, sy, s, s, 297 + 2.5, 19 + 2.5, d, d); x.restore();
  } else {
    x.drawImage(ph, 297, 19, 106, 106);
  }

  // text (positions from Figma node 2738:2)
  const text = (str, font, color, left, top, lh) => { x.font = font; x.fillStyle = color; x.textBaseline = 'alphabetic'; x.fillText(str, left, top + baseline(font, lh)); };
  text(p.name, '700 24px Poppins', '#16391c', 28, 104, 'normal');
  text(p.role, '500 12px Poppins', '#4a5a4c', 28, 136, 'normal');
  x.font = '400 8px Poppins';
  wrap(x, 'Manpho Stambh, 1st Main Rd, opposite Shri Vasupujya Swami Jain Temple, Hebbal, Bengaluru, Karnataka 560032', 262)
    .forEach((l, i) => text(l, '400 8px Poppins', '#4a5a4c', 28, 160 + i * 11.5, '11.5px'));
  [[a.iconPhone, p.phone, 106], [a.iconEmail, p.email, 126], [a.iconWeb, 'arthproject.com', 146]].forEach(([icon, t, top]) => {
    x.drawImage(icon, 492, top, 16, 16);
    text(t, '400 10px Poppins', '#16391c', 514, top + 1, 'normal');
  });
  // social icons at their Figma sizes and offsets inside the 492,170 group
  x.drawImage(a.ig, 492, 170, 16, 16);
  x.drawImage(a.fb, 492 + 22, 170 - 0.4, 16.8, 16.8);
  x.drawImage(a.li, 492 + 42.7, 170 - 2.1, 20.2, 20.2);
  x.drawImage(a.wa, 492 + 63.35, 170 - 3.85, 23.7, 23.7);
  return c;
}

function cut(full, key) {
  const r = PIECES[key], c = document.createElement('canvas');
  c.width = r.w * S; c.height = r.h * S;
  c.getContext('2d').drawImage(full, r.x * S, r.y * S, r.w * S, r.h * S, 0, 0, c.width, c.height);
  return c;
}

const person = () => ({ name: f.name.value.trim(), role: f.role.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim() });
function measure(text, font) { const x = document.createElement('canvas').getContext('2d'); x.font = font; return x.measureText(text).width; }

function update() {
  const p = person();
  st.full = renderFull(p);
  st.urls = Object.fromEntries(Object.keys(PIECES).map(k => [k, cut(st.full, k).toDataURL('image/png')]));
  st.version = hash(ownPieces().map(k => st.urls[k]).join(''));
  document.getElementById('preview').innerHTML = signatureHtml(p, k => st.urls[k]);
  document.getElementById('folder').textContent = `assets/email/people/${slug(p.name)}/`;
  const w = [];
  if (measure(p.name, '700 24px Poppins') > 260) w.push('The name runs into the decoration on the right; consider a shorter form.');
  if (measure(p.role, '500 12px Poppins') > 260) w.push('The role is wider than its space.');
  if (measure(p.email, '400 10px Poppins') > 170) w.push('The email address is wider than its space and will be cut off.');
  document.getElementById('warn').textContent = w.join(' ');
}

const status = t => { document.getElementById('status').textContent = t; };
const download = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
const blobOf = c => new Promise(ok => c.toBlob(ok, 'image/png'));
const htmlDoc = p => `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n<title>${esc(p.name)} Signature</title>\n</head>\n<body>\n<!-- Arth email signature (Figma node 2738:2, 700×200). Generated by generator.html. -->\n${signatureHtml(p)}\n</body>\n</html>\n`;

document.getElementById('dlImages').onclick = async () => {
  for (const k of ownPieces()) { download(await blobOf(cut(st.full, k)), pieceFile(k)); await new Promise(r => setTimeout(r, 300)); }
  status(`Downloaded ${ownPieces().map(pieceFile).join(', ')}. Upload them to assets/email/people/${slug(person().name)}/ on GitHub.`);
};
// Publish this person's pieces to the repo as one commit via the GitHub API, then wait for GitHub Pages.
const REPO = 'MGPLOrg/email-signature', BRANCH = 'main';
async function gh(token, path, opts = {}) {
  const r = await fetch(`https://api.github.com/repos/${REPO}/${path}`, {
    ...opts,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', ...(opts.body ? { 'Content-Type': 'application/json' } : {}) },
  });
  if (!r.ok) {
    const why = r.status === 401 ? 'the token is invalid or expired' : r.status === 403 || r.status === 404 ? 'the token has no write access to ' + REPO : (await r.json().catch(() => ({}))).message || r.statusText;
    throw new Error(`GitHub said ${r.status}: ${why}`);
  }
  return r.json();
}
const toBase64 = blob => new Promise(ok => { const fr = new FileReader(); fr.onload = () => ok(fr.result.split(',')[1]); fr.readAsDataURL(blob); });

// Upload this person's pieces as one commit, then wait until GitHub Pages serves them.
async function upload(token, p, full) {
  status('Uploading the new images to GitHub…');
  const dir = `assets/email/people/${slug(p.name)}`, tree = [];
  const head = await gh(token, `git/ref/heads/${BRANCH}`);
  const base = await gh(token, `git/commits/${head.object.sha}`);
  for (const k of ownPieces()) {
    const b = await gh(token, 'git/blobs', { method: 'POST', body: JSON.stringify({ content: await toBase64(await blobOf(cut(full, k))), encoding: 'base64' }) });
    tree.push({ path: `${dir}/${pieceFile(k)}`, mode: '100644', type: 'blob', sha: b.sha });
  }
  const t = await gh(token, 'git/trees', { method: 'POST', body: JSON.stringify({ base_tree: base.tree.sha, tree }) });
  const c = await gh(token, 'git/commits', { method: 'POST', body: JSON.stringify({ message: `Add email signature images for ${p.name}`, tree: t.sha, parents: [head.object.sha] }) });
  await gh(token, `git/refs/heads/${BRANCH}`, { method: 'PATCH', body: JSON.stringify({ sha: c.sha }) });
  for (let i = 0; i < 36; i++) {
    status(`Uploaded. Waiting for the images to go online… (${i * 5}s, usually under a minute)`);
    if (!(await stalePieces(p, full)).length) return;
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error('GitHub Pages is slow to publish; wait a minute and click Copy signature again');
}
// Opened through the Arth Apps Script helper: it uploads without a token and can set the Gmail signature.
const helper = window.google && google.script && google.script.run;
const server = (fn, ...args) => new Promise((ok, err) => google.script.run.withSuccessHandler(ok).withFailureHandler(e => err(new Error(e.message || e)))[fn](...args));

// Make sure GitHub serves exactly the pieces on screen, uploading them if needed.
async function ensureOnline(p, full) {
  status('Checking that GitHub has the latest images…');
  if (!(await stalePieces(p, full)).length) return;
  if (helper) {
    status('Uploading the new images and waiting for them to go online… (usually under a minute)');
    const files = {};
    for (const k of ownPieces()) files[pieceFile(k)] = await toBase64(await blobOf(cut(full, k)));
    return server('upload', p.name, slug(p.name), files);
  }
  const token = tokenValue();
  if (!token) throw new Error('the photo or details changed, so the new images must be uploaded first. Paste a GitHub token above (or upload the downloaded images by hand and wait a minute)');
  await upload(token, p, full);
}
const pub = document.getElementById('pub');
const tokenValue = () => {
  const t = pub.token.value.trim();
  try { pub.remember.checked && t ? localStorage.setItem('arthToken', t) : localStorage.removeItem('arthToken'); } catch (e) {}
  return t;
};
try { const t = localStorage.getItem('arthToken'); if (t) { pub.token.value = t; pub.remember.checked = true; } } catch (e) {}
pub.remember.onchange = tokenValue;

const busy = on => ['copy', 'publish', 'setGmail'].forEach(id => { document.getElementById(id).disabled = on; });
document.getElementById('publish').onclick = async () => {
  const p = person(); busy(true);
  try { await ensureOnline(p, st.full); status(`The images for ${p.name} are online. Click "Copy signature".`); }
  catch (e) { status(`Not uploaded: ${e.message}.`); }
  finally { busy(false); }
};
document.getElementById('dlHtml').onclick = () => { const p = person(); download(new Blob([htmlDoc(p)], { type: 'text/html' }), `signature-${slug(p.name)}.html`); };
// The copied signature links to the images on GitHub, so check GitHub already serves what the preview shows.
async function stalePieces(p, full) {
  const stale = [];
  for (const k of ownPieces()) {
    const mine = cut(full, k), w = mine.width, h = mine.height;
    const theirs = await load(`${BASE}people/${slug(p.name)}/${pieceFile(k)}?check=${Date.now()}`).catch(() => null);
    if (!theirs) { stale.push(k); continue; }
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); x.drawImage(theirs, 0, 0, w, h);
    const a = mine.getContext('2d').getImageData(0, 0, w, h).data, b = x.getImageData(0, 0, w, h).data;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff += Math.abs(a[i] - b[i]);
    if (diff / a.length > 3) stale.push(k); // small differences are font smoothing between computers
  }
  return stale;
}
document.getElementById('copy').onclick = async () => {
  // Snapshot what is on screen now, so edits made while uploading do not mix in.
  const p = person(), full = st.full, html = signatureHtml(p);
  busy(true);
  // Clipboard data is given as promises so the browser keeps the click's permission while the upload runs.
  const ready = ensureOnline(p, full);
  const blob = type => ready.then(() => new Blob([html], { type }));
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'text/html': blob('text/html'), 'text/plain': blob('text/plain') })]);
    status(`Signature for ${p.name} copied, exactly as in the preview. Paste it into Gmail → Settings → Signature and save.`);
  } catch (e) {
    const failed = await ready.then(() => null, e => e);
    if (failed) status(`Not copied: ${failed.message}.`);
    else status('The images are online now, but the browser did not allow copying after the wait. Click "Copy signature" once more; it copies straight away.');
  } finally { busy(false); }
};
if (helper) {
  pub.hidden = true;
  document.querySelectorAll('.token-step').forEach(li => { li.hidden = true; });
  const btn = document.getElementById('setGmail');
  btn.hidden = false;
  server('me').then(email => { st.me = email; btn.textContent = `Set as Gmail signature for ${email}`; }).catch(() => {});
  btn.onclick = async () => {
    const p = person(), full = st.full, html = signatureHtml(p);
    if (st.me && p.email && p.email.toLowerCase() !== st.me.toLowerCase() &&
        !confirm(`You are signed in as ${st.me}, so this replaces YOUR Gmail signature with ${p.name}'s. For someone else, use "Copy signature" instead. Continue?`)) return;
    busy(true);
    try {
      await ensureOnline(p, full);
      status('Setting the Gmail signature…');
      const email = await server('setMySignature', html);
      status(`Done: ${email} now uses this signature. In Gmail, reload and check Settings → Signature → Signature defaults.`);
    } catch (e) { status(`Not set: ${e.message}.`); }
    finally { busy(false); }
  };
}
document.getElementById('darkToggle').onchange = e => document.getElementById('preview').classList.toggle('dark', e.target.checked);

f.addEventListener('input', update);
function usePhoto(i) {
  const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight;
  const x = c.getContext('2d'); x.drawImage(i, 0, 0);
  st.photoIsCutout = x.getImageData(1, 1, 1, 1).data[3] === 0; // transparent corner = already a round cut-out
  st.photo = i; f.zoom.value = 1; f.dx.value = 0; f.dy.value = 0; update();
}
f.photo.addEventListener('change', () => {
  const file = f.photo.files[0]; if (!file) return;
  f.photoPick.value = '';
  const i = new Image();
  i.onload = () => usePhoto(i);
  i.src = URL.createObjectURL(file);
});
f.photoPick.addEventListener('change', async () => {
  if (!f.photoPick.value) return;
  f.photo.value = '';
  try { usePhoto(await load(f.photoPick.value)); }
  catch (e) { status('Could not load that photo from GitHub. Try again in a moment.'); }
});
// Photos uploaded to assets/photos/ on GitHub show up here straight away (the folder listing is public, no token needed).
(async () => {
  const sel = f.photoPick;
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/contents/assets/photos?ref=${BRANCH}`, { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    const photos = (await r.json()).filter(x => x.type === 'file' && /\.(png|jpe?g|webp)$/i.test(x.name));
    const label = n => n.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    sel.innerHTML = '<option value="">Choose a photo…</option>' +
      photos.map(x => `<option value="${esc(x.download_url)}">${esc(label(x.name))}</option>`).join('');
  } catch (e) {
    sel.innerHTML = '<option value="">Could not list the photos (reload to try again)</option>';
  }
})();

(async () => {
  try {
    await Promise.all(['400', '500', '700'].map(w => document.fonts.load(`${w} 24px Poppins`)));
    const files = { topLeft: 'sig-top-left.png', topRight: 'sig-top-right.png', photoBg: 'sig-photo-bg.png', left: 'sig-left.png', midA: 'sig-mid-a.png', midD: 'sig-mid-d.png', right: 'sig-right.png',
      iconPhone: 'icon-phone.png', iconEmail: 'icon-email.png', iconWeb: 'icon-website.png', ig: 'social-instagram.png', fb: 'social-facebook.png', li: 'social-linkedin.png', wa: 'social-whatsapp.png' };
    const entries = await Promise.all(Object.entries(files).map(async ([k, v]) => [k, await load(BASE + v)]));
    st.assets = Object.fromEntries(entries);
    st.assets.defaultPhoto = await load('https://mgplorg.github.io/email-signature/assets/images/profile-photo.png');
    update();
  } catch (e) { status('Could not load the shared images from GitHub (' + e.message + '). Check your connection.'); }
})();
