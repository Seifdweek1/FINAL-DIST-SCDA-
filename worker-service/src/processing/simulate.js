function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Simulated heavy steps (virus scan, OCR, metadata extraction).
 */
async function simulateDocumentProcessing() {
  await sleep(400);
  return {
    virus_scan: { engine: 'simulated-clam', result: 'clean', scanned_at: new Date().toISOString() },
    ocr: { engine: 'simulated-tesseract', pages: 1, text_preview_chars: 0 },
    metadata: { extracted_fields: ['mime', 'size', 'sha256'], duration_ms: 400 },
  };
}

module.exports = { simulateDocumentProcessing };
