require('dotenv').config();

const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const axios = require('axios');
const cheerio = require('cheerio');
const XLSX = require('xlsx');
const puppeteer = require('puppeteer');

const { COVER_LETTER_SYSTEM_PROMPT, getCoverLetterPrompt } = require('./prompt/coverLetterPrompt');
const { RESUME_SYSTEM_PROMPT, getResumePrompt } = require('./prompt/resumePrompt');
const {
  MOTIVATION_LETTER_SYSTEM_PROMPT,
  getMotivationLetterPrompt
} = require('./prompt/motivationLetterPrompt');
const { buildResumeHtml } = require('./pdf-generators/resumePdf');
const { buildLetterHtml } = require('./pdf-generators/letterPdf');

const OUTPUT_BASE_DIR = '/Users/workgoonja/Downloads/Resumes/automated';
const GLOBAL_CACHE_FILE = path.resolve(__dirname, '../data/company_cache.json');
const XAI_MODEL = 'grok-4-1-fast-reasoning';
const XAI_TIMEOUT_MS = 60000;
const TEXT_LIMIT = 5000;

const RESUME_SOURCE_OF_TRUTH = `Goonja Gandhi
+91 7718961340 • gandhi.goonja@gmail.com • linkedin.com/in/goonja-gandhi • https://github.com/gona04
Senior Frontend Engineer (React, TypeScript, Performance & Systems)
Frontend Engineer with ~5 years of experience building high-performance, scalable web applications
using React and TypeScript. Specializes in performance optimization, frontend architecture, and system
design, with a proven track record of reducing load times, improving API efficiency, and delivering
maintainable UI systems. Experienced working in cross-functional teams and owning features end-to-end,
from architecture to deployment.
SKILLS
Frontend: CSS3, HTML5, JavaScript (ES6+), React, SCSS, Tailwind, TypeScript
State Management: Context API, Redux, RxJS
Backend: Express, Node.js, REST APIs
Systems & Performance: API optimization, bundle analysis, caching strategies, code splitting
AI Integration: FAISS, LangChain, LLM integrations, RAG systems
Tools: AWS, CI/CD (Jenkins), Firebase, Git, Netlify, Railway
Testing: Jest, unit testing
Other: Accessibility (WCAG), Agile, system design fundamentals
PROJECTS
NewsAlign — AI-Powered Fact Verification System (Full Stack)
• Designed and built a full-stack system using React, Node.js, and PostgreSQL (AWS RDS)
• Reduced frontend bundle size from 941KB to <300KB using code splitting and optimization techniques
• Improved system performance (Lighthouse score: 73 to 95) by eliminating redundant API calls and optimizing auth flow
• Built a RAG-based pipeline using FAISS, semantic search, and LLM reasoning
• Replaced runtime scraping with scheduled pipelines, significantly improving response latency
• Implemented backend safeguards: JWT authentication, rate limiting, and usage tracking
• Achieved ~84% test coverage using Jest
WORK EXPERIENCE
Datapret | 01/2024 - 03/2024 | MERN Stack Developer
Tata Consultancy Services | 01/2019 - 04/2023 | Senior Frontend Developer
EDUCATION
Mobile Applications Development, Cambrian College (GPA: 3.8)
CERTIFICATIONS
Generative AI: Large Language Models
AI Engineering: RAG (LangChain, FAISS, Hugging Face)
NLP Programming`;

