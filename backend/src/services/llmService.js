const OpenAI = require('openai');

const MODEL = 'gpt-4o-mini';
const TEMPERATURE = 0;

const JOB_EXTRACTION_PROMPT = `You are a strict JSON extraction engine for frontend job postings.

Return ONLY valid JSON. No markdown, no explanations, no code fences.

Task:
1) Extract structured details from the provided job text.
2) Keep only frontend-oriented roles (React, Angular, Vue, JavaScript, TypeScript, UI-focused web roles).
3) If the job is not frontend-focused, return [] only.
4) Detect visa sponsorship and set visa_sponsorship exactly to one of: "Yes", "No", "Unknown".
5) Detect if role can be done only with English and set only_english exactly to one of: "true", "false", or null.

Output schema (array of objects):
[
  {
    "jobTitle": "string",
    "job_link": "string",
    "visa_sponsorship": "Yes|No|Unknown",
    "only_english": "true|false|null",
    "company_name": "string",
    "rolesAndResponsibilities": "string",
    "skillsRequired": ["string"]
  }
]

Rules:
- Always return a JSON array.
- If a field is unknown, use empty string for text fields, [] for skillsRequired, and null for only_english.
- Do not invent a job_link unless explicitly present in the text.
- Exclude non-frontend jobs by returning [].`;

let client;

function getClient() {
  if (client) {
    return client;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing. Add it to backend/.env or export it in your shell before running the pipeline.');
  }

  client = new OpenAI({ apiKey });
  return client;
}

async function generateJobDetails(jobText) {
  const completion = await getClient().chat.completions.create({
    model: MODEL,
    temperature: TEMPERATURE,
    messages: [
      { role: 'system', content: JOB_EXTRACTION_PROMPT },
      { role: 'user', content: jobText }
    ]
  });

  return completion.choices?.[0]?.message?.content ?? '';
}

module.exports = {
  generateJobDetails,
  JOB_EXTRACTION_PROMPT
};
