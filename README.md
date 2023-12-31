# killp
Terminates a process listening on a specific TCP port or terminates its parent process including children.

```zsh
Usage: killp [-v] -p num [--parent-name string]

Options:
      --help         Show help
  -p, --port         Port of process to terminate
      --parent-name  Name of the parent process that is to be terminated instead
  -f  --force        Force terminating process      
  -v, --verbose      Verbose output
      --version      Show version number
```
By default, the listening port of the process you want to terminate is specified.
If you want to terminate the parent process instead you must additionally pass its 
name to the `parent-name` option. This name is typically the command,
that started the process.

In general, it is not safe to terminate a parent process based only on information about the child process (e.g. its listen port or PID).
The `parent-name` option protects you from making errors. If the name of the parent process and the passed name do not match, 
`killp` refuses to end the parent process. In this case, `killp` displays an error message containing 
the expected name of the parent process.

The option `force` has only effect when not terminating a parent process. Because if a parent is force killed, 
their children remain alive.

The command is working on Windows 10+, macOS 13+, FreeBSD 14+ and Linux systems. Under Linux and FreeBSD you must ensure 
that the package `lsof` is installed.

### Examples
Terminates a process that is listening on port 9000 and show verbose output:
```zsh
cli.mjs -v -p 9000      
```
Terminates the parent process of a process that is listening on port 8080. It is expected that the
parent process has been started via `zsh`.
```zsh
cli.mjs -p 8080 --parent-name=zsh  
```

