# killp
Kill a process running on given port or kill its parent process (including children).

```zsh
Usage: killp [-v] -p num [--parent-name string]

Options:
      --help         Show help                                                                                 [boolean]
  -p, --port         Port of process                                                                 [number] [required]
      --parent-name  Name of the parent process                                                                 [string]
  -v, --verbose      Verbose output                                                                            [boolean]
      --version      Show version number                                                                       [boolean]

Examples:
  killp -p 9000                       terminate process which listens on port 9000
  killp -v -p 8080 --parent-name=zsh  terminate parent process of process which listens on port 8080 (verbose)
```

In general, it is not safe to terminate a parent process based only on information about the child process (e.g. its listen port or PID).
Therefore, you must pass the name of the parent process (the command that started it) to the `parent-name` option. 
If the names do not match, killp refuses to end the parent process.

The command is working on Windows 10+, macOS 13+, FreeBSD 14+ and Linux systems. Under Linux and FreeBSD you must ensure 
that the package `lsof` is installed.
