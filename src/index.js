/* eslint-disable max-len */
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import url from 'url';
import cheerio from 'cheerio';

const fsPromises = fs.promises;

const createFileName = (hostname, pathname) => {
  const formattedHostName = hostname.replace(/\./g, '-');
  const formattedPathName = (pathname === '/' ? '' : pathname.replace(/\//g, '-'));
  return `${formattedHostName}${formattedPathName}`;
};

const downloadImage = (sourceURL, pathToDirectory, imageName) => axios
  .get(sourceURL, { responseType: 'arraybuffer' })
  .then((response) => {
    const pathToImage = path.resolve(pathToDirectory, imageName);
    return fsPromises.writeFile(pathToImage, response.data);
  });

export default (pathToDirectory, address) => {
  const parsedURL = url.parse(address);
  const fileName = createFileName(parsedURL.hostname, parsedURL.pathname);
  const pathToFile = path.resolve(pathToDirectory, `${fileName}.html`);
  const pathToFilesDir = path.resolve(pathToDirectory, `${fileName}-files`);
  let links;
  let html;
  return axios.get(address)
    .then((response) => {
      const $ = cheerio.load(response.data);
      const elements = $('img').toArray();
      links = elements.map((elem) => {
        const parsedSRC = url.parse($(elem).attr('src'));
        if (parsedSRC.hostname === null) {
          const fullUrl = new URL(parsedSRC.pathname, parsedURL.href);
          $(elem).attr('src', path.join(`${fileName}-files`, createFileName(fullUrl.hostname, fullUrl.pathname)));
          return fullUrl;
        }
        $(elem).attr('src', path.join(`${fileName}-files`, createFileName(parsedSRC.hostname, parsedSRC.pathname)));
        return parsedSRC;
      });
      html = $.html();
      return fsPromises.mkdir(pathToFilesDir);
    })
    .then(() => Promise.all(links
      .map((link) => downloadImage(link.href, pathToFilesDir, createFileName(link.hostname, link.pathname)))))
    .then(() => fsPromises.writeFile(pathToFile, html, 'utf-8'))
    .then(() => pathToFile);
};
