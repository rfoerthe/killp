#!/usr/bin/env node
'use strict'

import shellExec from 'shell-exec';

import psList from 'ps-list';
import os from 'os';

export default async function (port, allowedParents, verbose, forceKill) {
    const processId = os.platform() === 'win32' ? await getProcessIdWin32() : await getProcessId();

    if (allowedParents.length > 0) {
        const {parentProcessId, name} = await getParentProcess(parseInt(processId), allowedParents)  // Use new function
        if (parentProcessId) {
            await killProcess(parentProcessId, verbose, false);
        } else {
            throw new Error(`Refused to terminate parent process. None of the specified name(s)` +
            ` '${allowedParents}' corresponds to the real name '${name}'`)
        }
    } else {
        await killProcess(processId, verbose, forceKill);
    }

    async function getProcessId() {
        const res = await shellExec('lsof -i -P -n')
        if (res.code !== 0 && res.stderr) throw new Error("command 'lsof' failed: " + res.stderr)
        const {stdout} = res
        if (!stdout) throw new Error(`No process running on port ${port}`)

        const lines = stdout.split('\n')

        const foundProcess = lines.filter((line) => line.match(new RegExp(`TCP.*:*${port}`)))
        if (foundProcess.length === 0) throw new Error(`No process running on port ${port}`)
        if (foundProcess.length > 1) throw new Error('More than one process found')

        const line = foundProcess[0]
        return line.split(/\s+/)[1]
    }

    async function getProcessIdWin32() {
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

    async function getParentProcess(childPid, parentNames) {
        const allProcesses = await psList();
        const childProcess = allProcesses.find(proc => proc.pid === childPid);
        const ppid = childProcess ? childProcess.ppid : undefined;
        const parentProcess = allProcesses.find(proc => proc.pid === ppid);
        return {parentProcessId: parentNames.includes(parentProcess.name) ? ppid : undefined, name: parentProcess.name}
    }

    async function killProcess(pid, verbose, force) {
        const res = os.platform() === 'win32' ? await shellExec(`TaskKill /F /PID ${pid}`) : await shellExec(`kill ${force ? '-9' : ''} ${pid}`)
        if (res.code !== 0) {
            throw new Error("Kill command failed: " + res.stderr)
        }
        if (verbose) console.log(`${force || os.platform() === 'win32' ? 'Killed' : 'Terminated'} process: ${pid}`)
    }
}
