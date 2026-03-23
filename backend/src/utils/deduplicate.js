function deduplicateJobs(jobs) {
  if (!Array.isArray(jobs)) {
    return [];
  }

  const seen = new Set();
  const deduplicated = [];

  for (const job of jobs) {
    if (!job || typeof job !== 'object') {
      continue;
    }

    const jobLink = typeof job.job_link === 'string' ? job.job_link.trim() : '';
    if (!jobLink || seen.has(jobLink)) {
      continue;
    }

    seen.add(jobLink);
    deduplicated.push(job);
  }

  return deduplicated;
}

module.exports = {
  deduplicateJobs
};
