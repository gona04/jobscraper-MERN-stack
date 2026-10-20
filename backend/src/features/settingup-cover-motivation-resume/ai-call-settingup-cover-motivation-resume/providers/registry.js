/**
 * Provider registry — each entry defines the API endpoint and how to
 * build / parse requests for that provider.
 *
 * OpenAI-compatible providers (openai, grok, deepseek) all share the same
 * request shape; only the base URL differs.
 */

/** Shared request-body / response-parsing for OpenAI-compatible providers. */
function openAICompatibleBody() {
  return {
    buildBody: (model, systemPrompt, userPrompt) => ({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    }),
    parseResponse: (data) => {
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') {
        throw new Error('Malformed response: missing choices[0].message.content.');
      }
      return content;
    }
  };
}

/** Shared request/response helpers for OpenAI-compatible providers that require a bearer key. */
function openAICompatibleMethods() {
  return {
    buildHeaders: (apiKey) => ({
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    ...openAICompatibleBody()
  };
}

const PROVIDER_REGISTRY = {
  claude: {
    url: 'https://api.anthropic.com/v1/messages',
    buildHeaders: (apiKey) => ({
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    }),
    buildBody: (model, systemPrompt, userPrompt) => ({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    }),
    parseResponse: (data) => {
      const content = (data?.content ?? [])
        .map((part) => (part?.type === 'text' && typeof part.text === 'string' ? part.text : ''))
        .join('')
        .trim();

      if (!content) throw new Error('Malformed Claude response: no text content found.');
      return content;
    }
  },

  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    ...openAICompatibleMethods()
  },

  grok: {
    url: 'https://api.x.ai/v1/chat/completions',
    ...openAICompatibleMethods()
  },

  deepseek: {
    url: 'https://api.deepseek.com/v1/chat/completions',
    ...openAICompatibleMethods()
  },

  // Ollama (local or Ollama Cloud). Base URL defaults to the local daemon;
  // override with OLLAMA_BASE_URL if it's running elsewhere.
  // Cloud-hosted models (tagged `:cloud`, e.g. Nemotron-3-super:cloud) need
  // an API key from your ollama.com account — plain local models don't.
  // The key is optional here so both cases work.
  ollama: {
    url: `${process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434'}/v1/chat/completions`,
    buildHeaders: (apiKey) =>
      apiKey
        ? { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' },
    ...openAICompatibleBody()
  }
};

module.exports = { PROVIDER_REGISTRY };
