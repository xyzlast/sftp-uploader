'use strict';
/*eslint no-console: ["error", { allow: ["log", "error"] }] */
if (process.argv.length < 3) {
  console.log('select target: --mobile, --web, --api, --cmd --all');
  return;
}
const config = require('./env/' + process.env.NODE_ENV);
const param = process.argv[2].replace(/-/gi, '');
const Promise = require('bluebird');
const command = require('./command');
const sshCommand = require('./sshCommand');
const _ = require('lodash');
const co = require('co');

function executeLocalCommands() {
  console.log(' > fms-api: git pull');
  return co(function * () {
    yield command.exec('git', ['pull'], { cwd: config.apiDevPath });
    if (param === 'all' || param === 'web') {
      console.log(' > fms-web: grunt build');
      return yield command.exec('grunt', ['build'], { cwd: config.webDevPath });
    } else {
      return Promise.resolve(true);
    }
  });
}

function uploadFiles() {
  if (param === 'cmd') {
    console.log(' > pass uploadFiles : ' + param);
    return Promise.resolve(true);
  }
  const ScpDeployer = require('./scp-deployer').ScpDeployer;
  let targets = config.targets;
  if (param !== 'all') {
    targets = _.filter(config.targets, function (c) {
      return c.name === param;
    });
  }
  const funcs = [];
  targets.forEach(target => {
    const scpDeployer = new ScpDeployer(target);
    scpDeployer.on('error', (err) => {
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
    });
    funcs.push(scpDeployer.upload());
  });
  return Promise.all(funcs);
}

function deleteOldFiles(serverName) {
  if (process.argv.length <= 3) {
    console.log(' > pass deleteOldFiles : ' + process.argv);
    return Promise.resolve(true);
  } else {
    const del = process.argv[3].replace(/-/gi, '');
    if (del !== 'del') {
      console.log(' > pass deleteOldFiles : ' + process.argv);
      return Promise.resolve(true);
    }
  }
  const commands = [];
  if (param === 'all') {
    commands.push({ cmd: 'rm -drf ' + config.paths.api + '/app' });
    commands.push({ cmd: 'rm -drf ' + config.paths.web });
    commands.push({ cmd: 'rm -drf ' + config.paths.mobile });
  } else if (param === 'api') {
    commands.push({ cmd: 'rm -drf ' + config.paths.api + '/app' });
  } else if (param === 'web') {
    commands.push({ cmd: 'rm -drf ' + config.paths.web });
  } else if (param === 'mobile') {
    commands.push({ cmd: 'rm -drf ' + config.paths.mobile });
  }
  if (commands.length === 0) {
    return Promise.resolve(true);
  }
  const sshOptions = config.getSshOptions(serverName);
  return sshCommand.exec(sshOptions, commands);
}

function restartPM2(serverName) {
  console.log('');
  if (param !== 'api' && param !== 'all' && param !== 'cmd') {
    console.log('  > pass restartPM2:' + param);
    return Promise.resolve(true);
  }
  const commandBundle = {
    was1: [
      { cmd: 'pm2 kill' },
      { cmd: 'npm install', cwd: '/home/krobis/apps/fms-api-v2'},
      { cmd: 'pm2 start /home/krobis/apps/fms-api-v2/api-system1.json' }
    ],
    was2: [
      { cmd: 'pm2 kill' },
      { cmd: 'npm install', cwd: '/home/krobis/apps/fms-api-v2'},
      { cmd: 'pm2 start /home/krobis/apps/fms-api-v2/api-system2.json' }
    ]
  };
  console.log('');
  console.log('execute command to ' + serverName);
  const commands = commandBundle[serverName];
  const sshOptions = config.getSshOptions(serverName);
  return sshCommand.exec(sshOptions, commands);
}

function doProcess() {
  co(function * () {
    console.log('1. Execute Local Commands');
    yield executeLocalCommands();
    console.log('2. Delete Old Files in Server');
    yield deleteOldFiles();
    console.log('3. Upload Files');
    yield uploadFiles();
    console.log('4. RestartPM2 processes');
    yield restartPM2('was1');
    yield restartPM2('was2');
    console.log('');
    console.log('deploy completed : ' + param);
  });
}

doProcess();
