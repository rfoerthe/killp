# killp - Architecture Documentation

## Overview

**killp** (kill process) is a Node.js command-line utility that terminates processes listening on specific TCP ports. It supports two primary modes:

1. **Direct termination**: Kill the process listening on a port
2. **Parent termination**: Safely kill the parent process of a child listening on a port

The tool is designed with safety mechanisms to prevent accidental termination of the wrong processes, particularly when dealing with parent-child process relationships.

---

## Architecture

### High-Level Structure

```
┌─────────────────────────────────────────────────────┐
│                    CLI Layer (cli.mjs)              │
│  - yargs argument parsing                           │
│  - Input validation                                 │
│  - Error handling                                   │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              Main Module (index.mjs)                │
│  - Orchestrates termination flow                    │
│  - Platform detection (Windows/Unix)                │
│  - Mode selection (direct/parent)                   │
└──────────────────────┬──────────────────────────────┘
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
┌──────────────┐            ┌───────────────────────┐
│  Support     │            │   Platform Detect     │
│  Class       │            │   (isWindows)         │
└──────┬───────┘            └───────────────────────┘
       │
       ├─ getProcessId()         (Unix: lsof)
       ├─ getProcessIdWin32()    (Windows: netstat)
       ├─ getParentProcess()     (ps-list)
       └─ killProcess()          (exec: kill/taskkill)
```

---

## Components

### 1. CLI Layer (`cli.mjs`)

**Responsibility**: Command-line interface with argument parsing and validation.

**Key Features**:
- Argument parsing using `yargs`
- Port validation (0-65535 range)
- Ancestor name parsing (comma-separated list)
- Auto-generated help text

**CLI Options**:
```
-p, --port          Port number (required)
-a, --ancestor      Allowed parent process names (comma-separated)
-f, --force         Force kill with SIGKILL (-9)
-v, --verbose       Enable verbose output
--help              Show help text
--version           Show version number
```

**Validation Checks**:
- Port must be a valid number
- Port must be in range 0-65535
- Ancestor string must not be empty if provided

**Error Handling**: All validation errors are caught and displayed to stderr.

---

### 2. Main Module (`index.mjs`)

**Responsibility**: Core business logic and orchestration.

#### Entry Point

```javascript
export default async function (port, allowedParents, verbose, forceKill)
```

**Flow**:
1. Create `Support` instance
2. Detect platform and get process ID
3. Check if parent termination mode is enabled
4. Execute appropriate kill strategy

#### Process Termination Logic

**Direct Mode (no ancestor specified)**:
```javascript
// 1. Get PID from port
pid = getProcessId(port)  // or getProcessIdWin32()

// 2. Kill the process
killProcess(pid, verbose, forceKill)
```

**Parent Mode (ancestor specified)**:
```javascript
// 1. Get child PID from port
childPid = getProcessId(port)

// 2. Get parent process info
{parentProcessId, name} = getParentProcess(childPid, allowedParents)

// 3. Validate parent name matches
if (parentProcessId) {
    killProcess(parentProcessId, verbose, false)
} else {
    throw Error("Parent name mismatch")
}
```

**Important Safety Note**: When terminating parent processes, `killp` **always uses SIGTERM (kill -15)** instead of SIGKILL. This is crucial because:
- `kill -9` (SIGKILL) on Unix kills the parent but leaves children orphaned
- `kill -15` (SIGTERM) allows graceful shutdown of the entire process tree

---

### 3. Support Class (`index.mjs`)

**Responsibility**: Platform-specific process management.

#### Methods

##### `getProcessId(port)` - Unix/Linux/macOS/FreeBSD

**Tools Used**: `lsof` (list open files)

**Command Executed**:
```bash
lsof -i -P -n
```

**Flags**:
- `-i`: List network files
- `-P`: Show port numbers (not service names)
- `-n`: Skip hostname resolution

**Parsing Logic**:
1. Execute `lsof` and capture stdout
2. Filter lines matching: `TCP.*:<port>.*(LISTEN)`
3. Extract PID from second column (whitespace-separated)

**Example Output**:
```
COMMAND   PID   USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
node    12345  user   20u  IPv4 123456      0t0  TCP *:8080 (LISTEN)
```

**Error Cases**:
- No output → No process on port
- No matching lines → No process on port
- Multiple matches → Ambiguous port binding

---

##### `getProcessIdWin32(port)` - Windows

**Tools Used**: `netstat`

**Command Executed**:
```bash
netstat -nao
```

**Flags**:
- `-n`: Show addresses numerically (no DNS lookups)
- `-a`: Show all connections and listening ports
- `-o`: Include process IDs

**Parsing Logic**:
1. Execute `netstat` and capture stdout
2. Filter lines matching: `^ *TCP *[^ ]*:<port>`
3. Extract PID from last numeric field
4. Deduplicate PIDs (multiple connections can share same PID)

