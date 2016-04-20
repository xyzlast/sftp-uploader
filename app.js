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
const _ = require('lodash');

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
  const ScpDeployer = require('./scp-deployer').ScpDeployer;

  let targets = config.targets;
  if (param !== 'all') {
    targets = _.filter(config.targets, function (c) {
      return c.name === param;
    });
  }
  const funcs = [];
  targets.forEach(target => {
    funcs.push(new Promise(resolve => {
      const scpDeployer = new ScpDeployer(target);
      scpDeployer.on('error', function(err){
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
      scpDeployer.upload();
    }));
  });
  return Promise.all(funcs);
}).then(() => {
  if (param !== 'api' && param !== 'all') {
    return Promise.resolve(true);
  }
  console.log('');
  console.log('execute command to ADWAS1');
  const commands = [
    { cmd: 'pm2 kill' },
    { cmd: 'npm install', cwd: '/home/krobis/apps/fms-api-v2'},
    { cmd: 'pm2 start /home/krobis/apps/fms-api-v2/api-system1.json' }
  ];
  const sshOptions = {
    host: '14.63.170.47',
    port: 7010,
    username: 'krobis',
    privateKey: require('fs').readFileSync(config.rsaKeyPath)
  };
  return executeSshCommands(sshOptions, commands);
}).then(() => {
  if (param !== 'api' && param !== 'all') {
    return Promise.resolve(true);
  }
  console.log('execute command to ADWAS2');
  const commands = [
    { cmd: 'pm2 kill' },
    { cmd: 'npm install', cwd: '/home/krobis/apps/fms-api-v2'},
    { cmd: 'pm2 start /home/krobis/apps/fms-api-v2/api-system2.json' }
  ];
  const sshOptions = {
    host: '14.63.170.47',
    port: 7020,
    username: 'krobis',
    privateKey: require('fs').readFileSync(config.rsaKeyPath)
  };
  return executeSshCommands(sshOptions, commands);
}).done();

function executeSshCommands(sshOptions, commands) {
  const sshConnect = require('ssh2-connect');
  const exec = require('ssh2-exec');
  const connectAsync = Promise.promisify(sshConnect);
  const execAsync = Promise.promisify(exec);

  let remoteSsh;
  const firstCmd = commands[0];
  const remainCmds = commands.slice(1);
  return connectAsync(sshOptions).then(ssh => {
    remoteSsh = ssh;
    firstCmd.ssh = ssh;
    return remainCmds.reduce((pre, current) => {
      return pre.then((stdout, stderr) => {
        console.log(stdout);
        if (stderr) {
          console.error(stderr);
        }
        current.ssh = ssh;
        return execAsync(current);
      });
    }, execAsync(firstCmd));
  }).then(stdout => {
    console.log(stdout);
    remoteSsh.end();
  });
}
