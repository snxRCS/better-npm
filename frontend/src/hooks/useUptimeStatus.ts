import { useQuery } from "@tanstack/react-query";
import { getUptimeStatus, type UptimeStatusMap } from "src/api/backend";

const useUptimeStatus = () => {
	return useQuery<UptimeStatusMap, Error>({
		queryKey: ["uptime", "status"],
		queryFn: getUptimeStatus,
		staleTime: 30 * 1000,
		refetchInterval: 30 * 1000,
		retry: false,
	});
};

export { useUptimeStatus };
