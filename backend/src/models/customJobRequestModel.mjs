function extractNonEmptyContents(items = []) {
  return items
    .map((item) => {
      if (typeof item === 'string') {
        return item.trim();
      }

      if (item && typeof item === 'object' && typeof item.content === 'string') {
        return item.content.trim();
      }

      return '';
    })
    .filter(Boolean);
}

export function validateCustomJobRequest(body = {}) {
  if (typeof body === 'string' && body.trim()) {
    return {
      isValid: true,
      data: {
        contents: [body.trim()]
      }
    };
  }

  if (Array.isArray(body)) {
    const contents = extractNonEmptyContents(body);

    if (contents.length === 0) {
      return {
        isValid: false,
        status: 400,
        message: 'Provide at least one non-empty content entry'
      };
    }

    return {
      isValid: true,
      data: { contents }
    };
  }

  if (body && typeof body === 'object') {
    if (typeof body.content === 'string' && body.content.trim()) {
      return {
        isValid: true,
        data: {
          contents: [body.content.trim()]
        }
      };
    }

    if (Array.isArray(body.entries)) {
      const contents = extractNonEmptyContents(body.entries);

      if (contents.length === 0) {
        return {
          isValid: false,
          status: 400,
          message: 'Provide at least one non-empty content entry'
        };
      }

      return {
        isValid: true,
        data: { contents }
      };
    }
  }

  return {
    isValid: false,
    status: 400,
    message: 'Send either {"content":"..."}, {"entries":[{"content":"..."}]}, or an array of {"content":"..."}'
  };
}
