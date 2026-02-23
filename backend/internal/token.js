import avatar from "../lib/avatar.js";
import _ from "lodash";
import errs from "../lib/error.js";
import { parseDatePeriod } from "../lib/helpers.js";
import authModel from "../models/auth.js";
import TokenModel from "../models/token.js";
import userModel from "../models/user.js";
import userPermissionModel from "../models/user_permission.js";
import twoFactor from "./2fa.js";
import internalLdap from "./ldap.js";

const ERROR_MESSAGE_INVALID_AUTH = "Invalid email or password";
const ERROR_MESSAGE_INVALID_AUTH_I18N = "error.invalid-auth";
const ERROR_MESSAGE_INVALID_2FA = "Invalid verification code";
const ERROR_MESSAGE_INVALID_2FA_I18N = "error.invalid-2fa";

export default {
	/**
	 * @param   {Object} data
	 * @param   {String} data.identity
	 * @param   {String} data.secret
	 * @param   {String} [data.scope]
	 * @param   {String} [data.expiry]
	 * @param   {String} [issuer]
	 * @returns {Promise}
	 */
	getTokenFromEmail: async (data, issuer) => {
		const Token = TokenModel();

		data.scope = data.scope || "user";
		data.expiry = data.expiry || "1d";

		const user = await userModel
			.query()
			.where("email", data.identity.toLowerCase().trim())
			.andWhere("is_deleted", 0)
			.andWhere("is_disabled", 0)
			.first();

		if (!user) {
			throw new errs.AuthError(ERROR_MESSAGE_INVALID_AUTH);
		}

		const auth = await authModel
			.query()
			.where("user_id", "=", user.id)
			.where("type", "=", "password")
			.first();

		if (!auth) {
			throw new errs.AuthError(ERROR_MESSAGE_INVALID_AUTH);
		}

		const valid = await auth.verifyPassword(data.secret);
		if (!valid) {
			throw new errs.AuthError(
				ERROR_MESSAGE_INVALID_AUTH,
				ERROR_MESSAGE_INVALID_AUTH_I18N,
			);
		}

		if (data.scope !== "user" && _.indexOf(user.roles, data.scope) === -1) {
			// The scope requested doesn't exist as a role against the user,
			// you shall not pass.
			throw new errs.AuthError(`Invalid scope: ${data.scope}`);
		}

		// Check if 2FA is enabled
		const has2FA = await twoFactor.isEnabled(user.id);
		if (has2FA) {
			// Return challenge token instead of full token
			const challengeToken = await Token.create({
				iss: issuer || "api",
				attrs: {
					id: user.id,
				},
				scope: ["2fa-challenge"],
				expiresIn: "5m",
			});

			return {
				requires_2fa: true,
				challenge_token: challengeToken.token,
			};
		}

		// Create a moment of the expiry expression
		const expiry = parseDatePeriod(data.expiry);
		if (expiry === null) {
			throw new errs.AuthError(`Invalid expiry time: ${data.expiry}`);
		}

		const signed = await Token.create({
			iss: issuer || "api",
			attrs: {
				id: user.id,
			},
			scope: [data.scope],
			expiresIn: data.expiry,
		});

		return {
			token: signed.token,
			expires: expiry.toISOString(),
		};
	},

	/**
	 * Authenticate via LDAP and return a JWT token.
	 * If the LDAP user doesn't exist locally, auto-create them.
	 *
	 * @param   {Object} data
	 * @param   {String} data.identity  Username or email
	 * @param   {String} data.secret    Password
	 * @param   {String} [data.scope]
	 * @param   {String} [data.expiry]
	 * @param   {String} [issuer]
	 * @returns {Promise}
	 */
	getTokenFromLdap: async (data, issuer) => {
		const Token = TokenModel();

		data.scope = data.scope || "user";
		data.expiry = data.expiry || "1d";

		// Authenticate against LDAP server
		const ldapUser = await internalLdap.authenticate(data.identity, data.secret);

		// Check if user already exists locally
		let user = await userModel
			.query()
			.where("email", ldapUser.email.toLowerCase().trim())
			.andWhere("is_deleted", 0)
			.first();

		if (user && user.is_disabled) {
			throw new errs.AuthError("Account is disabled");
		}

		const ldapConfig = await internalLdap.getLdapConfig();

		if (!user) {
			// Auto-create user from LDAP if enabled
			if (!ldapConfig || ldapConfig.auto_create_user === false) {
				throw new errs.AuthError(
					"LDAP authentication succeeded but no local account exists. " +
					"Please contact an administrator."
				);
			}

			// Determine roles: check if user is in the admin group
			const roles = [];
			if (ldapConfig.admin_group) {
				const isAdmin = ldapUser.groups.some((g) => {
					const groupLower = g.toLowerCase();
					const adminGroupLower = ldapConfig.admin_group.toLowerCase();
					return groupLower === adminGroupLower || groupLower.includes(`cn=${adminGroupLower},`);
				});
				if (isAdmin) {
					roles.push("admin");
				}
			}

			// Create the user (use LDAP photo if available, otherwise generate initials avatar)
			user = await userModel.query().insertAndFetch({
				email: ldapUser.email,
				name: ldapUser.name,
				nickname: ldapUser.name.split(" ")[0] || "LDAP User",
				avatar: ldapUser.avatar || avatar.generateAvatar(ldapUser.email, ldapUser.name),
				roles: roles,
				auth_source: "ldap",
			});

			// Create auth record (type: ldap, no password stored)
			await authModel.query().insert({
				user_id: user.id,
				type: "ldap",
				secret: "ldap-authenticated",
				meta: {
					ldap_groups: ldapUser.groups,
				},
			});

			// Create default permissions
			const isAdmin = roles.indexOf("admin") !== -1;
			await userPermissionModel.query().insert({
				user_id: user.id,
				visibility: isAdmin ? "all" : "user",
				proxy_hosts: "manage",
				redirection_hosts: "manage",
				dead_hosts: "manage",
				streams: "manage",
				access_lists: "manage",
				certificates: "manage",
			});

			// Re-fetch with full relations
			user = await userModel
				.query()
				.where("id", user.id)
				.first();
		} else {
			// Update existing user's name, avatar, and auth source
			await userModel.query().where("id", user.id).patch({
				name: ldapUser.name,
				avatar: ldapUser.avatar || avatar.generateAvatar(ldapUser.email, ldapUser.name),
				auth_source: "ldap",
			});

			// Update or create LDAP auth record
			const existingAuth = await authModel
				.query()
				.where("user_id", user.id)
				.where("type", "ldap")
				.first();

			if (existingAuth) {
				await authModel
					.query()
					.where("id", existingAuth.id)
					.patch({
						meta: { ldap_groups: ldapUser.groups },
					});
			} else {
				await authModel.query().insert({
					user_id: user.id,
					type: "ldap",
					secret: "ldap-authenticated",
					meta: { ldap_groups: ldapUser.groups },
				});
			}

			// Sync admin role from LDAP groups (if admin_group is configured)
			if (ldapConfig && ldapConfig.admin_group && ldapConfig.sync_admin_group) {
				const isLdapAdmin = ldapUser.groups.some((g) => {
					const groupLower = g.toLowerCase();
					const adminGroupLower = ldapConfig.admin_group.toLowerCase();
					return groupLower === adminGroupLower || groupLower.includes(`cn=${adminGroupLower},`);
				});

				const currentRoles = user.roles || [];
				const hasAdminRole = currentRoles.includes("admin");

				if (isLdapAdmin && !hasAdminRole) {
					await userModel.query().where("id", user.id).patch({
						roles: [...currentRoles, "admin"],
					});
				} else if (!isLdapAdmin && hasAdminRole) {
					await userModel.query().where("id", user.id).patch({
						roles: currentRoles.filter((r) => r !== "admin"),
					});
				}
			}
		}

		if (data.scope !== "user" && _.indexOf(user.roles, data.scope) === -1) {
			throw new errs.AuthError(`Invalid scope: ${data.scope}`);
		}

		// Check if 2FA is enabled for this user
		const has2FA = await twoFactor.isEnabled(user.id);
		if (has2FA) {
			const challengeToken = await Token.create({
				iss: issuer || "api",
				attrs: { id: user.id },
				scope: ["2fa-challenge"],
				expiresIn: "5m",
			});

			return {
				requires_2fa: true,
				challenge_token: challengeToken.token,
			};
		}

		// Create JWT token
		const expiry = parseDatePeriod(data.expiry);
		if (expiry === null) {
			throw new errs.AuthError(`Invalid expiry time: ${data.expiry}`);
		}

		const signed = await Token.create({
			iss: issuer || "api",
			attrs: { id: user.id },
			scope: [data.scope],
			expiresIn: data.expiry,
		});

		return {
			token: signed.token,
			expires: expiry.toISOString(),
		};
	},

	/**
	 * @param {Access} access
	 * @param {Object} [data]
	 * @param {String} [data.expiry]
	 * @param {String} [data.scope]   Only considered if existing token scope is admin
	 * @returns {Promise}
	 */
	getFreshToken: async (access, data) => {
		const Token = TokenModel();
		const thisData = data || {};

		thisData.expiry = thisData.expiry || "1d";

		if (access?.token.getUserId(0)) {
			// Create a moment of the expiry expression
			const expiry = parseDatePeriod(thisData.expiry);
			if (expiry === null) {
				throw new errs.AuthError(`Invalid expiry time: ${thisData.expiry}`);
			}

			const token_attrs = {
				id: access.token.getUserId(0),
			};

			// Only admins can request otherwise scoped tokens
			let scope = access.token.get("scope");
			if (thisData.scope && access.token.hasScope("admin")) {
				scope = [thisData.scope];

				if (thisData.scope === "job-board" || thisData.scope === "worker") {
					token_attrs.id = 0;
				}
			}

			const signed = await Token.create({
				iss: "api",
				scope: scope,
				attrs: token_attrs,
				expiresIn: thisData.expiry,
			});

			return {
				token: signed.token,
				expires: expiry.toISOString(),
			};
		}
		throw new error.AssertionFailedError("Existing token contained invalid user data");
	},

	/**
	 * Verify 2FA code and return full token
	 * @param {string} challengeToken
	 * @param {string} code
	 * @param {string} [expiry]
	 * @returns {Promise}
	 */
	verify2FA: async (challengeToken, code, expiry) => {
		const Token = TokenModel();
		const tokenExpiry = expiry || "1d";

		// Verify challenge token
		let tokenData;
		try {
			tokenData = await Token.load(challengeToken);
		} catch {
			throw new errs.AuthError("Invalid or expired challenge token");
		}

		// Check scope
		if (!tokenData.scope || tokenData.scope[0] !== "2fa-challenge") {
			throw new errs.AuthError("Invalid challenge token");
		}

		const userId = tokenData.attrs?.id;
		if (!userId) {
			throw new errs.AuthError("Invalid challenge token");
		}

		// Verify 2FA code
		const valid = await twoFactor.verifyForLogin(userId, code);
		if (!valid) {
			throw new errs.AuthError(
				ERROR_MESSAGE_INVALID_2FA,
				ERROR_MESSAGE_INVALID_2FA_I18N,
			);
		}

		// Create full token
		const expiryDate = parseDatePeriod(tokenExpiry);
		if (expiryDate === null) {
			throw new errs.AuthError(`Invalid expiry time: ${tokenExpiry}`);
		}

		const signed = await Token.create({
			iss: "api",
			attrs: {
				id: userId,
			},
			scope: ["user"],
			expiresIn: tokenExpiry,
		});

		return {
			token: signed.token,
			expires: expiryDate.toISOString(),
		};
	},

	/**
	 * Authenticate via trusted reverse proxy headers (SSO).
	 * The reverse proxy (e.g. Authelia) authenticates the user and passes
	 * headers like Remote-User, Remote-Email, Remote-Name, Remote-Groups.
	 *
	 * @param   {Object} headers
	 * @param   {String} headers.email   User email from proxy header
	 * @param   {String} [headers.name]  Display name from proxy header
	 * @param   {String} [headers.user]  Username from proxy header
	 * @param   {String} [headers.groups] Comma-separated groups from proxy header
	 * @param   {String} [issuer]
	 * @returns {Promise}
	 */
	getTokenFromSSO: async (headers, issuer) => {
		const Token = TokenModel();
		const email = headers.email;

		if (!email) {
			throw new errs.AuthError("SSO: No email header provided");
		}

		// Validate email format to prevent injection
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		const sanitizedEmail = email.toLowerCase().trim();
		if (!emailRegex.test(sanitizedEmail)) {
			throw new errs.AuthError("SSO: Invalid email format in header");
		}

		// Check if user already exists locally
		let user = await userModel
			.query()
			.where("email", sanitizedEmail)
			.andWhere("is_deleted", 0)
			.first();

		if (user && user.is_disabled) {
			throw new errs.AuthError("Account is disabled");
		}

		const ldapConfig = await internalLdap.getLdapConfig();

		// Helper: get config value supporting both camelCase and snake_case
		const cfg = (camel, snake) => ldapConfig && (ldapConfig[camel] || ldapConfig[snake]);
		const adminGroup = cfg("adminGroup", "admin_group");
		const syncAdminGroup = cfg("syncAdminGroup", "sync_admin_group");
		const ssoAdminEmails = cfg("ssoAdminEmails", "sso_admin_emails") || "";


		// Check if user is admin based on configured admin email list
		const isAdminByEmail = (email) => {
			if (!ssoAdminEmails) return false;
			const adminEmails = ssoAdminEmails.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
			return adminEmails.includes(email.toLowerCase().trim());
		};

		// Parse groups from header, with LDAP fallback
		const parseGroups = (groupsHeader) => {
			if (!groupsHeader) return [];
			return groupsHeader.split(",").map((g) => g.trim()).filter(Boolean);
		};

		// Get user groups: from SSO header first, fallback to direct LDAP query
		const resolveGroups = async (groupsHeader, email) => {
			let groups = parseGroups(groupsHeader);
			if (groups.length === 0) {
				// Fallback: query LDAP directly for this user's groups
				try {
					groups = await internalLdap.lookupGroupsByEmail(email);
					if (groups.length > 0) {
						console.log(`[SSO] Groups resolved via LDAP for ${email}: ${JSON.stringify(groups)}`);
					}
				} catch (err) {
					console.log(`[SSO] LDAP group lookup failed for ${email}: ${err.message}`);
				}
			}
			return groups;
		};

		// Check if user is admin based on groups
		const isAdminByGroups = (groups) => {
			if (!groups || groups.length === 0) return false;
			if (adminGroup) {
				// Explicit admin group configured: match against it
				return groups.some((g) => {
					const groupLower = g.toLowerCase();
					const adminGroupLower = adminGroup.toLowerCase();
					return groupLower === adminGroupLower
						|| groupLower.includes(`cn=${adminGroupLower},`)
						|| groupLower.includes(adminGroupLower);
				});
			}
			// No admin group configured: match common admin group names
			const commonAdminNames = ["admin", "admins", "administrators", "npm-admins", "proxy-admins"];
			return groups.some((g) => {
				const groupLower = g.toLowerCase();
				// Match plain name or DN like cn=admins,ou=groups,...
				return commonAdminNames.some((name) =>
					groupLower === name || groupLower.startsWith(`cn=${name},`)
				);
			});
		};

		if (!user) {
			// Auto-create user from SSO
			const name = headers.name || headers.user || sanitizedEmail.split("@")[0];
			const groups = await resolveGroups(headers.groups, sanitizedEmail);

			// Determine roles from groups
			const roles = [];
			if (isAdminByGroups(groups) || isAdminByEmail(sanitizedEmail)) {
				roles.push("admin");
			}

			// If no admin users exist yet, make the first SSO user an admin
			if (roles.length === 0) {
				const allUsers = await userModel.query().where("is_deleted", 0);
				const adminCount = allUsers.filter((u) => u.roles && u.roles.includes("admin")).length;
				if (adminCount === 0) {
					roles.push("admin");
				}
			}

			// Create user
			user = await userModel.query().insertAndFetch({
				email: sanitizedEmail,
				name: name,
				nickname: name.split(" ")[0] || "SSO User",
				avatar: avatar.generateAvatar(sanitizedEmail, name),
				roles: roles,
				auth_source: "sso",
			});

			// Create auth record (type: sso, no password)
			await authModel.query().insert({
				user_id: user.id,
				type: "sso",
				secret: "sso-authenticated",
				meta: { sso_groups: groups },
			});

			// Create default permissions
			const isAdmin = roles.indexOf("admin") !== -1;
			await userPermissionModel.query().insert({
				user_id: user.id,
				visibility: isAdmin ? "all" : "user",
				proxy_hosts: "manage",
				redirection_hosts: "manage",
				dead_hosts: "manage",
				streams: "manage",
				access_lists: "manage",
				certificates: "manage",
			});

			user = await userModel.query().where("id", user.id).first();
		} else {
			// Update existing user
			const name = headers.name || headers.user || user.name;
			await userModel.query().where("id", user.id).patch({
				name: name,
				avatar: avatar.generateAvatar(sanitizedEmail, name),
				auth_source: user.auth_source || "sso",
			});

			// Update or create SSO auth record
			const existingAuth = await authModel
				.query()
				.where("user_id", user.id)
				.where("type", "sso")
				.first();

			const groups = await resolveGroups(headers.groups, sanitizedEmail);
			if (existingAuth) {
				await authModel.query().where("id", existingAuth.id).patch({
					meta: { sso_groups: groups },
				});
			} else {
				await authModel.query().insert({
					user_id: user.id,
					type: "sso",
					secret: "sso-authenticated",
					meta: { sso_groups: groups },
				});
			}

			// Sync admin role from SSO groups
			const isSSOAdmin = isAdminByGroups(groups) || isAdminByEmail(sanitizedEmail);
			const currentRoles = user.roles || [];
			const hasAdminRole = currentRoles.includes("admin");

			// Always GRANT admin if SSO groups indicate admin
			if (isSSOAdmin && !hasAdminRole) {
				await userModel.query().where("id", user.id).patch({
					roles: [...currentRoles, "admin"],
				});
				await userPermissionModel.query().where("user_id", user.id).patch({
					visibility: "all",
				});
			} else if (syncAdminGroup && !isSSOAdmin && hasAdminRole) {
				// Only REVOKE admin if syncAdminGroup is explicitly enabled
				await userModel.query().where("id", user.id).patch({
					roles: currentRoles.filter((r) => r !== "admin"),
				});
			}

			// Fallback: if no admin users exist at all, promote this user
			const currentRolesCheck = user.roles || [];
			if (!currentRolesCheck.includes("admin")) {
				const allUsers = await userModel.query().where("is_deleted", 0);
				const adminCount = allUsers.filter((u) => u.roles && u.roles.includes("admin")).length;
				if (adminCount === 0) {
					await userModel.query().where("id", user.id).patch({
						roles: [...currentRolesCheck, "admin"],
					});
					// Also update permissions to admin level
					await userPermissionModel.query().where("user_id", user.id).patch({
						visibility: "all",
					});
				}
			}
		}

		// Create JWT token (skip 2FA for SSO - already authenticated by proxy)
		const expiry = parseDatePeriod("1d");
		const signed = await Token.create({
			iss: issuer || "api",
			attrs: { id: user.id },
			scope: ["user"],
			expiresIn: "1d",
		});

		return {
			token: signed.token,
			expires: expiry.toISOString(),
		};
	},

	/**
	 * @param   {Object} user
	 * @returns {Promise}
	 */
	getTokenFromUser: async (user) => {
		const expire = "1d";
		const Token = TokenModel();
		const expiry = parseDatePeriod(expire);

		const signed = await Token.create({
			iss: "api",
			attrs: {
				id: user.id,
			},
			scope: ["user"],
			expiresIn: expire,
		});

		return {
			token: signed.token,
			expires: expiry.toISOString(),
			user: user,
		};
	},
};
