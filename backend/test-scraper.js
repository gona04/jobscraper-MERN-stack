const { scrapeJobs, scrapeJobDetails } = require('./scrapping-data/scrapping-job-pannel');

async function testScraper() {
  try {
    console.log('Testing LinkedIn scraper...');

    // Example LinkedIn job search URL
    const searchUrl = 'https://www.linkedin.com/jobs/search/?keywords=software%20engineer&location=United%20States';

    const jobs = await scrapeJobs('linkedin', searchUrl);

    console.log(`Scraped ${jobs.length} jobs:`);
    jobs.slice(0, 3).forEach((job, index) => {
      console.log(`${index + 1}. ${job.jobTitle} at ${job.company} - ${job.location}`);
      console.log(`   Link: ${job.jobLink}`);
    });

    // Test job details scraping if we have jobs
    if (jobs.length > 0) {
      console.log('\nTesting job details scraping...');
      const firstJobUrl = jobs[0].jobLink;
      const details = await scrapeJobDetails('linkedin', firstJobUrl);

      console.log('Job Details:');
      console.log(`Title: ${details.title}`);
      console.log(`Description: ${details.description ? details.description.substring(0, 200) + '...' : 'No description'}`);
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testScraper();