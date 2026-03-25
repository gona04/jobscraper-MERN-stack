const PHONE_NUMBER = '+91 7718961340';

function toTitle(label) {
  return String(label)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function stripHtml(input) {
  return String(input || '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function normalizePhoneNumbers(input) {
  if (!input) return '';

  const patterns = [
    /\+91\s*[-]?\s*[Xx*]{3,}\b/g,
    /\+91\s*[Xx*\d\-\s]{6,}\b/g,
    /\b\+?91[-\s]?\d{10}\b/g,
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

function textToHtmlParagraphs(text) {
  const cleanText = normalizeText(text);
  if (!cleanText) return '';

  const chunks = cleanText
    .split(/\n\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return chunks
    .map((chunk) => {
      const lines = chunk
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const bulletLines = lines.filter((line) => /^[-•*]\s+/.test(line));
      if (lines.length > 0 && bulletLines.length === lines.length) {
        const listItems = lines
          .map((line) => line.replace(/^[-•*]\s+/, '').trim())
          .map((line) => `<li>${line}</li>`)
          .join('');
        return `<ul>${listItems}</ul>`;
      }

      return `<p>${lines.join('<br/>')}</p>`;
    })
    .join('\n');
}

function objectToHtml(value, depth = 2) {
  if (value == null) return '';

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return textToHtmlParagraphs(String(value));
  }

  if (Array.isArray(value)) {
    const allPrimitive = value.every(
      (item) => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
    );

    if (allPrimitive) {
      const listItems = value
        .map((item) => normalizeText(String(item)))
        .filter(Boolean)
        .map((item) => `<li>${item}</li>`)
        .join('');
      return listItems ? `<ul>${listItems}</ul>` : '';
    }

    return value
      .map((item) => `<div class="entry">${objectToHtml(item, Math.min(depth + 1, 4))}</div>`)
      .join('\n');
  }

  return Object.entries(value)
    .map(([key, child]) => {
      const title = toTitle(key);
      const headingLevel = Math.min(depth, 4);
      const body = objectToHtml(child, Math.min(depth + 1, 4));
      if (!body) return '';
      return `<section><h${headingLevel}>${title}</h${headingLevel}>${body}</section>`;
    })
    .filter(Boolean)
    .join('\n');
}

function contentToHtml(content) {
  return typeof content === 'string' ? textToHtmlParagraphs(content) : objectToHtml(content);
}

module.exports = {
  PHONE_NUMBER,
  contentToHtml,
};
