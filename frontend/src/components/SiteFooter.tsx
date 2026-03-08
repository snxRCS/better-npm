import { useCheckVersion, useHealth } from "src/hooks";
import { T } from "src/locale";

export function SiteFooter() {
	const health = useHealth();
	const { data: versionData } = useCheckVersion();

	const getVersion = () => {
		if (!health.data) {
			return "";
		}
		const v = health.data.version;
		return `v${v.major}.${v.minor}.${v.revision}`;
	};

	return (
		<footer className="footer d-print-none py-3">
			<div className="container-xl">
				<div className="d-flex flex-wrap align-items-center justify-content-between gap-2" style={{ fontSize: "0.8rem" }}>
					<div className="text-secondary">
						© 2025 Better NPM Contributors
						{" · "}
						<a
							href={`https://github.com/snxRCS/better-npm/releases/tag/${getVersion()}`}
							className="link-secondary"
							target="_blank"
							rel="noopener"
						>
							{getVersion()}
						</a>
					</div>
					<div className="d-flex align-items-center gap-3">
						{versionData?.updateAvailable && versionData?.latest && (
							<a
								href={`https://github.com/snxRCS/better-npm/releases/tag/${versionData.latest}`}
								className="link-warning fw-bold"
								target="_blank"
								rel="noopener"
								title={`New version ${versionData.latest} is available`}
							>
								<T id="update-available" data={{ latestVersion: versionData.latest }} />
							</a>
						)}
						<a
							href="https://github.com/snxRCS/better-npm"
							target="_blank"
							className="link-secondary"
							rel="noopener"
						>
							<T id="footer.github-fork" />
						</a>
					</div>
				</div>
			</div>
		</footer>
	);
}
