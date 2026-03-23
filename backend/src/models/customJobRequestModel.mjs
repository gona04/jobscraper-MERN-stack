export function validateCustomJobRequest(body = {}) {
  const { content } = body;

  if (typeof content !== 'string' || !content.trim()) {
    return {
      isValid: false,
      status: 400,
      message: 'content is required and must be a non-empty string'
    };
  }

  return {
    isValid: true,
    data: {
      content: content.trim()
    }
  };
}
