'use strict';
/*eslint no-console: ["error", { allow: ["log", "error"] }] */

const Promise = require('bluebird');
const spawn = require('child_process').spawn;
require('colors');

function execute(cmd, option1, option2) {
  return new Promise(resolve => {
    const exec = spawn(cmd, option1, option2);
    exec.stdout.on('data', data => {
      console.log(`${data}`.green);
    });
    exec.stderr.on('data', data => {
      console.log(`${data}`.red);
    });
    exec.on('close', code => {
      console.log( `child process exited with code ${code}`.yellow );
      resolve(true);
    });
  });
}

module.exports = {
  exec: execute
};
