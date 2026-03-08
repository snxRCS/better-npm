import avatar from "../lib/avatar.js";
import express from "express";
import internalLdap from "../internal/ldap.js";
import jwtdecode from "../lib/express/jwt-decode.js";
import settingModel from "../models/setting.js";
import authModel from "../models/auth.js";
import userModel from "../models/user.js";
import userPermissionModel from "../models/user_permission.js";
import { debug, express as logger } from "../logger.js";

const router = express.Router({
	caseSensitive: true,
	strict: true,
	mergeParams: true,
});

/**
 * /api/ldap/config
 *
 * LDAP configuration management (admin only)
 */
router
	.route("/config")
	.options((_, res) => {
		res.sendStatus(204);
	})
	.all(jwtdecode())

	/**
	 * GET /api/ldap/config
	 *
	 * Retrieve the current LDAP configuration
	 */
	.get(async (req, res, next) => {
		try {
			await res.locals.access.can("settings:get", "ldap-auth");

			const setting = await settingModel
				.query()
				.where("id", internalLdap.LDAP_SETTING_ID)
				.first();

			if (!setting) {
				res.status(200).send({
					id: internalLdap.LDAP_SETTING_ID,
					meta: getDefaultConfig(),
				});
				return;
			}

			// Never expose the bind password in the response
			const config = { ...setting.meta };
			if (config.bind_password) {
				config.bind_password = "********";
			}

			res.status(200).send({
				id: setting.id,
				meta: config,
			});
		} catch (err) {
			debug(logger, `${req.method.toUpperCase()} ${req.path}: ${err}`);
			next(err);
		}
	})

	/**
	 * PUT /api/ldap/config
	 *
	 * Update the LDAP configuration
	 */
	.put(async (req, res, next) => {
		try {
			await res.locals.access.can("settings:update", "ldap-auth");

			const config = req.body;

			// Sync the enabled flag with auth_mode
			if (config.auth_mode && config.auth_mode !== "internal") {
				config.enabled = true;
			} else if (config.auth_mode === "internal") {
				config.enabled = false;
			}

			// Validate required fields when LDAP is part of the auth flow
			if (config.enabled) {
				const hasServers = config.servers && Array.isArray(config.servers) && config.servers.length > 0;
				if (!config.host && !config.url && !hasServers) {
					throw new Error("LDAP host, URL, or at least one server is required");
				}
				if (!config.base_dn) {
					throw new Error("LDAP base DN is required");
				}
			}

			// If password is masked, keep the existing one
			if (config.bind_password === "********") {
				const existing = await settingModel
					.query()
					.where("id", internalLdap.LDAP_SETTING_ID)
					.first();
				if (existing && existing.meta) {
					config.bind_password = existing.meta.bind_password;
				}
			}

			// Upsert the setting
			const existing = await settingModel
				.query()
				.where("id", internalLdap.LDAP_SETTING_ID)
				.first();

			if (existing) {
				await settingModel
					.query()
					.where("id", internalLdap.LDAP_SETTING_ID)
					.patch({
						meta: config,
					});
			} else {
				await settingModel.query().insert({
					id: internalLdap.LDAP_SETTING_ID,
					name: "LDAP Authentication",
					description: "LDAP Authentication Settings",
					value: config.enabled ? "enabled" : "disabled",
					meta: config,
				});
			}

			// Return the config (masked)
			const responseConfig = { ...config };
			if (responseConfig.bind_password) {
				responseConfig.bind_password = "********";
			}

			res.status(200).send({
				id: internalLdap.LDAP_SETTING_ID,
				meta: responseConfig,
			});
		} catch (err) {
			debug(logger, `${req.method.toUpperCase()} ${req.path}: ${err}`);
			next(err);
		}
	});

/**
 * /api/ldap/test
 *
 * Test LDAP connection
 */
router
	.route("/test")
	.options((_, res) => {
		res.sendStatus(204);
	})
	.all(jwtdecode())

	/**
	 * POST /api/ldap/test
	 *
	 * Test the LDAP connection with given configuration
	 */
	.post(async (req, res, next) => {
		try {
			await res.locals.access.can("settings:update", "ldap-auth");

			const config = req.body;

			// If bind_password is masked, use existing
			if (config.bind_password === "********") {
				const existing = await settingModel
					.query()
					.where("id", internalLdap.LDAP_SETTING_ID)
					.first();
				if (existing && existing.meta) {
					config.bind_password = existing.meta.bind_password;
				}
			}

			const result = await internalLdap.testConnection(config);
			res.status(200).send(result);
		} catch (err) {
			debug(logger, `${req.method.toUpperCase()} ${req.path}: ${err}`);
			next(err);
		}
	});

/**
 * /api/ldap/auth
 *
 * LDAP proxy authentication endpoint
 * Used by nginx auth_request directive for proxy-level LDAP auth
 */
