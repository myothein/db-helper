export type CommandGroup =
    | "System Commands"
    | "Tenant Commands"
    | "Maintenance Commands";

export interface CommandMeta {
    name: string;
    description: string;
    group: CommandGroup;
}

const registry: CommandMeta[] = [];

export function registerCommand(meta: CommandMeta) {
    registry.push(meta);
}

export function getCommandRegistry(): CommandMeta[] {
    return registry;
}
