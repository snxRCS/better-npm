/**
 * Migration: Add auth_source column to user table
 * Tracks whether a user was created via internal or LDAP authentication
 */

export const up = async (knex) => {
	await knex.schema.alterTable("user", (table) => {
		table.string("auth_source", 20).notNull().defaultTo("internal");
	});

	// Update existing LDAP users based on auth table
	const ldapAuthRecords = await knex("auth").where("type", "ldap").select("user_id");
	if (ldapAuthRecords.length > 0) {
		const ldapUserIds = ldapAuthRecords.map((r) => r.user_id);
		await knex("user").whereIn("id", ldapUserIds).update({ auth_source: "ldap" });
	}
};

export const down = async (knex) => {
	await knex.schema.alterTable("user", (table) => {
		table.dropColumn("auth_source");
	});
};
