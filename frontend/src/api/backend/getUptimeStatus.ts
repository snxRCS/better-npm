import * as api from "./base";

export interface UptimeEntry {
	status: "up" | "down";
	responseCode: number | null;
	responseTimeMs: number | null;
	lastChecked: string;
}

export type UptimeStatusMap = Record<number, UptimeEntry>;

export async function getUptimeStatus(): Promise<UptimeStatusMap> {
	return await api.get({ url: "/uptime" });
}

export interface UptimeHistoryEntry {
	id: number;
	proxyHostId: number;
	status: "up" | "down";
	responseCode: number | null;
	responseTimeMs: number | null;
	createdOn: string;
}

export async function getUptimeHistory(proxyHostId: number): Promise<UptimeHistoryEntry[]> {
	return await api.get({ url: `/uptime/${proxyHostId}` });
}
