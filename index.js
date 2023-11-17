#!/usr/bin/env node
'use strict'

const shellExec = require("shell-exec");

module.exports = function (port, pid, parent) {
  if (process.platform === 'win32') {
    return shellExec('netstat -nao')
      .then(res => {
        const { stdout } = res
        console.log(stdout)
        return Promise.resolve()
      })
  }

  return shellExec('lsof -i -P -n')
    .then(res => {
      const { stdout } = res
      console.log(stdout)
      return Promise.resolve()
    })
}
