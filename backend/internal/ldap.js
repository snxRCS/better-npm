/**
 * LDAP Authentication Module
 *
 * Supports OpenLDAP, Active Directory, and LLDAP.
 * Used for both dashboard login and proxy-level authentication.
 */
import ldap from "ldapjs";
import { access as logger } from "../logger.js";
import settingModel from "../models/setting.js";

const LDAP_SETTING_ID = "ldap-auth";

/**
 * Get LDAP configuration from the settings table
 * @returns {Promise<Object|null>}
 */
const getLdapConfig = async () => {
	const setting = await settingModel
		.query()
		.where("id", LDAP_SETTING_ID)
		.first();

	if (!setting || !setting.meta || !setting.meta.enabled) {
		return null;
	}

	return setting.meta;
};

/**
 * Get the list of LDAP server URLs from config.
 * Supports both single-server (host/port/url) and multi-server (servers array) config.
 *
 * @param {Object} config
 * @returns {Array<String>} - Array of LDAP URLs, sorted by priority
 */
const getServerUrls = (config) => {
	// Multi-server mode: servers array with { url, priority } entries
	if (config.servers && Array.isArray(config.servers) && config.servers.length > 0) {
		return config.servers
			.filter((s) => s.url || s.host)
			.sort((a, b) => (a.priority || 99) - (b.priority || 99))
			.map((s) => s.url || `ldap://${s.host}:${s.port || 389}`);
	}

	// Single-server mode (backwards compatible)
	const url = config.url || `ldap://${config.host}:${config.port || 389}`;
	return [url];
};

/**
 * Create an LDAP client connection to a specific URL
 * @param {Object} config
 * @param {String} [serverUrl] - Override URL (used by failover)
 * @returns {Object} ldap client
 */
const createClient = (config, serverUrl) => {
	const url = serverUrl || config.url || `ldap://${config.host}:${config.port || 389}`;

	const clientOptions = {
		url: url,
		connectTimeout: config.connect_timeout || 5000,
		timeout: config.search_timeout || 10000,
		tlsOptions: {
			rejectUnauthorized: config.tls_verify !== false,
		},
	};

	return ldap.createClient(clientOptions);
};

/**
 * Create an LDAP client with failover support.
 * Tries each configured server in priority order until one connects.
 * Falls back to single-server mode if no servers array is configured.
 *
 * @param {Object} config
 * @returns {Promise<{client: Object, serverUrl: String}>}
 */
const createClientWithFailover = async (config) => {
	const urls = getServerUrls(config);
	let lastError = null;

	for (const url of urls) {
		try {
			const client = createClient(config, url);

			// Test the connection with a bind if we have credentials
			if (config.bind_dn && config.bind_password) {
				await bindAsync(client, config.bind_dn, config.bind_password);
				logger.info(`Connected to LDAP server: ${url}`);
				return { client, serverUrl: url };
			}

			// No service account — just return the client
			logger.info(`Created LDAP client for: ${url}`);
			return { client, serverUrl: url };
		} catch (err) {
			logger.warn(`LDAP server ${url} failed: ${err.message}`);
			lastError = err;
			// Continue to next server
		}
	}

	throw lastError || new Error("No LDAP servers available");
};

/**
 * Bind to LDAP server with given credentials
 * @param {Object} client
 * @param {String} dn
 * @param {String} password
 * @returns {Promise<void>}
 */
