const fs = require('fs-extra');
const path = require('node:path');
const XLSX = require('xlsx');

const EXCEL_HEADERS = [
  'Srno',
  'Application Date',
  'Country Name',
  'Company Name',
  'Recruiter Email & Phone',
  'Job Title',
  'Job Portal/Company Website/Link',
  'Status',
  'Response Remarks',
  'Job description',
  'skills',
  'visa_sponsor',
  'English_only'
];

const LINKEDIN_COUNTRY_BY_SUBDOMAIN = {
  ae: 'United Arab Emirates',
  ar: 'Argentina',
  at: 'Austria',
  au: 'Australia',
  be: 'Belgium',
  br: 'Brazil',
  ca: 'Canada',
  ch: 'Switzerland',
  cl: 'Chile',
  cn: 'China',
  co: 'Colombia',
  cz: 'Czechia',
  de: 'Germany',
  dk: 'Denmark',
  es: 'Spain',
  fi: 'Finland',
  fr: 'France',
  hk: 'Hong Kong',
  ie: 'Ireland',
  in: 'India',
  it: 'Italy',
  jp: 'Japan',
  mx: 'Mexico',
  my: 'Malaysia',
  nl: 'Netherlands',
  no: 'Norway',
  nz: 'New Zealand',
  ph: 'Philippines',
  pl: 'Poland',
  pt: 'Portugal',
  se: 'Sweden',
  sg: 'Singapore',
  uk: 'United Kingdom',
  za: 'South Africa'
};

function firstNonEmptyString(...values) {
  const value = values.find((candidate) => typeof candidate === 'string' && candidate.trim());
  return value ? value.trim() : '';
}

function inferCountryNameFromJobLink(jobLink) {
  if (typeof jobLink !== 'string' || !jobLink.trim()) {
    return '';
  }

  try {
    const hostname = new URL(jobLink).hostname.toLowerCase();
    const [, countrySubdomain] = hostname.match(/^([a-z]{2})\.linkedin\.com$/) || [];
    return LINKEDIN_COUNTRY_BY_SUBDOMAIN[countrySubdomain] || '';
  } catch (_error) {
    return '';
  }
}

function toCountryName(job) {
  return firstNonEmptyString(
    job?.countryName,
    job?.country_name,
    job?.country,
    job?.['Country Name'],
    inferCountryNameFromJobLink(job?.job_link)
  );
}

function toSkillsString(skillsRequired) {
  if (!Array.isArray(skillsRequired)) {
    return '';
  }

  return skillsRequired
    .filter((skill) => typeof skill === 'string' && skill.trim())
    .map((skill) => skill.trim())
    .join(', ');
}

function toOrdinal(day) {
  if (day > 3 && day < 21) {
    return `${day}th`;
  }

  const suffixes = ['th', 'st', 'nd', 'rd'];
  return `${day}${suffixes[Math.min(day % 10, 4)] || 'th'}`;
}

function formatDateDisplay(inputDate) {
  const date = inputDate ? new Date(inputDate) : new Date();
  if (Number.isNaN(date.getTime())) {
    return typeof inputDate === 'string' ? inputDate : '';
  }

  const day = toOrdinal(date.getUTCDate());
  const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  const year = date.getUTCFullYear();

  return `${day} ${month} ${year}`;
}

function toRecruiterContact(job) {
  if (typeof job?.recruiterContact === 'string' && job.recruiterContact.trim()) {
    return job.recruiterContact.trim();
  }

  if (typeof job?.['Recruiter Email & Phone'] === 'string' && job['Recruiter Email & Phone'].trim()) {
    return job['Recruiter Email & Phone'].trim();
  }

  const email = typeof job?.recruiterEmail === 'string' ? job.recruiterEmail.trim() : '';
  const phone = typeof job?.recruiterPhone === 'string' ? job.recruiterPhone.trim() : '';

  return [email, phone].filter(Boolean).join(' | ');
}

async function writeExcelFile(outputPath, jobs) {
  const rows = (Array.isArray(jobs) ? jobs : []).map((job, index) => ({
    Srno: index + 1,
    'Application Date': formatDateDisplay(job?.applicationDate),
    'Country Name': toCountryName(job),
    'Company Name': job?.company_name ?? job?.company_name ?? job?.company ?? '',
    'Recruiter Email & Phone': toRecruiterContact(job),
    'Job Title': job?.jobTitle ?? '',
    'Job Portal/Company Website/Link': job?.job_link ?? '',
    Status: job?.status ?? '',
    'Response Remarks': job?.responseRemarks ?? '',
    'Job description': job?.rolesAndResponsibilities ?? '',
    skills: toSkillsString(job?.skillsRequired),
    visa_sponsor: job?.visa_sponsorship ?? '',
    English_only: job?.only_english ?? job?.english_only ?? ''
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: EXCEL_HEADERS });

  // Basic formatting supported by xlsx: set column widths + header filter.
  worksheet['!cols'] = [
    { wch: 8 },
    { wch: 18 },
    { wch: 16 },
    { wch: 28 },
    { wch: 32 },
    { wch: 36 },
    { wch: 60 },
    { wch: 14 },
    { wch: 28 },
    { wch: 80 },
    { wch: 40 },
    { wch: 14 },
    { wch: 14 }
  ];

  worksheet['!autofilter'] = {
    ref: `A1:M${Math.max(rows.length + 1, 1)}`
  };

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Jobs');

  await fs.ensureDir(path.dirname(outputPath));
  XLSX.writeFile(workbook, outputPath);
}

module.exports = {
  writeExcelFile,
  EXCEL_HEADERS,
  toCountryName
};
