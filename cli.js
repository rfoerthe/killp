#!/usr/bin/env node
'use strict'

import killp from "./index.js";

import yargs from "yargs/yargs";

import {hideBin} from "yargs/helpers";


/*
yargs(hideBin(process.argv))
	.command('killp <port>', 'Kill process running on port', (yargs) => {
		return yargs
			.positional('port', {
				describe: 'port of process',
				number: true
			})
	}, (argv) => {
		if (argv.verbose) console.info(`start server on :${argv.port}`)
		serve(argv.port)
	})
	.demandCommand(1, 'You need at least one command before moving on')
	.option('verbose', {
		alias: 'v',
		type: 'boolean',
		description: 'Run with verbose logging'
	})
	.parse()
*/

/*
var argv = yargs(process.argv.splice(4))
	.usage('Usage: $0 <port> [options]')
	.positional('port')
	.example('$0 8080', 'kill process listening on port 8080')
	.alias('f', 'file')
	.nargs('f', 1)
	.describe('f', 'Load a file')
	.help('h')
	.alias('h', 'help')
	.argv;
*/


const argv = yargs(hideBin(process.argv))
	.usage('Usage: $0 --port num [--parent-name string]')
	.alias('p', 'port')
	.number('port')
	.demandOption(['port'])
	.argv


const kill_parent = argv.parentName;


killp(argv.port, kill_parent)
	.then((result) => {
		console.log(`Process with PID ${result} killed`)
	})
	.catch((error) => {
		console.log(`Could not kill process on port ${argv.port}. ${error.message}.`)
	})

