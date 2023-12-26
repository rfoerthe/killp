#!/usr/bin/env node
'use strict'

import shellExec from 'shell-exec';

import psList from 'ps-list';

export default async function (port, parentName) {
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
        if (!stdout) return res
        const lines = stdout.split('\n')
        const foundProcess = lines.filter((line) => line.match(new RegExp(`TCP.*:*${port}`)))
        if (foundProcess.length === 0) return Promise.reject(new Error('No process running on port'))
        if (foundProcess.length > 1) return Promise.reject(new Error('more than one process found'))

        const line = foundProcess[0]
        const processId = line.split(/\s+/)[1]

        if (typeof parentName === 'string' && parentName.length > 0) {
            return getParentPid(parseInt(processId), parentName)  // Use new function
                .then(ppid => {
                    if (ppid) {
                        console.log("Kill parent: " + ppid);
                        return shellExec(`kill -9 ${ppid}`);
                    }
                });
        } else {
            console.log("Kill process: " + processId)
            return shellExec(`kill -9 ${processId}`)
        }
    })

    async function getParentPid(childPid, parentCmdName) {
        const allProcesses = await psList();
        const childProcess = allProcesses.find(proc => proc.pid === childPid);
        const ppid = childProcess ? childProcess.ppid : undefined;
        const parentProcess = allProcesses.find(proc => proc.pid === ppid);
        return parentProcess && parentProcess.name === parentCmdName ? ppid : undefined;
    }
}


