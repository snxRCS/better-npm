import { useQuery } from "@tanstack/react-query";
import { IconActivity } from "@tabler/icons-react";
import AuthStore from "src/modules/AuthStore";

interface StatsData {
	requestsPerMinute: number;
	statusCounts: { "2xx": number; "3xx": number; "4xx": number; "5xx": number };
	topIps: { ip: string; count: number }[];
	bytesTotal: number;
	windowSeconds: number;
}

async function fetchStats(): Promise<StatsData> {
	const res = await fetch("/api/stats/summary", {
		headers: AuthStore.token ? { Authorization: `Bearer ${AuthStore.token.token}` } : {},
	});
	if (!res.ok) throw new Error("Failed to fetch stats");
	return res.json();
}

export function LiveStats() {
	const { data, isError } = useQuery<StatsData>({
		queryKey: ["live-stats"],
		queryFn: fetchStats,
		refetchInterval: 5000,
		retry: false,
	});

	if (isError || !data) return null;

	const total = data.statusCounts["2xx"] + data.statusCounts["3xx"] + data.statusCounts["4xx"] + data.statusCounts["5xx"] || 1;
	const formatBytes = (b: number) => b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : b > 1024 ? `${(b / 1024).toFixed(1)} KB` : `${b} B`;

	return (
		<div className="row g-3 mt-1">
			<div className="col-12">
				<div className="card">
					<div className="card-header d-flex align-items-center gap-2">
						<IconActivity size={18} />
						<span className="fw-semibold">Live Traffic <small className="text-secondary fw-normal">(last 60s)</small></span>
						<span className="badge bg-green-lt ms-auto">Live</span>
					</div>
					<div className="card-body">
						<div className="row g-4">
							<div className="col-sm-3 text-center">
								<div style={{ fontSize: "2.5rem", fontWeight: 700, lineHeight: 1 }}>{data.requestsPerMinute}</div>
								<div className="text-secondary small mt-1">Requests / min</div>
								<div className="text-secondary small">{formatBytes(data.bytesTotal)} transferred</div>
							</div>
							<div className="col-sm-4">
								<div className="small text-secondary mb-2">Status Codes</div>
								{(["2xx", "3xx", "4xx", "5xx"] as const).map((k) => {
									const pct = Math.round((data.statusCounts[k] / total) * 100);
									const color = k === "2xx" ? "bg-success" : k === "3xx" ? "bg-warning" : "bg-danger";
									return (
										<div key={k} className="mb-1">
											<div className="d-flex justify-content-between small mb-1">
												<span className="text-secondary">{k}</span>
												<span>{data.statusCounts[k]}</span>
											</div>
											<div className="progress" style={{ height: 6 }}>
												<div className={`progress-bar ${color}`} style={{ width: `${pct}%` }} />
											</div>
										</div>
									);
								})}
							</div>
							<div className="col-sm-5">
								<div className="small text-secondary mb-2">Top IPs</div>
								{data.topIps.length === 0 ? (
									<div className="text-secondary small">No traffic yet</div>
								) : (
									<table className="table table-sm table-borderless mb-0">
										<tbody>
											{data.topIps.map(({ ip, count }) => (
												<tr key={ip}>
													<td className="small py-0 ps-0 text-monospace">{ip}</td>
													<td className="small py-0 pe-0 text-end text-secondary">{count} req</td>
												</tr>
											))}
										</tbody>
									</table>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
