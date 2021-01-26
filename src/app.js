import programm from 'commander';
import downloadPage from './index.js';

export default () => {
  programm.version('0.0.1')
    .description('Download a page from Internet and save a file')
    .arguments('<url>')
    .option('-o, --output [path]', 'path to file', process.cwd())
    .action((url) => downloadPage(programm.output, url))
    .parse(process.argv);
};
