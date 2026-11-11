import buildId from './build-id.mjs';

const protocol = 'bt-sentence-cat/1';
const locales = new Set(['es-ES', 'de-DE', 'da-DK', 'fr-FR', 'it-IT']);
const tokens = text => text.match(/[\p{L}\p{N}]+(?:[’'\-][\p{L}\p{N}]+)*/gu) ?? [];

if (window.parent !== window) {
  document.getElementById('play').hidden = true;
  const message = document.querySelector('#preview p');
  message.textContent = 'Open Sentence Cat through the staging launcher.';
  let origin;
  try { origin = new URL(document.referrer).origin; } catch { /* Unapproved embed. */ }
  const allowed = /^https:\/\/(?:[a-z0-9-]+\.)?bt-vocabulary-platform-staging\.pages\.dev$/.test(origin);
  if (allowed) {
    let sessionId;
    let sequence = 0;
    let pending;
    const send = (type, data = {}) => window.parent.postMessage({ protocol, sessionId, type, ...data }, origin);
    function settle() {
      if (!pending) return;
      clearTimeout(pending.timer);
      pending.resolve();
      pending = null;
    }
    function receive(event) {
      const data = event.data;
      if (event.source !== window.parent || event.origin !== origin || data?.protocol !== protocol) return;
      if (!sessionId && data.type === 'INIT' && /^[\w-]{24,64}$/.test(data.sessionId)) {
        const { pairs, language } = data.set ?? {};
        if (!locales.has(language) || !Array.isArray(pairs) || pairs.length < 2 || pairs.length > 100 ||
            typeof data.soundOn !== 'boolean' || pairs.some(pair => !Array.isArray(pair) || pair.length !== 2 ||
            pair.some(text => typeof text !== 'string' || !text.trim() || text.length > 1000) || !tokens(pair[1]).length)) return;
        sessionId = data.sessionId;
        selectedLocale = language;
        const pool = [...new Set(pairs.flatMap(pair => tokens(pair[1])))];
        examples = pairs.map(([en, es]) => {
          const words = tokens(es);
          return { en, es, words, distractors: pool.filter(word => !words.includes(word)) };
        });
        shellSession = {
          speak(text) {
            settle();
            return new Promise(resolve => {
              const id = ++sequence;
              const timer = setTimeout(settle, Math.min(20000, Math.max(5000, text.length * 160)));
              pending = { id, timer, resolve };
              send('SPEAK', { id, text });
            });
          },
          cancel() { settle(); send('CANCEL'); },
          sound(soundOn) { if (!soundOn) settle(); send('SOUND', { soundOn }); },
          menu() { settle(); send('MENU'); },
        };
        setSound(data.soundOn);
        document.getElementById('preview').hidden = true;
        document.querySelector('main').hidden = false;
        restart();
        document.getElementById('pause').focus();
        send('STARTED');
      } else if (sessionId && data.sessionId === sessionId && data.type === 'PAUSE') {
        lifecycle.pause();
      } else if (sessionId && data.sessionId === sessionId && data.type === 'SPOKEN' && pending?.id === data.id) {
        settle();
      }
    }
    window.addEventListener('message', receive);
    window.addEventListener('pagehide', () => {
      window.removeEventListener('message', receive);
      settle();
    }, { once: true });
    send('READY', { buildId });
  }
}
