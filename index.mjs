#!/usr/bin/env node
'use strict'

import shellExec from 'shell-exec';

import psList from 'ps-list';
import os from 'os';

export default async function (port, allowedParents, verbose, forceKill) {
    const utils = new Utils()
    const processId = os.platform() === 'win32' ? await utils.getProcessIdWin32(port) : await utils.getProcessId(port);

    if (allowedParents.length > 0) {
        const {parentProcessId, name} = await utils.getParentProcess(parseInt(processId), allowedParents)  // Use new function
        if (parentProcessId) {
            await utils.killProcess(parentProcessId, verbose, false);
            if (verbose) console.log(`${os.platform() === 'win32' ? 'Killed' : 'Terminated'} parent process '${name}': ${parentProcessId}`)
        } else {
            throw new Error(`Refused to terminate parent process. None of the specified name(s)` +
            ` '${allowedParents}' corresponds to the real name '${name}'`)
        }
    } else {
        await utils.killProcess(processId, verbose, forceKill);
        if (verbose) console.log(`${forceKill || os.platform() === 'win32' ? 'Killed' : 'Terminated'} process: ${processId}`)
    }

}

export class Utils {
    async getProcessId(port) {
        const res = await shellExec('lsof -i -P -n')
        if (res.code !== 0 && res.stderr) throw new Error("command 'lsof' failed: " + res.stderr)
        const {stdout} = res
        if (!stdout) throw new Error(`No process running on port ${port}`)

        const lines = stdout.split('\n')

        const foundProcess = lines.filter((line) => line.match(new RegExp(`TCP.*:.*${port}.*(LISTEN)`)))
        if (foundProcess.length === 0) throw new Error(`No process running on port ${port}`)
        if (foundProcess.length > 1) throw new Error('More than one process found')

        const line = foundProcess[0]
        return line.split(/\s+/)[1]
    }

    async getProcessIdWin32(port) {
        const res = await shellExec('netstat -nao')
        if (res.code !== 0 && res.stderr) throw new Error("command 'netstat' failed: " + res.stderr)
        const {stdout} = res
        if (!stdout) throw new Error(`No process running on port ${port}`)

        const lines = stdout.split('\n')

        // The second white-space delimited column of netstat output is the local port,
        const lineWithLocalPortRegEx = new RegExp(`^ *TCP *[^ ]*:${port}`, 'gm')
        const linesWithLocalPort = lines.filter(line => line.match(lineWithLocalPortRegEx))


        const pids = linesWithLocalPort.reduce((acc, line) => {
            const match = line.match(/(\d*)\w*(\n|$)/gm)
            return match && match[0] && !acc.includes(match[0]) ? acc.concat(match[0]) : acc
        }, [])
        if (pids.length === 0) throw new Error(`No process running on port ${port}`)
        if (pids.length > 1) throw new Error('More than one process found')
        return pids[0]
    }

    async getParentProcess(childPid, parentNames) {
        const allProcesses = await psList();
        const childProcess = allProcesses.find(proc => proc.pid === childPid);
        const ppid = childProcess ? childProcess.ppid : undefined;
        const parentProcess = allProcesses.find(proc => proc.pid === ppid);
        return {parentProcessId: parentNames.includes(parentProcess.name) ? ppid : undefined, name: parentProcess.name}
    }

    async killProcess(pid, verbose, force) {
        const res = os.platform() === 'win32' ? await shellExec(`TaskKill /F /PID ${pid}`) : await shellExec(`kill ${force ? '-9' : ''} ${pid}`)
        if (res.code !== 0) {
            throw new Error("Kill command failed: " + res.stderr)
        }
        return true;
    }
}