**Example Output**:
```
Proto  Local Address          Foreign Address        State           PID
TCP    0.0.0.0:8080           0.0.0.0:0              LISTENING       12345
TCP    [::]:8080              [::]:0                 LISTENING       12345
```

**Key Difference from Unix**: Uses regex to find PID at end of line with `\d*\w*` pattern.

---

##### `getParentProcess(childPid, parentNames)`

**Tools Used**: `ps-list` (npm package)

**Flow**:
1. Get all running processes via `psList()`
2. Find process with matching PID
3. Extract parent PID (`ppid` field)
4. Find parent process by PID
5. Validate parent name against allowed list

**Returns**:
```javascript
{
    parentProcessId: PID | undefined,
    name: "process-name"
}
```

**Safety Check**: Parent is only terminated if:
- Parent process exists AND
- Parent name exactly matches one of the allowed names

**Error on Mismatch**: Throws descriptive error if parent name doesn't match.

---

##### `killProcess(pid, verbose, force)`

**Platform-Specific Commands**:

**Windows**:
```bash
TaskKill /F /PID <pid>
```
- Always uses `/F` (force flag)
- Windows doesn't distinguish between SIGTERM and SIGKILL

**Unix/Linux/macOS/FreeBSD**:
```bash
# Normal mode (SIGTERM):
kill <pid>

# Force mode (SIGKILL):
kill -9 <pid>
```

**Important**: When terminating parent processes, `force` flag is **always set to false**, ensuring graceful shutdown with SIGTERM.

---

## Data Flow

### Direct Termination Mode

```
User Input (port: 8080)
    ↓
CLI Validation (yargs check hook)
    ↓
Main Module → getProcessId(port)
    ↓
lsof (Unix) or netstat (Windows)
    ↓
Extract PID from command output
    ↓
killProcess(pid, verbose, forceKill)
    ↓
exec(terminate command)
    ↓
Success/Error Output
```

### Parent Termination Mode

```
User Input (port: 8080, ancestor: node,node.exe)
    ↓
CLI Validation
    ↓
Main Module → getProcessId(port)
    ↓
Extract child PID (e.g., 12345)
    ↓
getParentProcess(12345, ['node', 'node.exe'])
    ↓
ps-list → Find process with PID 12345
    ↓
Extract parent PID (e.g., 707111)
    ↓
Validate: Is 'node' in ['node', 'node.exe']?
    ↓
├─ YES → killProcess(707111, verbose, false)
│          ↓
│       exec(kill -15 707111)  ← Always SIGTERM
│          ↓
│       Success: "Terminated parent process 'node': 707111"
│
└─ NO → Throw Error:
        "Refused to terminate parent process. None of the specified 
         name(s) 'node,node.exe' corresponds to the real name 'bash'"
```

---

## Platform Differences

| Feature | Unix/Linux/macOS/FreeBSD | Windows |
|---------|--------------------------|---------|
| Process Detection | `lsof -i -P -n` | `netstat -nao` |
| Termination Command | `kill [options] <pid>` | `TaskKill /F /PID <pid>` |
| Force Flag Interpretation | `-9` (SIGKILL) vs no flag (SIGTERM) | Always force (`/F`) |
| Parent Kill Strategy | Always SIGTERM (no -9 flag) | Always force (no choice) |
| Process Info | `lsof` output parsing | `netstat` output parsing |

---

## Error Handling

### Validation Errors (CLI Layer)
- Port not a number
- Port out of range (0-65535)
- Empty ancestor string

### Runtime Errors (Main Module)
- No process running on port
- Multiple processes found on same port
- Parent name mismatch (ancestor mode only)
- Kill command failed

**Error Propagation**: All errors are caught at CLI level and printed to stderr.

---

## Testing Architecture

### Test Framework
- **Runner**: Mocha
- **Assertions**: Chai
- **Spies/Mocks**: Sinon

### Test Coverage (`index.test.mjs`)

1. **Async Function Validation**
   - Verifies default export is async

2. **Missing Port Handling**
   - Confirms error thrown with undefined port

3. **Direct Process Termination**
   - Stubs `getProcessId()` to return fake PID
   - Stubs `killProcess()` to simulate success
   - Verifies correct calls with verbose=true, force=false

4. **Force Process Termination**
   - Same as above but with force=true
   - Verifies killProcess called with force flag

5. **Parent Process Termination**
   - Stubs all three methods
   - Verifies parent process lookup flow
   - Confirms killProcess called with correct arguments

**Testing Strategy**: Heavy use of Sinon stubs to isolate units and avoid actual process termination during tests.

---

## Post-Install Script

### `scripts/create-local-bin.mjs`

**Purpose**: Create executable symlinks for local development.

