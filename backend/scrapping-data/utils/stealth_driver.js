const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function getStealthDriver() {
  const options = new chrome.Options();

  // Basic stealth options
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  options.addArguments('--disable-blink-features=AutomationControlled');
  options.addArguments('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  options.addArguments('--window-size=1920,1080');
  options.addArguments('--disable-extensions');
  options.addArguments('--disable-plugins');
  options.addArguments('--disable-images'); // Optional: speed up loading

  // Uncomment for headless mode
  // options.addArguments('--headless');

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  // Execute script to remove webdriver property
  await driver.executeScript("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})");

  return driver;
}

module.exports = { getStealthDriver };