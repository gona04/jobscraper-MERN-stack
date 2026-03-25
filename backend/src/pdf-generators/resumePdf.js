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

function renderSummary(content) {
  const paragraphs = toParagraphs(content);
  if (!paragraphs.length) return '';
  return `<h2>SUMMARY</h2>${paragraphs.map((p) => `<p>${linkifyText(p)}</p>`).join('')}`;
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
      const points = toBullets(exp.points || exp.bullets || []);

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
      const title = normalizeText(project.name || project.project_name || project.title || '');
      const points = toBullets(project.points || project.bullets || []);
      const fallbackPoints = !points.length
        ? toParagraphs(project.description || project.summary || '').filter(Boolean)
        : [];
      const projectPoints = points.length ? points : fallbackPoints;
      if (!title && !projectPoints.length) return '';
      return `<div class="experience">
        ${title ? `<strong>${linkifyText(title)}</strong><br/>` : ''}
        ${renderBullets(projectPoints)}
      </div>`;
    })
    .filter(Boolean)
    .join('');

  return items ? `<h2>PROJECTS</h2>${items}` : '';
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
    summarySection: renderSummary(resume.summary),
    skillsSection: renderSkills(resume.skills),
    experienceSection: renderExperience(resume.experience || []),
    projectsSection: renderProjects(resume.projects || []),
  };

  return applyTemplate(template, values);
}

module.exports = {
  buildResumeHtml,
};
