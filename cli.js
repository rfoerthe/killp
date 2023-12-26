#!/usr/bin/env node
'use strict'

import killp from "./index.js";
import yargs from "yargs";
import {hideBin} from "yargs/helpers";


const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 [-v] -p num [--parent-name string]')
	.option('p', {alias: 'port', description: 'Port of process', demandOption: true, type: 'number'})
	.option('parent-name',  {description: 'Name of the parent process', type: 'string'})
	.option('v', {alias: 'verbose', description: 'Verbose output', type: 'boolean'})
    .argv

const {port, parentName, verbose} = argv

try {
	await killp(port, parentName, verbose)
} catch (error) {
	console.error(error.message)
}
