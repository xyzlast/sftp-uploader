'use strict';

const ip = '14.63.170.47';
const port1 = '7010';
const port2 = '7020';
const username = 'krobis';
const password = 'krobis!@#';
const remoteBasePath = '/home/krobis/apps/';

const localWebDistPath = '/home/ykyoon/dev/work/fms-web-v2/dist';
const localApiPath = '/home/ykyoon/dev/work/pub/fms-api-v2';
const localMobilePath = '/home/ykyoon/dev/work/fms-mobile-v2/www';

const targets = [
  {
    name: 'web',
    host: ip,
    port: port1,
    username: username,
    password: password,
    path: localWebDistPath,
    remotePath: remoteBasePath + 'krofarm'
  },
  {
    name: 'web',
    host: ip,
    port: port2,
    username: username,
    password: password,
    path: localWebDistPath,
    remotePath: remoteBasePath + 'krofarm'
  },
  {
    name: 'api',
    host: ip,
    port: port1,
    username: username,
    password: password,
    path: localApiPath,
    remotePath: remoteBasePath + 'fms-api-v2'
  },
  {
    name: 'api',
    host: ip,
    port: port2,
    username: username,
    password: password,
    path: localApiPath,
    remotePath: remoteBasePath + 'fms-api-v2'
  },
  {
    name: 'mobile',
    host: ip,
    port: port1,
    username: username,
    password: password,
    path: localMobilePath,
    remotePath: remoteBasePath + 'krofarm-mobile'
  },
  {
    name: 'mobile',
    host: ip,
    port: port2,
    username: username,
    password: password,
    path: localMobilePath,
    remotePath: remoteBasePath + 'krofarm-mobile'
  }
];

module.exports = targets;
