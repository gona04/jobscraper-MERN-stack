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

const TODAY = new Date().toISOString().slice(0, 10);
const INPUT_FILE = path.resolve(__dirname, `../data/${TODAY}/enriched_job_details.json`);
const CACHE_FILE = path.resolve(__dirname, '../data/company_cache.json');

// ─── Resume ───────────────────────────────────────────────────────────────────

const RESUME = `GOONJA GANDHI
Mumbai• +91 7718961340• gandhi.goonja@gmail.com • linkedin.com/in/goonja-gandhi•
https://github.com/gona04
Sr Front-end Developer
Senior Frontend Engineer with 5 years of experience delivering scalable, high-performance web
applications using React, Next.js, TypeScript, GraphQL, and modern frontend architectures. Expertise in
frontend optimization, accessibility, AI integrations, SSR/SSG/ISR, React Server Components, and
enterprise-grade UI delivery within Agile environments.
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
• Engineered an AI-powered fact verification platform using React, Next.js, TypeScript, LangChain, FAISS,
Hugging Face, NLP, and RAG pipelines.
• Shrank bundle size by 68%, from 941KB to under 300KB, through code splitting and frontend optimization
strategies.
• Elevated Lighthouse performance score from 73 to 95 by implementing SSR enhancements, caching
mechanisms, and Core Web Vitals improvements.
• Integrated JWT authentication, API caching, and secure backend workflows to support scalable
application performance.
• Attained approximately 84% unit test coverage using Jest and automated testing practices.
reactli-c — React CLI Tool 01/2026
Personal Project
• Created a CLI tool that generates reusable React component boilerplates, accelerating project setup
and development workflows.
• Increased developer efficiency through zero-runtime-dependency architecture and automated
component scaffolding.
Custom Reactive JavaScript Engine 08/2025
Personal Project
• Architected a lightweight reactive state management engine inspired by React'
s useState internals.
• Showcased expertise in rendering cycles, reactivity systems, JavaScript memory management, and
frontend architecture patterns.
WORK EXPERIENCE
Datapret 01/2024 - 03/2024
MERN Stack Developer (Co-op)
• Delivered an accessibility-focused complaint resolution platform using React, Redux, TypeScript,
Node.js, and REST APIs.
• Increased WCAG compliance by 30%, strengthening accessibility scores and improving usability across
critical workflows.
• Accelerated application responsiveness through frontend rendering optimizations, efficient API
integrations, and streamlined data handling.
• Coordinated with cross-functional Agile teams to speed feature delivery and minimize development
rework.
• Successfully completed the engagement upon project delivery.
Tata Consultancy Services (TCS) 01/2019 - 04/2023
Senior Frontend Developer
• Directed a team of 5 developers while shaping frontend architecture decisions using Angular and
TypeScript.
• Delivered scalable enterprise applications using Angular, RxJS, TypeScript, REST APIs, and reusable
component frameworks.
• Crafted responsive, cross-browser-compatible UI systems aligned with WCAG accessibility standards.
• Reduced API calls by 40% through advanced RxJS implementations, lowering latency and enhancing
state management efficiency.
• Accelerated application performance using code splitting, lazy loading, caching strategies, and bundle
optimization techniques.
• Streamlined frontend-backend integrations with Spring Boot and GraphQL services, shortening feature
delivery timelines.
• Guided and mentored 5 developers, strengthening code quality standards and expediting review
cycles.
• Achieved zero accessibility violations during QA by enforcing WCAG-compliant design and
development practices.
• Delivered enterprise-scale frontend solutions focused on maintainability, scalability, and performance.
EDUCATION
Mobile Applications Development
Cambrian College • GPA: 3.8 Cambrian College, Canada • 01/2023 - 03/2024
• Completed advanced coursework in mobile application development, responsive UI design, and
frontend engineering.
• Applied modern JavaScript frameworks, API integrations, and cross-platform development concepts
across academic projects.
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
  console.log(rawJobs.length);
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