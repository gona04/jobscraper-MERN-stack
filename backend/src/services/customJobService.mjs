import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const URL_REGEX = /https?:\/\/\S+/gi;
const TITLE_HINT_REGEX = /(front\s*-?\s*end|back\s*-?\s*end|full\s*-?\s*stack|software|data|devops|qa|product|mobile|ios|android|react|node|javascript|typescript)\s+(engineer|developer|architect|manager|analyst|lead|specialist|consultant)/i;
const ROLE_TITLE_REGEX = /(senior|junior|lead|staff|principal)?\s*(front\s*-?\s*end|back\s*-?\s*end|full\s*-?\s*stack|software|data|devops|qa|product|mobile|ios|android)\s*(engineer|developer|architect|manager|analyst)/i;

const TITLE_NOISE = new Set([
  'apply',
  'save',
  'show more options',
  'about the role',
  'about the job',
  'summary',
  'responsibilities',
  'profile',
  'bonus points for',
  'what we offer'
]);

function inferBoolean(description, positivePattern, negativePattern, defaultValue = null) {
  if (negativePattern.test(description)) {
    return false;
  }

  if (positivePattern.test(description)) {
    return true;
  }

  return defaultValue;
}


function inferVisaSponsorship(description) {
  const noSponsorshipPattern = /(no\s+visa|without\s+visa|not\s+sponsor|unable\s+to\s+provide\s+visa|must\s+be\s+authorized\s+to\s+work|authorized\s+to\s+work\s+in|work\s+authorization\s+required|citizenship\s+required|eligibility\s+to\s+work\s+in|must\s+speak\s+(?!english\b)[a-z]+|[a-z]+\s+language\s+required)/i;

  if (noSponsorshipPattern.test(description)) {
    return false;
  }

  return null;
}

function cleanLine(line = '') {
  return line.replace(/\s+/g, ' ').trim();
}

function isLikelyJobTitle(line = '') {
  const normalized = cleanLine(line);

  if (!normalized || normalized.length < 3 || normalized.length > 120) {
    return false;
  }

  if (TITLE_NOISE.has(normalized.toLowerCase())) {
    return false;
  }

  return TITLE_HINT_REGEX.test(normalized);
}

function inferTitleFromLink(link = '') {
  try {
    const url = new URL(link);
    const parts = url.pathname.split('/').filter(Boolean);
    const slug = parts.at(-1) || 'Untitled Role';
    return slug
      .replace(/[-_]+/g, ' ')
      .replace(/\?.*$/, '')
      .replace(/\b\w/g, (match) => match.toUpperCase());
  } catch {
    return 'Untitled Role';
  }
}

function extractTitle(textWithoutLinks, lines, link) {
  const candidate = lines.find((line) => isLikelyJobTitle(line));

  if (candidate) {
    return cleanLine(candidate);
  }

  const roleMatch = textWithoutLinks.match(ROLE_TITLE_REGEX);
  if (roleMatch) {
    return cleanLine(roleMatch[0]).replace(/\b\w/g, (char) => char.toUpperCase());
  }

  const firstUsefulLine = lines.find((line) => !TITLE_NOISE.has(cleanLine(line).toLowerCase()));
  if (firstUsefulLine) {
    return cleanLine(firstUsefulLine);
  }

  return inferTitleFromLink(link);
}

function buildDescription(textWithoutLinks, title) {
  if (!textWithoutLinks) {
    return title;
  }

  const normalizedText = textWithoutLinks.trim();
  const normalizedTitle = title.trim();

  if (normalizedText.toLowerCase().startsWith(normalizedTitle.toLowerCase())) {
    const stripped = normalizedText.slice(normalizedTitle.length).trim();
    return stripped || normalizedTitle;
  }

  return normalizedText;
}

function parseBlockToJob(block) {
  const linkMatch = block.match(URL_REGEX);

  if (!linkMatch?.length) {
    return null;
  }

  const link = linkMatch[0];
  const textWithoutLinks = block.replace(URL_REGEX, '').trim();
  const lines = textWithoutLinks
    .split('\n')
    .map((line) => cleanLine(line))
    .filter(Boolean);

  const title = extractTitle(textWithoutLinks, lines, link);
  const description = buildDescription(textWithoutLinks, title);

  return {
    title,
    details: {
      title,
      description,
      visaSponsorship: inferVisaSponsorship(description),
      relocationSupport: inferBoolean(description, /(relocation|relocate)/i, /(no\s+relocation|without\s+relocation)/i)
    },
    link,
    portal: 'custom'
  };
}

function normalizeToSingleContent(input) {
  if (Array.isArray(input)) {
    return input.map((item) => item.trim()).filter(Boolean).join('\n\n');
  }

  return typeof input === 'string' ? input : '';
}

export function transformCustomJobs(input) {
  const content = normalizeToSingleContent(input);
  const blocks = content
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.map(parseBlockToJob).filter(Boolean);
}

export async function saveCustomJobs(jobs, outputPath = path.join(process.cwd(), 'data', 'custom', 'custom.json')) {
  const outputDir = path.dirname(outputPath);
  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, JSON.stringify(jobs, null, 2));

  return outputPath;
}

export async function transformAndSaveCustomJobs(input, outputPath) {
  const jobs = transformCustomJobs(input);
  const savedPath = await saveCustomJobs(jobs, outputPath);

  return {
    jobs,
    savedPath
  };
}
