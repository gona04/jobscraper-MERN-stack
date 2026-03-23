export function registerProcessErrorHandlers() {
  process.on('uncaughtException', (error) => {
    console.error('UNCAUGHT EXCEPTION:', error);
  });

  process.on('unhandledRejection', (error) => {
    console.error('UNHANDLED REJECTION:', error);
  });
}
