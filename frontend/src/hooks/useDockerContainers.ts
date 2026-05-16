import { useQuery } from "@tanstack/react-query";
import { getDockerContainers, type DockerContainer } from "src/api/backend";

const useDockerContainers = () => {
	return useQuery<DockerContainer[], Error>({
		queryKey: ["docker", "containers"],
		queryFn: getDockerContainers,
		staleTime: 10 * 1000,
		retry: false,
	});
};

export { useDockerContainers };
