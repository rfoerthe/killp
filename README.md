# killp
Terminates a process listening on a specific TCP port or terminates its parent process including children.  

## Compatibility
`killp` requires Node.JS >= 16.0.0 and npm >= 8.0.0.

The provided command uses os specific external tools and is working on Windows 10+, macOS 13+, FreeBSD 13+ and Linux systems. Under Linux and FreeBSD you must ensure
that the package `lsof` is installed.

## Installation
Install package in project:
```zsh
npm i @rfoerthe/killp
```
Install package globally:
```zsh
npm i -g @rfoerthe/killp
```
Install a specific version:
```zsh
npm i -g @rfoerthe/killp@1.0.13
```
Run directly from remote npm package:
```zsh
npx @rfoerthe/killp -p 8080
```

## Usage
```
killp [-v] -p number [-a string[,string...]]

Options:
      --help         Show help
  -p, --port         Port of process to terminate
  -a, --ancestor     Terminate parent process instead. Pass a comma-separated list of allowed parent process names.
  -f  --force        Force terminating process      
  -v, --verbose      Verbose output
      --version      Show version number
```
By default, the listening port of the process you want to terminate is specified.
If you want to terminate the parent process instead you must additionally pass its 
name to the `ancestor` option. This name is typically the command,
that started the process. `ancestor` can be a single name or a
comma seperated list of names, where one of the names must match the process name.

In general, it is not safe to terminate a parent process based only on information about the child process (e.g. its listen port or PID).
The `ancestor` option protects you from making errors. If the name of the parent process and the passed name(s) do not match, 
`killp` refuses to end the parent process. In this case, the command displays an error message containing 
the expected name of the parent process.

The option `force` has only effect in Unix-like systems when not terminating a parent process. 
Because if a parent is force killed with SIGKILL (kill -9), their children remain alive.
So in this case SIGTERM (kill -15) is used.

## Examples
Terminate a process that is listening on port 9000 and show verbose output:
```zsh
killp -v -p 9000      
```
Terminate the parent process of a process that is listening on port 8080. It is expected that the
parent process has been started via `node` or `node.exe`, otherwise the command will fail. 
```zsh
killp -p 8080 --ancestor=node,node.exe  
```
This allows you to support Windows and non-Windows systems at the same time.