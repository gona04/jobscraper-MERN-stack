const { By, until } = require('selenium-webdriver');
const { getStealthDriver } = require('../utils/stealth_driver');
const { translateToEnglish } = require('../utils/translator');
const { saveJobDetails } = require('../utils/file-handler');
const { closePopups } = require('../linkedin-scraper');

async function scrapeLinkedInJobDetails(url) {
  let driver;
  try {
    driver = await getStealthDriver();
    await driver.get(url);

    await driver.sleep(6000);

    // Close sign-in popup if exists
    try {
      const close = await driver.wait(until.elementToBeClickable(By.css(".modal__dismiss")), 10000);
      await closePopups(page);
      await close.click();
    } catch (e) {
      // Ignore if no popup
    }

    await driver.sleep(3000);

    let title = null;
    let company = null;
    let description = null;
    let location = null;

    try {
      title = await driver.findElement(By.css("h1")).getText();
    } catch (e) {
      // Title not found
    }

    // Try to extract description using JavaScript for more reliability
    const descriptionSelectors = [
      ".show-more-less-html__markup",
      ".show-more-less-html",
      ".description__text"
    ];

    for (const selector of descriptionSelectors) {
      try {
        description = await driver.executeScript(
          `return document.querySelector('${selector}')?.innerText || '';`
        );
        if (description && description.trim().length > 0) {
          console.log(`Description found using selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (description) {
      description = await translateToEnglish(description);
    }

    const result = {
      title: title,
      company: company,
      description: description,
      location: location
    };

    // Save job details to JSON file
    if (title) {
      await saveJobDetails('linkedin', title, result);
    }

    return result;

  } catch (error) {
    console.log("LinkedIn scrape error:", error.message);
    return { error: error.message };
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
}


module.exports = { scrapeLinkedInJobDetails };