**What It Does**:
1. Creates `node_modules/.bin/` directory
2. Generates shell wrapper script for Unix systems
3. Generates `.cmd` and `.ps1` wrappers for Windows

**Generated Files**:
- `node_modules/.bin/killp` (Unix shell script)
- `node_modules/.bin/killp.cmd` (Windows batch)
- `node_modules/.bin/killp.ps1` (PowerShell)

**Use Case**: Allows running `./node_modules/.bin/killp -p 8080` after local `npm install`.

---

## Dependencies

### Runtime Dependencies
```json
{
  "ps-list": "^9.0.0",      // Process list utility
  "yargs": "^18.0.0"        // CLI argument parser
}
```

### Development Dependencies
```json
{
  "chai": "^6.2.2",                     // Assertion library
  "mocha": "^11.7.5",                   // Test runner
  "mocha-sinon": "^2.1.2",              // Sinon integration for Mocha
  "nodemon": "^3.1.14",                 // Dev server reload
  "sinon": "^21.0.2"                    // Spies/mocks/stubs
}
```

### Overrides (Security)
```json
{
  "diff": "^8.0.3",
  "glob": "^13.0.6",
  "serialize-javascript": "^7.0.4"
}
```
These are security overrides to ensure newer, safer versions.

---

## External Tool Dependencies

**Must be installed on the system**:

| Platform | Required Tool | Purpose |
|----------|--------------|---------|
| Unix/Linux/macOS/FreeBSD | `lsof` | List open files/network connections |
| Windows | `netstat` (built-in) | Network statistics and PID mapping |

**lsof Installation**:
- **macOS**: already pre-installed
- **Ubuntu/Debian**: `sudo apt-get install lsof`
- **CentOS/RHEL**: `sudo yum install lsof`

---

## Security Considerations

1. **Parent Process Validation**: Ancestor mode requires exact name match
2. **No Force Kill for Parents**: Parent processes always use SIGTERM (not SIGKILL)
3. **Port Validation**: Input validation prevents injection attacks
4. **Command Execution**: Uses async exec with error capture

---

## Execution Examples

### Example 1: Kill Process on Port

```bash
killp -v -p 9000
```

**Flow**:
1. CLI validates port `9000` is in range
2. Calls `getProcessId(9000)` (Unix: lsof, Windows: netstat)
3. Gets PID e.g., `12345`
4. Calls `killProcess(12345, verbose=true, force=false)`
5. Executes `kill 12345` (SIGTERM) or `TaskKill /F /PID 12345`
6. Outputs: "Terminated process: 12345"

---

### Example 2: Kill Parent Process

```bash
killp -p 8080 --ancestor=node,node.exe
```

**Flow**:
1. CLI parses ancestor string into `['node', 'node.exe']`
2. Gets child PID e.g., `54321` from port 8080
3. Calls `getParentProcess(54321, ['node', 'node.exe'])`
4. `ps-list` finds child PID 54321 has parent PID `707111`
5. Parent process name is `'node'`
6. Validation: `'node'` matches allowed list ✓
7. Calls `killProcess(707111, verbose=true, force=false)`
8. Executes `kill 707111` (SIGTERM, NOT -9)
9. Outputs: "Terminated parent process 'node': 707111"

---

## Error Scenarios

### Scenario 1: Port Not in Use
```bash
$ killp -v -p 9999
Error: No process running on port 9999
```

### Scenario 2: Parent Name Mismatch
```bash
$ killp -p 8080 --ancestor=node
Error: Refused to terminate parent process. None of the specified 
       name(s) 'node' corresponds to the real name 'bash'
```

### Scenario 3: Multiple Processes on Port
```bash
$ killp -v -p 8080
Error: More than one process found
```

---

## File Structure

```
/Users/rfoerthe/work/pro/killp/
├── cli.mjs                    # CLI entry point with yargs
├── index.mjs                  # Main module and Support class
├── index.test.mjs             # Unit tests (Mocha)
├── example.mjs                # Example usage
├── scripts/
│   └── create-local-bin.mjs  # Post-install script
├── package.json               # Project metadata and deps
├── README.md                  # User documentation
└── ARCHITECTURE.md           # This file
```

---

## Version Info

- **Current Version**: 1.0.18
- **Engine Requirements**: Node.js >= 22.0.0, npm >= 10.0.0
- **License**: Apache-2.0
- **Author**: Roland Förther

---

## Summary

**killp** is a cross-platform process termination tool with:

✓ Platform abstraction (Unix vs Windows)  
✓ Parent process safety checks  
✓ Graceful shutdown for parent processes  
✓ Comprehensive input validation  
✓ Unit test coverage  
✓ Cross-platform CLI interface  

It solves the common problem of "I need to kill whatever is using port 8080" with additional safety for parent-child process scenarios.
