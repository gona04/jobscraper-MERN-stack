const fs = require('fs-extra');
const path = require('node:path');
const XLSX = require('xlsx');

function toSkillsString(skillsRequired) {
  if (!Array.isArray(skillsRequired)) {
    return '';
  }

  return skillsRequired
    .filter((skill) => typeof skill === 'string' && skill.trim())
    .map((skill) => skill.trim())
    .join(', ');
}

async function writeExcelFile(outputPath, jobs) {
  const rows = (Array.isArray(jobs) ? jobs : []).map((job) => ({
    'Job Title': job?.jobTitle ?? '',
    'Job Portal/Company Website/Link': job?.job_link ?? '',
    Status: '',
    'Response Remarks': '',
    'Job description': job?.rolesAndResponsibilities ?? '',
    Skills: toSkillsString(job?.skillsRequired)
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Jobs');

  await fs.ensureDir(path.dirname(outputPath));
  XLSX.writeFile(workbook, outputPath);
}

module.exports = {
  writeExcelFile
};
