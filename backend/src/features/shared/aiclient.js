require('dotenv').config();
const axios = require('axios');

const AI_TIMEOUT_MS = 60000;

function resolveProviderConfig() {
  const provider = (process.env.AI_PROVIDER || 'grok').toLowerCase();
  const model = process.env.AI_MODEL;

  if (!model) {
    throw new Error(`AI_MODEL is missing in .env for provider "${provider}"`);
  }

  const configs = {
    grok: {
      url: 'https://api.x.ai/v1/chat/completions',
      apiKey: process.env.GROK_API_KEY,
      keyName: 'GROK_API_KEY',
      shape: 'openai'
    },
    openai: {
      url: 'https://api.openai.com/v1/chat/completions',
      apiKey: process.env.OPENAI_API_KEY,
      keyName: 'OPENAI_API_KEY',
      shape: 'openai'
    },
    deepseek: {
      url: 'https://api.deepseek.com/chat/completions',
      apiKey: process.env.DEEPSEEK_API_KEY,
      keyName: 'DEEPSEEK_API_KEY',
      shape: 'openai'
    },
    claude: {
      url: 'https://api.anthropic.com/v1/messages',
      apiKey: process.env.CLAUDE_API_KEY,
      keyName: 'CLAUDE_API_KEY',
      shape: 'anthropic'
    },
    ollama: {
      // Native Ollama chat API works with both local and Cloud models.
      url: `${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/chat`,
      apiKey: process.env.OLLAMA_API_KEY,
      keyName: 'OLLAMA_API_KEY',
      shape: 'ollama'
    }
  };

  const config = configs[provider];
  if (!config) {
    throw new Error(`Unknown AI_PROVIDER "${provider}". Expected one of: ${Object.keys(configs).join(', ')}`);
  }
  if (!config.apiKey && provider !== 'ollama') {
    throw new Error(`${config.keyName} is missing in .env for provider "${provider}"`);
  }

  return { provider, model, ...config };
}

function buildRequest({ shape, model, apiKey }, systemPrompt, userPrompt, temperature) {
  if (shape === 'anthropic') {
    return {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      data: {
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      }
    };
  }

  if (shape === 'ollama') {
    return {
      headers: {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        'Content-Type': 'application/json'
      },
      data: {
        model,
        stream: false,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      }
    };
  }

  // 'openai' shape — covers grok, openai, deepseek (all OpenAI-compatible chat completions)
  const data = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  };

  if (typeof temperature === 'number') {
    data.temperature = temperature;
  }

  return {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    data
  };
}

function extractContent(shape, responseData) {
  if (shape === 'anthropic') {
    return responseData?.content?.[0]?.text || '';
  }
  if (shape === 'ollama') {
    return responseData?.message?.content || '';
  }
  return responseData?.choices?.[0]?.message?.content || '';
}

/**
 * Call the AI provider configured via AI_PROVIDER / AI_MODEL in .env.
 *
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @param {{ temperature?: number }} [options] - temperature is only applied
 *   for OpenAI-compatible providers (grok, openai, deepseek); ignored otherwise.
 * @returns {Promise<string>} raw text content from the model's response
 */
async function callAI(systemPrompt, userPrompt, options = {}) {
  const { temperature } = options;
  const config = resolveProviderConfig();
  const { headers, data } = buildRequest(config, systemPrompt, userPrompt, temperature);

  const response = await axios({
    url: config.url,
    method: 'post',
    timeout: AI_TIMEOUT_MS,
    headers,
    data
  });

  return extractContent(config.shape, response.data);
}

module.exports = {
  callAI,
  resolveProviderConfig
};