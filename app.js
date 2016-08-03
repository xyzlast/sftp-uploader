'use strict';
/*eslint no-console: ["error", { allow: ["log", "error"] }] */
if (process.argv.length < 3) {
  console.log('select target: --mobile, --web, --api, --cmd --all');
  return;
}
const config = require('./env/' + process.env.NODE_ENV);
const Promise = require('bluebird');
const command = require('./command');
const sshCommand = require('./sshCommand');
const _ = require('lodash');
const co = require('co');
const dateformat = require('dateformat');
require('colors');

const cmdMode = !!_.find(process.argv, arg => {
  return arg === '--cmd';
});

const param = _.find(process.argv, arg => {
  return arg.indexOf('--target:') === 0;
}).replace(/--target:/gi, '');
console.log({cmdMode, param});

function writeReleaseLog() {
  const fs = require('fs');
  const targets = _.filter(config.targets, target => target.name === param);
  const now = new Date();
  const LINE_END = '\n\r';
  let log = '## ' + dateformat(now, 'yyyy-mm-dd HH:MM:ss') + LINE_END;
  return co(function* () {
    for (let target of targets) {
      const filename = target.path + '/release-history.txt';
      log += `* host: ${target.username}@${target.host}:${target.port}:${target.remotePath}` + LINE_END;
      if (target.pm2Script) {
        log += ` * script: ${target.pm2Script}` + LINE_END;
      }
      const stream = Promise.promisifyAll(fs.createWriteStream(filename, { flags: 'a' }));
      yield stream.writeAsync(log);
      stream.close();
    }
  });
}


function executeLocalCommands() {
  console.log('> fms-api: git pull');
  return Promise.resolve(true);

  // return co(function * () {
  //   yield command.exec('git', ['pull'], { cwd: config.apiDevPath });
  //   if (param === 'all' || param.indexOf('web') >= 0) {
  //     console.log('> fms-web: grunt build');
  //     return yield command.exec('grunt', ['build'], { cwd: config.webDevPath });
  //   } else {
  //     return Promise.resolve(true);
  //   }
  // });
}

function uploadFiles() {
  if (cmdMode) {
    console.log('>> pass (cmdMode: true)');
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
      process.stdout.write('.'.green);
    })
    .on('completed', () => {
      process.stdout.write('O'.blue);
    });
    funcs.push(scpDeployer.upload());
  });
  return Promise.all(funcs);
}

function deleteOldFiles(server) {
  if (cmdMode) {
    console.log('>> pass (cmdMode: true)');
    return Promise.resolve(true);
  }
  if (process.argv.length <= 3) {
    console.log('> pass deleteOldFiles : ' + process.argv);
    return Promise.resolve(true);
  } else {
    const del = process.argv[3].replace(/-/gi, '');
    if (del !== 'del') {
      console.log('> pass deleteOldFiles : ' + process.argv);
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
  const sshOptions = Object.assign({}, server);
  sshOptions.privateKey = require('fs').readFileSync(config.rsaKeyPath);
  return sshCommand.exec(sshOptions, commands);
}

function restartPM2(server) {
  if (!server.cwd || !server.pm2Script) {
    console.log(' > pass restartPM2:' + param);
    return Promise.resolve(true);
  }
  const commandBundle = [
    { cmd: 'pm2 kill' },
    { cmd: 'pm2 flush' },
    { cmd: 'npm install', cwd: server.cwd },
    { cmd: 'pm2 start ' + server.pm2Script, cwd: server.cwd }
  ];
  console.log('');
  console.log('> execute command to ' + server.name);
  const commands = commandBundle;
  const sshOptions = Object.assign({}, server);
  sshOptions.privateKey = require('fs').readFileSync(config.rsaKeyPath);
  return sshCommand.exec(sshOptions, commands);
}

function doProcess() {
  co(function * () {
    yield writeReleaseLog();
    console.log('1. Execute Local Commands');
    yield executeLocalCommands();
    // console.log('2. Delete Old Files in Server');
    // yield deleteOldFiles();
    console.log('2. Upload Files');
    yield uploadFiles();
    console.log('3. RestartPM2 processes');
    const cmdTargets = _.filter(config.targets, target => target.name === param && target.cwd && target.pm2Script);
    for(let target of cmdTargets) {
      yield restartPM2(target);
    }
    console.log('');
    console.log('=== deploy completed : ' + param + ' ===');
  });
}

doProcess();
