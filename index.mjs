#!/usr/bin/env node
'use strict'

import psList from 'ps-list'
import os from 'node:os'
import util from 'node:util'
import childProcess from 'node:child_process'

const execAsync = util.promisify(childProcess.exec)

const isWindows = os.platform() === 'win32'

// Cached regular expressions for performance
const WHITESPACE_REGEX = /\s+/

/**
 * Terminates a process listening on a specific TCP port or its parent process including children.
 * @param {number} port - The port number where the process is listening
 * @param {string[]} allowedParents - Array of allowed parent process names to terminate
 * @param {boolean} verbose - Enable verbose output
 * @param {boolean} forceKill - Force kill the process (SIGKILL on Unix, always forced on Windows)
 * @throws {Error} When no process is found on the port or parent process name doesn't match
 * @returns {Promise<void>}
 */
export default async function (port, allowedParents, verbose, forceKill) {
    const support = new Support()
    const processId = isWindows ? await support.getProcessIdWin32(port) : await support.getProcessId(port);

    if (allowedParents.length > 0) {
        const {parentProcessId, name} = await support.getParentProcess(processId, allowedParents)
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

/**
 * Support class containing platform-specific process management utilities.
 */
export class Support {
    /**
     * Gets the process ID listening on the specified port using lsof (Unix/Linux/macOS).
     * @param {number} port - The port number to search for
     * @returns {Promise<string>} The process ID as a string
     * @throws {Error} When no process is found on the port or multiple processes found
     */
    async getProcessId(port) {
        const {stdout} = await execAsync('lsof -i -P -n')
        if (!stdout) throw new Error(`No process running on port ${port}`)

        const lines = stdout.split('\n')
        const portRegex = new RegExp(`TCP.*:.*${port}.*(LISTEN)`)
        const foundProcess = lines.filter((line) => line.match(portRegex))
        if (foundProcess.length === 0) throw new Error(`No process running on port ${port}`)
        if (foundProcess.length > 1) throw new Error('More than one process found')

        const line = foundProcess[0]
        return line.split(WHITESPACE_REGEX)[1]
    }

    /**
     * Gets the process ID listening on the specified port using netstat (Windows).
     * @param {number} port - The port number to search for
     * @returns {Promise<string>} The process ID as a string
     * @throws {Error} When no process is found on the port or multiple processes found
     */
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

    /**
     * Finds the parent process of a given child process ID.
     * @param {string|number} childPid - The child process ID
     * @param {string[]} parentNames - Array of allowed parent process names
     * @returns {Promise<{parentProcessId: number|undefined, name: string}>} Object containing parent process ID (if name matches) and name
     */
    async getParentProcess(childPid, parentNames) {
        const allProcesses = await psList();
        const pid = parseInt(childPid);
        const childProcess = allProcesses.find(proc => proc.pid === pid);
        const ppid = childProcess ? childProcess.ppid : undefined;
        const parentProcess = allProcesses.find(proc => proc.pid === ppid);
        return {parentProcessId: parentNames.includes(parentProcess.name) ? ppid : undefined, name: parentProcess.name}
    }

    /**
     * Kills a process with the specified process ID.
     * @param {string|number} pid - The process ID to kill
     * @param {boolean} verbose - Enable verbose output (not used internally)
     * @param {boolean} force - Force kill using SIGKILL on Unix (kill -9), always forced on Windows
     * @returns {Promise<boolean>} True if successful
     * @throws {Error} When the kill command fails
     */
    async killProcess(pid, verbose, force) {
        try {
            isWindows ? await execAsync(`TaskKill /F /PID ${pid}`) : await execAsync(`kill${force ? ' -9' : ''} ${pid}`)
            return true;
        } catch (e) {
            throw new Error("Kill command failed: " + e.stderr)
        }
    }
}


