const { By } = require('selenium-webdriver');
const { getStealthDriver } = require('./scrapping-data/utils/stealth_driver');
const fs = require('fs');
const path = require('path');

async function debugJobDetails() {
  let driver;
  try {
    console.log('Starting debug scraper...');
    driver = await getStealthDriver();
    
    // Use a known working job URL
    const url = 'https://www.linkedin.com/jobs/view/software-engineer-new-grads-new-york-at-giga-4374834620/';
    console.log(`Visiting: ${url}`);
    
    await driver.get(url);
    console.log('Page loaded, waiting for content...');
    await driver.sleep(8000);

    // Close popups
    try {
      const closeButtons = await driver.findElements(By.css("button[aria-label='Dismiss']"));
      for (const btn of closeButtons) {
        try {
          await btn.click();
          await driver.sleep(1000);
          console.log('Closed popup');
        } catch (e) {}
      }
    } catch (e) {}

    await driver.sleep(2000);

    // Get page HTML
    console.log('Extracting page HTML...');
    const pageHTML = await driver.executeScript("return document.documentElement.outerHTML;");
    
    // Save HTML
    const htmlPath = path.join(__dirname, './data/debug_page.html');
    await fs.promises.writeFile(htmlPath, pageHTML, 'utf8');
    console.log(`✓ Page HTML saved to: ${htmlPath}`);
    
    // Get title
    try {
      const title = await driver.findElement(By.css("h1")).getText();
      console.log(`✓ Title found: ${title}`);
    } catch (e) {
      console.log('✗ Title not found');
    }

    // Try different selectors and log results
    const selectors = [
      { name: 'show-more-less-html__markup', value: ".show-more-less-html__markup" },
      { name: 'show-more-less-html', value: ".show-more-less-html" },
      { name: 'description__text', value: ".description__text" },
      { name: '[data-test-id="show-more-less-html"]', value: "[data-test-id='show-more-less-html']" },
      { name: '.jobs-details-main-content', value: ".jobs-details-main-content" },
      { name: '[data-job-id] + div', value: "[data-job-id] + div" }
    ];

    console.log('\nTesting selectors:');
    for (const selector of selectors) {
      try {
        const elements = await driver.findElements(By.css(selector.value));
        if (elements.length > 0) {
          const text = await elements[0].getText();
          const length = text ? text.length : 0;
          console.log(`✓ ${selector.name}: Found ${elements.length} element(s), ${length} chars`);
        } else {
          console.log(`✗ ${selector.name}: No elements found`);
        }
      } catch (e) {
        console.log(`✗ ${selector.name}: Error - ${e.message.split('\n')[0]}`);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
}

debugJobDetails();