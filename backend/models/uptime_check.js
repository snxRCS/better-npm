import { Model } from "objection";
import db from "../db.js";
import ProxyHost from "./proxy_host.js";

Model.knex(db());

class UptimeCheck extends Model {
	static get name() {
		return "UptimeCheck";
	}

	static get tableName() {
		return "uptime_check";
	}

	static get relationMappings() {
		return {
			proxy_host: {
				relation: Model.BelongsToOneRelation,
				modelClass: ProxyHost,
				join: {
					from: "uptime_check.proxy_host_id",
					to: "proxy_host.id",
				},
			},
		};
	}
}

export default UptimeCheck;
