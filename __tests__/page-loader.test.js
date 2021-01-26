/**
 * @jest-environment node
 */

import nock from 'nock';
import os from 'os';
import fs from 'fs';
import path from 'path';
import downloadPage from '../src/index';

const fsPromises = fs.promises;
let tempTestDir;

beforeEach(async () => {
  console.log(path.join(os.tmpdir(), 'page-loader'));
  tempTestDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
});

test('Is parsed data correct?', async () => {
  const testString = 'Hello this is me';
  nock('https://example.com')
    .get('/')
    .reply(200, testString);
  await downloadPage(tempTestDir, 'https://example.com');
  const result = await fsPromises.readFile(path.join(tempTestDir, 'example-com.html'), 'utf-8');
  expect(result).toBe(testString);
});
