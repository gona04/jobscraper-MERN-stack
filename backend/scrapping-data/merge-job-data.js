const fs = require('fs');
const path = require('path');

const SOURCE_FOLDERS = ['linkedin', 'meetfrank', 'custom'];

function getDateFolderName() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCandidatePortalDirs(dateFolder, portal) {
  return [
    path.join(__dirname, 'data', dateFolder, portal),
    path.join(__dirname, '..', 'data', dateFolder, portal),
  ];
}

function readJsonFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

function collectPortalFiles(dateFolder, portal) {
  const portalDirs = getCandidatePortalDirs(dateFolder, portal);
  const files = [];

  for (const portalDir of portalDirs) {
    if (!fs.existsSync(portalDir)) {
      continue;
    }

    const entries = fs.readdirSync(portalDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
        files.push(path.join(portalDir, entry.name));
      }
    }
  }

  return files;
}

function mergeJobs(dateFolder = getDateFolderName()) {
  const allJobs = [];

  for (const portal of SOURCE_FOLDERS) {
    const files = collectPortalFiles(dateFolder, portal);

    for (const filePath of files) {
      try {
        const parsed = readJsonFile(filePath);

        if (Array.isArray(parsed)) {
          allJobs.push(...parsed);
        } else if (parsed && typeof parsed === 'object') {
          allJobs.push(parsed);
        } else {
          console.warn(`⚠️ Skipped non-object JSON in ${filePath}`);
        }
      } catch (error) {
        console.warn(`⚠️ Could not parse ${filePath}: ${error.message}`);
      }
    }
  }

  const outputDir = path.join(__dirname, 'data', dateFolder);
  const outputFile = path.join(outputDir, 'all_job_details.json');

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(allJobs, null, 2));

  console.log(`✅ Merged ${allJobs.length} jobs into ${outputFile}`);
  return outputFile;
}

module.exports = {
  getDateFolderName,
  mergeJobs,
};

if (require.main === module) {
  const dateFolder = process.argv[2] || getDateFolderName();
  mergeJobs(dateFolder);
}
