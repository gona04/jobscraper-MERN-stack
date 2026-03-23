const fs = require('fs-extra');
const path = require('node:path');

async function writeJsonFile(outputPath, payload) {
  const outputDir = path.dirname(outputPath);
  await fs.ensureDir(outputDir);
  await fs.writeJson(outputPath, payload, { spaces: 2 });
}

module.exports = {
  writeJsonFile
};
