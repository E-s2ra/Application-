/**
 * Content Protection Layer
 *
 * Enforces DRM-like protections across platforms:
 *  - Web:    CSS/JS disablers for right-click, keyboard shortcuts, drag,
 *            copy, print, DevTools open detection, and video controls.
 *  - Native: Screen-recording & screenshot detection via expo-screen-capture.
 *
 * Call `enableContentProtection()` when the watch screen mounts and
 * `disableContentProtection()` when it unmounts.
 */

import { Platform } from 'react-native';

// ─── Types ───────────────────────────────────────────────────────────────────

type Cleanup = () => void;

// ─── Web Protection ──────────────────────────────────────────────────────────

function enableWebProtection(): Cleanup {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const cleanups: Array<() => void> = [];

  // 1. Block right-click context menu
  const onContextMenu = (e: MouseEvent) => e.preventDefault();
  document.addEventListener('contextmenu', onContextMenu);
  cleanups.push(() => document.removeEventListener('contextmenu', onContextMenu));

  // 2. Block save/print/devtools keyboard shortcuts
  const BLOCKED_KEYS = new Set([
    'F12',        // DevTools
    'PrintScreen', // screenshot
    'Print',
  ]);
  const BLOCKED_CTRL_KEYS = new Set([
    's',  // Save
    'u',  // View Source
    'p',  // Print
    'a',  // Select All
    'c',  // Copy
    'x',  // Cut
    'j',  // DevTools (Chrome)
    'i',  // DevTools (Chrome)
    'shift+i',
  ]);
  const onKeyDown = (e: KeyboardEvent) => {
    if (BLOCKED_KEYS.has(e.key)) {
      e.preventDefault();
      return;
    }
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && BLOCKED_CTRL_KEYS.has(e.key.toLowerCase())) {
      e.preventDefault();
    }
    // Ctrl+Shift+I / Ctrl+Shift+J (DevTools)
    if (ctrl && e.shiftKey && (e.key === 'I' || e.key === 'J')) {
      e.preventDefault();
    }
  };
  document.addEventListener('keydown', onKeyDown, true);
  cleanups.push(() => document.removeEventListener('keydown', onKeyDown, true));

  // 3. Disable text selection & drag on the entire document during watch
  const style = document.createElement('style');
  style.id = '_aniflix_drm';
  style.textContent = `
    /* Disable selection and drag globally on the watch page */
    body {
      -webkit-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
      user-select: none !important;
    }
    /* Hide native video controls and prevent download button */
    video {
      pointer-events: none;
      -webkit-touch-callout: none !important;
      /* Chrome-specific: hides the download button */
      &::-webkit-media-controls-download-button { display: none !important; }
      &::-webkit-media-controls-enclosure { overflow: hidden !important; }
      /* Remove controls to stop browser "Save video as" */
      controlsList: nofullscreen nodownload noremoteplayback;
    }
  `;
  document.head.appendChild(style);
  cleanups.push(() => {
    const el = document.getElementById('_aniflix_drm');
    if (el) el.remove();
  });

  // 4. Patch all <video> elements: remove controls, set controlsList
  const patchVideos = () => {
    document.querySelectorAll('video').forEach((v) => {
      v.removeAttribute('controls');
      v.setAttribute('controlsList', 'nodownload nofullscreen noremoteplayback');
      v.setAttribute('disablePictureInPicture', 'true');
      v.setAttribute('disableRemotePlayback', 'true');
      (v as any).disableRemotePlayback = true;
    });
  };
  // Run immediately and observe future video insertions
  patchVideos();
  const observer = new MutationObserver(patchVideos);
  observer.observe(document.body, { childList: true, subtree: true });
  cleanups.push(() => observer.disconnect());

  // 5. Block copy event (clipboard)
  const onCopy = (e: ClipboardEvent) => e.preventDefault();
  document.addEventListener('copy', onCopy);
  cleanups.push(() => document.removeEventListener('copy', onCopy));

  // 6. Block drag-start (prevents drag-to-save on images/video)
  const onDragStart = (e: DragEvent) => e.preventDefault();
  document.addEventListener('dragstart', onDragStart);
  cleanups.push(() => document.removeEventListener('dragstart', onDragStart));

  // 7. Detect DevTools open via timing trick — pause video if opened
  let devToolsOpen = false;
  const devToolsCheck = setInterval(() => {
    const before = Date.now();
    // eslint-disable-next-line no-debugger
    debugger; // pauses if DevTools is open; nearly instant otherwise
    const delta = Date.now() - before;
    if (delta > 100 && !devToolsOpen) {
      devToolsOpen = true;
      // Pause all videos when devtools is detected
      document.querySelectorAll('video').forEach((v) => v.pause());
    } else if (delta <= 100) {
      devToolsOpen = false;
    }
  }, 1000);
  cleanups.push(() => clearInterval(devToolsCheck));

  // 8. Prevent print (Ctrl+P / window.print)
  const onBeforePrint = () => {
    document.querySelectorAll('video').forEach((v) => v.pause());
  };
  window.addEventListener('beforeprint', onBeforePrint);
  cleanups.push(() => window.removeEventListener('beforeprint', onBeforePrint));

  return () => cleanups.forEach((fn) => fn());
}

// ─── Native Protection (expo-screen-capture) ─────────────────────────────────

async function enableNativeProtection(): Promise<Cleanup> {
  try {
    // Dynamically import to avoid crashing on web where it's unavailable
    const ScreenCapture = await import('expo-screen-capture');

    // Prevent screenshots and screen recordings
    await ScreenCapture.preventScreenCaptureAsync();

    // Listen for recording attempts and show a warning overlay
    const subscription = ScreenCapture.addScreenshotListener(() => {
      console.warn('[AniFlix DRM] Screenshot attempt detected.');
      // The OS blurs/blacks out the capture automatically when preventScreenCapture is active.
    });

    return () => {
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
      subscription?.remove();
    };
  } catch (e) {
    // expo-screen-capture may not be installed — fail gracefully
    console.warn('[AniFlix DRM] Screen capture protection unavailable:', e);
    return () => {};
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

let _activeCleanup: Cleanup | null = null;

/**
 * Call on watch screen mount.
 * Applies all available content protections for the current platform.
 */
export async function enableContentProtection(): Promise<void> {
  // Ensure no double-init
  if (_activeCleanup) _activeCleanup();

  if (Platform.OS === 'web') {
    _activeCleanup = enableWebProtection();
  } else {
    _activeCleanup = await enableNativeProtection();
  }
}

/**
 * Call on watch screen unmount.
 * Removes all protections so other screens work normally.
 */
export function disableContentProtection(): void {
  if (_activeCleanup) {
    _activeCleanup();
    _activeCleanup = null;
  }
}
