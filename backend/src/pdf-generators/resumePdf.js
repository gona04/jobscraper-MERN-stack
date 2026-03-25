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

  const links = [resume.linkedin, resume.github, ...tokens.filter((item) => /linkedin|github|https?:\/\//i.test(item))]
    .filter(Boolean)
    .map((item) => normalizeText(item))
    .filter((item, index, arr) => arr.indexOf(item) === index);

  return { email, phone, links };
}

function renderBullets(items) {
  if (!items.length) return '';
  return `<ul>${items.map((item) => `<li>${linkifyText(item)}</li>`).join('')}</ul>`;
}

function renderParagraphSection(title, content) {
  const paragraphs = toParagraphs(content);
  if (!paragraphs.length) return '';
  return `<section><h2>${title}</h2>${paragraphs.map((p) => `<p>${linkifyText(p)}</p>`).join('')}</section>`;
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

  return items ? `<section><h2>Experience</h2>${items}</section>` : '';
}

function renderProjects(projects = []) {
  if (!Array.isArray(projects) || !projects.length) return '';

  const items = projects
    .map((project) => {
      const title = normalizeText(project.name || project.project_name || project.title || '');
      const description = normalizeText(project.description || project.summary || '');
      const points = toBullets(project.points || project.bullets || []);
      if (!title && !description && !points.length) return '';
      return `<div class="experience">
        ${title ? `<strong>${linkifyText(title)}</strong>` : ''}
        ${description ? `<p>${linkifyText(description)}</p>` : ''}
        ${renderBullets(points)}
      </div>`;
    })
    .filter(Boolean)
    .join('');

  return items ? `<section><h2>Projects</h2>${items}</section>` : '';
}

function renderEducation(education = []) {
  if (!Array.isArray(education) || !education.length) return '';
  const items = education
    .map((edu) => {
      const degree = normalizeText(edu.degree || edu.program || edu.title || '');
      const school = normalizeText(edu.school || edu.institution || '');
      const date = normalizeText(edu.duration || edu.date || '');
      const location = normalizeText(edu.location || edu.country || '');
      if (!degree && !school && !date && !location) return '';
      return `<div class="experience">
        <div class="exp-header">
          <div>${degree ? `<strong>${linkifyText(degree)}</strong><br/>` : ''}${school ? `${linkifyText(school)}` : ''}</div>
          <div class="exp-meta">${date ? `${linkifyText(date)}<br/>` : ''}${location ? `${linkifyText(location)}` : ''}</div>
        </div>
      </div>`;
    })
    .filter(Boolean)
    .join('');

  return items ? `<section><h2>Education</h2>${items}</section>` : '';
}

async function buildResumeHtml({ content }) {
  const resume = typeof content === 'object' && content ? content : {};
  const template = await loadTemplate('resume.html');
  const contact = parseContact(resume);

  const values = {
    name: linkifyText(resume.name || 'Goonja Gandhi'),
    email: linkifyText(contact.email),
    phone: contact.phone,
    linksLine: contact.links.length ? `<p>${contact.links.map((link) => linkifyText(link)).join(' • ')}</p>` : '',
    roleTitle: resume.position || resume.title ? `<div class="role-title">${linkifyText(resume.position || resume.title)}</div>` : '',
    summarySection: renderParagraphSection('Summary', resume.summary),
    skillsSection: renderParagraphSection('Skills', resume.skills),
    experienceSection: renderExperience(resume.experience || []),
    projectsSection: renderProjects(resume.projects || []),
    educationSection: renderEducation(resume.education || []),
    certificationsSection: renderParagraphSection('Certifications', resume.certifications || resume.certification),
  };

  return applyTemplate(template, values);
}

module.exports = {
  buildResumeHtml,
};
