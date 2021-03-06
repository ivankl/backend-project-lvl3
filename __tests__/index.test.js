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

nock.disableNetConnect();

beforeEach(async () => {
  tempTestDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
  tempTestFilesDir = path.join(tempTestDir, 'example-com_files');
});

const html = `<html lang="ru">
    <head>
        <meta charset="utf-8">
        <title>Курсы по программированию Хекслет</title>
        <link rel="stylesheet" media="all" href="https://cdn2.hexlet.io/assets/menu.css">
        <link rel="stylesheet" media="all" href="/assets/application.css" />
        <link rel="stylesheet" media="all" href="/assets/application.html">
    </head>
    <body>
        <img src="/assets/test.png" alt="Иконка профессии Node.js-программист" />
        <h3>
            <a href="/professions/nodejs">Node.js-программист</a>
        </h3>
        <script src="https://example.com/packs/js/runtime.js"></script>
    </body>
</html>`;

const expectedHtml = `<html lang="ru"><head>
        <meta charset="utf-8">
        <title>Курсы по программированию Хекслет</title>
        <link rel="stylesheet" media="all" href="https://cdn2.hexlet.io/assets/menu.css">
        <link rel="stylesheet" media="all" href="example-com_files/example-com-assets-application.css">
        <link rel="stylesheet" media="all" href="example-com_files/example-com-assets-application.html">
    </head>
    <body>
        <img src="example-com_files/example-com-assets-test.png" alt="Иконка профессии Node.js-программист">
        <h3>
            <a href="/professions/nodejs">Node.js-программист</a>
        </h3>
        <script src="example-com_files/example-com-packs-js-runtime.js"></script>
    
</body></html>`;

test('Is parsed data correct?', async () => {
  const expectedImg = await fsPromises.readFile(getFixturePath('test.png'));
  const expectedJS = await fsPromises.readFile(getFixturePath('runtime.js'));
  const expectedCSS = await fsPromises.readFile(getFixturePath('application.css'));
  const expectedhref = await fsPromises.readFile(getFixturePath('application.html'));
  nock('https://example.com')
    .get('/')
    .reply(200, html)
    .get('/assets/test.png')
    .reply(200, expectedImg)
    .get('/packs/js/runtime.js')
    .reply(200, expectedJS)
    .get('/assets/application.css')
    .reply(200, expectedCSS)
    .get('/assets/application.html')
    .reply(200, expectedhref);

  await downloadPage('https://example.com', tempTestDir);
  const result = await fsPromises.readFile(path.join(tempTestDir, 'example-com.html'), 'utf-8');
  const resultImg = await fsPromises.readFile(path.join(tempTestFilesDir, 'example-com-assets-test.png'));
  const resultJS = await fsPromises.readFile(path.join(tempTestFilesDir, 'example-com-packs-js-runtime.js'));
  const resultCSS = await fsPromises.readFile(path.join(tempTestFilesDir, 'example-com-assets-application.css'));
  const resulthref = await fsPromises.readFile(path.join(tempTestFilesDir, 'example-com-assets-application.html'));
  expect(resultImg).toEqual(expectedImg);
  expect(resultJS).toEqual(expectedJS);
  expect(resultCSS).toEqual(expectedCSS);
  expect(resulthref).toEqual(expectedhref);
  expect(result).toBe(expectedHtml);
});

test('http request fails', async () => {
  nock('https://example.com')
    .get('/nonExistentPage')
    .reply(404, 'Page does not exist')
    .get('/testServerError')
    .reply(502, 'Server error')
    .get('/delayTest')
    .delayConnection(4000)
    .reply(504, 'Timeout');
  await expect(downloadPage('https://example.com/testServerError', tempTestDir)).rejects.toThrow();
  await expect(downloadPage('https://example.com/nonExistentPage', tempTestDir)).rejects.toThrow();
  await expect(downloadPage('https://example.com/delayTest', tempTestDir)).rejects.toThrow();
  await expect(fsPromises.access(path.join('example-com-delayTest.html', tempTestDir))).rejects.toThrow(/ENOENT/);
});

test('directory does not exist', async () => {
  nock('https://example.com')
    .get('/')
    .reply(200);
  await expect(downloadPage('https://example.com', '/tmp/dir')).rejects.toThrow('ENOENT');
});
