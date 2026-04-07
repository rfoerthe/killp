/**
 * Terminates a process listening on a specific TCP port or its parent process including children.
 * @param port - The port number where the process is listening
 * @param allowedParents - Array of allowed parent process names to terminate
 * @param verbose - Enable verbose output
 * @param forceKill - Force kill the process (SIGKILL on Unix, always forced on Windows)
 * @throws {Error} When no process is found on the port or parent process name doesn't match
 */
export default function killp(
    port: number,
    allowedParents: string[],
    verbose: boolean,
    forceKill: boolean
): Promise<void>;

/**
 * Support class containing platform-specific process management utilities.
 */
export class Support {
    /**
     * Gets the process ID listening on the specified port using lsof (Unix/Linux/macOS).
     * @param port - The port number to search for
     * @returns The process ID as a string
     * @throws {Error} When no process is found on the port or multiple processes found
     */
    getProcessId(port: number): Promise<string>;

    /**
     * Gets the process ID listening on the specified port using netstat (Windows).
     * @param port - The port number to search for
     * @returns The process ID as a string
     * @throws {Error} When no process is found on the port or multiple processes found
     */
    getProcessIdWin32(port: number): Promise<string>;

    /**
     * Finds the parent process of a given child process ID.
     * @param childPid - The child process ID
     * @param parentNames - Array of allowed parent process names
     * @returns Object containing parent process ID (if name matches) and name
     */
    getParentProcess(
        childPid: string | number,
        parentNames: string[]
    ): Promise<{ parentProcessId: number | undefined; name: string }>;

    /**
     * Kills a process with the specified process ID.
     * @param pid - The process ID to kill
     * @param verbose - Enable verbose output (not used internally)
     * @param force - Force kill using SIGKILL on Unix (kill -9), always forced on Windows
     * @returns True if successful
     * @throws {Error} When the kill command fails
     */
    killProcess(
        pid: string | number,
        verbose: boolean,
        force: boolean
    ): Promise<boolean>;
}
