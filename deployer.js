'use strict';
const fs = require('fs'),
  path = require('path'),
  scpClient = require('scp2').Client,
  bluebird = require('bluebird'),
  events = require('events');

class Deployer extends events.EventEmitter {
  constructor(options) {
    super();
    this.files = [];
    this.options = options;
  }

  addFiles(files, baseDir) {
    files.forEach(file => {
      const currentFile = path.resolve(baseDir, file);
      const stats = fs.statSync(currentFile);
      if (stats.isFile()) {
        this.files.push(currentFile);
      } else if(stats.isDirectory() && !currentFile.endsWith('.git')) {
        const workingFolder = path.resolve(baseDir, currentFile);
        this.addFiles(fs.readdirSync(workingFolder), workingFolder);
      }
    });
  }

  uploadFiles() {
    const client = bluebird.promisifyAll(new scpClient(this.options));
    client.on('connect', () => {
      this.emit('connect');
    });
    const totalFiles = this.files.length;
    let uploadFileCount = 0;
    this.files.reduce((prev, file) => {
      return prev.then(() => {
        const localFile = path.relative(this.options.path, file);
        const remoteFile = path.join(this.options.remotePath, localFile);
        uploadFileCount++;
        this.emit('uploading', {
          file: file,
          percent: Math.round(uploadFileCount * 100 / totalFiles)
        });
        return client.uploadAsync(file, remoteFile);
      });
    }, Promise.resolve('startArray')).then(() => {
      this.emit('completed');
      client.close();
    });
  }

  upload() {
    this.addFiles(fs.readdirSync(this.options.path), this.options.path);
    this.uploadFiles();
    return this;
  }
}

module.exports = Deployer;