function log(step, message) {
  console.log(`[${step}] ${message}`);
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeCompanyName(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/\b(inc\.?|inc|llc|ltd|limited|corp|corporation)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeSegment(value, fallback) {
  return String(value || fallback || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || fallback;
}

function stripJsonNoise(raw) {
  return String(raw || '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
}

function deepNormalize(data) {
  if (Array.isArray(data)) {
    return data.map((item) => deepNormalize(item));
  }

  if (data && typeof data === 'object') {
    const normalized = {};
    for (const [key, value] of Object.entries(data)) {
      if (key === 'points' || key === 'paragraphs') {
        normalized[key] = Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : value;
        continue;
      }

      normalized[key] = deepNormalize(value);
    }
    return normalized;
  }

  if (typeof data === 'string') {
    return data
      .replace(/\+?91\s*[xX*\d\-\s]{8,}/g, '+91 7718961340')
      .replace(/\{\{[^}]+\}\}/g, '')
      .replace(/\[insert[^\]]*\]/gi, '')
      .replace(/<[^>]*placeholder[^>]*>/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  return data;
}

function getUniqueTargetDir(basePath) {
  let current = basePath;
  let suffix = 2;
  while (fsSync.existsSync(current)) {
    current = `${basePath}-${suffix}`;
    suffix += 1;
  }
  return current;
}

async function readJsonFile(filePath, label) {
  const raw = await fs.readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  log(label, `Read ${filePath}`);
  return parsed;
}

async function writeJsonFile(filePath, data, label) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  log(label, `Wrote ${filePath}`);
}

async function loadGlobalCache() {
  try {
    const raw = await fs.readFile(GLOBAL_CACHE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    return {};
  }
}

async function saveGlobalCache(cache) {
  await fs.mkdir(path.dirname(GLOBAL_CACHE_FILE), { recursive: true });
  await fs.writeFile(GLOBAL_CACHE_FILE, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
}

async function safeRequest(url, method, options = {}) {
  const response = await axios({ url, method, timeout: 20000, ...options });
  return response;
}

function validLink(link) {
  if (!link || typeof link !== 'string') return false;
  const lower = link.toLowerCase();
  return !['linkedin.com', 'facebook.com', 'twitter.com', 'instagram.com', 'wikipedia.org'].some((d) => lower.includes(d));
}

async function searchCompanyWebsite(companyName) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await safeRequest('https://google.serper.dev/search', 'post', {
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json'
    },
    data: {
      q: `${companyName} official website`,
      num: 5
    }
  });

  const organic = toArray(response?.data?.organic);
  const match = organic.find((entry) => validLink(entry?.link));
  return match?.link || null;
}

async function scrapeSiteText(url) {
  const response = await safeRequest(url, 'get');
  const $ = cheerio.load(response.data || '');
  $('script, style, noscript, img, svg').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  return text.slice(0, TEXT_LIMIT);
}

async function enrichCompany(companyName) {
  try {
    const website = await searchCompanyWebsite(companyName);
    if (!website) {
      return {
        company_status: 'not_found',
        company_website: '',
        company_details: ''
      };
    }

    const details = await scrapeSiteText(website);
    return {
      company_status: 'success',
      company_website: website,
      company_details: details
    };
  } catch (error) {
    return {
      company_status: 'error',
      company_website: '',
      company_details: String(error.message || error)
    };
  }
}

async function step2EnrichCompanies(inputPath, outputPath) {
  const jobs = toArray(await readJsonFile(inputPath, 'STEP-2'));
  const cache = await loadGlobalCache();
  const runCache = new Map();
  const enriched = [];

  for (const [index, job] of jobs.entries()) {
    try {
      const company = job.company_name || '';
      const cacheKey = normalizeCompanyName(company);

      let details = runCache.get(cacheKey) || cache[cacheKey];
      if (!details) {
        details = await enrichCompany(company);
        runCache.set(cacheKey, details);
        cache[cacheKey] = details;
        await saveGlobalCache(cache);
      }

      enriched.push({ ...job, ...details });
      log('STEP-2', `Enriched ${index + 1}/${jobs.length}: ${company || 'unknown-company'}`);
    } catch (error) {
      enriched.push({
        ...job,
        company_status: 'error',
        company_website: '',
        company_details: String(error.message || error)
      });
      log('STEP-2', `Failed to enrich row ${index + 1}: ${error.message}`);
    }
  }

  await writeJsonFile(outputPath, enriched, 'STEP-2');
  return enriched;
}

async function step3GenerateExcel(inputPath, outputPath) {
  const jobs = toArray(await readJsonFile(inputPath, 'STEP-3'));
  const rows = jobs.map((job) => ({
    'Job Title': job.jobTitle || '',
    'Company Name': job.company_name || '',
    'Job Link': job.job_link || '',
    Skills: Array.isArray(job.skillsRequired) ? job.skillsRequired.join(', ') : String(job.skillsRequired || ''),
    'Visa Sponsorship': job.visa_sponsorship || 'Unknown',
    'Company Website': job.company_website || ''
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Jobs');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  XLSX.writeFile(workbook, outputPath);
  log('STEP-3', `Wrote ${outputPath}`);
}

async function callGrok(systemPrompt, userPrompt) {
  if (!process.env.GROK_API_KEY) {
    throw new Error('GROK_API_KEY is missing');
  }

  const response = await safeRequest('https://api.x.ai/v1/chat/completions', 'post', {
    timeout: XAI_TIMEOUT_MS,
    headers: {
      Authorization: `Bearer ${process.env.GROK_API_KEY}`,
      'Content-Type': 'application/json'
    },
    data: {
      model: XAI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    }
  });

  return response?.data?.choices?.[0]?.message?.content || '{}';
}

function parseJsonSafe(raw) {
  try {
    return JSON.parse(stripJsonNoise(raw));
  } catch (_error) {
    return {};
  }
}

async function step4GenerateApplications(inputPath, outputPath) {
  const jobs = toArray(await readJsonFile(inputPath, 'STEP-4'));
  const applications = [];

  for (const [index, job] of jobs.entries()) {
    try {
      const coverRaw = await callGrok(COVER_LETTER_SYSTEM_PROMPT, getCoverLetterPrompt(job, RESUME_SOURCE_OF_TRUTH));
      const coverParsed = parseJsonSafe(coverRaw);

      const resumeRaw = await callGrok(
        RESUME_SYSTEM_PROMPT,
        getResumePrompt(RESUME_SOURCE_OF_TRUTH, job, coverParsed.analysis || '')
      );
      const resumeParsed = parseJsonSafe(resumeRaw);

      const result = {
        jobTitle: job.jobTitle || '',
        company_name: job.company_name || '',
        resume: resumeParsed.resume || {},
        cover_letter: coverParsed.cover_letter || {}
      };

      if (String(job.isEURegion || '').toLowerCase() === 'yes') {
        const motivationRaw = await callGrok(
          MOTIVATION_LETTER_SYSTEM_PROMPT,
          getMotivationLetterPrompt(
            job.company_name || '',
            job.jobTitle || '',
            '',
            job.company_details || JSON.stringify(job),
            RESUME_SOURCE_OF_TRUTH
          )
        );
        const motivationParsed = parseJsonSafe(motivationRaw);
        result.motivation_letter = motivationParsed;
      }

      applications.push(result);
      log('STEP-4', `Generated application ${index + 1}/${jobs.length}: ${job.company_name || 'unknown-company'}`);
    } catch (error) {
      applications.push({
        jobTitle: job.jobTitle || '',
        company_name: job.company_name || '',
        resume: {},
        cover_letter: {},
        error: String(error.message || error)
      });
      log('STEP-4', `Failed application ${index + 1}: ${error.message}`);
    }
  }

  await writeJsonFile(outputPath, applications, 'STEP-4');
  return applications;
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

async function createPdf(page, outputPath, html) {
  await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 0 });
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
  });
}

async function step5GeneratePdfs(inputPath, date) {
  const jobs = toArray(await readJsonFile(inputPath, 'STEP-5')).map((job) => deepNormalize(job));
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 794, height: 1123 });

  try {
    for (const [index, job] of jobs.entries()) {
      const companyDir = sanitizeSegment(job.company_name, 'unknown-company');
      const roleDir = sanitizeSegment(job.jobTitle, 'unknown-role');
      const targetDir = getUniqueTargetDir(path.join(OUTPUT_BASE_DIR, date, companyDir, roleDir));
      await fs.mkdir(targetDir, { recursive: true });

      const files = [
        {
          key: 'resume',
          fileName: 'GoonjaGandhi_resume.pdf',
          buildHtml: (sectionContent) => buildResumeHtml({ content: sectionContent })
        },
        {
          key: 'cover_letter',
          fileName: 'GoonjaGandhi_coverLetter.pdf',
          buildHtml: (sectionContent) => buildLetterHtml({ content: sectionContent, templateName: 'coverLetter.html' })
        },
        {
          key: 'motivation_letter',
          fileName: 'GoonjaGandhi_motivationLetter.pdf',
          buildHtml: (sectionContent) => buildLetterHtml({ content: sectionContent, templateName: 'motivationLetter.html' })
        }
      ];

      for (const file of files) {
        try {
          const section = getSectionContent(job, file.key);
          if (!section) continue;
          const html = await file.buildHtml(section);
          const outPath = path.join(targetDir, file.fileName);
          await createPdf(page, outPath, html);
        } catch (error) {
          log('STEP-5', `Failed ${file.key} for row ${index + 1}: ${error.message}`);
        }
      }

      log('STEP-5', `PDFs completed ${index + 1}/${jobs.length}: ${job.company_name || 'unknown-company'}`);
    }
  } finally {
    await page.close();
    await browser.close();
  }
}

function parseDateArg(argv) {
  const date = argv[0];
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Usage: npm run jobs:pipeline -- <YYYY-MM-DD>');
  }
  return date;
}

async function run() {
  const date = parseDateArg(process.argv.slice(2));
  const baseDir = path.resolve(__dirname, `../data/${date}`);

  const customJobsPath = path.join(baseDir, 'custom_jobs.json');
  const enrichedJobsPath = path.join(baseDir, 'enriched_jobs.json');
  const jobsExcelPath = path.join(baseDir, 'jobs.xlsx');
  const applicationsPath = path.join(baseDir, 'applications.json');

  await step2EnrichCompanies(customJobsPath, enrichedJobsPath);
  await step3GenerateExcel(enrichedJobsPath, jobsExcelPath);
  await step4GenerateApplications(enrichedJobsPath, applicationsPath);
  await step5GeneratePdfs(applicationsPath, date);

  log('DONE', 'Pipeline complete');
  log('DONE', customJobsPath);
  log('DONE', enrichedJobsPath);
  log('DONE', jobsExcelPath);
  log('DONE', applicationsPath);
}

if (require.main === module) {
  run().catch((error) => {
    console.error(`[FATAL] ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  run,
  step2EnrichCompanies,
  step3GenerateExcel,
  step4GenerateApplications,
  step5GeneratePdfs,
  deepNormalize,
  parseDateArg,
  sanitizeSegment,
  getUniqueTargetDir
};
