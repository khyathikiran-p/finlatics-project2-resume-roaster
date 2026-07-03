// PDF text extraction using pdf-parse.
// Import the inner module directly to avoid pdf-parse's debug block
// (its index.js reads a test file when run as the main module).
import pdfParse from "pdf-parse/lib/pdf-parse.js";

const MAX_CHARS = 15000;

export async function parsePdf(buffer) {
  const data = await pdfParse(buffer);
  const text = (data.text || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text.slice(0, MAX_CHARS);
}
