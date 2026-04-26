const dom = {
  video: document.getElementById('scanner-video'),
  overlay: document.getElementById('scanner-overlay'),
  startBtn: document.getElementById('start-scan-btn'),
  cancelBtn: document.getElementById('cancel-scan'),
  captureBtn: document.getElementById('capture-btn'),
  processingModal: document.getElementById('processing-modal'),
  processingStatus: document.getElementById('processing-status'),
};

const scannerReady = Boolean(
  dom.video &&
  dom.overlay &&
  dom.startBtn &&
  dom.cancelBtn &&
  dom.captureBtn &&
  dom.processingModal &&
  dom.processingStatus
);

if (!scannerReady) {
  console.warn('Scanner UI not found on this page.');
}

let stream = null;

async function startCamera() {
  if (!scannerReady) return;

  if (!navigator.mediaDevices?.getUserMedia) {
    alert('Camera API is not supported in this browser/context.');
    return;
  }

  try {
    // 1) Force rear camera first (mobile target)
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { exact: 'environment' } },
      audio: false
    });
  } catch (e1) {
    try {
      // 2) If exact fails, use ideal rear camera
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
    } catch (e2) {
      try {
        // 3) Final fallback: any available camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      } catch (innerErr) {
        console.error('Camera access failed:', innerErr);
        const map = {
          NotAllowedError: 'Camera permission denied. Please allow camera access in browser settings.',
          NotFoundError: 'No camera device found.',
          NotReadableError: 'Camera is already in use by another app.',
          OverconstrainedError: 'Requested camera mode is not available on this device.',
          SecurityError: 'Camera requires HTTPS or localhost.'
        };
        alert(map[innerErr.name] || `Could not access camera: ${innerErr.name}`);
        return;
      }
    }
  }

  dom.video.srcObject = stream;
  dom.overlay.classList.remove('hidden');
}

function stopCamera() {
  if (!scannerReady) return;
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  dom.overlay.classList.add('hidden');
}

async function processImage(imageDataUrl) {
  dom.processingModal.classList.remove('hidden');
  dom.processingStatus.textContent = 'Initializing OCR...';

  try {
    const worker = await Tesseract.createWorker('eng');
    dom.processingStatus.textContent = 'Scanning receipt...';
    
    const { data: { text } } = await worker.recognize(imageDataUrl);
    await worker.terminate();

    console.log('OCR Result:', text);
    
    const amount = extractAmount(text);
    
    if (amount) {
      dom.processingStatus.textContent = `Found amount: LKR ${amount}`;
      setTimeout(() => {
        window.location.href = `./expense.html?quick=add-expense&amount=${amount}#expense-form-card`;
      }, 1000);
    } else {
      dom.processingStatus.textContent = 'Could not find amount. Redirecting to manual entry...';
      setTimeout(() => {
        window.location.href = `./expense.html?quick=add-expense#expense-form-card`;
      }, 1500);
    }
  } catch (err) {
    console.error('OCR Error:', err);
    dom.processingStatus.textContent = 'Error processing image.';
    setTimeout(() => {
      dom.processingModal.classList.add('hidden');
    }, 2000);
  }
}

function extractAmount(text) {
  // Regex to find currency-like numbers (e.g., 1,234.56, 123.00, 1500, etc.)
  const priceRegex = /(?:LKR|Rs|[\$€£])?\s*(\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?|\d+\.\d{2}|\d+)/gi;
  
  const lines = text.split('\n');
  let possibleAmounts = [];

  for (const line of lines) {
    const matches = [...line.matchAll(priceRegex)];
    for (const match of matches) {
      let numStr = match[1].replace(/[,\s]/g, '');
      const val = parseFloat(numStr);
      if (!isNaN(val) && val > 0.5 && val < 1000000) {
        possibleAmounts.push(val);
      }
    }
  }

  if (possibleAmounts.length === 0) return null;
  return Math.max(...possibleAmounts);
}

function captureFrame() {
  if (!scannerReady) return;
  if (!dom.video.videoWidth || !dom.video.videoHeight) {
    alert('Camera is not ready yet. Please wait a moment and try again.');
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = dom.video.videoWidth;
  canvas.height = dom.video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(dom.video, 0, 0, canvas.width, canvas.height);

  const imageDataUrl = canvas.toDataURL('image/jpeg');
  stopCamera();
  processImage(imageDataUrl);
}

if (scannerReady) {
  dom.startBtn.addEventListener('click', startCamera);
  dom.cancelBtn.addEventListener('click', stopCamera);
  dom.captureBtn.addEventListener('click', captureFrame);
}
