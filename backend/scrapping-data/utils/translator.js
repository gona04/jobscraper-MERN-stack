const { translate } = require('@vitalets/google-translate-api');

async function translateToEnglish(text) {
  try {
    if (!text || text.trim() === '') {
      return text;
    }

    // Translate to English
    const result = await translate(text, { to: 'en' });
    return result.text;

  } catch (error) {
    console.log('Translation error:', error.message);
    // Return original text if translation fails
    return text;
  }
}

module.exports = { translateToEnglish };