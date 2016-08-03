'use strict';

const production = {
  ip: '14.63.170.47',
  port1: '7010',
  port2: '7020',
  username: 'krobis',
  password: 'norooKrobis',
  remoteBasePath: '/home/krobis/apps'
};

const rsaKeyPath = '/home/ykyoon/.ssh/id_rsa';
// const apiDevPath = '/home/ykyoon/dev/work/pub/fms-api-v2';
const apiDevPath = '/home/ykyoon/dev/work/fms-api-v2';
const webDevPath = '/home/ykyoon/dev/work/fms-web-v2';
const mobileDevPath = '/home/ykyoon/dev/work/fms-mobile-v2';

const localWebDistPath = webDevPath + '/dist';
const localApiPath = apiDevPath;
const localMobilePath = mobileDevPath + '/www';

const targets = [
  {
    name: 'web',
    host: production.ip,
    port: production.port1,
    username: production.username,
    password: production.password,
    path: localWebDistPath,
    remotePath: production.remoteBasePath + '/krofarm'
  },
  {
    name: 'web',
    host: production.ip,
    port: production.port2,
    username: production.username,
    password: production.password,
    path: localWebDistPath,
    remotePath: production.remoteBasePath + '/krofarm'
  },
  {
    name: 'api',
    host: production.ip,
    port: production.port1,
    username: production.username,
    password: production.password,
    path: localApiPath,
    remotePath: production.remoteBasePath + '/fms-api-v2',
    cwd: production.remoteBasePath + '/fms-api-v2',
    pm2Script: 'pm2/api-system1.json'
  },
  {
    name: 'api',
    host: production.ip,
    port: production.port2,
    username: production.username,
    password: production.password,
    path: localApiPath,
    remotePath: production.remoteBasePath + '/fms-api-v2',
    cwd: production.remoteBasePath + '/fms-api-v2',
    pm2Script: 'pm2/api-system2.json'
  },
  {
    name: 'mobile',
    host: production.ip,
    port: production.port1,
    username: production.username,
    password: production.password,
    path: localMobilePath,
    remotePath: production.remoteBasePath + '/krofarm-mobile'
  },
  {
    name: 'mobile',
    host: production.ip,
    port: production.port2,
    username: production.username,
    password: production.password,
    path: localMobilePath,
    remotePath: production.remoteBasePath + '/krofarm-mobile'
  },
  {
    name: 'api.dev',
    host: '10.1.95.184',
    port: 22,
    username: 'main',
    password: 'qwer12#$',
    path: '/home/ykyoon/dev/work/fms-api-v2',
    remotePath: '/home/main/apps/fms-api-v2',
    cwd: '/home/main/apps/fms-api-v2',
    pm2Script: 'pm2/dev-system.json'
  },
  {
    name: 'web.dev',
    host: '10.1.95.184',
    port: 22,
    username: 'main',
    password: 'qwer12#$',
    path: localWebDistPath,
    remotePath: '/home/main/apps/krofarm'
  },
  {
    name: 'mobile.dev',
    host: '10.1.95.184',
    port: 22,
    username: 'main',
    password: 'qwer12#$',
    path: localMobilePath,
    remotePath: '/home/main/apps/krofarm-mobile'
  },
  {
    name: 'api.kaz',
    host: '192.168.30.223',
    port: 22,
    username: 'krobis',
    password: 'qwer12#$',
    path: apiDevPath,
    remotePath: '/home/krobis/apps/fms-api-v2',
    cwd: '/home/krobis/apps/fms-api-v2',
    pm2Script: 'pm2/kaz-system.json'
  },
  {
    name: 'web.kaz',
    host: '192.168.30.223',
    port: 22,
    username: 'krobis',
    password: 'qwer12#$',
    path: localWebDistPath,
    remotePath: '/home/krobis/apps/krofarm'
  }
];

class Config {
  constructor() {
    this.apiDevPath = apiDevPath;
    this.webDevPath = webDevPath;
    this.mobileDevPath = mobileDevPath;
    this.rsaKeyPath = rsaKeyPath;
    this.targets = targets;
    this.username = production.username;
  }
}
module.exports = new Config();
