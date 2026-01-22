import { dbHelper } from "../../lib/db.helper";

export async function withProvider<T>(
    fn: (provider: ReturnType<typeof dbHelper.getProvider>) => Promise<T>
): Promise<T> {
    const provider = dbHelper.getProvider();
    await provider.connect();

    try {
        return await fn(provider);
    } finally {
        await provider.disconnect();
    }
}
