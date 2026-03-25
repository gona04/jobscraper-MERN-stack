const fs = require('fs/promises');
const path = require('path');

const TEMPLATE_DIR = path.resolve(__dirname, '../../../templates');
const cache = new Map();

async function loadTemplate(fileName) {
  if (!cache.has(fileName)) {
    const filePath = path.join(TEMPLATE_DIR, fileName);
    const template = await fs.readFile(filePath, 'utf8');
    cache.set(fileName, template);
  }

  return cache.get(fileName);
}

function applyTemplate(template, values) {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => values[key] ?? '');
}

module.exports = {
  loadTemplate,
  applyTemplate,
};
