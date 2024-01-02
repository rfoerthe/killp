#!/usr/bin/env node
'use strict'

import killp from "./index.mjs";
import yargs from "yargs";
import {hideBin} from "yargs/helpers";

process.argv[0] = 'killp'
const argv = yargs(hideBin(process.argv))
    .usage('\nTerminates a process listening on a specific TCP port or terminates its parent process including children.\n')
    .usage('Usage: $0 [-v] -p number [-a string[,string...]]')
    .wrap(140)
    .example('$0 -v -p 9000', 'Terminates a process that is listening on port 9000 and show verbose output')
    .example('$0 -p 8080 -a zsh', 'Terminates the parent process (zsh) of a process that is listening on port 8080')
    .example('$0 -p 8080 -a node,node.exe', 'Terminates the parent process (node or node.exe) of a process that is listening on port 8080')
    .option('p', {alias: 'port', description: 'Port of process to terminate', demandOption: true, type: 'number'})
    .option('a', {
        alias: "ancestor",
        description: 'Terminate parent process instead. Pass a comma-separated list of allowed parent process names.',
        type: 'string'
    })
    .option('f', {alias: 'force', description: 'Force terminating process', type: 'boolean', default: false})
    .option('v', {alias: 'verbose', description: 'Verbose output', type: 'boolean', default: false})
    .epilogue('Author: Roland Förther')
    .version()
    .strict()
    .check(argv => {
        if (isNaN(argv.port)) {
            throw new Error('Error: port is not a number')
        }
        if (argv.ancestor !== undefined && argv.ancestor.trim().length === 0) {
            throw new Error('Error: ancestor value must be a non-empty string')
        }
        return true
    })
    .argv

const {port, ancestor, verbose, force} = argv
try {
    const allowedParents = ancestor ? ancestor.split(",").map(item => item.trim()) : []
    await killp(port, allowedParents, verbose, force)
} catch (error) {
    console.error(error.message)
}
