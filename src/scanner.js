// Camera barcode scanning. Uses the browser's built-in BarcodeDetector where
// available (Chrome on Android, desktop Chrome) and falls back to ZXing,
// loaded only when needed (iPhone Safari).

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src; s.onload = resolve; s.onerror = () => reject(new Error("Couldn't load the barcode reader."));
    document.head.appendChild(s);
  });
}

export async function startScanner(video, onCode) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("This browser can't use the camera. Type the barcode instead.");
  }
  let stopped = false;
  let stream;

  const native = "BarcodeDetector" in window &&
    (await window.BarcodeDetector.getSupportedFormats?.().then((f) => FORMATS.some((x) => f.includes(x))).catch(() => false));

  if (native) {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
    video.srcObject = stream;
    await video.play();
    const detector = new window.BarcodeDetector({ formats: FORMATS });
    const tick = async () => {
      if (stopped) return;
      try {
        const codes = await detector.detect(video);
        if (codes.length) { onCode(codes[0].rawValue); return; }
      } catch { /* frame not ready */ }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => { stopped = true; stream.getTracks().forEach((t) => t.stop()); };
  }

  if (!window.ZXingBrowser) await loadScript("vendor/zxing-browser.min.js");
  const reader = new window.ZXingBrowser.BrowserMultiFormatOneDReader();
  const controls = await reader.decodeFromConstraints(
    { video: { facingMode: { ideal: "environment" } }, audio: false },
    video,
    (result) => { if (result && !stopped) { stopped = true; onCode(result.getText()); } },
  );
  return () => { stopped = true; controls.stop(); };
}
