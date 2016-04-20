'use strict';
/*eslint no-console: ["error", { allow: ["log", "error"] }] */
if (process.argv.length < 3) {
  console.log('select target: --mobile, --web, --api, --all');
  return;
}
const config = require('./env/' + process.env.NODE_ENV);
const param = process.argv[2].replace(/-/gi, '');
const Promise = require('bluebird');
const command = require('./command');
const SshClient = require('ssh-promise');

console.log('STEP1. fms-api: git pull');
command('git', ['pull'], { cwd: config.apiDevPath }).then(() => {
  if (param === 'all' || param === 'web') {
    console.log('STEP2. fms-web: grunt build');
    return command('grunt', ['build'], { cwd: config.webDevPath });
  } else {
    return Promise.resolve(true);
  }
}).then(() => {
  console.log('STEP. UPLOAD FILES: ' + param);
  const Deployer = require('./deployer');
  const _ = require('lodash');
  let targets = config.targets;
  if (param !== 'all') {
    targets = _.filter(config.targets, function (c) {
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
  const sshOptions = {
    host: '14.63.170.47',
    port: 7010,
    username: 'krobis',
    privateKey: require('fs').readFileSync(config.rsaKeyPath)
  };
  const ssh1 = new SshClient(sshOptions);
  return ssh1.exec(ssh1Commands);
}).then(() => {
  if (param !== 'api' && param !== 'all') {
    return Promise.resolve(true);
  }
  console.log('');
  console.log('execute command to ADWAS2');
  const ssh1Commands = [
    'pm2 kill',
    'pm2 start /home/krobis/apps/fms-api-v2/api-system2.json'
  ];
  const sshOptions = {
    host: '14.63.170.47',
    port: 7020,
    username: 'krobis',
    privateKey: require('fs').readFileSync(config.rsaKeyPath)
  };
  const ssh1 = new SshClient(sshOptions);
  return ssh1.exec(ssh1Commands);
}).done();

