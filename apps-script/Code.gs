// Arth email signature helper (Google Apps Script web app, open only to arthproject.com accounts).
// It shows the generator from GitHub Pages and does the two things that need a login:
// uploading a person's images to GitHub (with a token kept in the script properties) and
// setting the signed-in person's Gmail signature. Setup steps: apps-script/README.md.

const REPO = 'MGPLOrg/email-signature', BRANCH = 'main';
const PAGES = 'https://mgplorg.github.io/email-signature/';
const PIECE_FILES = ['top.png', 'left.png', 'phone-row.png', 'email-row.png'];

function doGet() {
  // Always the latest generator from GitHub Pages, so there is only one copy of the page to maintain.
  const html = UrlFetchApp.fetch(PAGES + 'generator.html?t=' + Date.now()).getContentText();
  return HtmlService.createHtmlOutput(html)
    .setTitle('Arth Email Signatures')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function me() {
  return Session.getActiveUser().getEmail();
}

function github_(path, method, body) {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('the helper has no GitHub token yet; the admin must add GITHUB_TOKEN in Project Settings → Script properties');
  const opts = {
    method: method || 'get',
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    muteHttpExceptions: true,
  };
  if (body) { opts.contentType = 'application/json'; opts.payload = JSON.stringify(body); }
  const r = UrlFetchApp.fetch('https://api.github.com/repos/' + REPO + '/' + path, opts);
  const code = r.getResponseCode();
  if (code === 401) throw new Error('GitHub said 401: the helper\'s token is invalid or expired; the admin must replace GITHUB_TOKEN');
  if (code === 403 || code === 404) throw new Error('GitHub said ' + code + ': the helper\'s token has no write access to ' + REPO);
  if (code >= 300) throw new Error('GitHub said ' + code + ': ' + r.getContentText().slice(0, 200));
  return JSON.parse(r.getContentText());
}

// Uploads one person's 4 images as one commit, then waits until GitHub Pages serves exactly those bytes.
// files: { 'top.png': base64, 'left.png': base64, 'phone-row.png': base64, 'email-row.png': base64 }
function upload(name, slug, files) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) throw new Error('invalid name for the folder: ' + slug);
  const keys = Object.keys(files).sort();
  if (keys.join() !== PIECE_FILES.slice().sort().join()) throw new Error('unexpected files: ' + keys.join(', '));
  const bytes = {};
  keys.forEach(k => {
    if (files[k].indexOf('iVBORw0KGgo') !== 0) throw new Error(k + ' is not a PNG image');
    bytes[k] = Utilities.base64Decode(files[k]);
    if (bytes[k].length > 2 * 1024 * 1024) throw new Error(k + ' is too large');
  });

  const dir = 'assets/email/people/' + slug + '/';
  const head = github_('git/ref/heads/' + BRANCH);
  const base = github_('git/commits/' + head.object.sha);
  const tree = keys.map(k => ({ path: dir + k, mode: '100644', type: 'blob', sha: github_('git/blobs', 'post', { content: files[k], encoding: 'base64' }).sha }));
  const t = github_('git/trees', 'post', { base_tree: base.tree.sha, tree: tree });
  const c = github_('git/commits', 'post', { message: 'Add email signature images for ' + String(name).slice(0, 80) + ' (by ' + me() + ')', tree: t.sha, parents: [head.object.sha] });
  github_('git/refs/heads/' + BRANCH, 'patch', { sha: c.sha });

  const digest = b => Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, b));
  for (let i = 0; i < 36; i++) {
    const live = keys.every(k => {
      const r = UrlFetchApp.fetch(PAGES + dir + k + '?check=' + Date.now(), { muteHttpExceptions: true });
      return r.getResponseCode() === 200 && digest(r.getContent()) === digest(bytes[k]);
    });
    if (live) return c.sha.slice(0, 7);
    Utilities.sleep(5000);
  }
  throw new Error('the images were uploaded, but GitHub Pages is slow to publish them; try again in a minute');
}

// Sets the Gmail signature of the person who is signed in (never anyone else's).
function setMySignature(html) {
  if (typeof html !== 'string' || html.length > 10000) throw new Error('the signature is too long for Gmail');
  if (/<script|javascript:|\bon\w+\s*=/i.test(html)) throw new Error('the signature contains code');
  const email = me();
  Gmail.Users.Settings.SendAs.update({ signature: html }, 'me', email);
  return email;
}
