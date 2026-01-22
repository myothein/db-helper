// packages/db-helper/src/policies/naming.policy.ts

export const validateTenantName = (name: string) => {
    const regex = /^[a-z0-9_]+$/; // lowercase letters, numbers, underscores
    if (!regex.test(name)) {
        throw new Error(
            `Invalid tenant name "${name}". Only lowercase letters, numbers, and underscores are allowed.`
        );
    }
};
