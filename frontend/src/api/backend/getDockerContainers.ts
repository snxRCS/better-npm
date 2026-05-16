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

export async function getDockerContainers(): Promise<DockerContainer[]> {
	return await api.get({ url: "/docker/containers" });
}
