// Passwort zurücksetzen für Badgehunter. Keine Fremd-Skripte, kein Speicher, kein Tracking.
// Der Token steht hinter „#“ (erreicht nie den Webserver) und wird erst beim Absenden eingelöst,
// damit Link-Scanner von Mail-Programmen ihn nicht verbrauchen.
(() => {
  'use strict';
  const API = 'https://npjojzfxxqdizrkmrwqa.supabase.co/auth/v1';
  const KEY = 'sb_publishable_WJp3R3gTCNmCmULsXQQ0Tg_a9GTPhak';
  const $ = (id) => document.getElementById(id);
  const intro = $('intro'), form = $('form'), msg = $('msg'), save = $('save');
  const EXPIRED = 'Dieser Link ist abgelaufen oder wurde schon benutzt. Fordere unter „Passwort vergessen“ in der App einen neuen Link an.';
  let tokenHash = '', session = '';

  function show(text, error) { msg.textContent = text; msg.className = error ? 'err' : ''; msg.hidden = false; }

  function readLink() {
    const value = new URLSearchParams(location.hash.slice(1)).get('token_hash');
    if (value) {
      tokenHash = value; session = '';
      history.replaceState(null, '', location.pathname);
      intro.textContent = 'Wähle ein neues Passwort mit mindestens 8 Zeichen.';
      form.hidden = false; msg.hidden = true;
    } else if (!tokenHash) {
      intro.textContent = 'Bitte öffne diese Seite über den Link in Deiner E-Mail.';
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
    if (!e.status) return 'Keine Verbindung. Bitte versuche es noch einmal.';
    if (e.code === 'same_password') return 'Das neue Passwort muss sich vom bisherigen unterscheiden.';
    if (e.code === 'weak_password') return 'Das Passwort ist zu schwach. Bitte wähle ein längeres.';
    if (e.code === 'insufficient_aal') return 'Dein Konto ist mit Zwei-Faktor-Anmeldung geschützt. Bitte wende Dich an den Badgehunter-Support.';
    if (e.status === 429) return 'Zu viele Versuche. Bitte warte einen Moment.';
    if (e.status >= 500) return 'Der Server antwortet gerade nicht. Bitte versuche es gleich noch einmal.';
    return EXPIRED;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const a = $('pw1').value, b = $('pw2').value;
    if (a.length < 8) return show('Bitte verwende mindestens 8 Zeichen.', true);
    if (a !== b) return show('Die beiden Passwörter stimmen nicht überein.', true);
    save.disabled = true; save.textContent = 'Wird gespeichert …';
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
      show('Fertig! Dein neues Passwort ist gespeichert. Du kannst Dich jetzt damit anmelden.', false);
    } catch (e) {
      show(explain(e), true);
    } finally {
      save.disabled = false; save.textContent = 'Passwort speichern';
    }
  });

  window.addEventListener('hashchange', readLink);
  readLink();
})();
