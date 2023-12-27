#!/usr/bin/env node
'use strict'

import killp from "./index.mjs";
import yargs from "yargs";
import {hideBin} from "yargs/helpers";

const argv = yargs(hideBin(process.argv))
	.usage('\nTerminates a process listening on a specific TCP port or terminates its parent process including children.\n')
	.usage('Usage: $0 [-v] -p num [--parent-name string]')
	.wrap(120)
	.example('$0 -v -p 9000', 'Terminates a process that is listening on port 9000 and show verbose output')
	.example('$0 -p 8080 --parent-name=zsh', 'Terminates the parent process of a process that is listening on port 8080')
	.option('p', {alias: 'port', description: 'Port of process to terminate', demandOption: true, type: 'number'})
	.option('parent-name',  {description: 'Name of the parent process that is to be terminated instead', type: 'string'})
	.option('v', {alias: 'verbose', description: 'Verbose output', type: 'boolean'})
	.version()
    .argv

const {port, parentName, verbose} = argv

try {
	await killp(port, parentName, verbose)
} catch (error) {
	console.error(error.message)
}
