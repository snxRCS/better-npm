import * as api from "./base";

export type AuthMode = "internal" | "internal_ldap" | "ldap_only";

export interface LdapServer {
	url: string;
	priority: number;
	label?: string;
}

export interface LdapConfig {
	enabled: boolean;
	authMode: AuthMode;
	host: string;
	port: number;
	url: string;
	servers?: LdapServer[];
	useTls: boolean;
	tlsVerify: boolean;
	bindDn: string;
	bindPassword: string;
	baseDn: string;
	userDnTemplate: string;
	searchFilter: string;
	emailAttribute: string;
	nameAttribute: string;
	groupAttribute: string;
	adminGroup: string;
	syncAdminGroup: boolean;
	autoCreateUser: boolean;
	ssoEnabled: boolean;
	ssoLogoutUrl: string;
	ssoAdminEmails: string;
	connectTimeout: number;
	searchTimeout: number;
}

export interface LdapConfigResponse {
	id: string;
	meta: LdapConfig;
}

export interface LdapTestResult {
	success: boolean;
	message: string;
	entriesFound?: number;
	connectedServer?: string;
}

export interface LdapStatusResult {
	connected: boolean;
	message: string;
	connectedServer?: string;
	totalServers?: number;
}

export async function getLdapConfig(): Promise<LdapConfigResponse> {
	return await api.get({ url: "/ldap/config" });
}

export async function updateLdapConfig(config: LdapConfig): Promise<LdapConfigResponse> {
	return await api.put({ url: "/ldap/config", data: config as any });
}

export async function testLdapConnection(config: LdapConfig): Promise<LdapTestResult> {
	return await api.post({ url: "/ldap/test", data: config as any });
}

export interface LdapSyncResult {
	success: boolean;
	total: number;
	created: number;
	updated: number;
	skipped: number;
	message: string;
}

export async function getLdapStatus(): Promise<LdapStatusResult> {
	return await api.get({ url: "/ldap/status" });
}

export async function syncLdapUsers(): Promise<LdapSyncResult> {
	return await api.post({ url: "/ldap/sync" });
}
