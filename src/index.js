import axios from 'axios';
import fs from 'fs';
import path from 'path';
import URL from 'url';

const fsPromises = fs.promises;

const createFileName = (hostname, pathname) => {
  const formattedHostName = hostname.replace(/\./g, '-');
  const formattedPathName = (pathname === '/' ? '' : pathname.replace(/\//g, '-'));
  return `${formattedHostName}${formattedPathName}.html`;
};

export default (pathToDirectory, url) => {
  const parsedURL = URL.parse(url);
  const fileName = createFileName(parsedURL.hostname, parsedURL.pathname);
  const pathToFile = path.resolve(pathToDirectory, fileName);
  return axios.get(url)
    .then((response) => {
      fsPromises.writeFile(pathToFile, response.data, 'utf-8');
    })
    .then(() => pathToFile);
};
