import { IconArrowsCross, IconBolt, IconBoltOff, IconChevronRight, IconDisc } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { HasPermission } from "src/components";
import { useHostReport } from "src/hooks";
import { T } from "src/locale";
import { DEAD_HOSTS, PROXY_HOSTS, REDIRECTION_HOSTS, STREAMS, VIEW } from "src/modules/Permissions";

interface StatCardProps {
	href: string;
	icon: React.ReactNode;
	iconBg: string;
	countId: string;
	count?: number;
	labelId: string;
}

function StatCard({ href, icon, iconBg, count, labelId }: StatCardProps) {
	const navigate = useNavigate();
	return (
		<a
			href={href}
			className="card card-link card-link-pop"
			style={{ textDecoration: "none" }}
			onClick={(e) => {
				e.preventDefault();
				navigate(href);
			}}
		>
			<div className="card-body p-4">
				<div className="d-flex align-items-center mb-3">
					<span
						className="avatar avatar-lg text-white"
						style={{ background: iconBg, borderRadius: 12 }}
					>
						{icon}
					</span>
				</div>
				<div style={{ fontSize: "2rem", fontWeight: 700, lineHeight: 1.1 }}>
					{count ?? 0}
				</div>
				<div className="text-secondary mt-1 d-flex align-items-center justify-content-between" style={{ fontSize: "0.85rem" }}>
					<T id={labelId} />
					<IconChevronRight size={16} style={{ opacity: 0.4 }} />
				</div>
			</div>
		</a>
	);
}

const Dashboard = () => {
	const { data: hostReport } = useHostReport();

	return (
		<div>
			<div className="mb-4">
				<h2 className="mb-1" style={{ fontWeight: 700 }}>
					<T id="dashboard" />
				</h2>
				<p className="text-secondary mb-0" style={{ fontSize: "0.9rem" }}>
					<T id="dashboard.subtitle" />
				</p>
			</div>
			<div className="row g-3">
				<HasPermission section={PROXY_HOSTS} permission={VIEW} hideError>
					<div className="col-sm-6 col-xl-3">
						<StatCard
							href="/nginx/proxy"
							icon={<IconBolt size={24} />}
							iconBg="#16a34a"
							countId="proxy-hosts.count"
							count={hostReport?.proxy}
							labelId="proxy-hosts"
						/>
					</div>
				</HasPermission>
				<HasPermission section={REDIRECTION_HOSTS} permission={VIEW} hideError>
					<div className="col-sm-6 col-xl-3">
						<StatCard
							href="/nginx/redirection"
							icon={<IconArrowsCross size={24} />}
							iconBg="#eab308"
							countId="redirection-hosts.count"
							count={hostReport?.redirection}
							labelId="redirection-hosts"
						/>
					</div>
				</HasPermission>
				<HasPermission section={STREAMS} permission={VIEW} hideError>
					<div className="col-sm-6 col-xl-3">
						<StatCard
							href="/nginx/stream"
							icon={<IconDisc size={24} />}
							iconBg="#0ea5e9"
							countId="streams.count"
							count={hostReport?.stream}
							labelId="streams"
						/>
					</div>
				</HasPermission>
				<HasPermission section={DEAD_HOSTS} permission={VIEW} hideError>
					<div className="col-sm-6 col-xl-3">
						<StatCard
							href="/nginx/404"
							icon={<IconBoltOff size={24} />}
							iconBg="#ef4444"
							countId="dead-hosts.count"
							count={hostReport?.dead}
							labelId="dead-hosts"
						/>
					</div>
				</HasPermission>
			</div>
		</div>
	);
};

export default Dashboard;
