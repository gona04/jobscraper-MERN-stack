const { scrapeLinkedInJobDetails } = require('./scrapping-data/linkedin/linkedin-job-details-scraper');

async function testJobDetailsScraper() {
  try {
    console.log('Testing LinkedIn Job Details Scraper...');

    // Use a sample job URL from previous scraping
    const jobUrl = 'https://www.linkedin.com/jobs/view/software-engineer-new-grads-new-york-at-giga-4374834620/';

    console.log(`Scraping details from: ${jobUrl}`);

    const details = await scrapeLinkedInJobDetails(jobUrl);

    console.log('Job Details:');
    console.log(`Title: ${details.title}`);
    console.log(`Company: ${details.company}`);
    console.log(`Location: ${details.location}`);
    console.log(`Description: ${details.description ? details.description.substring(0, 200) + '...' : 'Not found'}`);

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testJobDetailsScraper();