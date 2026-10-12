/* PWA integration only. Does not start exams, open IndexedDB, or authorize teachers. */
(() => {
  'use strict';
  const script = document.currentScript;
  const root = new URL('../', script.src);
  const notice = document.querySelector('aside[role="note"]');
  function status(state, detail) {
    document.documentElement.dataset.offlineStatus = state;
    if (notice) notice.title = detail;
    window.dispatchEvent(new CustomEvent('calculator-pwa-status', {detail: {state, message: detail}}));
  }
  function verify(worker) {
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => { channel.port1.close(); reject(new Error('Cache verification timed out')); }, 15000);
      channel.port1.onmessage = event => {
        clearTimeout(timer);
        channel.port1.close();
        if (event.data && event.data.type === 'CACHE_STATUS' && event.data.ready === true) resolve(event.data);
        else reject(new Error('Required offline assets are unavailable or invalid'));
      };
      worker.postMessage({type: 'VERIFY_CACHE'}, [channel.port2]);
    });
  }
  if (!window.isSecureContext || !['https:', 'http:'].includes(location.protocol) || !('serviceWorker' in navigator)) {
    status('unsupported', 'Offline installation requires a supported HTTPS origin (localhost is for testing). Exam access remains disabled.');
    return;
  }
  status('checking', 'Checking offline application assets. Exam access remains disabled.');
  let checking = false;
  async function check() {
    if (checking) return;
    const worker = navigator.serviceWorker.controller;
    if (!worker) { status('checking', 'Waiting for service worker control; offline readiness is not yet verified.'); return; }
    checking = true;
    try {
      const result = await verify(worker);
      status('ready', 'Offline application assets verified: ' + result.release + '. TEST ONLY; no exam enforcement.');
    } catch (error) {
      status('unavailable', error.message + '. Exam access remains disabled.');
    } finally { checking = false; }
  }
  navigator.serviceWorker.addEventListener('controllerchange', check);
  window.addEventListener('pageshow', check);
  window.addEventListener('online', check);
  window.addEventListener('offline', check);
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register(new URL('service-worker.js', root), {scope: root.pathname, updateViaCache: 'none'});
      function waiting() {
        if (registration.waiting) {
          document.documentElement.dataset.pwaUpdate = 'waiting';
          window.dispatchEvent(new CustomEvent('calculator-pwa-update', {detail: {state: 'waiting'}}));
        }
      }
      waiting();
      registration.addEventListener('updatefound', () => {
        if (registration.installing) registration.installing.addEventListener('statechange', waiting);
      });
      await navigator.serviceWorker.ready;
      await check();
    } catch (error) { status('unavailable', 'Offline registration failed: ' + error.message); }
  }, {once: true});
})();
