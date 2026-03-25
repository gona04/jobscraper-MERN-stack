const {
  PHONE_NUMBER,
  normalizePhoneValue,
  normalizeText,
  linkifyText,
  toParagraphs,
  toBullets,
} = require('./contentFormatter');

function parseContact(resume = {}) {
  const rawContact = normalizeText(resume.contact || '');
  const tokens = rawContact
    ? rawContact.split(/[•|]/).map((item) => item.trim()).filter(Boolean)
    : [];

  const email = resume.email || tokens.find((item) => /@/.test(item)) || 'gandhi.goonja@gmail.com';
  const phoneToken = resume.phone || tokens.find((item) => /\d{10}/.test(item));
  const phone = normalizePhoneValue(phoneToken || PHONE_NUMBER);

  const links = [
    resume.linkedin,
    resume.github,
    ...tokens.filter((item) => /linkedin|github|https?:\/\//i.test(item)),
  ]
    .filter(Boolean)
    .map((item) => normalizeText(item))
    .filter((item, index, arr) => arr.indexOf(item) === index);

  return { email, phone, links };
}

function renderList(list = []) {
  if (!list.length) return '';
  return `<ul>${list.map((item) => `<li>${linkifyText(item)}</li>`).join('')}</ul>`;
}

function renderExperience(experience = []) {
  if (!Array.isArray(experience) || !experience.length) return '';

  const blocks = experience
    .map((item) => {
      const company = normalizeText(item.company || '');
      const role = normalizeText(item.role || item.title || '');
      const date = normalizeText(item.duration || item.date || '');
      const location = normalizeText(item.location || item.country || '');
      const points = toBullets(item.points || item.bullets || []);

      if (!company && !role && !date && !location && !points.length) return '';

      return `<div class="exp-item">
        <div class="exp-head">
          <div class="exp-left">
            ${company ? `<div class="exp-company">${linkifyText(company)}</div>` : ''}
            ${role ? `<div class="exp-role">${linkifyText(role)}</div>` : ''}
          </div>
          <div class="exp-right">
            ${date ? `<div>${linkifyText(date)}</div>` : ''}
            ${location ? `<div>${linkifyText(location)}</div>` : ''}
          </div>
        </div>
        ${renderList(points)}
      </div>`;
    })
    .filter(Boolean)
    .join('');

  return blocks ? `<section><h2>Experience</h2>${blocks}</section>` : '';
}

function renderProjects(projects = []) {
  if (!Array.isArray(projects) || !projects.length) return '';
  const entries = projects
    .map((project) => {
      const name = normalizeText(project.name || project.project_name || project.title || '');
      const description = normalizeText(project.description || project.summary || '');
      const points = toBullets(project.points || project.bullets || []);
      if (!name && !description && !points.length) return '';
      return `<div class="entry-block">
        ${name ? `<h3>${linkifyText(name)}</h3>` : ''}
        ${description ? `<p>${linkifyText(description)}</p>` : ''}
        ${renderList(points)}
      </div>`;
    })
    .filter(Boolean)
    .join('');

  return entries ? `<section><h2>Projects</h2>${entries}</section>` : '';
}

function renderSimpleSection(title, value) {
  const paragraphs = toParagraphs(value);
  if (!paragraphs.length) return '';
  return `<section><h2>${title}</h2>${paragraphs.map((p) => `<p>${linkifyText(p)}</p>`).join('')}</section>`;
}

function renderEducation(items = []) {
  if (!Array.isArray(items) || !items.length) return '';
  const rows = items
    .map((item) => {
      const degree = normalizeText(item.degree || item.program || item.title || '');
      const school = normalizeText(item.school || item.institution || '');
      const date = normalizeText(item.duration || item.date || '');
      const location = normalizeText(item.location || item.country || '');
      if (!degree && !school && !date && !location) return '';
      return `<div class="edu-item">
        <div>
          ${degree ? `<div class="edu-degree">${linkifyText(degree)}</div>` : ''}
          ${school ? `<div>${linkifyText(school)}</div>` : ''}
        </div>
        <div class="exp-right">
          ${date ? `<div>${linkifyText(date)}</div>` : ''}
          ${location ? `<div>${linkifyText(location)}</div>` : ''}
        </div>
      </div>`;
    })
    .filter(Boolean)
    .join('');

  return rows ? `<section><h2>Education</h2>${rows}</section>` : '';
}

function buildResumeHtml({ content, css }) {
  const resume = typeof content === 'object' && content ? content : {};
  const name = normalizeText(resume.name || 'Goonja Gandhi');
  const title = normalizeText(resume.position || resume.title || 'JavaScript Front-end Developer (React)');
  const summary = normalizeText(resume.summary || '');
  const skills = normalizeText(resume.skills || '');
  const contact = parseContact(resume);

  const summarySection = summary ? `<section><h2>Summary</h2><p>${linkifyText(summary)}</p></section>` : '';
  const skillsSection = skills ? `<section><h2>Skills</h2><p>${linkifyText(skills)}</p></section>` : '';
  const experienceSection = renderExperience(resume.experience || []);
  const projectsSection = renderProjects(resume.projects || []);
  const educationSection = renderEducation(resume.education || []);
  const certificationsSection = renderSimpleSection('Certifications', resume.certifications || resume.certification);

  const linksLine = contact.links.length
    ? `<div class="contact-line links">${contact.links.map((link) => linkifyText(link)).join(' • ')}</div>`
    : '';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>${css}</style>
</head>
<body>
  <main class="page resume-page">
    <header class="header top-header">
      <div>
        <h1 class="person-name">${linkifyText(name)}</h1>
      </div>
      <div class="contact resume-contact">
        <div class="contact-line">${linkifyText(contact.email)}</div>
        <div class="contact-line">${contact.phone}</div>
        ${linksLine}
      </div>
    </header>

    ${title ? `<div class="job-title">${linkifyText(title)}</div>` : ''}
    ${summarySection}
    ${skillsSection}
    ${experienceSection}
    ${projectsSection}
    ${educationSection}
    ${certificationsSection}
  </main>
</body>
</html>`;
}

module.exports = {
  buildResumeHtml,
};
