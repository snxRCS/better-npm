import express from "express";
import internalLdap from "../internal/ldap.js";
import internalToken from "../internal/token.js";
import jwtdecode from "../lib/express/jwt-decode.js";
import apiValidator from "../lib/validator/api.js";
import { debug, express as logger } from "../logger.js";
import { getValidationSchema } from "../schema/index.js";

const router = express.Router({
	caseSensitive: true,
	strict: true,
	mergeParams: true,
});

router
	.route("/")
	.options((_, res) => {
		res.sendStatus(204);
	})

	/**
	 * GET /tokens
	 *
	 * Get a new Token, given they already have a token they want to refresh
	 * We also piggy back on to this method, allowing admins to get tokens
	 * for services like Job board and Worker.
	 */
	.get(jwtdecode(), async (req, res, next) => {
		try {
			const data = await internalToken.getFreshToken(res.locals.access, {
				expiry: typeof req.query.expiry !== "undefined" ? req.query.expiry : null,
				scope: typeof req.query.scope !== "undefined" ? req.query.scope : null,
			});
			res.status(200).send(data);
		} catch (err) {
			debug(logger, `${req.method.toUpperCase()} ${req.path}: ${err}`);
			next(err);
		}
	})

	/**
	 * POST /tokens
	 *
	 * Create a new Token
	 * Respects the configured auth_mode:
	 *   "internal"       - Only local (email/password) authentication
	 *   "internal_ldap"  - Try local first, fall back to LDAP
	 *   "ldap_only"      - Only LDAP authentication
	 */
	.post(async (req, res, next) => {
		try {
			const data = await apiValidator(getValidationSchema("/tokens", "post"), req.body);

			// Determine auth mode from LDAP settings
			const ldapConfig = await internalLdap.getLdapConfig();
			const authMode = (ldapConfig && ldapConfig.auth_mode) || "internal";

			let result;

			if (authMode === "ldap_only") {
				// Only LDAP authentication
				result = await internalToken.getTokenFromLdap(data);
			} else if (authMode === "internal_ldap") {
				// Try local first, then LDAP
				try {
					result = await internalToken.getTokenFromEmail(data);
				} catch (localErr) {
					try {
						result = await internalToken.getTokenFromLdap(data);
					} catch (ldapErr) {
						debug(logger, `LDAP auth fallback failed: ${ldapErr.message}`);
						throw localErr;
					}
				}
			} else {
				// Default: internal only
				result = await internalToken.getTokenFromEmail(data);
			}

			res.status(200).send(result);
		} catch (err) {
			debug(logger, `${req.method.toUpperCase()} ${req.path}: ${err}`);
			next(err);
		}
	});

router
	.route("/sso")
	.options((_, res) => {
		res.sendStatus(204);
	})

	/**
	 * GET /tokens/sso
	 *
	 * SSO authentication via trusted reverse proxy headers.
	 * Reads Remote-Email, Remote-User, Remote-Name, Remote-Groups headers
	 * set by Authelia (or similar forward auth proxy).
	 * Returns a JWT token if a valid email header is present.
	 */
	.get(async (req, res, next) => {
		try {
			// Check if SSO is enabled in LDAP config
			const ldapConfig = await internalLdap.getLdapConfig();
			const ssoEnabled = ldapConfig && (ldapConfig.sso_enabled || ldapConfig.ssoEnabled);

			const ssoLogoutUrl = ldapConfig && (ldapConfig.sso_logout_url || ldapConfig.ssoLogoutUrl) || "";

			if (!ssoEnabled) {
				res.status(200).send({ sso_available: false });
				return;
			}

			const email = req.headers["remote-email"] || req.headers["x-forwarded-email"];
			const user = req.headers["remote-user"] || req.headers["x-forwarded-user"];
			const name = req.headers["remote-name"] || req.headers["x-forwarded-name"];
			const groups = req.headers["remote-groups"] || req.headers["x-forwarded-groups"];

			debug(logger, `[SSO] Headers received — email: ${email || "(empty)"}, user: ${user || "(empty)"}, name: ${name || "(empty)"}, groups: ${groups || "(empty)"}`);

			if (!email) {
				res.status(200).send({ sso_available: true, authenticated: false, sso_logout_url: ssoLogoutUrl });
				return;
			}

			const result = await internalToken.getTokenFromSSO({
				email,
				user,
				name,
				groups,
			});


			res.status(200).send({
				sso_available: true,
				authenticated: true,
				sso_logout_url: ssoLogoutUrl,
				...result,
			});
		} catch (err) {
			debug(logger, `${req.method.toUpperCase()} ${req.path}: ${err}`);
			next(err);
		}
	});

router
	.route("/2fa")
	.options((_, res) => {
		res.sendStatus(204);
	})

	/**
	 * POST /tokens/2fa
	 *
	 * Verify 2FA code and get full token
	 */
	.post(async (req, res, next) => {
		try {
			const { challenge_token, code } = await apiValidator(getValidationSchema("/tokens/2fa", "post"), req.body);
			const result = await internalToken.verify2FA(challenge_token, code);
			res.status(200).send(result);
		} catch (err) {
			debug(logger, `${req.method.toUpperCase()} ${req.path}: ${err}`);
			next(err);
		}
	});

export default router;
