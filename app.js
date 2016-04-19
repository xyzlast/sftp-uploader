'use strict';
/*eslint no-console: ["error", { allow: ["log", "error"] }] */

if (process.argv.length < 3) {
  console.log('select target: --mobile, --web, --api, --all');
  return;
}
const param = process.argv[2].replace(/-/gi, '');
const Promise = require('bluebird');
const command = require('./command');
const SshClient = require('ssh-promise');

console.log('STEP1. fms-api: git pull');
command('git', ['pull'], { cwd: '/home/ykyoon/dev/work/pub/fms-api-v2' }).then(() => {
  if (param === 'all' || param === 'web') {
    console.log('STEP2. fms-web: grunt build');
    return command('grunt', ['build'], { cwd: '/home/ykyoon/dev/work/fms-web-v2' });
  } else {
    return Promise.resolve(true);
  }
}).then(() => {
  const Deployer = require('./deployer');
  const config = require('./config');
  const _ = require('lodash');

  let targets = config;
  if (param !== 'all') {
    targets = _.filter(config, function (c) {
      return c.name === param;
    });
  }
  const funcs = [];
  targets.forEach(target => {
    funcs.push(new Promise(resolve => {
      const deployer = new Deployer(target);
      deployer.on('error', function(err){
        if (err) {
          console.error(err);
        }
        throw err;
      })
      .on('uploading', () => {
        process.stdout.write('.');
      })
      .on('completed', () => {
        process.stdout.write('O');
        resolve(true);
      });
      deployer.upload();
    }));
  });
  return Promise.all(funcs);
}).then(() => {
  if (param !== 'api' && param !== 'all') {
    return Promise.resolve(true);
  }
  console.log('');
  console.log('execute command to ADWAS1');
  const ssh1Commands = [
    'pm2 kill',
    'pm2 start /home/krobis/apps/fms-api-v2/api-system1.json'
  ];
  const config = {
    host: '14.63.170.47',
    port: 7010,
    username: 'krobis',
    privateKey: require('fs').readFileSync('/home/ykyoon/.ssh/id_rsa')
  };
  const ssh1 = new SshClient(config);
  return ssh1.exec(ssh1Commands);
}).then(() => {
  if (param !== 'api' && param !== 'all') {
    return Promise.resolve(true);
  }
  console.log('');
  console.log('execute command to ADWAS1');
  const ssh1Commands = [
    'pm2 kill',
    'pm2 start /home/krobis/apps/fms-api-v2/api-system2.json'
  ];
  const config = {
    host: '14.63.170.47',
    port: 7020,
    username: 'krobis',
    privateKey: require('fs').readFileSync('/home/ykyoon/.ssh/id_rsa')
  };
  const ssh1 = new SshClient(config);
  return ssh1.exec(ssh1Commands);
}).done();

