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
  const tokens = rawContact
    ? rawContact.split(/[•|]/).map((item) => item.trim()).filter(Boolean)
    : [];

  const email =
    resume.email ||
    tokens.find((item) => /@/.test(item)) ||
    'gandhi.goonja@gmail.com';

  const phoneToken = resume.phone || tokens.find((item) => /\d{10}/.test(item));
  const phone = normalizePhoneValue(phoneToken || PHONE_NUMBER);

  const linkedin = normalizeText(
    resume.linkedin ||
      tokens.find((item) => /linkedin|github|https?:\/\//i.test(item)) ||
      'linkedin.com/in/goonja-gandhi'
  );

  return { email, phone, linkedin };
}

function cleanFiller(text) {
  return normalizeText(text)
    .replace(/\bresponsible for\b/gi, '')
    .replace(/\bworked on\b/gi, '')
    .replace(/\binvolved in\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function renderBullets(items) {
  if (!items || !items.length) return '';
  return `<ul>${items.map((item) => `<li>${linkifyText(cleanFiller(item))}</li>`).join('')}</ul>`;
}

function renderSummary(content) {
  const paragraphs = toParagraphs(content)
    .map((item) => cleanFiller(item))
    .filter(Boolean);
  if (!paragraphs.length) return '';
  return `<h2>SUMMARY</h2><p>${linkifyText(paragraphs.join(' '))}</p>`;
}

function renderSkills(skills) {
  const skillsList = Array.isArray(skills)
    ? skills.map((item) => normalizeText(item)).filter(Boolean)
    : skills && typeof skills === 'object'
      ? Object.entries(skills).flatMap(([category, values]) => {
          const label = normalizeText(category.replace(/_/g, ' '));
          const items = Array.isArray(values) ? values : [values];
          const renderedItems = items.map((item) => normalizeText(item)).filter(Boolean);
          return renderedItems.length
            ? [`<strong>${linkifyText(label)}:</strong> ${renderedItems.map((item) => linkifyText(item)).join(', ')}`]
            : [];
        })
      : toParagraphs(skills)
          .flatMap((paragraph) => paragraph.split('|'))
          .map((item) => normalizeText(item))
          .filter(Boolean);

  if (!skillsList.length) return '';
  return `<h2>SKILLS</h2><p>${skillsList
    .map((item) => (item.startsWith('<strong>') ? item : linkifyText(item)))
    .join('<br/>')}</p>`;
}

function renderExperience(experience = []) {
  if (!Array.isArray(experience) || !experience.length) return '';

  const items = experience
    .map((exp) => {
      const company = normalizeText(exp.company || '');
      const role = normalizeText(exp.role || exp.position || exp.title || '');
      const date = normalizeText(
        exp.duration || exp.date || [exp.start_date, exp.end_date].filter(Boolean).join(' - ')
      );
      const location = normalizeText(exp.location || exp.country || '');
      const points = toBullets(
        exp.points || exp.bullets || exp.achievements || []
      ).map((item) =>
        cleanFiller(item)
      );

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
      const title = normalizeText(
        project.projectName ||
          project.name ||
          project.project_name ||
          project.title ||
          ''
      );

      const points = toBullets(
        project.points || project.bullets || project.achievements || []
      ).map((item) =>
        cleanFiller(item)
      );

      const fallbackPoints =
        points.length === 0
          ? toParagraphs(project.description || project.summary || '')
              .map((item) => cleanFiller(item))
              .filter(Boolean)
          : [];

      const projectPoints = points.length ? points : fallbackPoints;

      if (!title && !projectPoints.length) return '';

      const github = normalizeText(project.github_link || project.github || '');
      const live = normalizeText(
        project.live_link || project.live || project.url || ''
      );
      const date = normalizeText(project.date || '');
      const type = normalizeText(project.type || '');
      const links = [];
      if (github) links.push(`Github: ${linkifyText(github)}`);
      if (live) links.push(`Live: ${linkifyText(live)}`);

      return `<div class="project">
        ${title ? `<strong>${linkifyText(title)}</strong><br/>` : ''}
        ${date || type ? `<p>${[date, type].filter(Boolean).map((item) => linkifyText(item)).join(' | ')}</p>` : ''}
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
      const degree = normalizeText(
        edu.degree || edu.program || edu.field || edu.title || ''
      );
      const institution = normalizeText(
        edu.institution || edu.school || edu.university || ''
      );
      const duration = normalizeText(
        edu.duration || edu.date || [edu.start_date, edu.end_date].filter(Boolean).join(' - ')
      );
      const location = normalizeText(edu.location || '');
      const gpa = normalizeText(edu.gpa ? `GPA: ${edu.gpa}` : '');
      const details = toParagraphs(edu.details || edu.description || '')
        .map((item) => cleanFiller(item))
        .filter(Boolean);

      if (!degree && !institution && !duration && !location && !gpa && !details.length) return '';

      return `<div class="education">
        ${degree ? `<strong>${linkifyText(degree)}</strong><br/>` : ''}
        ${institution ? `${linkifyText(institution)}<br/>` : ''}
        ${duration ? `${linkifyText(duration)}<br/>` : ''}
        ${location ? `${linkifyText(location)}<br/>` : ''}
        ${gpa ? `${linkifyText(gpa)}<br/>` : ''}
        ${details.length ? `${renderBullets(details)}` : ''}
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
    location: linkifyText(resume.location || ''),
    linkedin: linkifyText(contact.linkedin),
    github: linkifyText(resume.github || ''),
    roleTitle:
      resume.position || resume.title
        ? `<div class="role-title">${linkifyText(cleanFiller(resume.position || resume.title))}</div>`
        : '',
    summarySection: renderSummary(resume.summary),
    skillsSection: renderSkills(resume.skills),
    projectsSection: renderProjects(resume.projects || []),
    experienceSection: renderExperience(resume.experience || resume.work_experience || []),
    educationSection: renderEducation(resume.education || []),
    certificationsSection: renderCertifications(
      resume.certifications || resume.certification || []
    ),
  };

  return applyTemplate(template, values);
}

module.exports = {
  buildResumeHtml,
};