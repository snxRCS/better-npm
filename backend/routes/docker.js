import express from "express";
import http from "node:http";
import fs from "node:fs";
import jwtdecode from "../lib/express/jwt-decode.js";
import { debug, express as logger } from "../logger.js";

const router = express.Router({
	caseSensitive: true,
	strict: true,
	mergeParams: true,
});

const DOCKER_SOCKET = process.env.DOCKER_SOCKET || "/var/run/docker.sock";

function dockerRequest(path, method = "GET", body = null) {
	return new Promise((resolve, reject) => {
		const options = {
			socketPath: DOCKER_SOCKET,
			path,
			method,
			headers: { "Content-Type": "application/json" },
		};

		const req = http.request(options, (res) => {
			let data = "";
			res.on("data", (chunk) => { data += chunk; });
			res.on("end", () => {
				try {
					resolve({ status: res.statusCode, body: JSON.parse(data) });
				} catch {
					resolve({ status: res.statusCode, body: data });
				}
			});
		});

		req.on("error", reject);
		if (body) req.write(JSON.stringify(body));
		req.end();
	});
}

/**
 * GET /api/docker/containers
 */
router
	.route("/containers")
	.options((_, res) => res.sendStatus(204))
	.all(jwtdecode())
	.get(async (req, res, next) => {
		try {
			const result = await dockerRequest("/containers/json?all=1");
			const containers = result.body.map((c) => ({
				id: c.Id.slice(0, 12),
				name: c.Names?.[0]?.replace(/^\//, "") || c.Id.slice(0, 12),
				image: c.Image,
				status: c.Status,
				state: c.State,
				created: c.Created,
				ports: (c.Ports || []).map((p) => ({
					hostPort: p.PublicPort || null,
					containerPort: p.PrivatePort,
					protocol: p.Type,
				})),
			}));
			res.status(200).send({ available: true, containers });
		} catch (err) {
			debug(logger, `Docker error: ${err}`);
			res.status(200).send({ available: false, error: "Docker socket not available", containers: [] });
		}
	});

/**
 * GET /api/docker/container/:id/stats
 */
router
	.route("/container/:id/stats")
	.options((_, res) => res.sendStatus(204))
	.all(jwtdecode())
	.get(async (req, res, next) => {
		try {
			const result = await dockerRequest(`/containers/${req.params.id}/stats?stream=false`);
			const s = result.body;
			const cpuDelta = s.cpu_stats.cpu_usage.total_usage - s.precpu_stats.cpu_usage.total_usage;
			const systemDelta = s.cpu_stats.system_cpu_usage - s.precpu_stats.system_cpu_usage;
			const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * s.cpu_stats.online_cpus * 100 : 0;
			const memUsage = s.memory_stats.usage - (s.memory_stats.stats?.cache || 0);
			const memLimit = s.memory_stats.limit;
			res.status(200).send({
				cpu: Math.round(cpuPercent * 10) / 10,
				memoryUsageMb: Math.round(memUsage / 1024 / 1024),
				memoryLimitMb: Math.round(memLimit / 1024 / 1024),
				memoryPercent: Math.round((memUsage / memLimit) * 1000) / 10,
			});
		} catch (err) {
			debug(logger, `Docker stats error: ${err}`);
			next(err);
		}
	});

/**
 * POST /api/docker/container/:id/restart
 */
router
	.route("/container/:id/restart")
	.options((_, res) => res.sendStatus(204))
	.all(jwtdecode())
	.post(async (req, res, next) => {
		try {
			await dockerRequest(`/containers/${req.params.id}/restart`, "POST");
			res.status(200).send({ ok: true });
		} catch (err) {
			debug(logger, `Docker restart error: ${err}`);
			next(err);
		}
	});

export default router;
