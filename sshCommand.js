'use strict';
/*eslint no-console: ["error", { allow: ["log", "error"] }] */
const Promise = require('bluebird');
const co = require('co');

function execute(sshOptions, commands) {
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

module.exports = {
  exec: execute
};
