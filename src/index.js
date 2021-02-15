/* eslint-disable max-len */
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import url from 'url';
import cheerio from 'cheerio';
import debug from 'debug';
import Listr from 'listr';
import _ from 'lodash';
import 'axios-debug-log';

const fsPromises = fs.promises;
const logger = debug('page-loader');

const createFileName = (hostname, pathname, ext) => {
  const formattedHostName = hostname.replace(/\./g, '-');
  const formattedPathName = (pathname === '/' ? '' : pathname.replace(/\//g, '-'));
  return (ext ? `${formattedHostName}${formattedPathName}` : `${formattedHostName}${formattedPathName}.html`);
};

const downloadAsset = (sourceURL, pathToDirectory, assetName) => axios
  .get(sourceURL, { responseType: 'arraybuffer' })
  .then((response) => {
    const pathToAsset = path.resolve(pathToDirectory, assetName);
    return fsPromises.writeFile(pathToAsset, response.data);
  });

const changeLinkToLocal = (element, linkAtrribute, htmlFileName, assetName) => element
  .attr(linkAtrribute, path.join(`${htmlFileName}_files`, assetName));

const createFullURL = (element, linkAtrribute, hostURL) => {
  logger(`Current element: ${element.attr(linkAtrribute)}, ${linkAtrribute}`);
  const srcURL = url.parse(element.attr(linkAtrribute));
  return new URL(srcURL.href, hostURL);
};

const adaptLinks = (htmlPage, hostURL, htmlFileName) => {
  const $ = cheerio.load(htmlPage, {
    normalizeWhitespace: true,
    decodeEntities: false,
  });
  const tags = ['img', 'link', 'script'];
  const links = tags.reduce((acc, tag) => {
    const elements = $(tag).toArray();
    logger(`there are ${elements.length} ${tag} elements on this page`);
    const linkAtrribute = (tag === 'link' ? 'href' : 'src');
    return acc.concat(elements.reduce((acc2, elem) => {
      const fullURL = createFullURL($(elem), linkAtrribute, hostURL.href);
      if ((tag === 'link' || tag === 'script') && fullURL.hostname !== hostURL.hostname) {
        return acc2;
      }
      changeLinkToLocal($(elem), linkAtrribute, htmlFileName, createFileName(fullURL.hostname, fullURL.pathname, path.parse(fullURL.pathname).ext));
      acc2.push(fullURL);
      return acc2;
    }, []));
  }, []);
  const html = $.html();
  return { html, links };
};

export default (pathToDirectory, address) => {
  const parsedURL = url.parse(address);
  const htmlFileName = createFileName(parsedURL.hostname, parsedURL.pathname, '.html');
  const pathToFile = path.resolve(pathToDirectory, `${htmlFileName}.html`);
  const pathToFilesDir = path.resolve(pathToDirectory, `${htmlFileName}_files`);
  let html;
  let links;
  return axios.get(address, { timeout: 1000 })
    .then((response) => {
      const result = adaptLinks(response.data, parsedURL, htmlFileName);
      html = result.html;
      links = result.links;
      return fsPromises.writeFile(pathToFile, html, 'utf-8');
    })
    .then(() => fsPromises.mkdir(pathToFilesDir))
    .then(() => {
      const data = links.map((item) => ({
        title: item.href,
        task: () => downloadAsset(item.href, pathToFilesDir, createFileName(item.hostname, item.pathname, path.parse(item.pathname).ext)).catch(_.noop),
      }));
      const tasks = new Listr(data, { concurrent: true });
      return tasks.run();
    })
    .then(() => {
      logger(`Downloaded html file name: ${htmlFileName}`);
      logger(`Downloaded assets are in this folder: ${pathToFilesDir}`);
      return pathToFile;
    });
};
