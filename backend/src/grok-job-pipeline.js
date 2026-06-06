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

// ─── Constants ────────────────────────────────────────────────────────────────

const DELAY_BETWEEN_REQUESTS = 1500;
const TEXT_LIMIT = 5000;
const AI_TIMEOUT_MS = 60_000;
const AI_MAX_RETRIES = 3;

const RETRYABLE_HTTP_STATUSES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);
const RETRYABLE_ERROR_CODES = new Set([
  'ECONNABORTED',
  'ECONNRESET',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ETIMEDOUT'
]);

const BLACKLISTED_DOMAINS = [
  'linkedin.com',
  'facebook.com',
  'twitter.com',
  'instagram.com',
  'wikipedia.org',
  'glassdoor.com',
  'indeed.com'
];

/**
 * Provider registry — each entry defines the API endpoint and how to
 * build / parse requests for that provider.
 *
 * OpenAI-compatible providers (openai, grok, deepseek) all share the same
 * request shape; only the base URL differs.
 */
const PROVIDER_REGISTRY = {
  claude: {
    url: 'https://api.anthropic.com/v1/messages',
    buildHeaders: (apiKey) => ({
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    }),
    buildBody: (model, systemPrompt, userPrompt) => ({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    }),
    parseResponse: (data) => {
      const content = (data?.content ?? [])
        .map((part) => (part?.type === 'text' && typeof part.text === 'string' ? part.text : ''))
        .join('')
        .trim();

      if (!content) throw new Error('Malformed Claude response: no text content found.');
      return content;
    }
  },

  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    ...openAICompatibleMethods()
  },

  grok: {
    url: 'https://api.x.ai/v1/chat/completions',
    ...openAICompatibleMethods()
  },

  deepseek: {
    url: 'https://api.deepseek.com/v1/chat/completions',
    ...openAICompatibleMethods()
  }
};

