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

const NGINX_LOG_DIR = process.env.NGINX_LOG_DIR || "/data/logs";

function parseNginxLine(line, host = "unknown") {
	// NPM log format: [date] - status status - METHOD proto host "path" [Client ip] [Length bytes] ...
	const m = line.match(/^\[[^\]]+\] - (\d+) \d+ - (\S+) \S+ \S+ "(\S+)" \[Client (\S+)\] \[Length (\d+)\]/);
	if (!m) return null;
	return {
		ts: new Date(),
		ip: m[4],
		host,
		method: m[2],
		path: m[3],
		status: parseInt(m[1], 10),
		bytes: parseInt(m[5], 10),
	};
}

function getStats() {
	const now = Date.now();
	const cutoff = now - WINDOW_MS;
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

// Per-file watcher state
const watchers = new Map(); // filePath -> { fd, pos }

function hostnameFromFile(filename) {
	// "proxy-host-1_access.log" -> "proxy-host-1"
	return filename.replace(/_access\.log$/, "");
}

function watchFile(filePath) {
	if (watchers.has(filePath)) return;
	if (!fs.existsSync(filePath)) return;

	try {
		const stat = fs.statSync(filePath);
		const fd = fs.openSync(filePath, "r");
		watchers.set(filePath, { fd, pos: stat.size });
	} catch {
		// ignore
	}
}

function pollFiles() {
	for (const [filePath, state] of watchers) {
		try {
			const stat2 = fs.statSync(filePath);
			if (stat2.size < state.pos) {
				// rotated
				state.pos = 0;
			}
			if (stat2.size === state.pos) continue;

			const buf = Buffer.alloc(stat2.size - state.pos);
			fs.readSync(state.fd, buf, 0, buf.length, state.pos);
			state.pos = stat2.size;

			const host = hostnameFromFile(path.basename(filePath));
			const lines = buf.toString("utf8").split("\n").filter(Boolean);
			for (const line of lines) {
				const parsed = parseNginxLine(line, host);
				if (parsed) logLines.push(parsed);
			}

			if (logLines.length > 10000) logLines.splice(0, logLines.length - 10000);
		} catch {
			// ignore read errors
		}
	}
}

function startLogWatcher() {
	if (!fs.existsSync(NGINX_LOG_DIR)) return;

	// Watch existing access logs
	try {
		const files = fs.readdirSync(NGINX_LOG_DIR);
		for (const f of files) {
			if (f.endsWith("_access.log")) {
				watchFile(path.join(NGINX_LOG_DIR, f));
			}
		}
	} catch {
		// ignore
	}

	// Watch for new log files appearing
	try {
		fs.watch(NGINX_LOG_DIR, (event, filename) => {
			if (filename && filename.endsWith("_access.log")) {
				const fp = path.join(NGINX_LOG_DIR, filename);
				watchFile(fp);
			}
		});
	} catch {
		// ignore if fs.watch not supported
	}

	setInterval(pollFiles, 1000);
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
