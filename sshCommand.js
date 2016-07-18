'use strict';
/*eslint no-console: ["error", { allow: ["log", "error"] }] */
const Promise = require('bluebird');
const co = require('co');
require('colors');

function execute(sshOptions, commands) {
  const sshConnect = require('ssh2-connect');
  const exec = require('ssh2-exec');
  const connectAsync = Promise.promisify(sshConnect);
  const execAsync = Promise.promisify(exec);

  return co(function * () {
    const ssh = yield connectAsync(sshOptions);
    try {
      for(let cmd of commands) {
        cmd.ssh = ssh;
        console.log((': execute >> ' + cmd.cmd).yellow);
        const stdout = yield execAsync(cmd);
        console.log(stdout.green);
      }
    } catch(err) {
      console.log('========================');
      console.log(err);
      console.log('========================');
    }
    ssh.end();
  });
}

module.exports = {
  exec: execute
};
