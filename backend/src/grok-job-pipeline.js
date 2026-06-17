require('dotenv').config();

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('node:fs').promises;
const path = require('node:path');

const { COVER_LETTER_SYSTEM_PROMPT, getCoverLetterPrompt } = require('./prompt/coverLetterPrompt');
const { RESUME_SYSTEM_PROMPT, getResumePrompt } = require('./prompt/resumePrompt');
const {
  MOTIVATION_LETTER_SYSTEM_PROMPT,
  getMotivationLetterPrompt
} = require('./prompt/motivationLetterPrompt');
const { TESTING_SYSTEM_PROMPT, getTestingPrompt } = require('./prompt/testingPrompt');
const { isIndiaBasedJob } = require('./utils/indiaLocation');

const DELAY_BETWEEN_REQUESTS = 1500;
const TEXT_LIMIT = 5000;
const XAI_TIMEOUT_MS = 60000;
const XAI_MAX_RETRIES = 3;
const RETRYABLE_HTTP_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const RETRYABLE_ERROR_CODES = new Set([
  'ECONNABORTED',
  'ECONNRESET',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ETIMEDOUT'
]);
const BLACKLIST_DOMAINS = [
  'linkedin.com',
  'facebook.com',
  'twitter.com',
  'instagram.com',
  'wikipedia.org',
  'glassdoor.com',
  'indeed.com'
];

const INPUT_FILE = path.resolve(__dirname, '../data/2026-03-23/enriched_job_details.json');
const CACHE_FILE = path.resolve(__dirname, '../data/2026-03-23/company_cache.json');

const RESUME = `Goonja Gandhi
+91 XXXXXXXX• gandhi.goonja@gmail.com • linkedin.com/in/goonja-gandhi• https://github.com/gona04
Senior Frontend Engineer (React, TypeScript, Performance & Systems)
Frontend Engineer with ~5 years of experience building high-performance, scalable web applications
using React and TypeScript. Specializes in performance optimization, frontend architecture, and system
design, with a proven track record of reducing load times, improving API efficiency, and delivering
maintainable UI systems. Experienced working in cross-functional teams and owning features end-to-end,
from architecture to deployment.
SKILLS
Frontend: CSS3, HTML5, JavaScript ( ES6+
) , React, SCSS, Tailwind, TypeScript
State Management: Context API, Redux, RxJS
Backend: Express, Node. js, REST APIs
Systems & Performance: API optimization, bundle analysis, caching strategies, Code splitting
AI Integration: FAISS, LangChain, LLM integrations, RAG systems
Tools: AWS, CI/ CD ( Jenkins) , Firebase, Git, Netlify, Railway
Testing: Jest, unit testing
Other: Accessibility ( WCAG) , Agile, system design fundamentals
PROJECTS
NewsAlign — AI-Powered Fact Verification System (Full Stack)
• Designed and built a full-stack system using React, Node.js, and PostgreSQL (AWS RDS)
• Reduced frontend bundle size from 941KB → <300KB using code splitting and optimization techniques
• Improved system performance (Lighthouse score: 73 → 95) by eliminating redundant API calls and
optimizing auth flow
• Built a RAG-based pipeline using FAISS, semantic search, and LLM reasoning
• Replaced runtime scraping with scheduled pipelines, significantly improving response latency
• Implemented backend safeguards: JWT authentication, rate limiting, and usage tracking
• Achieved ~84% test coverage using Jest
• Github: https://github.com/gona04/NewsAlignApp: https://news-align.netlify.app/
Custom Reactive JS Engine (React Internals Exploration)
• Built a lightweight reactivity system mimicking useState behavior using Object.defineProperty
• Demonstrates understanding of how modern frameworks handle state updates and rendering
• Github: https://github.com/gona04/custom-js-framework
reactli-c — React CLI Tool
• Developed a CLI tool to generate React component boilerplate, reducing repetitive setup
• Designed for simplicity and zero runtime dependencies
• npm: https://www.npmjs.com/package/reactli-c
WORK EXPERIENCE
Datapret 01/2024 - 03/2024
MERN Stack Developer
• Built an accessibility-compliant complaint resolution system using React and Redux
• Improved WCAG compliance score by 30%, enhancing usability for diverse user groups
• Integrated frontend with REST APIs, ensuring reliable and performant data flow
• Collaborated with design/product teams to reduce rework and improve delivery speed
Tata Consultancy Services 01/2019 - 04/2023
Senior Frontend Developer
• Led a team of 5 developers, contributing to frontend architecture and enforcing clean code and SOLID
principles
• Reduced unnecessary API calls by 40% by redesigning state management using RxJS and TypeScript
• Improved usability of complex data-heavy interfaces by redesigning UI architecture (accordion-based
system)
• Delivered responsive, cross-browser compatible applications used in enterprise environments
• Collaborated closely with backend teams (Spring Boot) to optimize API contracts and reduce frontend
bottlenecks
• Mentored junior developers and conducted code reviews to maintain engineering standards
EDUCATION
Mobile Applications Development
Cambrian College • GPA: 3.8 Canada
CERTIFICATIONS
Generative AI: Large Language Models
AI Engineering: RAG (LangChain, FAISS, Hugging Face)
NLP Programming`;

