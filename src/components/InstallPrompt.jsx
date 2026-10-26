import React, { useEffect, useState } from 'react';
import { FaDownload, FaShareFromSquare, FaXmark } from 'react-icons/fa6';

const DISMISS_KEY = 'ridematch:installPromptDismissed';

// Chrome/Edge/Samsung Internet fire this once, often before React has drawn
// anything, so it is captured here at module level and used later.
let deferredPrompt = null;
const listeners = new Set();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    listeners.forEach((fn) => fn());
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    listeners.forEach((fn) => fn());
  });
}

function isInstalled() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function isIos() {
  const ua = window.navigator.userAgent;
  // iPads in desktop mode report as a Mac, but have a touch screen
  return /iphone|ipad|ipod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

function wasDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

// A small card that invites people to install the app.
//  - Android / desktop Chrome: an "Install app" button that opens the real install dialog.
//  - iPhone / iPad: iOS has no install button for websites, so it shows the steps.
//  - Hidden when the app is already installed, or after the person closes it.
export default function InstallPrompt() {
  const [, force] = useState(0);
  const [dismissed, setDismissed] = useState(wasDismissed());

  useEffect(() => {
    const update = () => force((n) => n + 1);
    listeners.add(update);
    return () => listeners.delete(update);
  }, []);

  if (dismissed || isInstalled()) return null;

  const ios = isIos();
  if (!ios && !deferredPrompt) return null; // browser can't install it (yet)

  const close = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // storage unavailable: it just comes back next visit
    }
    setDismissed(true);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    force((n) => n + 1);
  };

  return (
    <div className="relative w-full rounded-2xl bg-white border border-[#0A7B44]/20 shadow-sm p-4 text-left">
      <button
        onClick={close}
        aria-label="Dismiss"
        className="absolute right-3 top-3 p-1 text-gray-400 hover:text-gray-600"
      >
        <FaXmark />
      </button>

      <p className="text-sm font-semibold text-gray-900 pr-6">Install RideMatch SA</p>
      <p className="text-xs text-gray-500 mt-1">
        Add the app to your home screen to open it in one tap, like any other app.
      </p>

      {ios ? (
        <p className="mt-3 text-xs text-gray-700 flex flex-wrap items-center gap-1">
          Tap <FaShareFromSquare className="text-[#0A7B44]" /> <span className="font-semibold">Share</span>
          in Safari, then <span className="font-semibold">Add to Home Screen</span>.
        </p>
      ) : (
        <button
          onClick={install}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold text-white bg-[#0A7B44] hover:bg-[#065F33]"
        >
          <FaDownload /> Install app
        </button>
      )}
    </div>
  );
}