import { warmupWorker } from '../utils/ocr.js';

(async () => {
  console.log('Warming up OCR worker...');
  const ok = await warmupWorker();
  if (ok) console.log('OCR worker warmed up successfully');
  else console.error('OCR warmup failed');
  process.exit(ok ? 0 : 2);
})();