router
	.route("/auth")
	.options((_, res) => {
		res.sendStatus(204);
	})

	/**
	 * GET /api/ldap/auth
	 *
	 * Verify credentials sent via HTTP Basic Auth against LDAP
	 * Returns 200 if valid, 401 if not
	 */
	.get(async (req, res) => {
		const authHeader = req.headers.authorization;

		if (!authHeader || !authHeader.startsWith("Basic ")) {
			res.set("WWW-Authenticate", 'Basic realm="LDAP Authentication"');
			res.status(401).send("Authentication required");
			return;
		}

		try {
			const decoded = Buffer.from(authHeader.slice(6), "base64").toString();
			const [username, ...passwordParts] = decoded.split(":");
			const password = passwordParts.join(":");

			if (!username || !password) {
				res.set("WWW-Authenticate", 'Basic realm="LDAP Authentication"');
				res.status(401).send("Invalid credentials format");
				return;
			}

			const valid = await internalLdap.verifyCredentials(username, password);
			if (valid) {
				res.status(200).send("OK");
			} else {
				res.set("WWW-Authenticate", 'Basic realm="LDAP Authentication"');
				res.status(401).send("Invalid credentials");
			}
		} catch (err) {
			debug(logger, `LDAP proxy auth error: ${err}`);
			res.set("WWW-Authenticate", 'Basic realm="LDAP Authentication"');
			res.status(401).send("Authentication failed");
		}
	});

/**
 * /api/ldap/status
 *
 * LDAP connection status
 */
router
	.route("/status")
	.options((_, res) => {
		res.sendStatus(204);
	})
	.all(jwtdecode())

	/**
	 * GET /api/ldap/status
	 *
	 * Check current LDAP connection status
	 */
	.get(async (req, res, next) => {
		try {
			await res.locals.access.can("settings:get", "ldap-auth");
			const result = await internalLdap.checkConnectionStatus();
			res.status(200).send(result);
		} catch (err) {
			debug(logger, `${req.method.toUpperCase()} ${req.path}: ${err}`);
			next(err);
		}
	});

/**
 * /api/ldap/sync
 *
 * Sync all LDAP users into NPM
 */
router
	.route("/sync")
	.options((_, res) => {
		res.sendStatus(204);
	})
	.all(jwtdecode())

	/**
	 * POST /api/ldap/sync
	 *
	 * Search all LDAP users and create/update them in NPM
	 */
	.post(async (req, res, next) => {
		try {
			await res.locals.access.can("settings:update", "ldap-auth");

			const ldapUsers = await internalLdap.searchAllUsers();
			const ldapConfig = await internalLdap.getLdapConfig();

			let created = 0;
			let updated = 0;
			let skipped = 0;

			for (const ldapUser of ldapUsers) {
				try {
					let user = await userModel
						.query()
						.where("email", ldapUser.email.toLowerCase().trim())
						.andWhere("is_deleted", 0)
						.first();

					if (user) {
						// Update existing user (use LDAP photo if available)
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

						// Sync admin role if configured
						if (ldapConfig.admin_group && ldapConfig.sync_admin_group) {
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

						updated++;
					} else {
						// Create new user
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

						user = await userModel.query().insertAndFetch({
							email: ldapUser.email,
							name: ldapUser.name,
							nickname: ldapUser.name.split(" ")[0] || "LDAP User",
							avatar: ldapUser.avatar || avatar.generateAvatar(ldapUser.email, ldapUser.name),
							roles: roles,
							auth_source: "ldap",
						});

						await authModel.query().insert({
							user_id: user.id,
							type: "ldap",
							secret: "ldap-authenticated",
							meta: { ldap_groups: ldapUser.groups },
						});

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

						created++;
					}
				} catch (err) {
					debug(logger, `Failed to sync LDAP user ${ldapUser.email}: ${err}`);
					skipped++;
				}
			}

			res.status(200).send({
				success: true,
				total: ldapUsers.length,
				created,
				updated,
				skipped,
				message: `Synced ${ldapUsers.length} LDAP users: ${created} created, ${updated} updated, ${skipped} skipped`,
			});
		} catch (err) {
			debug(logger, `${req.method.toUpperCase()} ${req.path}: ${err}`);
			next(err);
		}
	});

/**
 * Returns the default LDAP configuration template
 */
function getDefaultConfig() {
	return {
		enabled: false,
		auth_mode: "internal",
		host: "",
		port: 389,
		url: "",
		servers: [],
		use_tls: false,
		tls_verify: true,
		bind_dn: "",
		bind_password: "",
		base_dn: "",
		user_dn_template: "",
		search_filter: "(|(uid={{USERNAME}})(mail={{USERNAME}})(sAMAccountName={{USERNAME}}))",
		email_attribute: "mail",
		name_attribute: "displayName",
		group_attribute: "memberOf",
		admin_group: "",
		sync_admin_group: false,
		auto_create_user: true,
		sso_enabled: false,
		sso_logout_url: "",
		sso_admin_emails: "",
		connect_timeout: 5000,
		search_timeout: 10000,
	};
}

export default router;
