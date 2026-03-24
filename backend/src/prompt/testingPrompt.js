const TESTING_SYSTEM_PROMPT = `
The output JSON structure MUST remain IDENTICAL to the input structure.

DO NOT:

• Add fields
• Remove fields
• Rename fields
• Reorder fields
• Change nesting
• Change array structure
• Change key casing
• Wrap or unwrap objects

Return the SAME schema.

Only modify VALUES when necessary.

FACTUAL HONESTY RULE (ABSOLUTE)

The Reference Resume is the ONLY ground truth.

NEVER introduce:

• New companies
• New roles
• New technologies not logically implied
• Fabricated metrics
• Inflated responsibilities
• False seniority signals

Allowed:

• Rewording
• Clarification
• Stronger phrasing
• ATS keyword injection (truthful only)
• Grammar / coherence improvements

If a claim cannot be verified from the reference resume → REMOVE or SOFTEN it.

ATS OPTIMIZATION OBJECTIVE

Evaluate documents like a modern ATS:

Check for:

• Hard skill coverage
• Role alignment
• Missing JD keywords
• Semantic relevance
• Keyword density (natural)
• Seniority matching
• Redundant fluff

Target: Optimize toward ≥ 80% ATS match WITHOUT violating honesty.

CONSISTENCY VALIDATION

Ensure cross-document consistency:

Resume ↔ Reference Resume
Cover Letter ↔ Reference Resume
Motivation Letter ↔ Reference Resume

Correct exaggerations or drift.

LANGUAGE CONSTRAINTS

Maintain human realism.

Avoid:

• Keyword stuffing
• Robotic phrasing
• Marketing hype
• Exaggeration tone

SUMMARY GENERATION RULE

Generate EXACTLY ONE summary line:

Format:

"[Company Domain (3–4 precise words)], [Role Classification], [Primary Hiring Focus]"

Domain must be specific and information-dense.

Good Example:
"Automotive data infrastructure, Frontend Angular role, scalable data-driven SPA systems"

Bad Example:
"Tech company hiring developer"

OUTPUT REQUIREMENTS

Return ONLY valid JSON.

NO explanations.
NO commentary.
NO headings.
NO markdown.

JSON must contain:
"company_summary"

All original fields preserved exactly`;

function getTestingPrompt(resume, coverLetter, motivationLetter, jd, oldResume) {
  const prompt = `
Validate and optimize the following application package.

═══════════════════════════════════════
SOURCE OF TRUTH HIERARCHY (STRICT)
═══════════════════════════════════════

1. OLD RESUME → PRIMARY source of truth
   • Work experience, skills, education MUST NOT exceed this

2. PERSONAL PROJECTS → SECONDARY source of truth
   • Can be used ONLY for project-related content
   • MUST NOT introduce unrealistic experience or inflated seniority

3. COVER LETTER + MOTIVATION LETTER
   • Must align strictly with the above
   • Remove exaggerations, mismatches, or unsupported claims

═══════════════════════════════════════
PERSONAL PROJECTS (VALIDATED SOURCE)
═══════════════════════════════════════

IMPORTANT:
• Select ONLY 1–2 most relevant projects
• DO NOT list all projects
• If a stronger project exists → DO NOT include weaker ones
• Projects must be integrated naturally, not listed mechanically

Project 1 — NewsAlign v2 (AI Fact Checking System)
• Full-stack system using <b>semantic search</b>, <b>FAISS</b>, and <b>LLM reasoning</b>
• Key concept: <b>Retrieval ≠ Reasoning</b>
• Demonstrates:
  - AI system design thinking
  - Backend architecture (Node.js, PostgreSQL, cron jobs)
  - Real-world tradeoffs (rate limiting, caching, cost control)
Use when:
• AI / LLM / RAG / search systems are relevant
• Company works with knowledge systems or data-heavy products

Project 2 — Custom JS Framework
https://github.com/gona04/custom-js-framework
• Built simplified React-like state system (<b>useState</b>)
• Demonstrates deep understanding of JS internals
Use when:
• Role values JavaScript fundamentals or system-level thinking

Project 3 — Weather App (React, Accessibility-focused)
https://github.com/gona04/weather-app
• Focus on accessibility and UI clarity
Use when:
• UX, accessibility, or frontend quality is important

Project 4 — Typing Speed App (Vanilla JS)
https://test-typing-93b00.web.app/
• Measures typing speed (WPM)
Use when:
• Role values performance or core JS fundamentals

Project 5 — Tic Tac Toe (Vanilla JS)
https://tic-tac-toe-b22b6.web.app/
• Logic-driven frontend implementation
Use when:
• Simplicity and clean logic are relevant

Project 6 — Promises vs Observables (Async Patterns Study)
• Explores <b>Promises</b> vs <b>Observables</b>
• Focus on:
  - Execution model (eager vs lazy)
  - Stream vs single-value handling
  - Cancellation and composability
• Demonstrates:
  - Understanding of async system design
  - Ability to reason about data flow and tradeoffs
Use when:
• Role involves RxJS, Angular, or reactive systems
• Event-driven or real-time architectures

CRITICAL RULES:
• NEVER present projects as learning exercises
• Frame them as evidence of thinking and decision-making
• NEVER inflate experience based on projects
• Prefer depth over breadth

═══════════════════════════════════════
VALIDATION OBJECTIVES
═══════════════════════════════════════

Ensure:

• No claims exceed OLD RESUME or PROJECTS
• No hallucinated skills, tools, or experience
• Resume, cover letter, and motivation letter are consistent
• Projects are used ONLY when relevant (not forced)
• Strongest project is prioritized
• Remove vague, exaggerated, or unsupported claims
• Maintain ATS alignment with Job Description
• Maintain professional, natural tone

═══════════════════════════════════════
INPUT
═══════════════════════════════════════

JOB DESCRIPTION:
${jd}

OLD RESUME (PRIMARY SOURCE OF TRUTH):
${oldResume}

GENERATED RESUME:
${resume}

COVER LETTER:
${coverLetter}

MOTIVATION LETTER:
${motivationLetter}

═══════════════════════════════════════
OUTPUT RULES (CRITICAL)
═══════════════════════════════════════

• Return EXACTLY ONE valid JSON object
• Preserve EXACT JSON structure
• Do NOT add explanations
• Do NOT add new sections
• Do NOT change schema
• Only correct, align, and validate content

Return corrected JSON only.
`;
  return prompt;
}

module.exports = {
  TESTING_SYSTEM_PROMPT,
  getTestingPrompt
};
