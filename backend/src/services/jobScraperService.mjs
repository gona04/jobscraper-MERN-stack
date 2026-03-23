import scraperModule from '../../scrapping-data/scrapping-job-pannel.js';

const { scrapeJobs } = scraperModule;

export async function scrapeJobsByPortal(portal, url) {
  return scrapeJobs(portal, url);
}
