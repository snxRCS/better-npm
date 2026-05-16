import { useUptimeStatus } from "src/hooks";

interface Props {
	proxyHostId: number;
}

export function UptimeBadge({ proxyHostId }: Props) {
	const { data: uptimeMap } = useUptimeStatus();
	const entry = uptimeMap?.[proxyHostId];

	if (!entry) {
		return <span className="uptime-dot uptime-dot--unknown" title="No data yet" />;
	}

	const label =
		entry.status === "up"
			? `Up · ${entry.responseTimeMs}ms · HTTP ${entry.responseCode}`
			: `Down · Last checked: ${entry.lastChecked}`;

	return (
		<span
			className={`uptime-dot uptime-dot--${entry.status}`}
			title={label}
		/>
	);
}
