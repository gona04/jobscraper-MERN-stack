const INDIA_LOCATION_TERMS = [
  'andhra pradesh',
  'arunachal pradesh',
  'assam',
  'bihar',
  'chhattisgarh',
  'goa',
  'gujarat',
  'haryana',
  'himachal pradesh',
  'jharkhand',
  'karnataka',
  'kerala',
  'madhya pradesh',
  'maharashtra',
  'manipur',
  'meghalaya',
  'mizoram',
  'nagaland',
  'odisha',
  'orissa',
  'punjab',
  'rajasthan',
  'sikkim',
  'tamil nadu',
  'telangana',
  'tripura',
  'uttar pradesh',
  'uttarakhand',
  'west bengal',
  'andaman and nicobar',
  'chandigarh',
  'dadra and nagar haveli',
  'daman and diu',
  'delhi',
  'jammu and kashmir',
  'ladakh',
  'lakshadweep',
  'puducherry',
  'pondicherry',
  'ahmedabad',
  'bengaluru',
  'bangalore',
  'chennai',
  'gurugram',
  'gurgaon',
  'hyderabad',
  'kolkata',
  'mumbai',
  'new delhi',
  'noida',
  'pune'
];

const INDIA_COUNTRY_PATTERN = /(^|[^a-z])india([^a-z]|$)/i;
const INDIA_REMOTE_PATTERN = /\b(remote|hybrid|onsite|on-site)\s*(?:[-,():/]|\s)+\s*(?:from|in|within)?\s*india\b/i;

function normalizeLocationText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_/|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function collectLocationSignals(job) {
  if (!job || typeof job !== 'object') return [];

  const fields = [
    job.location,
    job.jobLocation,
    job.job_location,
    job.locations,
    job.country,
    job.city,
    job.address,
    job.region,
    job.state,
    job.workLocation,
    job.work_location,
    job.remoteLocation,
    job.remote_location,
    job.jobDescription,
    job.description,
    job.rolesAndResponsibilities,
    job.details?.location,
    job.details?.jobLocation,
    job.details?.country,
    job.details?.city,
    job.details?.address,
    job.details?.description
  ];

  return fields.flatMap((field) => {
    if (Array.isArray(field)) return field;
    return [field];
  }).filter((field) => field !== undefined && field !== null && String(field).trim());
}

function containsIndiaLocation(value) {
  const normalized = normalizeLocationText(value);
  if (!normalized) return false;

  if (INDIA_COUNTRY_PATTERN.test(normalized) || INDIA_REMOTE_PATTERN.test(normalized)) {
    return true;
  }

  return INDIA_LOCATION_TERMS.some((term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, 'i').test(normalized);
  });
}

function isIndiaBasedJob(job) {
  const countryCode = String(job?.country || job?.details?.country || '').trim().toUpperCase();
  return countryCode === 'IN' || collectLocationSignals(job).some(containsIndiaLocation);
}

module.exports = {
  INDIA_LOCATION_TERMS,
  collectLocationSignals,
  containsIndiaLocation,
  isIndiaBasedJob
};
