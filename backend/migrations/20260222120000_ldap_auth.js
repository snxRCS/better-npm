/**
 * Migration: Add LDAP authentication setting
 */

export const up = async (knex) => {
	// Insert the LDAP auth setting with defaults
	const exists = await knex("setting").where("id", "ldap-auth").first();
	if (!exists) {
		await knex("setting").insert({
			id: "ldap-auth",
			name: "LDAP Authentication",
			description: "LDAP Authentication Settings",
			value: "disabled",
			meta: JSON.stringify({
				enabled: false,
				auth_mode: "internal",
				host: "",
				port: 389,
				url: "",
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
				connect_timeout: 5000,
				search_timeout: 10000,
			}),
		});
	}
};

export const down = async (knex) => {
	await knex("setting").where("id", "ldap-auth").delete();
};
