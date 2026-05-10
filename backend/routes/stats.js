import express from "express";
import fs from "node:fs";
import path from "node:path";
import jwtdecode from "../lib/express/jwt-decode.js";
import { debug, express as logger } from "../logger.js";

const router = express.Router({
	caseSensitive: true,
	strict: true,
	mergeParams: true,
});

// Rolling window: last 60 seconds of parsed log lines
const WINDOW_MS = 60_000;
const logLines = []; // { ts: Date, ip, host, method, path, status, bytes }

const NGINX_LOG = process.env.NGINX_LOG_PATH || "/data/logs/default.log";

function parseNginxLine(line) {
	// Combined log format: ip - - [date] "method path proto" status bytes "referer" "ua"
	const m = line.match(/^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+) \S+" (\d+) (\d+)/);
	if (!m) return null;
	return {
		ts: new Date(),
		ip: m[1],
		host: "unknown",
		method: m[3],
		path: m[4],
		status: parseInt(m[5], 10),
		bytes: parseInt(m[6], 10),
	};
}

function getStats() {
	const now = Date.now();
	const cutoff = now - WINDOW_MS;
	// Clean old entries
	while (logLines.length > 0 && logLines[0].ts.getTime() < cutoff) {
		logLines.shift();
	}

	const recent = logLines;
	const statusCounts = { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 };
	const ipCounts = {};
	let bytesTotal = 0;

	for (const l of recent) {
		const bucket = `${Math.floor(l.status / 100)}xx`;
		if (statusCounts[bucket] !== undefined) statusCounts[bucket]++;
		ipCounts[l.ip] = (ipCounts[l.ip] || 0) + 1;
		bytesTotal += l.bytes;
	}

	const topIps = Object.entries(ipCounts)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 5)
		.map(([ip, count]) => ({ ip, count }));

	return {
		requestsPerMinute: recent.length,
		statusCounts,
		topIps,
		bytesTotal,
		windowSeconds: 60,
	};
}

// Tail the nginx log file
let logWatcher = null;
let logFd = null;
let logPos = 0;

function startLogWatcher() {
	if (!fs.existsSync(NGINX_LOG)) return;

	try {
		const stat = fs.statSync(NGINX_LOG);
		logPos = stat.size; // start at end, don't replay history
		logFd = fs.openSync(NGINX_LOG, "r");

		logWatcher = setInterval(() => {
			try {
				const stat2 = fs.statSync(NGINX_LOG);
				if (stat2.size < logPos) {
					// log rotated
					logPos = 0;
				}
				if (stat2.size === logPos) return;

				const buf = Buffer.alloc(stat2.size - logPos);
				fs.readSync(logFd, buf, 0, buf.length, logPos);
				logPos = stat2.size;

				const lines = buf.toString("utf8").split("\n").filter(Boolean);
				for (const line of lines) {
					const parsed = parseNginxLine(line);
					if (parsed) logLines.push(parsed);
				}

				// Keep max 10000 entries to avoid memory bloat
				if (logLines.length > 10000) logLines.splice(0, logLines.length - 10000);
			} catch {
				// ignore read errors
			}
		}, 1000);
	} catch {
		// ignore if log not accessible
	}
}

startLogWatcher();

/**
 * GET /api/stats/traffic  — SSE stream, emits stats every 5s
 */
router
	.route("/traffic")
	.options((_, res) => res.sendStatus(204))
	.all(jwtdecode())
	.get((req, res) => {
		res.setHeader("Content-Type", "text/event-stream");
		res.setHeader("Cache-Control", "no-cache");
		res.setHeader("Connection", "keep-alive");
		res.setHeader("X-Accel-Buffering", "no");
		res.flushHeaders();

		const sendStats = () => {
			const data = JSON.stringify(getStats());
			res.write(`data: ${data}\n\n`);
		};

		sendStats();
		const interval = setInterval(sendStats, 5000);
		const ping = setInterval(() => res.write(": ping\n\n"), 15000);

		req.on("close", () => {
			clearInterval(interval);
			clearInterval(ping);
		});
	});

/**
 * GET /api/stats/summary  — JSON snapshot of current 60s window
 */
router
	.route("/summary")
	.options((_, res) => res.sendStatus(204))
	.all(jwtdecode())
	.get(async (req, res, next) => {
		try {
			res.status(200).send(getStats());
		} catch (err) {
			debug(logger, `${req.method.toUpperCase()} ${req.path}: ${err}`);
			next(err);
		}
	});

export default router;
