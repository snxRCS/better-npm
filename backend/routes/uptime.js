import express from "express";
import UptimeCheck from "../models/uptime_check.js";

const router = express.Router({
	caseSensitive: true,
	strict: true,
	mergeParams: true,
});

/**
 * GET /api/uptime
 * Returns the latest check status for all proxy hosts
 */
router.get("/", async (req, res, next) => {
	try {
		// Get the most recent check per proxy_host_id
		const latest = await UptimeCheck.query()
			.select("proxy_host_id")
			.max("id as max_id")
			.groupBy("proxy_host_id");

		if (!latest.length) {
			return res.status(200).json({});
		}

		const ids = latest.map((r) => r.max_id);
		const checks = await UptimeCheck.query().whereIn("id", ids);

		const result = {};
		for (const check of checks) {
			result[check.proxy_host_id] = {
				status: check.status,
				responseCode: check.response_code,
				responseTimeMs: check.response_time_ms,
				lastChecked: check.created_on,
			};
		}
		res.status(200).json(result);
	} catch (err) {
		next(err);
	}
});

/**
 * GET /api/uptime/:proxy_host_id
 * Returns the last 100 checks for a specific proxy host
 */
router.get("/:proxy_host_id", async (req, res, next) => {
	try {
		const hostId = parseInt(req.params.proxy_host_id, 10);
		if (isNaN(hostId)) {
			return res.status(400).json({ error: { message: "Invalid proxy_host_id" } });
		}

		const checks = await UptimeCheck.query()
			.where("proxy_host_id", hostId)
			.orderBy("id", "desc")
			.limit(100);

		res.status(200).json(checks);
	} catch (err) {
		next(err);
	}
});

export default router;
