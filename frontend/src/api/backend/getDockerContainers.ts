import * as api from "./base";

export interface DockerContainerPort {
	hostPort: number;
	containerPort: number;
	protocol: string;
}

export interface DockerContainer {
	id: string;
	name: string;
	image: string;
	status: string;
	state: string;
	ports: DockerContainerPort[];
}

interface DockerContainersResponse {
	available: boolean;
	containers: DockerContainer[];
	error?: string;
}

export async function getDockerContainers(): Promise<DockerContainer[]> {
	const result: DockerContainersResponse = await api.get({ url: "/docker/containers" });
	return result.containers || [];
}
