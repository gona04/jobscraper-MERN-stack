const {
  PHONE_NUMBER,
  normalizePhoneValue,
  normalizeText,
  linkifyText,
  toParagraphs,
  toBullets,
  splitParagraphAndBullets,
} = require('./contentFormatter');

function buildLetterHtml({ content, css }) {
  const letter = typeof content === 'object' && content ? content : {};

  const name = normalizeText(letter.name || 'Goonja Gandhi');
  const email = normalizeText(letter.email || 'gandhi.goonja@gmail.com');
  const phone = normalizePhoneValue(letter.phone || PHONE_NUMBER);

  const sourceParagraphs = toParagraphs(letter.paragraphs || letter.body || content);
  const regularParagraphs = [];
  const bulletPoints = [...toBullets(letter.highlights || [])];

  for (const para of sourceParagraphs) {
    const { paragraph, bullets } = splitParagraphAndBullets(para);
    if (paragraph) regularParagraphs.push(paragraph);
    if (bullets.length) bulletPoints.push(...bullets);
  }

  const greeting = 'Dear Hiring Manager,';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>${css}</style>
</head>
<body>
  <main class="page letter-page">
    <header class="header top-header">
      <div>
        <h1 class="person-name">${linkifyText(name)}</h1>
      </div>
      <div class="contact letter-contact">
        <div class="contact-line">${linkifyText(email)}</div>
        <div class="contact-line">${phone}</div>
      </div>
    </header>

    <p class="greeting">${greeting}</p>

    ${regularParagraphs.map((paragraph) => `<p>${linkifyText(paragraph)}</p>`).join('')}

    ${
      bulletPoints.length
        ? `<ul>${bulletPoints.map((point) => `<li>${linkifyText(point)}</li>`).join('')}</ul>`
        : ''
    }

    <p class="closing">Kind regards,<br/><strong>Goonja Gandhi</strong></p>
  </main>
</body>
</html>`;
}

module.exports = {
  buildLetterHtml,
};
