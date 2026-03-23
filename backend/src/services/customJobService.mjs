import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const URL_REGEX = /https?:\/\/\S+/gi;

function inferBoolean(description, positivePattern, negativePattern) {
  if (negativePattern.test(description)) {
    return false;
  }

  return positivePattern.test(description);
}

function inferTitle(lines = [], link = '') {
  if (lines.length > 0) {
    return lines[0];
  }

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

function parseBlockToJob(block) {
  const linkMatch = block.match(URL_REGEX);

  if (!linkMatch?.length) {
    return null;
  }

  const link = linkMatch[0];
  const textWithoutLinks = block.replace(URL_REGEX, '').trim();
  const lines = textWithoutLinks
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const title = inferTitle(lines, link);
  const description = lines.length > 1 ? lines.slice(1).join('\n') : textWithoutLinks || title;

  return {
    title,
    details: {
      title,
      description,
      visaSponsorship: inferBoolean(description, /(visa|sponsorship)/i, /(no\s+visa|without\s+visa|not\s+sponsor)/i),
      relocationSupport: inferBoolean(description, /(relocation|relocate)/i, /(no\s+relocation|without\s+relocation)/i)
    },
    link,
    portal: 'custom'
  };
}

export function transformCustomJobs(content) {
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

export async function transformAndSaveCustomJobs(content, outputPath) {
  const jobs = transformCustomJobs(content);
  const savedPath = await saveCustomJobs(jobs, outputPath);

  return {
    jobs,
    savedPath
  };
}
