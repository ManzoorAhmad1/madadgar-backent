import { createWorker } from 'tesseract.js';
import fs from 'fs';
import Jimp from 'jimp';

let worker;

const getWorker = async () => {
  if (!worker) {
    worker = await createWorker({ logger: m => {} });
    // load/initialize removed warning handled by tesseract; keep for compatibility
    try { await worker.load(); } catch (e) {}
    try { await worker.loadLanguage('eng'); } catch (e) {}
    try { await worker.initialize('eng'); } catch (e) {}
  }
  return worker;
};

const digitsOnly = (s = '') => (s.match(/\d+/g) || []).join('');

// Preprocess image to improve OCR accuracy: resize, grayscale, contrast
const preprocessImageBuffer = async (imagePath) => {
  if (!fs.existsSync(imagePath)) return null;
  try {
    const img = await Jimp.read(imagePath);
    // Normalize size — make width around 1600px for better OCR
    const width = img.getWidth();
    if (width < 1600) img.resize(1600, Jimp.AUTO);
    img.grayscale();
    img.contrast(0.4);
    img.normalize();
    img.quality(90);
    const buffer = await img.getBufferAsync(Jimp.MIME_JPEG);
    return buffer;
  } catch (err) {
    return null;
  }
};

// Try to extract a Pakistani CNIC (13 digits) from one or two images using OCR
export const extractCNIC = async (frontImagePath, backImagePath = null) => {
  try {
    const w = await getWorker();

    // Helper that runs OCR on a buffer or path
    const runOCR = async (pathOrBuffer) => {
      try {
        const { data: { text } } = await w.recognize(pathOrBuffer);
        return text || '';
      } catch (e) {
        return '';
      }
    };

    // Try preprocessed front image first
    if (frontImagePath && fs.existsSync(frontImagePath)) {
      const pre = await preprocessImageBuffer(frontImagePath);
      const text = pre ? await runOCR(pre) : await runOCR(frontImagePath);
      if (text) {
        const cleaned = digitsOnly(text);
        const m = cleaned.match(/\d{13}/);
        if (m) return m[0];
        const dashMatch = text.match(/\d{5}[-\s]?\d{7}[-\s]?\d{1}/);
        if (dashMatch) return digitsOnly(dashMatch[0]);
      }
    }

    // Try back image if front failed
    if (backImagePath && fs.existsSync(backImagePath)) {
      const preB = await preprocessImageBuffer(backImagePath);
      const textB = preB ? await runOCR(preB) : await runOCR(backImagePath);
      if (textB) {
        const cleanedB = digitsOnly(textB);
        const m2 = cleanedB.match(/\d{13}/);
        if (m2) return m2[0];
        const dashMatch2 = textB.match(/\d{5}[-\s]?\d{7}[-\s]?\d{1}/);
        if (dashMatch2) return digitsOnly(dashMatch2[0]);
      }
    }

    return null;
  } catch (err) {
    return null;
  }
};

export const formatCNIC = (digits) => {
  if (!digits) return null;
  const d = digitsOnly(digits);
  if (d.length !== 13) return null;
  return `${d.slice(0,5)}-${d.slice(5,12)}-${d.slice(12)}`;
};

export const warmupWorker = async () => {
  try {
    await getWorker();
    return true;
  } catch (err) {
    return false;
  }
};

export default { extractCNIC, formatCNIC, warmupWorker };
