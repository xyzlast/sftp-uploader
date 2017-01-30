'use strict';
/*eslint no-console: ["error", { allow: ["log", "error"] }] */

const config = require('./env/' + process.env.NODE_ENV);
const Promise = require('bluebird');
const command = require('./command');
const sshCommand = require('./sshCommand');
const _ = require('lodash');
const co = require('co');
const dateformat = require('dateformat');
require('colors');

function writeReleaseLog(targets) {
  const fs = require('fs');
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

function executeLocalCommands(targetName) {
  console.log('> fms-api: git pull');
  return co(function * () {
    if (targetName.indexOf('web') >= 0) {
      console.log('> fms-web: grunt build');
      return yield command.exec('grunt', ['build', '--force'], { cwd: config.webDevPath });
    } else {
      return Promise.resolve(true);
    }
  });
}

function uploadFiles(targets) {
  const ScpDeployer = require('./scp-deployer').ScpDeployer;
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

// function deleteOldFiles(targetName, server) {
//   if (cmdMode) {
//     console.log('>> pass (cmdMode: true)');
//     return Promise.resolve(true);
//   }
//   if (process.argv.length <= 3) {
//     console.log('> pass deleteOldFiles : ' + process.argv);
//     return Promise.resolve(true);
//   } else {
//     const del = process.argv[3].replace(/-/gi, '');
//     if (del !== 'del') {
//       console.log('> pass deleteOldFiles : ' + process.argv);
//       return Promise.resolve(true);
//     }
//   }
//   const commands = [];
//   if (param === 'all') {
//     commands.push({ cmd: 'rm -drf ' + config.paths.api + '/app' });
//     commands.push({ cmd: 'rm -drf ' + config.paths.web });
//     commands.push({ cmd: 'rm -drf ' + config.paths.mobile });
//   } else if (param === 'api') {
//     commands.push({ cmd: 'rm -drf ' + config.paths.api + '/app' });
//   } else if (param === 'web') {
//     commands.push({ cmd: 'rm -drf ' + config.paths.web });
//   } else if (param === 'mobile') {
//     commands.push({ cmd: 'rm -drf ' + config.paths.mobile });
//   }
//   if (commands.length === 0) {
//     return Promise.resolve(true);
//   }
//   const sshOptions = Object.assign({}, server);
//   sshOptions.privateKey = require('fs').readFileSync(config.rsaKeyPath);
//   return sshCommand.exec(sshOptions, commands);
// }

function restartPM2(server) {
  if (!server.cwd || !server.pm2Script) {
    console.log(' > pass restartPM2');
    return Promise.resolve(true);
  }
  const commandBundle = [
    { cmd: 'pm2 kill' },
    { cmd: 'pm2 flush' },
    { cmd: 'npm install', cwd: server.cwd },
    // { cmd: 'yarn upgrade', cwd: server.cwd },    
    { cmd: 'pm2 start ' + server.pm2Script, cwd: server.cwd }
  ];
  console.log('');
  console.log('> execute command to ' + server.name);
  const commands = commandBundle;
  const sshOptions = Object.assign({}, server);
  sshOptions.privateKey = require('fs').readFileSync(config.rsaKeyPath);
  return sshCommand.exec(sshOptions, commands);
}

function doProcess(targetName) {
  const targets = _.filter(config.targets, target => target.name === targetName);
  co(function * () {
    yield writeReleaseLog(targets);
    console.log('* Execute Local Commands');
    yield executeLocalCommands(targetName);
    // console.log('2. Delete Old Files in Server');
    // yield deleteOldFiles();
    console.log('* Upload Files');
    yield uploadFiles(targets);

    console.log('* RestartPM2 processes');
    const cmdTargets = _.filter(targets, target => target.cwd && target.pm2Script);
    for(let target of cmdTargets) {
      yield restartPM2(target);
    }
    console.log('');
    console.log('=== deploy completed : ' + targetName + ' ===');
  });
}

const program = require('commander');

program.version('1.0.0');
program
  .command('install <name>')
  .action(name => {
    doProcess(name);
  });
program
  .command('list')
  .action(() => {
    console.log(config.targets);
  });

program.parse(process.argv);

