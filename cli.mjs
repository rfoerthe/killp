#!/usr/bin/env node
'use strict'

import killp from "./index.mjs";
import yargs from "yargs";
import {hideBin} from "yargs/helpers";

const argv = yargs(hideBin(process.argv))
	.usage('\nTerminate a process running on given port or its parent process\n\n' +
		'Usage: $0 [-v] -p num [--parent-name string]')
	.wrap(120)
	.example('$0 -p 9000', 'terminate process which listens on port 9000')
	.example('$0 -v -p 8080 --parent-name=zsh', 'terminate parent process of process which listens on port 8080 (verbose)')
	.option('p', {alias: 'port', description: 'Port of process', demandOption: true, type: 'number'})
	.option('parent-name',  {description: 'Name of the parent process', type: 'string'})
	.option('v', {alias: 'verbose', description: 'Verbose output', type: 'boolean'})
	.version()
    .argv

const {port, parentName, verbose} = argv

try {
	await killp(port, parentName, verbose)
} catch (error) {
	console.error(error.message)
}
