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

const TODAY = new Date().toISOString().slice(0, 10);
const INPUT_FILE = path.resolve(__dirname, `../data/${TODAY}/enriched_job_details.json`);
const CACHE_FILE = path.resolve(__dirname, '../data/company_cache.json');

const RESUME = `Goonja Gandhi
Mumbai• +91 7718961340• gandhi.goonja@gmail.com • linkedin.com/in/goonja-gandhi•
github.com/gona04
Senior Frontend developer
Senior Frontend Engineer with around 5 years of experience building scalable, high-performance web
applications using React, Next.js, TypeScript, GraphQL, and modern frontend architecture. Skilled in
performance optimization, accessibility, AI integrations, SSR/SSG/ISR, React Server Components, and
enterprise-grade UI development across Agile environments.
SKILLS
Frontend: CSS3, HTML5, JavaScript ( ES6+
) , Next. js, React. js, SCSS, Tailwind CSS, TypeScript
Next.js & Rendering: App Router, Dynamic Routing, ISR, Nested Layouts, React Server Components, SEO
Optimization, SSG, SSR
State Management: Context API, Redux, RxJS
Backend & APIs: Apollo Client, Express. js, GraphQL, Node. js, REST APIs
Performance & Architecture: Bundle Optimization, Caching Strategies, Code Splitting, Frontend
Architecture, Lazy Loading, Performance Optimization, System Design
AI & Data: FAISS, Generative AI, Hugging Face, LangChain, LLM Integrations, NLP, RAG Systems, Semantic
Search
Cloud & DevOps: AWS, CI/ CD, Firebase, Jenkins, Netlify, Railway
Testing & Development: Accessibility ( WCAG) , Agile Methodologies, Git, Jest, Unit Testing
PROJECTS
NewsAlign — AI-Powered Fact Verification System 02/2026
Personal Project
• Built an AI-powered fact verification platform using React, Next.js, TypeScript, LangChain, FAISS, Hugging
Face, NLP, and RAG pipelines.
• Reduced bundle size from 941KB to under 300KB using code splitting and frontend optimization
techniques.
• Boosted Lighthouse score from 73→95 via SSR optimization, caching, and Core Web Vitals
improvements.
• Implemented JWT authentication, API caching, and secure backend workflows for scalable
performance.
• Achieved approximately 84% unit test coverage using Jest and modern testing practices.
reactli-c — React CLI Tool 01/2026
Personal Project
• Developed a CLI tool for generating reusable React component boilerplate templates.
• Improved developer productivity with zero runtime dependencies and simplified component
scaffolding workflows.
Custom Reactive JavaScript Engine 08/2025
Personal Project
• Built a lightweight reactive state management engine inspired by React’s useState internals.
• Demonstrated deep understanding of rendering cycles, reactivity systems, JavaScript memory
handling, and frontend architecture principles.
WORK EXPERIENCE
Datapret 01/2024 - 03/2024
MERN Stack Developer
Coop-based position
• Developed an accessibility-focused complaint resolution platform using React, Redux, TypeScript,
Node.js, and REST APIs.
• Raised WCAG compliance by 30%; improved accessibility score and enabled inclusive user experience
across workflows.
• Optimized frontend rendering, API integration, and data handling for improved responsiveness and
scalability.
• Collaborated with Agile cross-functional teams to accelerate feature delivery and reduce rework
cycles.
• Contract concluded upon successful project delivery.
Tata Consultancy Services (TCS) 01/2019 - 04/2023
Senior Frontend Developer
• Led a team of 5 developers and contributed to frontend architecture decisions using Angular and
TypeScript
• Built scalable enterprise applications using Angular, RxJS, TypeScript, REST APIs, and reusable
component architecture
• Developed responsive and cross-browser compatible UI systems following WCAG accessibility
standards
• Cut API calls by 40% with RxJS; reduced latency and improved state management efficiency.
• Improved performance through code splitting, lazy loading, caching strategies, and bundle
optimization.
• Mentored 5 developers; enforced clean architecture standards; streamlined code review cycles.
• Built WCAG-compliant responsive UI systems with cross-browser compatibility and zero accessibility
violations during QA.
• Worked in Agile teams to deliver enterprise-scale frontend solutions with strong focus on
maintainability and performance
EDUCATION
Mobile Applications Development
Cambrian College • GPA: 3.8 Canada • 01/2023 - 03/2024
• Studied mobile UI patterns, frontend application development, and responsive interface design.
• Worked on modern JavaScript frameworks, cross-platform development concepts, and API
integrations.
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

async function searchCompanyWebsite(company_name) {
  const response = await safeRequest('https://google.serper.dev/search', 'post', {
    headers: {
      'X-API-KEY': process.env.SERPER_API_KEY,
      'Content-Type': 'application/json'
    },
    data: {
      q: `${company_name} official website`,
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

async function getCompanyDetails(company_name) {
  try {
    const website = await searchCompanyWebsite(company_name);
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
  const rawCompany = job.company_name;
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

  const coverLetterRaw = await callGrok(
    COVER_LETTER_SYSTEM_PROMPT,
    getCoverLetterPrompt(job, RESUME)
  );
  const coverLetterParsed = safeParseJSON(coverLetterRaw);

  const resumeRaw = await callGrok(
    RESUME_SYSTEM_PROMPT,
    getResumePrompt(RESUME, job, coverLetterParsed.analysis || '')
  );
  const resumeParsed = safeParseJSON(resumeRaw);

  const motivationContext =
    (companyStatus === 'success' && companyDetails) || job.jobDescription || JSON.stringify(job);

  const motivationRaw = await callGrok(
    MOTIVATION_LETTER_SYSTEM_PROMPT,
    getMotivationLetterPrompt(rawCompany, job.jobTitle, job.location, motivationContext, RESUME)
  );
  const motivationLetterParsed = safeParseJSON(motivationRaw);

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
  const testingParsed = safeParseJSON(testingRaw);

  return {
    summary: testingParsed?.company_summary || '',
    company_name: rawCompany,
    job_title: job.jobTitle,
    motivation_letter: motivationLetterParsed,
    cover_letter: testingParsed?.cover_letter || coverLetterParsed?.cover_letter || {},
    resume: testingParsed?.resume || resumeParsed?.resume || {},
    job_link: job.jobLink || coverLetterParsed?.job_link || '',
    company_website: companyWebsite,
    company_status: companyStatus
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
    log(`[${i + 1}/${jobs.length}] Processing → ${job.company_name || 'unknown'}`);

    try {
      const processed = await processJob(job, cache);
      results.push(processed);
    } catch (error) {
      log(`Error processing ${job.company_name || 'unknown'}: ${error.message}`);
      results.push({
        summary: '',
        company_name: job.company_name || '',
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
