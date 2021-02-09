/* eslint-disable max-len */
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import url from 'url';
import cheerio from 'cheerio';
import debug from 'debug';
import 'axios-debug-log';

const fsPromises = fs.promises;
const logger = debug('page-loader');

const createFileName = (hostname, pathname) => {
  const formattedHostName = hostname.replace(/\./g, '-');
  const formattedPathName = (pathname === '/' ? '' : pathname.replace(/\//g, '-'));
  return `${formattedHostName}${formattedPathName}`;
};

const downloadAsset = (sourceURL, pathToDirectory, assetName) => axios
  .get(sourceURL, { responseType: 'arraybuffer' })
  .then((response) => {
    const pathToAsset = path.resolve(pathToDirectory, assetName);
    return fsPromises.writeFile(pathToAsset, response.data);
  });

const changeLinkToLocal = (element, linkAtrribute, htmlFileName, fullURL) => element
  .attr(linkAtrribute, path.join(`${htmlFileName}-files`, createFileName(fullURL.hostname, fullURL.pathname)));

const createFullURL = (element, linkAtrribute, hostURL) => {
  logger(element.attr(linkAtrribute), linkAtrribute);
  const srcURL = url.parse(element.attr(linkAtrribute));
  return new URL(srcURL.href, hostURL);
};

const adaptLinks = (htmlPage, hostURL, htmlFileName) => {
  const $ = cheerio.load(htmlPage);
  const tags = ['img', 'link', 'script'];
  const links = tags.reduce((acc, tag) => {
    const elements = $(tag).toArray();
    logger(`there are ${elements.length} ${tag} elemts on this page`);
    const linkAtrribute = (tag === 'link' ? 'href' : 'src');
    return acc.concat(elements.reduce((acc2, elem) => {
      const fullURL = createFullURL($(elem), linkAtrribute, hostURL.href);
      if ((tag === 'link' || tag === 'script') && fullURL.hostname !== hostURL.hostname) {
        return acc2;
      }
      changeLinkToLocal($(elem), linkAtrribute, htmlFileName, fullURL);
      acc2.push(fullURL);
      return acc2;
    }, []));
  }, []);
  const html = $.html();
  return { html, links };
};

export default (pathToDirectory, address) => {
  const parsedURL = url.parse(address);
  const htmlFileName = createFileName(parsedURL.hostname, parsedURL.pathname);
  const pathToFile = path.resolve(pathToDirectory, `${htmlFileName}.html`);
  const pathToFilesDir = path.resolve(pathToDirectory, `${htmlFileName}-files`);
  logger(`Downloaded html file name: ${htmlFileName}`);
  logger(`Downloaded assets are in this folder: ${pathToFilesDir}`);
  let html;
  let links;
  return axios.get(address)
    .then((response) => {
      const result = adaptLinks(response.data, parsedURL, htmlFileName);
      html = result.html;
      links = result.links;
      return fsPromises.mkdir(pathToFilesDir);
    })
    .then(() => Promise.all(links
      .map((item) => downloadAsset(item.href, pathToFilesDir, createFileName(item.hostname, item.pathname)))))
    .then(() => fsPromises.writeFile(pathToFile, html, 'utf-8'))
    .then(() => pathToFile);
};
