// Passwort zurücksetzen für Badgehunter. Keine Fremd-Skripte, kein Speicher, kein Tracking.
// Der Token steht hinter „#“ (erreicht nie den Webserver) und wird erst beim Absenden eingelöst,
// damit Link-Scanner von Mail-Programmen ihn nicht verbrauchen.
(() => {
  'use strict';
  const API = 'https://npjojzfxxqdizrkmrwqa.supabase.co/auth/v1';
  const KEY = 'sb_publishable_WJp3R3gTCNmCmULsXQQ0Tg_a9GTPhak';
  const $ = (id) => document.getElementById(id);
  const intro = $('intro'), form = $('form'), msg = $('msg'), save = $('save');
  // Sprache: „lang“ im Link (von der Mail gesetzt), sonst Browsersprache. Deutsch nur bei de-*.
  const hashLang = new URLSearchParams(location.hash.slice(1)).get('lang');
  const EN = hashLang ? hashLang === 'en' : !/^de\b/i.test(navigator.language || 'de');
  const T = EN ? {
    title: 'Set a new password', doc: 'New password – Badgehunter', pw1: 'New password', pw2: 'Repeat password',
    save: 'Save password', saving: 'Saving …', choose: 'Choose a new password with at least 8 characters.',
    open: 'Please open this page using the link in your email.',
    expired: 'This link has expired or has already been used. Request a new link under “Forgot password” in the app.',
    offline: 'No connection. Please try again.', same: 'The new password must be different from your current one.',
    weak: 'This password is too weak. Please choose a longer one.',
    aal: 'Your account is protected with two-factor sign-in. Please contact Badgehunter support.',
    many: 'Too many attempts. Please wait a moment.', server: 'The server is not responding right now. Please try again shortly.',
    short: 'Please use at least 8 characters.', mismatch: 'The two passwords do not match.',
    done: 'Done! Your new password has been saved. You can now sign in with it.',
    imprint: 'Legal notice', privacy: 'Privacy', privacyUrl: 'https://badgehunter.shop/privacy',
  } : {
    title: 'Neues Passwort festlegen', doc: 'Neues Passwort – Badgehunter', pw1: 'Neues Passwort', pw2: 'Passwort wiederholen',
    save: 'Passwort speichern', saving: 'Wird gespeichert …', choose: T.choose,
    open: T.open,
    expired: 'Dieser Link ist abgelaufen oder wurde schon benutzt. Fordere unter „Passwort vergessen“ in der App einen neuen Link an.',
    offline: T.offline, same: T.same,
    weak: T.weak,
    aal: T.aal,
    many: T.many, server: T.server,
    short: T.short, mismatch: T.mismatch,
    done: T.done,
    imprint: 'Impressum', privacy: 'Datenschutz', privacyUrl: 'https://badgehunter.com/datenschutz.html',
  };
  if (EN) {
    document.documentElement.lang = 'en'; document.title = T.doc;
    document.querySelector('h1').textContent = T.title;
    document.querySelector('label[for=pw1]').textContent = T.pw1;
    document.querySelector('label[for=pw2]').textContent = T.pw2;
    save.textContent = T.save;
    const links = document.querySelectorAll('footer a');
    links[0].textContent = T.imprint; links[1].textContent = T.privacy; links[1].href = T.privacyUrl;
  }
  const EXPIRED = T.expired;
  let tokenHash = '', session = '';

  function show(text, error) { msg.textContent = text; msg.className = error ? 'err' : ''; msg.hidden = false; }

  function readLink() {
    const value = new URLSearchParams(location.hash.slice(1)).get('token_hash');
    if (value) {
      tokenHash = value; session = '';
      history.replaceState(null, '', location.pathname);
      intro.textContent = T.choose;
      form.hidden = false; msg.hidden = true;
    } else if (!tokenHash) {
      intro.textContent = T.open;
      form.hidden = true;
    }
  }

  async function call(path, method, body) {
    const headers = { apikey: KEY, 'Content-Type': 'application/json' };
    if (session) headers.Authorization = `Bearer ${session}`;
    const res = await fetch(API + path, { method, headers, body: body && JSON.stringify(body), referrerPolicy: 'no-referrer' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error('auth'), { code: data.error_code || data.code, status: res.status });
    return data;
  }

  function explain(e) {
    if (!e.status) return T.offline;
    if (e.code === 'same_password') return T.same;
    if (e.code === 'weak_password') return T.weak;
    if (e.code === 'insufficient_aal') return T.aal;
    if (e.status === 429) return T.many;
    if (e.status >= 500) return T.server;
    return EXPIRED;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const a = $('pw1').value, b = $('pw2').value;
    if (a.length < 8) return show(T.short, true);
    if (a !== b) return show(T.mismatch, true);
    save.disabled = true; save.textContent = T.saving;
    try {
      if (!session) {
        const result = await call('/verify', 'POST', { type: 'recovery', token_hash: tokenHash });
        if (!result.access_token) throw Object.assign(new Error('auth'), { status: 400 });
        session = result.access_token;
      }
      await call('/user', 'PUT', { password: a });
      await call('/logout?scope=global', 'POST').catch(() => {});
      session = ''; tokenHash = '';
      form.reset(); form.hidden = true; intro.textContent = '';
      show(T.done, false);
    } catch (e) {
      show(explain(e), true);
    } finally {
      save.disabled = false; save.textContent = T.save;
    }
  });

  window.addEventListener('hashchange', readLink);
  readLink();
})();
