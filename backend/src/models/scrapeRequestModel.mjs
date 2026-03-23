export function validateScrapeRequest(query = {}) {
  const { portal, url } = query;

  if (!portal) {
    return {
      isValid: false,
      status: 400,
      message: 'Portal is required (linkedin | meetfrank)'
    };
  }

  if (!url) {
    return {
      isValid: false,
      status: 400,
      message: 'URL is required'
    };
  }

  return {
    isValid: true,
    data: {
      portal,
      url
    }
  };
}
