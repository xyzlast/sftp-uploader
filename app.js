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
const _ = require('lodash');
const co = require('co');

function executeSshCommands(sshOptions, commands) {
  const sshConnect = require('ssh2-connect');
  const exec = require('ssh2-exec');
  const connectAsync = Promise.promisify(sshConnect);
  const execAsync = Promise.promisify(exec);

  return co(function * () {
    const ssh = yield connectAsync(sshOptions);
    for(let cmd of commands) {
      cmd.ssh = ssh;
      const stdout = yield execAsync(cmd);
      console.log(stdout);
    }
    ssh.end();
  });
}

function pullGitProcess() {
  console.log('STEP1. fms-api: git pull');
  return command('git', ['pull'], { cwd: config.apiDevPath }).then(() => {
    if (param === 'all' || param === 'web') {
      console.log('STEP2. fms-web: grunt build');
      return command('grunt', ['build'], { cwd: config.webDevPath });
    } else {
      return Promise.resolve(true);
    }
  });
}

function uploadFiles() {
  console.log('STEP. UPLOAD FILES: ' + param);
  if (param === 'cmd') {
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
  return executeSshCommands(sshOptions, commands);
}

function restartPM2(serverName) {
  console.log('');
  if (param !== 'api' && param !== 'all' && param !== 'cmd') {
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
  return executeSshCommands(sshOptions, commands);
}

function doProcess() {
  co(function * () {
    yield pullGitProcess();
    yield deleteOldFiles();
    yield uploadFiles();
    yield restartPM2('was1');
    yield restartPM2('was2');
    console.log('');
    console.log('deploy completed : ' + param);
  });
}

doProcess();
