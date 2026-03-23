function toTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function extractJobText(job) {
  if (!job || typeof job !== 'object') {
    return '';
  }

  const details = job.details;

  if (details && typeof details === 'object') {
    const detailsCandidates = [
      details.description,
      details.jobDescription,
      details.content
    ];

    for (const candidate of detailsCandidates) {
      const text = toTrimmedString(candidate);
      if (text) {
        return text;
      }
    }
  }

  if (typeof details === 'string') {
    const text = details.trim();
    if (text) {
      return text;
    }
  }

  const fallbackCandidates = [
    job.description,
    job.jobDescription,
    job.summary,
    job.jobTitle
  ];

  for (const candidate of fallbackCandidates) {
    const text = toTrimmedString(candidate);
    if (text) {
      return text;
    }
  }

  return '';
}

module.exports = {
  extractJobText
};
