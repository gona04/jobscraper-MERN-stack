const {
  PHONE_NUMBER,
  normalizePhoneValue,
  normalizeText,
  linkifyText,
  toParagraphs,
  toBullets,
  splitParagraphAndBullets,
} = require('./contentFormatter');
const { loadTemplate, applyTemplate } = require('./templateEngine');

function limitWords(text, maxWords) {
  const words = normalizeText(text).split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(' ');
  return `${words.slice(0, maxWords).join(' ')}…`;
}

async function buildLetterHtml({ content, templateName }) {
  const letter = typeof content === 'object' && content ? content : {};
  const template = await loadTemplate(templateName);

  const sourceParagraphs = toParagraphs(letter.paragraphs || letter.body || content);
  const regularParagraphs = [];
  const bulletPoints = [...toBullets(letter.highlights || [])];

  for (const paragraph of sourceParagraphs) {
    const split = splitParagraphAndBullets(paragraph);
    if (split.paragraph) regularParagraphs.push(split.paragraph);
    if (split.bullets.length) bulletPoints.push(...split.bullets);
  }

  const limitedParagraphs = regularParagraphs.slice(0, 3).map((item) => limitWords(item, 70));
  const limitedBullets = bulletPoints.slice(0, 3).map((item) => limitWords(item, 18));
  const usedWords = limitedParagraphs.join(' ').split(/\s+/).filter(Boolean).length;
  const closingWordBudget = Math.max(20, 250 - usedWords);

  const values = {
    name: linkifyText(letter.name || 'Goonja Gandhi'),
    email: linkifyText(letter.email || 'gandhi.goonja@gmail.com'),
    phone: normalizePhoneValue(letter.phone || PHONE_NUMBER),
    paragraphs: limitedParagraphs.map((item) => `<p>${linkifyText(item)}</p>`).join(''),
    highlights: limitedBullets.length
      ? `<ul>${limitedBullets.map((item) => `<li>${linkifyText(item)}</li>`).join('')}</ul>`
      : '',
    closingParagraph: linkifyText(limitWords(letter.closing || 'Thank you for considering my application.', closingWordBudget)),
  };

  return applyTemplate(template, values);
}

module.exports = {
  buildLetterHtml,
};
