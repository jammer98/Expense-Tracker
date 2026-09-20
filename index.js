import 'dotenv/config'
import app from  './src/app.js'
import logger from './src/utils/logger.js'

process.on("unhandledRejection", (err) => {
  logger.error({ err }, "Unhandled rejection — shutting down");
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception — shutting down");
  process.exit(1);
});

const PORT = process.env.PORT || 3000;


  app.listen(PORT, () => {
    logger.info(`Server is listening on port ${PORT}`);
  });
