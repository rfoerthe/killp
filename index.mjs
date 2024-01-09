#!/usr/bin/env node
'use strict'

import psList from 'ps-list'
import os from 'os'
import util from 'util'
import childProcess from 'child_process'

const execAsync = util.promisify(childProcess.exec)

const isWindows = os.platform() === 'win32'

export default async function (port, allowedParents, verbose, forceKill) {
    const support = new Support()
    const processId = isWindows ? await support.getProcessIdWin32(port) : await support.getProcessId(port);

    if (allowedParents.length > 0) {
        const {parentProcessId, name} = await support.getParentProcess(parseInt(processId), allowedParents)  // Use new function
        if (parentProcessId) {
            await support.killProcess(parentProcessId, verbose, false);
            if (verbose) console.log(`${ isWindows ? 'Killed' : 'Terminated'} parent process '${name}': ${parentProcessId}`)
        } else {
            throw new Error(`Refused to terminate parent process. None of the specified name(s)` +
            ` '${allowedParents}' corresponds to the real name '${name}'`)
        }
    } else {
        await support.killProcess(processId, verbose, forceKill);
        if (verbose) console.log(`${forceKill || isWindows ? 'Killed' : 'Terminated'} process: ${processId}`)
    }
}

export class Support {
    async getProcessId(port) {
        const {stdout} = await execAsync('lsof -i -P -n')
        if (!stdout) throw new Error(`No process running on port ${port}`)

        const lines = stdout.split('\n')
        const foundProcess = lines.filter((line) => line.match(new RegExp(`TCP.*:.*${port}.*(LISTEN)`)))
        if (foundProcess.length === 0) throw new Error(`No process running on port ${port}`)
        if (foundProcess.length > 1) throw new Error('More than one process found')

        const line = foundProcess[0]
        return line.split(/\s+/)[1]
    }

    async getProcessIdWin32(port) {
        const {stdout} = await execAsync('netstat -nao')
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
        try {
            isWindows ? await execAsync(`TaskKill /F /PID ${pid}`) : await execAsync(`kill ${force ? '-9' : ''} ${pid}`)
            return true;
        } catch (e) {
            throw new Error("Kill command failed: " + e.stderr)
        }
    }
}


