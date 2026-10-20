const { PROVIDER_REGISTRY } = require('./registry');

const API_KEY_MAP = {
  claude: 'CLAUDE_API_KEY',
  openai: 'OPENAI_API_KEY',
  grok: 'GROK_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  ollama: 'OLLAMA_API_KEY'
};

// Providers that can run without an API key (e.g. Ollama running local models).
const OPTIONAL_API_KEY_PROVIDERS = new Set(['ollama']);

/**
 * Resolve provider config from environment variables.
 * Supported AI_PROVIDER values: claude | openai | grok | deepseek
 *
 * Required env vars:
 *   AI_PROVIDER  — one of the supported provider names
 *   AI_MODEL     — the model string for that provider
 *   CLAUDE_API_KEY / OPENAI_API_KEY / GROK_API_KEY / DEEPSEEK_API_KEY
 */
function resolveProviderConfig() {
  const provider = String(process.env.AI_PROVIDER ?? '').toLowerCase();

  if (!PROVIDER_REGISTRY[provider]) {
    const supported = Object.keys(PROVIDER_REGISTRY).join(', ');
    throw new Error(
      `Unsupported AI_PROVIDER "${provider}". Supported values: ${supported}.`
    );
  }

  const apiKey = process.env[API_KEY_MAP[provider]];
  const model = process.env.AI_MODEL;

  if (!apiKey && !OPTIONAL_API_KEY_PROVIDERS.has(provider)) {
    throw new Error(`Missing env var: ${API_KEY_MAP[provider]}`);
  }
  if (!model) throw new Error('Missing env var: AI_MODEL');

  return { provider, apiKey, model };
}

module.exports = { resolveProviderConfig };
