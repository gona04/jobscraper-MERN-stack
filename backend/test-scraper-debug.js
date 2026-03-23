const { scrapeJobs, scrapeJobDetails } = require('./scrapping-data/scrapping-job-pannel');
const fs = require('fs');
const path = require('path');

async function testScraper() {
  try {
    console.log('Testing LinkedIn scraper...');

    // Example LinkedIn job search URL
    const searchUrl = 'https://www.linkedin.com/jobs/search/?keywords=software%20engineer&location=United%20States';

    const jobs = await scrapeJobs('linkedin', searchUrl);

    console.log(`Scraped ${jobs.length} jobs:`);
    if (jobs.length > 0) {
      console.log(`First job: ${jobs[0].jobTitle}`);
      console.log(`Job link: ${jobs[0].jobLink}`);

      // Test job details scraping with debug
      console.log('\nTesting job details scraping with HTML debugging...');
      const firstJobUrl = jobs[0].jobLink;
      
      // Call the debug version
      const details = await scrapeJobDetailsWithDebug(firstJobUrl);
      
      console.log('Job Details:');
      console.log(`Title: ${details.title}`);
      console.log(`Description: ${details.description ? details.description.substring(0, 200) + '...' : 'Not found'}`);
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Debug version to see page HTML
async function scrapeJobDetailsWithDebug(url) {
  const { By, until } = require('selenium-webdriver');
  const { getStealthDriver } = require('./scrapping-data/utils/stealth_driver');

  let driver;
  try {
    driver = await getStealthDriver();
    await driver.get(url);
    await driver.sleep(8000);

    // Close popups
    try {
      const closeButtons = await driver.findElements(By.css("button[aria-label='Dismiss']"));
      for (const btn of closeButtons) {
        try {
          await btn.click();
          await driver.sleep(1000);
        } catch (e) {}
      }
    } catch (e) {}

    await driver.sleep(3000);

    // Scroll down to load more content
    await driver.executeScript("window.scrollBy(0, 500);");
    await driver.sleep(2000);

    let title = null;
    let description = null;

    try {
      title = await driver.findElement(By.css("h1")).getText();
    } catch (e) {}

    // Get the page HTML for debugging
    const pageHTML = await driver.executeScript("return document.body.innerHTML;");
    
    // Save HTML for inspection
    const htmlPath = path.join(__dirname, './data/debug_page.html');
    await fs.promises.writeFile(htmlPath, pageHTML, 'utf8');
    console.log(`Page HTML saved to: ${htmlPath}`);

    // Try to find description with better detection
    try {
      const descElements = await driver.findElements(By.xpath("//*[contains(text(), 'About the job')]/../following-sibling::*"));
      if (descElements.length > 0) {
        description = await descElements[0].getText();
      }
    } catch (e) {}

    return {
      title: title,
      description: description
    };

  } catch (error) {
    console.log("Debug scrape error:", error.message);
    return { error: error.message };
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
}

// Run the test
testScraper();