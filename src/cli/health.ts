import { Command } from "commander";
import { dbHelper } from "../lib/db.helper";

export function healthCommand(program: Command) {
    program
        .command("health")
        .description("Check system database health")
        .action(async () => {
            const result = await dbHelper.checkHealth();
            console.log(result);
        });
}
