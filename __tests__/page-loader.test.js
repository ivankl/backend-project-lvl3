/**
 * @jest-environment node
 */

import nock from 'nock';
import os from 'os';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import downloadPage from '../src/index.js';

// eslint-disable-next-line no-underscore-dangle
const __filename = fileURLToPath(import.meta.url);
// eslint-disable-next-line no-underscore-dangle
const __dirname = dirname(__filename);
const getFixturePath = (fileName) => path.join(__dirname, '..', '__fixtures__', fileName);

const fsPromises = fs.promises;
let tempTestDir;
let tempTestFilesDir;

beforeEach(async () => {
  tempTestDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
  tempTestFilesDir = path.join(tempTestDir, 'example-com-files');
});

const html = `<html lang="ru">
    <head>
        <meta charset="utf-8">
        <title>Курсы по программированию Хекслет</title>
    </head>
    <body>
        <img src="/assets/test.png" alt="Иконка профессии Node.js-программист" />
        <h3>
            <a href="/professions/nodejs">Node.js-программист</a>
        </h3>
    </body>
</html>`;

test('Is parsed data correct?', async () => {
  const expectedImg = await fsPromises.readFile(getFixturePath('test.png'));
  nock('https://example.com')
    .get('/')
    .reply(200, html)
    .get('/assets/test.png')
    .reply(200, expectedImg);
  console.log(tempTestFilesDir, tempTestDir);
  await downloadPage(tempTestDir, 'https://example.com');
  const result = await fsPromises.readFile(path.join(tempTestDir, 'example-com.html'), 'utf-8');
  const resultImg = await fsPromises.readFile(path.join(tempTestFilesDir, 'example-com-assets-test.png'));
  expect(resultImg).toEqual(expectedImg);
  expect(result).toBe(html);
});
