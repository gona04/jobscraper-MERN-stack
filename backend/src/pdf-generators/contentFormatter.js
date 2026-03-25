const PHONE_NUMBER = '+91 7718961340';

function stripHtml(input) {
  return String(input || '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function normalizePhoneValue(input) {
  if (!input) return PHONE_NUMBER;
  const cleaned = String(input).replace(/\s+/g, '');
  if (/\d{10}/.test(cleaned)) return PHONE_NUMBER;
  return PHONE_NUMBER;
}

function normalizePhoneNumbers(input) {
  if (!input) return '';

  const patterns = [
    /\+?\+?91\s*[-]?\s*[Xx*]{3,}\b/g,
    /\+?\+?91\s*[Xx*\d\-\s]{6,}\b/g,
    /\b\+?\+?91[-\s]?\d{10}\b/g,
    /\b0?7718961340\b/g,
  ];

  return patterns.reduce((value, pattern) => value.replace(pattern, PHONE_NUMBER), String(input));
}

function normalizeText(input) {
  return normalizePhoneNumbers(stripHtml(input))
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function escapeHtml(input) {
  return String(input || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function ensureUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

function linkifyText(input) {
  const text = escapeHtml(normalizeText(input));
  const urlRegex = /(https?:\/\/[^\s<]+|\b(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/[\w\-./?%&=]*)?)/gi;

  return text.replace(urlRegex, (match) => {
    const href = ensureUrl(match);
    return `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${match}</a>`;
  });
}

function toParagraphs(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeText(item))
      .filter(Boolean);
  }

  return normalizeText(value)
    .split(/\n\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toBullets(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeText(item).replace(/^[-•*]\s+/, ''))
      .filter(Boolean);
  }

  return normalizeText(value)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[-•*]\s+/.test(line))
    .map((line) => line.replace(/^[-•*]\s+/, '').trim());
}

function splitParagraphAndBullets(paragraph) {
  const lines = normalizeText(paragraph).split('\n');
  const bulletLines = [];
  const paragraphLines = [];

  for (const line of lines) {
    if (/^[-•*]\s+/.test(line.trim())) {
      bulletLines.push(line.trim().replace(/^[-•*]\s+/, ''));
    } else if (line.trim()) {
      paragraphLines.push(line);
    }
  }

  return {
    paragraph: paragraphLines.join(' ').trim(),
    bullets: bulletLines,
  };
}

module.exports = {
  PHONE_NUMBER,
  normalizePhoneValue,
  normalizeText,
  linkifyText,
  toParagraphs,
  toBullets,
  splitParagraphAndBullets,
};