/** Shared request/response helpers for OpenAI-compatible providers. */
function openAICompatibleMethods() {
  return {
    buildHeaders: (apiKey) => ({
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    buildBody: (model, systemPrompt, userPrompt) => ({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    }),
    parseResponse: (data) => {
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new Error('Malformed response: missing choices[0].message.content.');
      }
      return content;
    }
  };
}

// ─── Paths ────────────────────────────────────────────────────────────────────

const INPUT_FILE = path.resolve(__dirname, '../data/2026-06-05/enriched_job_details.json');
const CACHE_FILE = path.resolve(__dirname, '../data/company_cache.json');

// ─── Resume ───────────────────────────────────────────────────────────────────

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

// ─── Utilities ────────────────────────────────────────────────────────────────

function log(message) {
  console.log(`[INFO] ${message}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeCompanyName(name) {
  return String(name ?? '')
    .toLowerCase()
    .trim()
    .replace(/\b(inc\.?|inc|llc|ltd|limited|corp|corporation)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isValidLink(link) {
  if (!link || typeof link !== 'string') return false;
  const lower = link.toLowerCase();
  return !BLACKLISTED_DOMAINS.some((domain) => lower.includes(domain));
}

function safeParseJSON(raw) {
  try {
    const cleaned = String(raw ?? '')
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (err) {
    log(`Warning: failed to parse JSON — ${err.message}`);
    return {};
  }
}

// ─── HTTP ─────────────────────────────────────────────────────────────────────

async function safeRequest(url, method, options = {}) {
  try {
    return await axios({ url, method, timeout: 20_000, ...options });
  } catch (err) {
    const status = err.response?.status ? ` (status ${err.response.status})` : '';
    throw new Error(`${method.toUpperCase()} ${url}${status} failed: ${err.message}`);
  }
}

// ─── Cache ────────────────────────────────────────────────────────────────────

async function loadCache() {
  try {
    const raw = await fs.readFile(CACHE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code !== 'ENOENT') log(`Cache load failed, starting fresh: ${err.message}`);
    return {};
  }
}

async function saveCache(cache) {
  await fs.writeFile(CACHE_FILE, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
}

// ─── Company research ─────────────────────────────────────────────────────────

async function findCompanyWebsite(companyName) {
  const response = await safeRequest('https://google.serper.dev/search', 'post', {
    headers: {
      'X-API-KEY': process.env.SERPER_API_KEY,
      'Content-Type': 'application/json'
    },
    data: { q: `${companyName} official website`, num: 5 }
  });

  const organic = Array.isArray(response?.data?.organic) ? response.data.organic : [];
  for (const result of organic) {
    if (isValidLink(result?.link)) return result.link;
  }

  return null;
}

async function scrapePageText(url) {
  const response = await safeRequest(url, 'get');
  const $ = cheerio.load(response.data ?? '');
  $('script, style, noscript, img, svg').remove();
  const text = ($('body').text() || $.root().text()).replace(/\s+/g, ' ').trim();
  return text.slice(0, TEXT_LIMIT);
}

async function fetchCompanyDetails(companyName) {
  try {
    const website = await findCompanyWebsite(companyName);
    if (!website) return { status: 'not_found', website: null, details: null };

    const details = await scrapePageText(website);
    return { status: 'success', website, details };
  } catch (err) {
    return { status: 'error', website: null, details: err.message };
  }
}

// ─── AI ───────────────────────────────────────────────────────────────────────

/**
 * Resolve provider config from environment variables.
 * Supported AI_PROVIDER values: claude | openai | grok | deepseek
 *
 * Required env vars:
 *   AI_PROVIDER  — one of the supported provider names
 *   AI_MODEL     — the model string for that provider
 *   CLAUDE_API_KEY / OPENAI_API_KEY / GROK_API_KEY / DEEPSEEK_API_KEY
 */
function resolveProviderConfig() {
  const provider = String(process.env.AI_PROVIDER ?? '').toLowerCase();

  if (!PROVIDER_REGISTRY[provider]) {
    const supported = Object.keys(PROVIDER_REGISTRY).join(', ');
    throw new Error(
      `Unsupported AI_PROVIDER "${provider}". Supported values: ${supported}.`
    );
  }

  const API_KEY_MAP = {
    claude: 'CLAUDE_API_KEY',
    openai: 'OPENAI_API_KEY',
    grok: 'GROK_API_KEY',
    deepseek: 'DEEPSEEK_API_KEY'
  };

  const apiKey = process.env[API_KEY_MAP[provider]];
  const model = process.env.AI_MODEL;

  if (!apiKey) throw new Error(`Missing env var: ${API_KEY_MAP[provider]}`);
  if (!model) throw new Error('Missing env var: AI_MODEL');

  return { provider, apiKey, model };
}

async function callAI(providerConfig, systemPrompt, userPrompt) {
  const { provider, apiKey, model } = providerConfig;
  const registry = PROVIDER_REGISTRY[provider];

  if (!registry) throw new Error(`Unknown provider: ${provider}`);

  const requestOptions = {
    timeout: AI_TIMEOUT_MS,
    headers: registry.buildHeaders(apiKey),
    data: registry.buildBody(model, systemPrompt, userPrompt)
  };

  for (let attempt = 1; attempt <= AI_MAX_RETRIES; attempt++) {
    try {
      const response = await safeRequest(registry.url, 'post', requestOptions);

      if (response.status !== 200) {
        throw new Error(`Unexpected HTTP status: ${response.status}`);
      }

      const content = registry.parseResponse(response.data);
      await delay(DELAY_BETWEEN_REQUESTS);
      return content;
    } catch (err) {
      const statusMatch =
        err.message.match(/\(status (\d+)\)/) ||
        err.message.match(/Unexpected HTTP status: (\d+)/);
      const status = statusMatch ? Number(statusMatch[1]) : null;

      const isRetryable =
        (status !== null && RETRYABLE_HTTP_STATUSES.has(status)) ||
        RETRYABLE_ERROR_CODES.has(err.code) ||
        err.message.includes('timeout');

      if (!isRetryable || attempt >= AI_MAX_RETRIES) throw err;

      const backoffMs = Math.min(2000 * 2 ** (attempt - 1), 10_000);
      log(
        `[${provider}] Attempt ${attempt}/${AI_MAX_RETRIES} failed: ${err.message}. ` +
        `Retrying in ${backoffMs}ms…`
      );
      await delay(backoffMs);
    }
  }
}

// ─── Job processing ───────────────────────────────────────────────────────────

async function processJob(job, cache, providerConfig) {
  const rawCompany = job.company_name;
  const companyKey = normalizeCompanyName(rawCompany);

  // Company research (cached)
  let companyEntry;
  if (cache[companyKey]) {
    companyEntry = cache[companyKey];
    log(`Cache hit → ${companyKey}`);
  } else {
    companyEntry = await fetchCompanyDetails(rawCompany);
    cache[companyKey] = companyEntry;
    await saveCache(cache);
    await delay(DELAY_BETWEEN_REQUESTS);
  }

  const { status: companyStatus, website: companyWebsite, details: companyDetails } = companyEntry;

  // AI passes
  const coverLetterRaw = await callAI(
    providerConfig,
    COVER_LETTER_SYSTEM_PROMPT,
    getCoverLetterPrompt(job, RESUME)
  );
  const coverLetterParsed = safeParseJSON(coverLetterRaw);

  const resumeRaw = await callAI(
    providerConfig,
    RESUME_SYSTEM_PROMPT,
    getResumePrompt(RESUME, job, coverLetterParsed.analysis ?? '')
  );
  const resumeParsed = safeParseJSON(resumeRaw);

  const motivationContext =
    companyStatus === 'success' && companyDetails
      ? companyDetails
      : job.jobDescription ?? JSON.stringify(job);

  const motivationRaw = await callAI(
    providerConfig,
    MOTIVATION_LETTER_SYSTEM_PROMPT,
    getMotivationLetterPrompt(rawCompany, job.jobTitle, job.location, motivationContext, RESUME)
  );
  const motivationLetterParsed = safeParseJSON(motivationRaw);

  const testingRaw = await callAI(
    providerConfig,
    TESTING_SYSTEM_PROMPT,
    getTestingPrompt(
      JSON.stringify(resumeParsed?.resume ?? {}),
      JSON.stringify(coverLetterParsed?.cover_letter ?? {}),
      JSON.stringify(motivationLetterParsed ?? {}),
      job.jobDescription ?? JSON.stringify(job),
      RESUME
    )
  );
  const testingParsed = safeParseJSON(testingRaw);

  return {
    summary: testingParsed?.company_summary ?? '',
    company_name: rawCompany,
    job_title: job.jobTitle,
    motivation_letter: motivationLetterParsed,
    cover_letter: testingParsed?.cover_letter ?? coverLetterParsed?.cover_letter ?? {},
    resume: testingParsed?.resume ?? resumeParsed?.resume ?? {},
    job_link: job.jobLink ?? coverLetterParsed?.job_link ?? '',
    company_website: companyWebsite,
    company_status: companyStatus
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const date = new Date().toISOString().slice(0, 10);
  const outputFile = path.resolve(__dirname, `../data/results_${date}.json`);

  const [rawJobs, cache] = await Promise.all([
    fs.readFile(INPUT_FILE, 'utf8').then(JSON.parse),
    loadCache()
  ]);

  const providerConfig = resolveProviderConfig();
  log(`Using provider: ${providerConfig.provider}, model: ${providerConfig.model}`);

  const results = [];

  for (let i = 0; i < rawJobs.length; i++) {
    const job = rawJobs[i];
    log(`[${i + 1}/${rawJobs.length}] Processing → ${job.company_name ?? 'unknown'}`);

    try {
      const processed = await processJob(job, cache, providerConfig);
      results.push(processed);
    } catch (err) {
      log(`Error processing ${job.company_name ?? 'unknown'}: ${err.message}`);
      results.push({
        summary: '',
        company_name: job.company_name ?? '',
        job_title: job.jobTitle ?? '',
        cover_letter: {},
        resume: {},
        job_link: job.jobLink ?? '',
        company_website: null,
        company_status: 'error',
        error: err.message
      });
    }
  }

  await fs.writeFile(outputFile, `${JSON.stringify(results, null, 2)}\n`, 'utf8');
  log(`Saved ${results.length} results → ${outputFile}`);
}

if (require.main === module) {
  main().catch((err) => {
    log(`Fatal pipeline error: ${err.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  normalizeCompanyName,
  isValidLink,
  safeParseJSON,
  loadCache,
  saveCache,
  safeRequest,
  findCompanyWebsite,
  scrapePageText,
  fetchCompanyDetails,
  resolveProviderConfig,
  callAI,
  processJob,
  main
};