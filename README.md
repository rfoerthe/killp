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

It is not without danger to terminate a parent process by using option `--parent-name`. Therefore, you have to provide the name of the parent
process (the command which started it). If it does not match, killp will refuse to terminate the parent process.

The command is working on Windows 10+, macOS 13+ and Linux systems. On Linux you have to install the package `lsof`.
