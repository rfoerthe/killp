#!/usr/bin/env node
'use strict'

import shellExec from 'shell-exec';

import psList from 'ps-list';
import os from 'os';

export default async function (port, parentName, verbose) {
    if (!port || isNaN(Number(port))) throw new Error('Port is not a number')
    port = Number(port)

    if (os.platform() === 'win32') {
        const res = await shellExec('netstat -nao')
        const {stdout} = res
        console.log(stdout)
        return
    }

    const res = await shellExec('lsof -i -P -n')
    const {stdout} = res
    if (!stdout) throw new Error('No stdout from command "lsof"')

    const lines = stdout.split('\n')

    const foundProcess = lines.filter((line) => line.match(new RegExp(`TCP.*:*${port}`)))
    if (foundProcess.length === 0) throw new Error(`No process running on port ${port}`)
    if (foundProcess.length > 1) throw new Error('More than one process found')

    const line = foundProcess[0]
    const processId = line.split(/\s+/)[1]


    if (typeof parentName === 'string' && parentName.length > 0) {
        const ppid = await getParentPid(parseInt(processId), parentName)  // Use new function
        if (ppid) {
            await killProcess(ppid, verbose);
        } else {
            if (verbose) console.log(`Parent process with name '${parentName}' not found.`)
        }
    } else {
        await killProcess(processId, verbose);
    }

    async function getParentPid(childPid, parentCmdName) {
        const allProcesses = await psList();
        const childProcess = allProcesses.find(proc => proc.pid === childPid);
        const ppid = childProcess ? childProcess.ppid : undefined;
        const parentProcess = allProcesses.find(proc => proc.pid === ppid);
        return parentProcess && parentProcess.name === parentCmdName ? ppid : undefined;
    }

    async function killProcess(pid, verbose) {
        const res = await shellExec(`kill -9 ${pid}`);
        if (res.code !== 0) {
            throw new Error("Kill command failed: " + res.stderr)
        }
        if (verbose) console.log("Killed process: " + processId)
    }
}
