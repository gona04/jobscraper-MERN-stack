function log(message) {
  console.log(`[INFO] ${message}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { log, delay };
