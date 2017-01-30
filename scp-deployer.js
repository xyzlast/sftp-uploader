'use strict';
const fs = require('fs'),
  path = require('path'),
  scpClient = require('scp2').Client,
  bluebird = require('bluebird'),
  events = require('events'),
  co = require('co');

class ScpDeployer extends events.EventEmitter {
  constructor(options) {
    super();
    this.files = [];
    this.options = options;
  }

  addFiles(files, baseDir) {
    files.forEach(file => {
      const currentFile = path.resolve(baseDir, file);
      const stats = fs.statSync(currentFile);
      if (stats.isFile() && !currentFile.endsWith('.sql')) {
        let excluded = false;
        if (this.options.excludes) {
          this.options.excludes.forEach(excludeFileName => {
            excluded = excluded || currentFile.endsWith(excludeFileName);
          });
        }
        if (!excluded) {
          this.files.push(currentFile);
        } else {
          console.log('exculded > ' + currentFile);
        }
      } else if(this.checkUploadCondition(stats, currentFile)) {
        const workingFolder = path.resolve(baseDir, currentFile);
        this.addFiles(fs.readdirSync(workingFolder), workingFolder);
      }
    });
  }

  checkUploadCondition(stats, currentFile) {
    return stats.isDirectory() &&
           !currentFile.endsWith('db-modeling') &&
           !currentFile.endsWith('.git') &&
           !currentFile.endsWith('.vscode') &&
           !currentFile.endsWith('node_modules');
  }

  uploadFiles() {
    const client = bluebird.promisifyAll(new scpClient(this.options));
    client.on('connect', () => {
      this.emit('connect');
    });
    const totalFiles = this.files.length;
    let uploadFileCount = 0;
    const me = this;
    return co(function* () {
      for(let file of me.files) {
        const localFile = path.relative(me.options.path, file);
        const remoteFile = path.join(me.options.remotePath, localFile);
        uploadFileCount++;
        me.emit('uploading', {
          file: file,
          percent: Math.round(uploadFileCount * 100 / totalFiles)
        });
        yield client.uploadAsync(file, remoteFile);
      }
      me.emit('completed');
      client.close();
    });
  }

  upload() {
    this.addFiles(fs.readdirSync(this.options.path), this.options.path);
    return this.uploadFiles();
  }
}

module.exports.ScpDeployer = ScpDeployer;
