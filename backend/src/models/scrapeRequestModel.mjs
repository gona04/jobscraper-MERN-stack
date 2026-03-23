export function validateScrapeRequest(body = {}) {
  const { job_links: jobLinks } = body;

  if (!Array.isArray(jobLinks) || jobLinks.length === 0) {
    return {
      isValid: false,
      status: 400,
      message: 'job_links is required and must be a non-empty array'
    };
  }

  const normalizedLinks = [];

  for (const [index, jobLink] of jobLinks.entries()) {
    if (!jobLink || typeof jobLink !== 'object') {
      return {
        isValid: false,
        status: 400,
        message: `job_links[${index}] must be an object with portal and link`
      };
    }

    const { portal, link } = jobLink;

    if (!portal || typeof portal !== 'string') {
      return {
        isValid: false,
        status: 400,
        message: `job_links[${index}].portal is required`
      };
    }

    if (!link || typeof link !== 'string') {
      return {
        isValid: false,
        status: 400,
        message: `job_links[${index}].link is required`
      };
    }

    normalizedLinks.push({
      portal: portal.trim().toLowerCase(),
      link: link.trim()
    });
  }

  return {
    isValid: true,
    data: {
      jobLinks: normalizedLinks
    }
  };
}
