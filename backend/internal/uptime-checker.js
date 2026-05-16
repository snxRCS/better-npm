import http from "node:http";
import https from "node:https";
import ProxyHost from "../models/proxy_host.js";
import UptimeCheck from "../models/uptime_check.js";
import { global as logger } from "../logger.js";

const INTERVAL_MS = 60_000;
const TIMEOUT_MS = 5_000;
const MAX_CHECKS_PER_HOST = 1440; // 24h at 1min intervals

function checkHost(scheme, host, port) {
	return new Promise((resolve) => {
		const start = Date.now();
		const mod = scheme === "https" ? https : http;
		const options = {
			hostname: host,
			port: port,
			path: "/",
			method: "HEAD",
			timeout: TIMEOUT_MS,
			rejectUnauthorized: false,
		};

		const req = mod.request(options, (res) => {
			const responseTimeMs = Date.now() - start;
			resolve({ status: "up", responseCode: res.statusCode, responseTimeMs });
		});

		req.on("timeout", () => {
			req.destroy();
			resolve({ status: "down", responseCode: null, responseTimeMs: TIMEOUT_MS });
		});

		req.on("error", () => {
			resolve({ status: "down", responseCode: null, responseTimeMs: Date.now() - start });
		});

		req.end();
	});
}

async function runChecks() {
	let hosts;
	try {
		hosts = await ProxyHost.query().where("enabled", 1).where("is_deleted", 0);
	} catch (err) {
		logger.warn("Uptime checker: failed to load hosts:", err.message);
		return;
	}

	for (const host of hosts) {
		try {
			const result = await checkHost(host.forward_scheme, host.forward_host, host.forward_port);
			await UptimeCheck.query().insert({
				proxy_host_id: host.id,
				status: result.status,
				response_code: result.responseCode,
				response_time_ms: result.responseTimeMs,
				created_on: new Date().toISOString().replace("T", " ").split(".")[0],
			});

			// Prune old entries
			const oldest = await UptimeCheck.query()
				.where("proxy_host_id", host.id)
				.orderBy("id", "desc")
				.offset(MAX_CHECKS_PER_HOST)
				.first();
			if (oldest) {
				await UptimeCheck.query()
					.where("proxy_host_id", host.id)
					.where("id", "<=", oldest.id)
					.delete();
			}
		} catch (err) {
			logger.warn(`Uptime checker: error checking host ${host.id}:`, err.message);
		}
	}
}

function initTimer() {
	// Initial check after 10s startup delay
	setTimeout(() => {
		runChecks();
		setInterval(runChecks, INTERVAL_MS);
	}, 10_000);
	logger.info("Uptime checker initialized (60s interval)");
}

export default { initTimer };
