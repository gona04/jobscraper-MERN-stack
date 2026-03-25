const {
  PHONE_NUMBER,
  normalizePhoneValue,
  normalizeText,
  linkifyText,
  toParagraphs,
  toBullets,
} = require('./contentFormatter');
const { loadTemplate, applyTemplate } = require('./templateEngine');

function parseContact(resume = {}) {
  const rawContact = normalizeText(resume.contact || '');
  const tokens = rawContact ? rawContact.split(/[•|]/).map((item) => item.trim()).filter(Boolean) : [];

  const email = resume.email || tokens.find((item) => /@/.test(item)) || 'gandhi.goonja@gmail.com';
  const phoneToken = resume.phone || tokens.find((item) => /\d{10}/.test(item));
  const phone = normalizePhoneValue(phoneToken || PHONE_NUMBER);
  const linkedin = normalizeText(
    resume.linkedin || tokens.find((item) => /linkedin|github|https?:\/\//i.test(item)) || 'linkedin.com/in/goonja-gandhi'
  );

  return { email, phone, linkedin };
}

function renderBullets(items) {
  if (!items.length) return '';
  return `<ul>${items.map((item) => `<li>${linkifyText(item)}</li>`).join('')}</ul>`;
}

function cleanFiller(text) {
  return normalizeText(text)
    .replace(/\bresponsible for\b/gi, '')
    .replace(/\bworked on\b/gi, '')
    .replace(/\binvolved in\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function clampLine(text, maxChars = 130) {
  const value = cleanFiller(text);
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars - 1).trim()}…`;
}

function renderSummary(content) {
  const paragraphs = toParagraphs(content).map((item) => cleanFiller(item)).filter(Boolean);
  if (!paragraphs.length) return '';
  const compact = paragraphs.join(' ');
  const summary = clampLine(compact, 360);
  return `<h2>SUMMARY</h2><p>${linkifyText(summary)}</p>`;
}

function renderSkills(skills) {
  const skillsList = Array.isArray(skills)
    ? skills.map((item) => normalizeText(item)).filter(Boolean)
    : toParagraphs(skills)
        .join(', ')
        .split(',')
        .map((item) => normalizeText(item))
        .filter(Boolean);

  if (!skillsList.length) return '';
  return `<h2>SKILLS</h2><p>${skillsList.map((item) => linkifyText(item)).join(', ')}</p>`;
}

function renderExperience(experience = []) {
  if (!Array.isArray(experience) || !experience.length) return '';

  const items = experience
    .map((exp) => {
      const company = normalizeText(exp.company || '');
      const role = normalizeText(exp.role || exp.title || '');
      const date = normalizeText(exp.duration || exp.date || '');
      const location = normalizeText(exp.location || exp.country || '');
      const points = toBullets(exp.points || exp.bullets || []).map((item) => clampLine(item, 120)).slice(0, 5);

      if (!company && !role && !date && !location && !points.length) return '';

      return `<div class="experience">
        <div class="exp-header">
          <div>
            ${company ? `<strong>${linkifyText(company)}</strong><br/>` : ''}
            ${role ? `${linkifyText(role)}` : ''}
          </div>
          <div class="exp-meta">
            ${date ? `${linkifyText(date)}<br/>` : ''}
            ${location ? `${linkifyText(location)}` : ''}
          </div>
        </div>
        ${renderBullets(points)}
      </div>`;
    })
    .filter(Boolean)
    .join('');

  return items ? `<h2>EXPERIENCE</h2>${items}` : '';
}

function renderProjects(projects = []) {
  if (!Array.isArray(projects) || !projects.length) return '';

  const items = projects
    .map((project) => {
      const title = normalizeText(project.projectName || project.name || project.project_name || project.title || '');
      const points = toBullets(project.points || project.bullets || []).map((item) => clampLine(item, 115));
      const fallbackPoints = !points.length
        ? toParagraphs(project.description || project.summary || '').map((item) => clampLine(item, 115)).filter(Boolean)
        : [];
      const projectPoints = (points.length ? points : fallbackPoints).slice(0, 4);
      if (!title && !projectPoints.length) return '';
      const github = normalizeText(project.github_link || project.github || '');
      const live = normalizeText(project.live_link || project.live || project.url || '');
      const links = [];
      if (github) links.push(`Github: ${linkifyText(github)}`);
      if (live) links.push(`Live: ${linkifyText(live)}`);

      return `<div class="project">
        ${title ? `<strong>${linkifyText(title)}</strong><br/>` : ''}
        ${links.length ? `<p>${links.join(' | ')}</p>` : ''}
        ${renderBullets(projectPoints)}
      </div>`;
    })
    .filter(Boolean)
    .join('');

  return items ? `<h2>PROJECTS</h2>${items}` : '';
}

function renderEducation(education = []) {
  if (!Array.isArray(education) || !education.length) return '';

  const items = education
    .map((edu) => {
      const degree = normalizeText(edu.degree || edu.program || edu.title || '');
      const institution = normalizeText(edu.institution || edu.school || edu.university || '');
      const duration = normalizeText(edu.duration || edu.date || '');
      const details = normalizeText(edu.details || edu.description || '');
      if (!degree && !institution && !duration && !details) return '';

      return `<div class="education">
        ${degree ? `<strong>${linkifyText(degree)}</strong><br/>` : ''}
        ${institution ? `${linkifyText(institution)}<br/>` : ''}
        ${duration ? `${linkifyText(duration)}<br/>` : ''}
        ${details ? `${linkifyText(details)}` : ''}
      </div>`;
    })
    .filter(Boolean)
    .join('');

  return items ? `<h2>EDUCATION</h2>${items}` : '';
}

function renderCertifications(certifications) {
  const certList = Array.isArray(certifications)
    ? certifications.map((item) => normalizeText(item)).filter(Boolean)
    : toParagraphs(certifications);

  if (!certList.length) return '';
  return `<h2>CERTIFICATIONS</h2>${renderBullets(certList)}`;
}

async function buildResumeHtml({ content }) {
  const resume = typeof content === 'object' && content ? content : {};
  const template = await loadTemplate('resume.html');
  const contact = parseContact(resume);

  const values = {
    name: linkifyText(resume.name || 'Goonja Gandhi'),
    email: linkifyText(contact.email),
    phone: contact.phone,
    linkedin: linkifyText(contact.linkedin),
    roleTitle: resume.position || resume.title ? `<div class="role-title">${linkifyText(cleanFiller(resume.position || resume.title))}</div>` : '',
    summarySection: renderSummary(resume.summary),
    skillsSection: renderSkills(resume.skills),
    projectsSection: renderProjects(resume.projects || []),
    experienceSection: renderExperience(resume.experience || []),
    educationSection: renderEducation(resume.education || []),
    certificationsSection: renderCertifications(resume.certifications || resume.certification || []),
  };

  return applyTemplate(template, values);
}

module.exports = {
  buildResumeHtml,
};
