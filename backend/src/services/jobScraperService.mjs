import scraperModule from '../../scrapping-data/scrapping-job-pannel.js';

const { scrapeJobs } = scraperModule;

export async function scrapeJobsByLinks(jobLinks) {
  const scrapeResults = await Promise.all(
    jobLinks.map(async ({ portal, link }) => {
      const jobs = await scrapeJobs(portal, link);

      return jobs;
    })
  );

  return scrapeResults.flat();
}
