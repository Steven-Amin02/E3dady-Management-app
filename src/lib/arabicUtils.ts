/**
 * Normalizes Arabic string for resilient fuzzy searching & matching:
 * - Normalizes Alef variations (أ, إ, آ, ٱ -> ا)
 * - Normalizes Taa Marbuta (ة -> ه)
 * - Normalizes Yaa (ى -> ي)
 * - Normalizes Waw with Hamza (ؤ -> و)
 * - Normalizes Yaa with Hamza (ئ -> ي)
 * - Removes diacritics / tashkeel (fatha, damma, kasra, sukun, tanween)
 * - Removes Tatweel / Kashida (\u0640)
 * - Trims and lowercases
 */
export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F\u0670]/g, '') // Remove tashkeel
    .replace(/\u0640/g, '') // Remove tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .toLowerCase()
    .trim();
}
