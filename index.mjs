#!/usr/bin/env node
'use strict'

import shellExec from 'shell-exec';

import psList from 'ps-list';
import os from 'os';

export default async function (port, parentName, verbose) {
    if (!port || isNaN(Number(port))) throw new Error('Port is not a number')
    port = Number(port)

    const processId = os.platform() === 'win32' ? await getProcessIdWin32() : await getProcessId();

    if (typeof parentName === 'string' && parentName.length > 0) {
        const {parentProcessId, name} = await getParentProcess(parseInt(processId), parentName)  // Use new function
        if (parentProcessId) {
            await killProcess(parentProcessId, verbose);
        } else {
            throw new Error(`Refused to terminate parent process. The specified name '${parentName}' does not match the real name '${name}'`)
        }
    } else {
        await killProcess(processId, verbose);
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

    async function getParentProcess(childPid, parentCmdName) {
        const allProcesses = await psList();
        const childProcess = allProcesses.find(proc => proc.pid === childPid);
        const ppid = childProcess ? childProcess.ppid : undefined;
        const parentProcess = allProcesses.find(proc => proc.pid === ppid);
        return { parentProcessId: parentProcess.name === parentCmdName ? ppid : undefined, name: parentProcess.name }
    }

    async function killProcess(pid, verbose) {
        const res = os.platform() === 'win32' ?
            await shellExec(`TaskKill /F /PID ${pid}`) : await shellExec(`kill -9 ${pid}`)
        if (res.code !== 0) {
            throw new Error("Kill command failed: " + res.stderr)
        }
        if (verbose) console.log("Killed process: " + pid)
    }
}