const bindAsync = (client, dn, password) => {
	return new Promise((resolve, reject) => {
		client.bind(dn, password, (err) => {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
};

/**
 * Search LDAP with given parameters
 * @param {Object} client
 * @param {String} base
 * @param {Object} opts
 * @returns {Promise<Array>}
 */
// Binary LDAP attributes that should be kept as Buffers
const BINARY_ATTRS = new Set(["thumbnailphoto", "jpegphoto", "photo", "usercertificate"]);

const searchAsync = (client, base, opts) => {
	return new Promise((resolve, reject) => {
		client.search(base, opts, (err, res) => {
			if (err) {
				reject(err);
				return;
			}

			const entries = [];
			res.on("searchEntry", (entry) => {
				const _pojo = entry.pojo || entry.object || entry;
				const _flat = { dn: _pojo.objectName || _pojo.dn || '' };
				if (_pojo.attributes) {
					for (const _a of _pojo.attributes) {
						const attrName = _a.type;
						const isBinary = BINARY_ATTRS.has(attrName.toLowerCase());

						if (isBinary) {
							// For binary attributes, prefer raw buffers
							const bufs = _a.buffers || [];
							if (bufs.length > 0) {
								_flat[attrName] = bufs[0]; // Keep as Buffer
							} else {
								// Fallback: some ldapjs versions put binary in values as base64
								const _v = _a.values || _a.vals || [];
								if (_v.length > 0) {
									_flat[attrName] = Buffer.from(_v[0], "base64");
								}
							}
						} else {
							const _v = _a.values || _a.vals || [];
							_flat[attrName] = _v.length === 1 ? _v[0] : _v;
						}
					}
				}
				entries.push(_flat);
			});
			res.on("error", (err) => {
				reject(err);
			});
			res.on("end", (result) => {
				if (result.status !== 0) {
					reject(new Error(`LDAP search failed with status ${result.status}`));
				} else {
					resolve(entries);
				}
			});
		});
	});
};

/**
 * Unbind and destroy LDAP client
 * @param {Object} client
 */
const destroyClient = (client) => {
	try {
		client.unbind();
	} catch (_err) {
		// ignore
	}
	try {
		client.destroy();
	} catch (_err) {
		// ignore
	}
};

/**
 * Replace template variables in a string
 * {{USERNAME}} and {{EMAIL}} are supported
 * @param {String} template
 * @param {Object} vars
 * @returns {String}
 */
const replaceVars = (template, vars) => {
	let result = template;
	for (const [key, value] of Object.entries(vars)) {
		result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "gi"), value);
	}
	return result;
};

/**
 * Authenticate a user via LDAP
 *
 * Flow:
 * 1. Bind with service account (if configured) or user DN directly
 * 2. Search for the user using the configured filter
 * 3. Bind with the found user's DN and their password
 * 4. Extract user attributes (email, name, groups)
 *
 * @param {String} username - Username or email entered by the user
 * @param {String} password - User's password
 * @returns {Promise<Object>} - { email, name, groups }
 */
const authenticate = async (username, password) => {
	const config = await getLdapConfig();

	if (!config) {
		throw new Error("LDAP authentication is not enabled");
	}

	// Use failover-aware connection if service account is configured
	if (config.bind_dn && config.bind_password) {
		const { client } = await createClientWithFailover(config);

		try {
			// Already bound via failover — search for user
			const searchFilter = replaceVars(
				config.search_filter || "(|(uid={{USERNAME}})(mail={{USERNAME}})(sAMAccountName={{USERNAME}}))",
				{ USERNAME: username, EMAIL: username }
			);

			logger.info(`Searching LDAP with filter: ${searchFilter}`);

			const entries = await searchAsync(client, config.base_dn, {
				scope: "sub",
				filter: searchFilter,
				attributes: getAttributes(config),
			});

			if (entries.length === 0) {
				throw new Error("User not found in LDAP directory");
			}

			const userEntry = entries[0];
			const userDn = userEntry.dn?.toString() || userEntry.objectName?.toString();

			if (!userDn) {
				throw new Error("Could not determine user DN from LDAP entry");
			}

			// Bind as the user to verify their password
			logger.info(`Authenticating user DN: ${userDn}`);
			const userClient = createClient(config);
			try {
				await bindAsync(userClient, userDn, password);
			} finally {
				destroyClient(userClient);
			}

			return extractUserInfo(userEntry, config);
		} finally {
			destroyClient(client);
		}
	}

	// Direct bind mode (no service account): try servers in order
	const urls = getServerUrls(config);
	let lastError = null;

	for (const url of urls) {
		const client = createClient(config, url);
		try {
			if (config.user_dn_template) {
				const userDn = replaceVars(config.user_dn_template, {
					USERNAME: username,
					EMAIL: username,
				});
				logger.info(`Direct bind as: ${userDn} on ${url}`);
				await bindAsync(client, userDn, password);

				const searchFilter = replaceVars(
					config.search_filter || "(|(uid={{USERNAME}})(mail={{USERNAME}}))",
					{ USERNAME: username, EMAIL: username }
				);

				const entries = await searchAsync(client, config.base_dn, {
					scope: "sub",
					filter: searchFilter,
					attributes: getAttributes(config),
				});

				if (entries.length === 0) {
					throw new Error("User not found in LDAP directory");
				}

				return extractUserInfo(entries[0], config);
			}

			throw new Error("No service account or user DN template configured");
		} catch (err) {
			logger.warn(`LDAP server ${url} failed during authenticate: ${err.message}`);
			lastError = err;
			destroyClient(client);
		}
	}

	throw lastError || new Error("LDAP authentication failed — no servers available");
};

/**
 * Get the list of LDAP attributes to request
 * @param {Object} config
 * @returns {Array<String>}
 */
const getAttributes = (config) => {
	const attrs = [
		"dn",
		config.email_attribute || "mail",
		config.name_attribute || "displayName",
		config.name_attribute || "cn",
		"sn",
		"givenName",
		"uid",
		"sAMAccountName",
		// Avatar attributes (binary)
		"thumbnailPhoto",
		"jpegPhoto",
	];

	if (config.group_attribute) {
		attrs.push(config.group_attribute);
	} else {
		attrs.push("memberOf");
	}

	return [...new Set(attrs)];
};

/**
 * Extract user information from an LDAP entry
 * @param {Object} entry
 * @param {Object} config
 * @returns {Object} - { email, name, groups }
 */
const extractUserInfo = (entry, config) => {
	const emailAttr = config.email_attribute || "mail";
	const nameAttr = config.name_attribute || "displayName";
	const groupAttr = config.group_attribute || "memberOf";

	// Get attribute value (handle arrays)
	const getAttr = (obj, attr) => {
		const val = obj[attr];
		if (Array.isArray(val)) return val[0];
		return val || "";
	};

	const email = getAttr(entry, emailAttr);
	let name = getAttr(entry, nameAttr);

	// Fallback: construct name from givenName + sn
	if (!name) {
		const given = getAttr(entry, "givenName");
		const sn = getAttr(entry, "sn");
		name = [given, sn].filter(Boolean).join(" ");
	}

	// Further fallback: use cn or uid
	if (!name) {
		name = getAttr(entry, "cn") || getAttr(entry, "uid") || getAttr(entry, "sAMAccountName") || email;
	}

	// Groups
	let groups = [];
	const groupVal = entry[groupAttr];
	if (groupVal) {
		groups = Array.isArray(groupVal) ? groupVal : [groupVal];
	}

	if (!email) {
		throw new Error(
			`LDAP user entry does not have an email attribute (${emailAttr}). ` +
			"Please check your LDAP configuration."
		);
	}

	// Extract avatar photo from LDAP (thumbnailPhoto or jpegPhoto)
	let avatar = null;
	const photoData = entry.thumbnailPhoto || entry.jpegPhoto;
	if (photoData && Buffer.isBuffer(photoData) && photoData.length > 0) {
		// Detect MIME type from magic bytes
		let mime = "image/jpeg"; // default
		if (photoData[0] === 0x89 && photoData[1] === 0x50) {
			mime = "image/png";
		} else if (photoData[0] === 0x47 && photoData[1] === 0x49) {
			mime = "image/gif";
		} else if (photoData[0] === 0x42 && photoData[1] === 0x4D) {
			mime = "image/bmp";
		}
		avatar = `data:${mime};base64,${photoData.toString("base64")}`;
		logger.info(`LDAP avatar found for ${email} (${photoData.length} bytes, ${mime})`);
	}

	return {
		email: email.toLowerCase().trim(),
		name: name || email,
		groups: groups,
		avatar: avatar,
	};
};

/**
 * Test LDAP connection and optionally search for a user
 * @param {Object} config - LDAP configuration to test
 * @param {String} [testUsername] - Optional username to test search
 * @returns {Promise<Object>} - { success, message, user? }
 */
const testConnection = async (config) => {
	try {
		if (config.bind_dn && config.bind_password) {
			const { client, serverUrl } = await createClientWithFailover(config);

			try {
				// Try a base search to verify base_dn is valid
				const entries = await searchAsync(client, config.base_dn, {
					scope: "base",
					filter: "(objectClass=*)",
					attributes: ["dn"],
					sizeLimit: 1,
				});

				const urls = getServerUrls(config);
				const serverInfo = urls.length > 1
					? ` (connected to ${serverUrl}, ${urls.length} servers configured)`
					: "";

				return {
					success: true,
					message: `Successfully connected and bound to LDAP server${serverInfo}. Base DN "${config.base_dn}" is accessible.`,
					entries_found: entries.length,
					connected_server: serverUrl,
				};
			} finally {
				destroyClient(client);
			}
		}

		// Without service account, try connecting to first available server
		const urls = getServerUrls(config);
		return {
			success: true,
			message: `LDAP configured with ${urls.length} server(s) (no service account configured for search test).`,
		};
	} catch (err) {
		return {
			success: false,
			message: `LDAP connection failed: ${err.message}`,
		};
	}
};

/**
 * Verify a username/password against LDAP for proxy auth
 * This is a simpler flow for nginx auth_request subrequests
 *
 * @param {String} username
 * @param {String} password
 * @returns {Promise<Boolean>}
 */
const verifyCredentials = async (username, password) => {
	try {
		await authenticate(username, password);
		return true;
	} catch (_err) {
		return false;
	}
};

/**
 * Search all users in the LDAP directory
 * Uses the service account to bind and search for all users matching the filter
 *
 * @returns {Promise<Array<Object>>} - Array of { email, name, groups }
 */
const searchAllUsers = async () => {
	const config = await getLdapConfig();

	if (!config) {
		throw new Error("LDAP authentication is not enabled");
	}

	if (!config.bind_dn || !config.bind_password) {
		throw new Error("Service account (Bind DN) is required for user sync");
	}

	const { client } = await createClientWithFailover(config);

	try {
		// Build a broad search filter that finds all users
		// Replace {{USERNAME}} with * to match all users
		let searchFilter = config.search_filter || "(|(uid={{USERNAME}})(mail={{USERNAME}}))";
		searchFilter = searchFilter.replace(/\{\{USERNAME\}\}/gi, "*");

		logger.info(`Searching all LDAP users with filter: ${searchFilter}`);

		const entries = await searchAsync(client, config.base_dn, {
			scope: "sub",
			filter: searchFilter,
			attributes: getAttributes(config),
			paged: true,
			sizeLimit: 0,
		});

		const users = [];
		for (const entry of entries) {
			try {
				const userInfo = extractUserInfo(entry, config);
				users.push(userInfo);
			} catch (_err) {
				// Skip entries without valid email
				logger.warn(`Skipping LDAP entry without valid email: ${entry.dn || "unknown"}`);
			}
		}

		return users;
	} finally {
		destroyClient(client);
	}
};

/**
 * Look up a user's group membership by email via LDAP.
 * Used as fallback when SSO headers (Remote-Groups) are missing.
 *
 * Supports:
 * - LLDAP: searches ou=groups for (member=<userDN>)
 * - OpenLDAP: reads memberOf attribute from user entry, or searches groups
 * - Active Directory: reads memberOf attribute from user entry
 *
 * @param {String} email - User email to look up
 * @returns {Promise<Array<String>>} - Array of group names (cn values)
 */
const lookupGroupsByEmail = async (email) => {
	const config = await getLdapConfig();
	if (!config || !config.bind_dn || !config.bind_password) {
		return [];
	}

	let client;
	try {
		const result = await createClientWithFailover(config);
		client = result.client;
	} catch (err) {
		logger.warn(`LDAP failover connection failed for group lookup: ${err.message}`);
		return [];
	}

	try {
		// Step 1: Find the user by email
		const emailAttr = config.email_attribute || "mail";
		const groupAttr = config.group_attribute || "memberOf";
		const userFilter = `(${emailAttr}=${email})`;

		const users = await searchAsync(client, config.base_dn, {
			scope: "sub",
			filter: userFilter,
			attributes: ["dn", emailAttr, groupAttr],
		});

		if (users.length === 0) {
			return [];
		}

		const userEntry = users[0];
		const userDn = userEntry.dn?.toString() || "";

		// Try 1: Check memberOf attribute on user (OpenLDAP, Active Directory)
		let groups = [];
		const memberOfVal = userEntry[groupAttr];
		if (memberOfVal) {
			const memberOfArr = Array.isArray(memberOfVal) ? memberOfVal : [memberOfVal];
			// Extract CN from DN format: "cn=admins,ou=groups,dc=example,dc=com" -> "admins"
			groups = memberOfArr.map((g) => {
				const cnMatch = g.match(/^cn=([^,]+)/i);
				return cnMatch ? cnMatch[1] : g;
			});
		}

		// Try 2: If no memberOf results, search groups that contain this user (LLDAP style)
		if (groups.length === 0 && userDn) {
			// Determine group search base
			const groupBase = config.base_dn.replace(/^ou=people,/i, "").replace(/^(dc=)/i, "ou=groups,$1");
			// Try ou=groups under base_dn first, fall back to base_dn itself
			const groupSearchBases = [
				config.base_dn.replace(/^ou=people/i, "ou=groups"),
				`ou=groups,${config.base_dn}`,
				config.base_dn,
			];

			for (const base of groupSearchBases) {
				try {
					// Search for groups containing this user as member
					// Works with: groupOfNames (member), groupOfUniqueNames (uniqueMember), posixGroup (memberUid)
					const groupFilter = `(|(member=${userDn})(uniqueMember=${userDn})(memberUid=${email.split("@")[0]}))`;
					const groupEntries = await searchAsync(client, base, {
						scope: "sub",
						filter: groupFilter,
						attributes: ["cn"],
					});

					if (groupEntries.length > 0) {
						groups = groupEntries.map((g) => g.cn || "").filter(Boolean);
						break;
					}
				} catch (_err) {
					// Base might not exist, try next
					continue;
				}
			}
		}

		return groups;
	} catch (err) {
		logger.warn(`LDAP group lookup failed for ${email}: ${err.message}`);
		return [];
	} finally {
		destroyClient(client);
	}
};

/**
 * Check if the LDAP connection is alive
 * @returns {Promise<Object>} - { connected, message }
 */
const checkConnectionStatus = async () => {
	const config = await getLdapConfig();

	if (!config) {
		return { connected: false, message: "LDAP is not enabled" };
	}

	if (!config.bind_dn || !config.bind_password) {
		return { connected: false, message: "No service account configured" };
	}

	try {
		const { client, serverUrl } = await createClientWithFailover(config);
		destroyClient(client);

		const urls = getServerUrls(config);
		const serverInfo = urls.length > 1
			? ` (${serverUrl}, ${urls.length} servers configured)`
			: "";

		return {
			connected: true,
			message: `Connected to LDAP server${serverInfo}`,
			connected_server: serverUrl,
			total_servers: urls.length,
		};
	} catch (err) {
		return { connected: false, message: `Connection failed: ${err.message}` };
	}
};

export default {
	getLdapConfig,
	authenticate,
	testConnection,
	verifyCredentials,
	searchAllUsers,
	lookupGroupsByEmail,
	checkConnectionStatus,
	LDAP_SETTING_ID,
};
