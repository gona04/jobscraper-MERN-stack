const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { buildResumeHtml } = require('./pdf-generators/resumePdf');
const { buildLetterHtml } = require('./pdf-generators/letterPdf');

const OUTPUT_BASE_DIR = '/Users/workgoonja/Downloads/Resumes/automated';

function sanitize(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function sanitizeCompany(companyName) {
  const baseName = String(companyName || '').split('/')[0];
  return sanitize(baseName || 'unknown-company');
}

function getSectionContent(job, key) {
  const value = job?.[key];
  if (!value) return null;
  if (typeof value === 'object' && !Array.isArray(value)) {
    const nestedKey = Object.keys(value).find((childKey) => childKey.toLowerCase() === key.toLowerCase());
    if (nestedKey && value[nestedKey]) return value[nestedKey];
  }
  return value;
}

function getUniqueTargetDir(basePath) {
  let folderPath = basePath;
  let counter = 2;

  while (fsSync.existsSync(folderPath)) {
    folderPath = `${basePath}-${counter}`;
    counter += 1;
  }

  return folderPath;
}

async function createPdf(page, outputPath, html) {
  await page.setContent(html, {
    waitUntil: 'domcontentloaded',
    timeout: 0,
  });

  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      bottom: '20mm',
      left: '15mm',
      right: '15mm',
    },
  });
}

async function run() {
  const today = new Date().toISOString().slice(0, 10);
  const inputArg = process.argv[2];
  const defaultInputPath = path.resolve(__dirname, `../data/results_${today}.json`);
  const inputPath = inputArg ? path.resolve(process.cwd(), inputArg) : defaultInputPath;

  const raw = await fs.readFile(inputPath, 'utf8');
  const jobs = JSON.parse(raw);

  if (!Array.isArray(jobs)) {
    throw new Error('Input file must contain an array of job objects.');
  }

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  let generatedCount = 0;

  for (const [index, job] of jobs.entries()) {
    const companyDir = sanitizeCompany(job.company_name || job.companyName || 'unknown-company');
    const role = job.job_title || 'unknown-role';
    const roleDir = sanitize(role);

    const baseDir = path.join(OUTPUT_BASE_DIR, today, companyDir, roleDir);
    const targetDir = getUniqueTargetDir(baseDir);
    await fs.mkdir(targetDir, { recursive: true });

    const files = [
      {
        key: 'resume',
        fileName: 'GoonjaGandhi_resume.pdf',
        label: 'Resume',
        buildHtml: (sectionContent) => buildResumeHtml({ content: sectionContent }),
      },
      {
        key: 'cover_letter',
        fileName: 'GoonjaGandhi_coverLetter.pdf',
        label: 'Cover Letter',
        buildHtml: (sectionContent) => buildLetterHtml({ content: sectionContent, templateName: 'coverLetter.html' }),
      },
      {
        key: 'motivation_letter',
        fileName: 'GoonjaGandhi_motivationLetter.pdf',
        label: 'Motivation Letter',
        buildHtml: (sectionContent) =>
          buildLetterHtml({ content: sectionContent, templateName: 'motivationLetter.html' }),
      },
    ];

    for (const { key, fileName, label, buildHtml } of files) {
      try {
        const sectionContent = getSectionContent(job, key);
        if (!sectionContent) {
          console.warn(`[SKIP] Job #${index + 1} (${companyDir}/${roleDir}) missing ${label}`);
          continue;
        }

        const html = await buildHtml(sectionContent);
        if (!html || !html.trim()) {
          console.warn(`[SKIP] Job #${index + 1} (${companyDir}/${roleDir}) empty ${label}`);
          continue;
        }

        const outputPath = path.join(targetDir, fileName);
        await createPdf(page, outputPath, html);
        generatedCount += 1;
        console.log(`[OK] ${label}: ${outputPath}`);
      } catch (error) {
        console.error(`[ERROR] Job #${index + 1} (${companyDir}/${roleDir}) failed ${label}: ${error.message}`);
      }
    }
  }

  await page.close();
  await browser.close();

  console.log(`Done. Generated ${generatedCount} PDF file(s).`);
}

run().catch((error) => {
  console.error(`[FATAL] ${error.message}`);
  process.exitCode = 1;
});
