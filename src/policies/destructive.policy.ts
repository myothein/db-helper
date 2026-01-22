// packages/db-helper/src/policies/destructive.policy.ts

export const preventDestructiveAction = (actionName: string) => {
    if (process.env.NODE_ENV === "production") {
        throw new Error(`Destructive action "${actionName}" is not allowed in production.`);
    }
};
