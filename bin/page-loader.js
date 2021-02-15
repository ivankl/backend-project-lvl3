#!/usr/bin/env node

import programm from 'commander';
import downloadPage from '../src/index.js';

export default () => {
  programm.version('0.0.1')
    .description('Download a page from Internet and save a file')
    .arguments('<url>')
    .option('-o, --output [path]', 'path to file', process.cwd())
    .action((url) => downloadPage(programm.output, url)
      .then((resultPath) => {
        console.log(`Downloaded html file can be found here ${resultPath}`);
        process.exit();
      })
      .catch((error) => {
        console.error(error.message);
        process.exit(1);
      }))
    .parse(process.argv);
};
