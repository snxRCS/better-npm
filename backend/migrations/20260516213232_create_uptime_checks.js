export const up = async (knex) => {
	await knex.schema.createTable("uptime_check", (table) => {
		table.increments("id").primary();
		table.integer("proxy_host_id").notNull().references("id").inTable("proxy_host");
		table.string("status", 4).notNull(); // 'up' or 'down'
		table.integer("response_code").nullable();
		table.integer("response_time_ms").nullable();
		table.dateTime("created_on").notNull().defaultTo(knex.fn.now());
	});

	await knex.schema.table("uptime_check", (table) => {
		table.index(["proxy_host_id", "created_on"]);
	});
};

export const down = async (knex) => {
	await knex.schema.dropTableIfExists("uptime_check");
};
