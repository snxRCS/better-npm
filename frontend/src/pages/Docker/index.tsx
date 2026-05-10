import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { IconRefresh, IconPlayerPlay, IconBrandDocker } from "@tabler/icons-react";
import { useState } from "react";
import AuthStore from "src/modules/AuthStore";

interface Container {
	id: string;
	name: string;
	image: string;
	status: string;
	state: string;
	created: number;
	ports: { hostPort: number | null; containerPort: number; protocol: string }[];
}

interface DockerResponse {
	available: boolean;
	containers: Container[];
	error?: string;
}

async function fetchContainers(): Promise<DockerResponse> {
	const res = await fetch("/api/docker/containers", {
		headers: AuthStore.token ? { Authorization: `Bearer ${AuthStore.token.token}` } : {},
	});
	if (!res.ok) throw new Error("Failed");
	return res.json();
}

async function restartContainer(id: string) {
	const res = await fetch(`/api/docker/container/${id}/restart`, {
		method: "POST",
		headers: AuthStore.token ? { Authorization: `Bearer ${AuthStore.token.token}` } : {},
	});
	if (!res.ok) throw new Error("Restart failed");
	return res.json();
}

const Docker = () => {
	const qc = useQueryClient();
	const [confirmId, setConfirmId] = useState<string | null>(null);

	const { data, isLoading, refetch } = useQuery<DockerResponse>({
		queryKey: ["docker-containers"],
		queryFn: fetchContainers,
		refetchInterval: 30000,
		retry: false,
	});

	const restartMutation = useMutation({
		mutationFn: restartContainer,
		onSuccess: () => {
			setConfirmId(null);
			setTimeout(() => qc.invalidateQueries({ queryKey: ["docker-containers"] }), 2000);
		},
	});

	return (
		<div>
			<div className="mb-4 d-flex align-items-center gap-3">
				<div>
					<h2 className="mb-1 fw-bold d-flex align-items-center gap-2">
						<IconBrandDocker size={28} /> Docker
					</h2>
					<p className="text-secondary mb-0 small">Container overview</p>
				</div>
				<button type="button" className="btn btn-sm btn-outline-secondary ms-auto" onClick={() => refetch()}>
					<IconRefresh size={16} className="me-1" /> Refresh
				</button>
			</div>

			{isLoading && <div className="text-secondary">Loading...</div>}

			{data && !data.available && (
				<div className="alert alert-warning">
					Docker socket not available. Mount <code>/var/run/docker.sock</code> into the container.
				</div>
			)}

			{data?.available && (
				<div className="card">
					<div className="table-responsive">
						<table className="table table-vcenter card-table">
							<thead>
								<tr>
									<th>Name</th>
									<th>Image</th>
									<th>Status</th>
									<th>Ports</th>
									<th />
								</tr>
							</thead>
							<tbody>
								{data.containers.map((c) => (
									<tr key={c.id}>
										<td>
											<span className="fw-medium">{c.name}</span>
											<div className="text-secondary small text-monospace">{c.id}</div>
										</td>
										<td className="small text-secondary">{c.image}</td>
										<td>
											<span className={`badge ${c.state === "running" ? "bg-success-lt" : "bg-secondary-lt"}`}>
												{c.state}
											</span>
										</td>
										<td className="small">
											{c.ports.filter((p) => p.hostPort).map((p, i) => (
												<span key={i} className="me-1">{p.hostPort}→{p.containerPort}</span>
											))}
										</td>
										<td className="text-end">
											{confirmId === c.id ? (
												<span className="d-flex gap-1 justify-content-end">
													<button type="button" className="btn btn-sm btn-danger" onClick={() => restartMutation.mutate(c.id)}>
														Confirm
													</button>
													<button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setConfirmId(null)}>
														Cancel
													</button>
												</span>
											) : (
												<button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setConfirmId(c.id)}>
													<IconPlayerPlay size={14} className="me-1" /> Restart
												</button>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
};

export default Docker;
