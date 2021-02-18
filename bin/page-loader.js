#!/usr/bin/env node

import programm from 'commander';
import downloadPage from '../src/index.js';

programm.version('0.0.1')
  .description('Download a page from Internet and save a file')
  .option('-o, --output [path]', 'path to file', process.cwd())
  .arguments('<url>')
  .action((url) => downloadPage(url, programm.output)
    .then((resultPath) => {
      console.log(`Downloaded html file can be found here ${resultPath}`);
      process.exit();
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    }))
  .parse(process.argv);
