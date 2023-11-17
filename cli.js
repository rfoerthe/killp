#!/usr/bin/env node
'use strict'

const killp = require('./')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const args = yargs(hideBin(process.argv)).argv

console.log(args)

const kill_parent = args.parent;

return killp(args.port, args.pid, kill_parent)
	.then((result) => {
		console.log(`Process on port ${args.port} killed`)
	})
	.catch((error) => {
		console.log(`Could not kill process on port ${args.port}. ${error.message}.`)
		console.log(error)
	})

