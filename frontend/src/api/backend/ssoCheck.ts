import * as api from "./base";

export interface SSOCheckResult {
	ssoAvailable: boolean;
	authenticated?: boolean;
	token?: string;
	expires?: string;
	ssoLogoutUrl?: string;
}

export async function checkSSO(): Promise<SSOCheckResult> {
	return await api.get({ url: "/tokens/sso" });
}
