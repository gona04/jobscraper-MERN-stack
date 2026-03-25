const { PHONE_NUMBER } = require('./contentFormatter');

function buildLetterHtml({ contentHtml, css }) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>${css}</style>
</head>
<body>
  <main class="page">
    <header class="header">
      <div class="name-wrap">
        <div class="accent"></div>
        <div>
          <h1>Goonja Gandhi</h1>
        </div>
      </div>
      <div class="contact">gandhi.goonja@gmail.com\n${PHONE_NUMBER}</div>
    </header>
    ${contentHtml}
  </main>
</body>
</html>`;
}

module.exports = {
  buildLetterHtml,
};
