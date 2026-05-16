import { useQuery } from "@tanstack/react-query";
import { getUptimeHistory, getUptimeStatus, type UptimeHistoryEntry } from "src/api/backend";
import { useProxyHosts } from "src/hooks";

function uptimePercent(checks: UptimeHistoryEntry[]): string {
	if (!checks.length) return "—";
	const up = checks.filter((c) => c.status === "up").length;
	return ((up / checks.length) * 100).toFixed(1) + "%";
}

function HostRow({ hostId, domainNames }: { hostId: number; domainNames: string[] }) {
	const { data: history } = useQuery({
		queryKey: ["uptime", "history", hostId],
		queryFn: () => getUptimeHistory(hostId),
		staleTime: 30 * 1000,
		refetchInterval: 30 * 1000,
		retry: false,
	});

	const latest = history?.[0];

	return (
		<tr>
			<td>{domainNames.join(", ")}</td>
			<td>
				{latest ? (
					<span className={`badge bg-${latest.status === "up" ? "success" : "danger"}`}>
						{latest.status === "up" ? "Up" : "Down"}
					</span>
				) : (
					<span className="badge bg-secondary">No data</span>
				)}
			</td>
			<td>{latest?.responseTimeMs != null ? `${latest.responseTimeMs}ms` : "—"}</td>
			<td>{history ? uptimePercent(history) : "—"}</td>
			<td>
				{latest?.createdOn
					? new Date(latest.createdOn).toLocaleString()
					: "—"}
			</td>
		</tr>
	);
}

export default function UptimePage() {
	const { data: proxyHosts, isLoading } = useProxyHosts(["owner"], { staleTime: 30000 });
	const { data: statusMap } = useQuery({
		queryKey: ["uptime", "status"],
		queryFn: getUptimeStatus,
		staleTime: 30 * 1000,
		refetchInterval: 30 * 1000,
		retry: false,
	});

	const hosts = proxyHosts?.filter((h: any) => h.enabled) ?? [];
	const upCount = hosts.filter((h: any) => statusMap?.[h.id]?.status === "up").length;
	const downCount = hosts.filter((h: any) => statusMap?.[h.id]?.status === "down").length;

	return (
		<div>
			<div className="page-header">
				<div className="row align-items-center">
					<div className="col">
						<h2 className="page-title">Uptime Monitor</h2>
					</div>
				</div>
			</div>

			<div className="row mb-4">
				<div className="col-sm-4">
					<div className="card">
						<div className="card-body text-center">
							<div className="h1 text-success">{upCount}</div>
							<div className="text-muted">Hosts Up</div>
						</div>
					</div>
				</div>
				<div className="col-sm-4">
					<div className="card">
						<div className="card-body text-center">
							<div className="h1 text-danger">{downCount}</div>
							<div className="text-muted">Hosts Down</div>
						</div>
					</div>
				</div>
				<div className="col-sm-4">
					<div className="card">
						<div className="card-body text-center">
							<div className="h1">{hosts.length}</div>
							<div className="text-muted">Total Monitored</div>
						</div>
					</div>
				</div>
			</div>

			<div className="card">
				<div className="card-body p-0">
					<table className="table table-vcenter card-table">
						<thead>
							<tr>
								<th>Host</th>
								<th>Status</th>
								<th>Response Time</th>
								<th>Uptime (last 100)</th>
								<th>Last Checked</th>
							</tr>
						</thead>
						<tbody>
							{isLoading && (
								<tr>
									<td colSpan={5} className="text-center py-4">
										Loading…
									</td>
								</tr>
							)}
							{!isLoading && hosts.length === 0 && (
								<tr>
									<td colSpan={5} className="text-center py-4 text-muted">
										No enabled proxy hosts found.
									</td>
								</tr>
							)}
							{hosts.map((host: any) => (
								<HostRow
									key={host.id}
									hostId={host.id}
									domainNames={host.domainNames}
								/>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
