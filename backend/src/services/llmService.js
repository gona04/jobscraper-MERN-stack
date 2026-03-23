const OpenAI = require('openai');

const MODEL = 'gpt-4o-mini';
const TEMPERATURE = 0;

// NOTE: Replace with the exact Python prompt if it differs.
const JOB_EXTRACTION_PROMPT = `You are a strict JSON extraction engine for frontend job postings.

Return ONLY valid JSON.

Task:
1) Extract structured details from the provided job text.
2) Keep only frontend-oriented roles (React, Angular, Vue, JavaScript, TypeScript, UI-focused web roles).
3) If not a frontend role, return [] only.
4) Include visa_sponsorship exactly as one of: "Yes", "No", "Unknown".

Output schema (single job object):
{
  "jobTitle": "string",
  "job_link": "string",
  "visa_sponsorship": "Yes|No|Unknown",
  "rolesAndResponsibilities": "string",
  "skillsRequired": ["string"]
}

You may also return an array of job objects if multiple jobs are clearly present in the text.`;

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
