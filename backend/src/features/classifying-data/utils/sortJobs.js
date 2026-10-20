// Desired order: yes → unknown → no. Anything unrecognized sorts last.
const VISA_SPONSORSHIP_RANK = {
  yes: 0,
  unknown: 1,
  no: 2
};

function rankFor(value) {
  const key = String(value ?? '').trim().toLowerCase();
  return key in VISA_SPONSORSHIP_RANK ? VISA_SPONSORSHIP_RANK[key] : Number.MAX_SAFE_INTEGER;
}

/**
 * Returns a new array sorted by visa_sponsorship: yes, unknown, no (then
 * anything else). Stable — jobs with the same visa_sponsorship keep their
 * original relative order.
 */
function sortByVisaSponsorship(jobs) {
  return [...jobs].sort((a, b) => rankFor(a.visa_sponsorship) - rankFor(b.visa_sponsorship));
}

export { sortByVisaSponsorship };
