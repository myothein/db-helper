import { Command } from "commander";

import { initSystemCommand } from "./init.command";
import { migrateSystemCommand } from "./migrate.command";
import { healthCommand } from "./health.command";

export function registerSystemCommands(program: Command) {
    initSystemCommand(program);
    migrateSystemCommand(program);
    healthCommand(program);
}
