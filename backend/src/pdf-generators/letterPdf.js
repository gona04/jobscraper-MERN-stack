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

  const values = {
    name: linkifyText(letter.name || 'Goonja Gandhi'),
    email: linkifyText(letter.email || 'gandhi.goonja@gmail.com'),
    phone: normalizePhoneValue(letter.phone || PHONE_NUMBER),
    paragraphs: regularParagraphs.map((item) => `<p>${linkifyText(item)}</p>`).join(''),
    highlights: bulletPoints.length
      ? `<ul>${bulletPoints.map((item) => `<li>${linkifyText(item)}</li>`).join('')}</ul>`
      : '',
    closingParagraph: linkifyText(normalizeText(letter.closing || 'Thank you for considering my application.')),
  };

  return applyTemplate(template, values);
}

module.exports = {
  buildLetterHtml,
};
