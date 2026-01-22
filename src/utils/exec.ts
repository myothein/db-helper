// packages/db-helper/src/utils/exec.ts

import { exec as execNode } from "child_process";
import { promisify } from "util";
import { Logger } from "./logger";

const execAsync = promisify(execNode);

export const exec = async (command: string, cwd?: string): Promise<{ stdout: string; stderr: string }> => {
    try {
        Logger.info(`Executing command: ${command}`);
        const { stdout, stderr } = await execAsync(command, { cwd });
        if (stderr) Logger.warn(stderr);
        return { stdout, stderr };
    } catch (err: any) {
        Logger.error(`Command failed: ${command}`, err);
        throw err;
    }
};
