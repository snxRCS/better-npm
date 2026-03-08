import { useQueryClient } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { useIntervalWhen } from "rooks";
import {
	getToken,
	isTwoFactorChallenge,
	loginAsUser,
	refreshToken,
	verify2FA,
	checkSSO,
	type TokenResponse,
} from "src/api/backend";
import AuthStore from "src/modules/AuthStore";

// SSO logout URL key in localStorage
const SSO_LOGOUT_URL_KEY = "sso_logout_url";

// 2FA challenge state
export interface TwoFactorChallenge {
	challengeToken: string;
}

// Context
export interface AuthContextType {
	authenticated: boolean;
	ssoLoading: boolean;
	twoFactorChallenge: TwoFactorChallenge | null;
	login: (username: string, password: string) => Promise<void>;
	verifyTwoFactor: (code: string) => Promise<void>;
	cancelTwoFactor: () => void;
	loginAs: (id: number) => Promise<void>;
	logout: () => void;
	token?: string;
}

const initalValue = null;
const AuthContext = createContext<AuthContextType | null>(initalValue);

// Provider
interface Props {
	children?: ReactNode;
	tokenRefreshInterval?: number;
}
function AuthProvider({ children, tokenRefreshInterval = 5 * 60 * 1000 }: Props) {
	const queryClient = useQueryClient();
	const [authenticated, setAuthenticated] = useState(AuthStore.hasActiveToken());
	const [ssoLoading, setSsoLoading] = useState(!AuthStore.hasActiveToken());
	const [twoFactorChallenge, setTwoFactorChallenge] = useState<TwoFactorChallenge | null>(null);

	const handleTokenUpdate = (response: TokenResponse) => {
		AuthStore.set(response);
		setAuthenticated(true);
		setTwoFactorChallenge(null);
	};

	// SSO auto-login: check for trusted reverse proxy headers on page load
	useEffect(() => {
		if (AuthStore.hasActiveToken()) {
			setSsoLoading(false);
			return;
		}

		let cancelled = false;

		const attemptSSO = async () => {
			// Timeout: fall back to login form after 5 seconds
			const timeout = setTimeout(() => {
				if (!cancelled) setSsoLoading(false);
			}, 5000);

			try {
				const result = await checkSSO();
				if (!cancelled && result.ssoAvailable && result.authenticated && result.token && result.expires) {
					// SSO backend returns same format as /tokens — store directly
					AuthStore.set({ token: result.token, expires: result.expires } as unknown as TokenResponse);
					setAuthenticated(true);

					// Store SSO logout URL for later use
					if (result.ssoLogoutUrl) {
						localStorage.setItem(SSO_LOGOUT_URL_KEY, result.ssoLogoutUrl);
					}
				}
			} catch (err) {
				// SSO not available or failed — fall back to normal login form
				console.debug("[SSO] Auto-login check failed:", err);
			} finally {
				clearTimeout(timeout);
				if (!cancelled) setSsoLoading(false);
			}
		};

		attemptSSO();

		return () => {
			cancelled = true;
		};
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const login = async (identity: string, secret: string) => {
		const response = await getToken(identity, secret);
		if (isTwoFactorChallenge(response)) {
			setTwoFactorChallenge({ challengeToken: response.challengeToken });
			return;
		}
		handleTokenUpdate(response);
	};

	const verifyTwoFactor = async (code: string) => {
		if (!twoFactorChallenge) {
			throw new Error("No 2FA challenge pending");
		}
		const response = await verify2FA(twoFactorChallenge.challengeToken, code);
		handleTokenUpdate(response);
	};

	const cancelTwoFactor = () => {
		setTwoFactorChallenge(null);
	};

	const loginAs = async (id: number) => {
		const response = await loginAsUser(id);
		AuthStore.add(response);
		queryClient.clear();
		window.location.reload();
	};

	const logout = () => {
		const ssoLogoutUrl = localStorage.getItem(SSO_LOGOUT_URL_KEY);

		if (AuthStore.count() >= 2) {
			AuthStore.drop();
			queryClient.clear();
			window.location.reload();
			return;
		}

		AuthStore.clear();
		localStorage.removeItem(SSO_LOGOUT_URL_KEY);
		setAuthenticated(false);
		queryClient.clear();

		// SSO: redirect to identity provider's logout endpoint
		if (ssoLogoutUrl) {
			window.location.href = ssoLogoutUrl;
		}
	};

	const refresh = async () => {
		const response = await refreshToken();
		handleTokenUpdate(response);
	};

	useIntervalWhen(
		() => {
			if (authenticated) {
				refresh();
			}
		},
		tokenRefreshInterval,
		true,
	);

	const value = {
		authenticated,
		ssoLoading,
		twoFactorChallenge,
		login,
		verifyTwoFactor,
		cancelTwoFactor,
		loginAs,
		logout,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuthState() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuthState must be used within a AuthProvider");
	}
	return context;
}

export { AuthProvider, useAuthState };
export default AuthContext;
