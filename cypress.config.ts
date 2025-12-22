// in test/config/base.config.ts
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

import { defineConfig } from 'cypress';
import installLogsPrinter from 'cypress-terminal-report/src/installLogsPrinter';
import config from './cumulocity.config';

module.exports = defineConfig({
  viewportWidth: 1920,
  viewportHeight: 1080,
  responseTimeout: 60000,
  pageLoadTimeout: 300000,

  e2e: {
    baseUrl: process.env['C8Y_CYPRESS_URL'] || 'http://localhost:9001/',
    setupNodeEvents(on) {
      installLogsPrinter(on, {
        printLogsToConsole: 'always',
      });
    },
    env: {
      C8Y_TENANT:
        process.env['CYPRESS_C8Y_TENANT'] || process.env['C8Y_TENANT'],
      C8Y_BASEURL:
        process.env['CYPRESS_C8Y_CYPRESS_URL'] ||
        process.env['C8Y_CYPRESS_URL'] ||
        'http://localhost:9001',
      C8Y_SHELL_EXTENSION: JSON.stringify(config.runTime.remotes),
      C8Y_SHELL_TARGET:
        process.env['CYPRESS_C8Y_SHELL_TARGET'] ||
        process.env['C8Y_SHELL_TARGET'] ||
        'cockpit',
      C8Y_USERNAME:
        process.env['CYPRESS_C8Y_USERNAME'] || process.env['C8Y_USERNAME'],
      C8Y_PASSWORD:
        process.env['CYPRESS_C8Y_PASSWORD'] || process.env['C8Y_PASSWORD'],
      C8Y_DEVICE_ID: process.env['C8Y_CYPRESS_DEVICE_ID'],
    },
  },
});