function log(message) {
  console.log(`[INFO] ${message}`);
}

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeCompanyName(name) {
  return String(name || '')
    .toLowerCase()
    .trim()
    .replace(/\b(inc\.?|inc|llc|ltd|limited|corp|corporation)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function loadCache() {
  try {
    const raw = await fs.readFile(CACHE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }

    log(`Cache load failed, using empty cache: ${error.message}`);
    return {};
  }
}

async function saveCache(cache) {
  await fs.writeFile(CACHE_FILE, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
}

function validLink(link) {
  if (!link || typeof link !== 'string') {
    return false;
  }

  const lower = link.toLowerCase();
  return !BLACKLIST_DOMAINS.some((domain) => lower.includes(domain));
}

async function safeRequest(url, method, options = {}) {
  try {
    const requestConfig = {
      url,
      method,
      timeout: 20000,
      ...options
    };
    return await axios(requestConfig);
  } catch (error) {
    const status = error.response?.status ? ` (status ${error.response.status})` : '';
    throw new Error(`Request failed for ${method.toUpperCase()} ${url}${status}: ${error.message}`);
  }
}

async function searchCompanyWebsite(companyName) {
  const response = await safeRequest('https://google.serper.dev/search', 'post', {
    headers: {
      'X-API-KEY': process.env.SERPER_API_KEY,
      'Content-Type': 'application/json'
    },
    data: {
      q: `${companyName} official website`,
      num: 5
    }
  });

  const organic = Array.isArray(response?.data?.organic) ? response.data.organic : [];
  for (const result of organic) {
    if (validLink(result?.link)) {
      return result.link;
    }
  }

  return null;
}

async function scrapeSiteText(url) {
  const response = await safeRequest(url, 'get');
  const $ = cheerio.load(response.data || '');
  $('script, style, noscript, img, svg').remove();
  const text =
    $('body').text().replace(/\s+/g, ' ').trim() || $.root().text().replace(/\s+/g, ' ').trim();

  return text.slice(0, TEXT_LIMIT);
}

async function getCompanyDetails(companyName) {
  try {
    const website = await searchCompanyWebsite(companyName);
    if (!website) {
      return { status: 'not_found', website: null, details: null };
    }

    const details = await scrapeSiteText(website);
    return { status: 'success', website, details };
  } catch (error) {
    return { status: 'error', website: null, details: error.message };
  }
}

async function xAI_API(systemPrompt, userPrompt) {
  for (let attempt = 1; attempt <= XAI_MAX_RETRIES; attempt += 1) {
    try {
      const response = await safeRequest('https://api.x.ai/v1/chat/completions', 'post', {
        timeout: XAI_TIMEOUT_MS,
        headers: {
          Authorization: `Bearer ${process.env.GROK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        data: {
          model: 'grok-4-1-fast-reasoning',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]
        }
      });

      if (response.status !== 200) {
        return JSON.stringify({ error: `Unexpected status: ${response.status}` });
      }

      const content = response?.data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        return JSON.stringify({ error: 'Malformed response: missing choices[0].message.content' });
      }

      return content;
    } catch (error) {
      const statusMatch = error.message.match(/\(status (\d+)\)/);
      const status = statusMatch ? Number(statusMatch[1]) : null;
      const isRetryableStatus = status !== null && RETRYABLE_HTTP_STATUS.has(status);
      const isRetryableCode = RETRYABLE_ERROR_CODES.has(error.code);
      const isTimedOut = error.message.includes('timeout');
      const shouldRetry = attempt < XAI_MAX_RETRIES && (isRetryableStatus || isRetryableCode || isTimedOut);

      if (!shouldRetry) {
        return JSON.stringify({ error: error.message });
      }

      const backoffMs = Math.min(2000 * 2 ** (attempt - 1), 10000);
      log(`xAI request failed (attempt ${attempt}/${XAI_MAX_RETRIES}): ${error.message}. Retrying in ${backoffMs}ms.`);
      await delay(backoffMs);
    }
  }

  return JSON.stringify({ error: 'xAI request failed after retries.' });
}

function safeParseJSON(str) {
  try {
    const cleaned = String(str || '')
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (error) {
    log(`Warning: failed to parse JSON response: ${error.message}`);
    return {};
  }
}

async function callGrok(systemPrompt, userPrompt) {
  const raw = await xAI_API(systemPrompt, userPrompt);
  await delay(DELAY_BETWEEN_REQUESTS);
  return raw;
}

async function processJob(job, cache) {
  const rawCompany = job.companyName;
  const company = normalizeCompanyName(rawCompany);

  let companyDetails = null;
  let companyWebsite = null;
  let companyStatus = 'skipped';

  if (cache[company]) {
    ({ status: companyStatus, website: companyWebsite, details: companyDetails } = cache[company]);
    log(`Cache hit → ${company}`);
  } else {
    const scraped = await getCompanyDetails(rawCompany);
    cache[company] = scraped;
    await saveCache(cache);
    await delay(DELAY_BETWEEN_REQUESTS);
    companyStatus = scraped.status;
    companyWebsite = scraped.website;
    companyDetails = scraped.details;
  }

  const skipLetters = isIndiaBasedJob(job);
  let coverLetterParsed = {};
  let motivationLetterParsed = {};
  let testingParsed = {};

  if (skipLetters) {
    log(`India-based job detected → skipping cover letter and motivation letter for ${rawCompany || 'unknown company'}.`);
  } else {
    const coverLetterRaw = await callGrok(
      COVER_LETTER_SYSTEM_PROMPT,
      getCoverLetterPrompt(job, RESUME)
    );
    coverLetterParsed = safeParseJSON(coverLetterRaw);
  }

  const resumeRaw = await callGrok(
    RESUME_SYSTEM_PROMPT,
    getResumePrompt(RESUME, job, coverLetterParsed.analysis || '')
  );
  const resumeParsed = safeParseJSON(resumeRaw);

  if (!skipLetters) {
    const motivationContext =
      (companyStatus === 'success' && companyDetails) || job.jobDescription || JSON.stringify(job);

    const motivationRaw = await callGrok(
      MOTIVATION_LETTER_SYSTEM_PROMPT,
      getMotivationLetterPrompt(rawCompany, job.jobTitle, job.location, motivationContext, RESUME)
    );
    motivationLetterParsed = safeParseJSON(motivationRaw);

    const testingRaw = await callGrok(
      TESTING_SYSTEM_PROMPT,
      getTestingPrompt(
        JSON.stringify(resumeParsed?.resume || {}),
        JSON.stringify(coverLetterParsed?.cover_letter || {}),
        JSON.stringify(motivationLetterParsed || {}),
        job.jobDescription || JSON.stringify(job),
        RESUME
      )
    );
    testingParsed = safeParseJSON(testingRaw);
  }

  return {
    summary: testingParsed?.company_summary || '',
    company_name: rawCompany,
    job_title: job.jobTitle,
    motivation_letter: skipLetters ? null : motivationLetterParsed,
    cover_letter: skipLetters ? null : testingParsed?.cover_letter || coverLetterParsed?.cover_letter || {},
    resume: testingParsed?.resume || resumeParsed?.resume || {},
    job_link: job.jobLink || coverLetterParsed?.job_link || '',
    company_website: companyWebsite,
    company_status: companyStatus,
    india_based_job: skipLetters
  };
}

async function main() {
  const date = new Date().toISOString().slice(0, 10);
  const outputFile = path.resolve(__dirname, `../data/results_${date}.json`);

  const rawJobs = await fs.readFile(INPUT_FILE, 'utf8');
  const jobs = JSON.parse(rawJobs);
  const cache = await loadCache();
  const results = [];

  for (let i = 0; i < jobs.length; i += 1) {
    const job = jobs[i];
    log(`[${i + 1}/${jobs.length}] Processing → ${job.companyName || 'unknown'}`);

    try {
      const processed = await processJob(job, cache);
      results.push(processed);
    } catch (error) {
      log(`Error processing ${job.companyName || 'unknown'}: ${error.message}`);
      results.push({
        summary: '',
        company_name: job.companyName || '',
        job_title: job.jobTitle || '',
        cover_letter: {},
        resume: {},
        job_link: job.jobLink || '',
        company_website: null,
        company_status: 'error',
        error: error.message
      });
    }
  }

  await fs.writeFile(outputFile, `${JSON.stringify(results, null, 2)}\n`, 'utf8');
  log(`Saved ${results.length} results to ${outputFile}`);
}

if (require.main === module) {
  main().catch((error) => {
    log(`Fatal pipeline error: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  normalizeCompanyName,
  loadCache,
  saveCache,
  validLink,
  safeRequest,
  searchCompanyWebsite,
  scrapeSiteText,
  getCompanyDetails,
  xAI_API,
  safeParseJSON,
  processJob,
  main
};
