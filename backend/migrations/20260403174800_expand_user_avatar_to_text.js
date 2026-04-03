/**
 * Migration: Expand user.avatar to TEXT for LDAP/generated data URI avatars
 * Fixes login failures when avatar data exceeds VARCHAR length.
 */

export const up = async (knex) => {
	await knex.schema.alterTable("user", (table) => {
		table.text("avatar").notNull().alter();
	});
};

export const down = async (knex) => {
	await knex.schema.alterTable("user", (table) => {
		table.string("avatar").notNull().alter();
	});
};
