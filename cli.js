#!/usr/bin/env node
'use strict'

import killp from "./index.js";
import yargs from "yargs/yargs";
import {hideBin} from "yargs/helpers";


const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 [-v] -p num [--parent-name string]')
	.option('p', {description: 'Port of process', type: 'number'})
    .alias('p', 'port')
	.option('parent-name',  {description: 'Name of the parent process', type: 'string'})
	.option('v', {description: 'Verbose output', type: 'boolean'})
	.alias('v', 'verbose')
	.demandOption(['port'])
    .argv

const {port, parentName, verbose} = argv

try {
	await killp(port, parentName, verbose)
} catch (error) {
	console.error(error.message)
}
