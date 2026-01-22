import { Command } from "commander";
import { getCommandRegistry } from "./command-registry";

const GROUP_HEADERS: Record<string, { title: string; icon: string }> = {
    system: { title: "SYSTEM", icon: "🛠️" },
    tenant: { title: "TENANT", icon: "🧩" },
    ops: { title: "OPS", icon: "🚀" },
};

export function applyGroupedHelp(program: Command) {
    program.configureHelp({
        formatHelp: (cmd, helper) => {
            let output = "";

            // =====================
            // Usage
            // =====================
            output += helper.commandUsage(cmd) + "\n\n";

            // =====================
            // Description
            // =====================
            if (cmd.description()) {
                output += `${cmd.description()}\n\n`;
            }

            // =====================
            // Group commands
            // =====================
            const groups = new Map<string, { name: string; desc: string }[]>();

            for (const c of getCommandRegistry()) {
                if (!groups.has(c.group)) {
                    groups.set(c.group, []);
                }
                groups.get(c.group)!.push({
                    name: c.name,
                    desc: c.description,
                });
            }

            // =====================
            // Render groups
            // =====================
            for (const [group, commands] of groups) {
                const header =
                    GROUP_HEADERS[group] ??
                    { title: group.toUpperCase(), icon: "📦" };

                output += `${header.icon}  ${header.title}\n`;
                output += "─".repeat(40) + "\n";

                for (const c of commands) {
                    output += `  ${c.name.padEnd(30)} ${c.desc}\n`;
                }

                output += "\n";
            }

            // =====================
            // Options
            // =====================
            if (cmd.options.length > 0) {
                output += "Options:\n";

                for (const option of cmd.options) {
                    const term = helper.optionTerm(option);
                    const desc = helper.optionDescription(option);
                    output += `  ${term.padEnd(30)} ${desc}\n`;
                }

                output += "\n";
            }

            return output;
        },
    });
}
