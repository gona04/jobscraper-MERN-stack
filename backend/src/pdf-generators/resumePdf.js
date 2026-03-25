const { PHONE_NUMBER } = require('./contentFormatter');

function buildResumeHtml({ contentHtml, css }) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>${css}</style>
</head>
<body>
  <main class="page resume">
    <header class="header">
      <div class="name-wrap">
        <div class="accent"></div>
        <div>
          <h1>Goonja Gandhi</h1>
          <div class="subtitle">JavaScript Front-end Developer (React)</div>
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
  buildResumeHtml,
};
