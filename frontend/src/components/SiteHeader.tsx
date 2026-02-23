import { IconLock, IconLogout, IconShieldLock, IconUser } from "@tabler/icons-react";
import { LocalePicker, ThemeSwitcher } from "src/components";
import { useAuthState } from "src/context";
import { useUser } from "src/hooks";
import { T } from "src/locale";
import { showChangePasswordModal, showTwoFactorModal, showUserModal } from "src/modals";

export function SiteHeader() {
	const { data: currentUser } = useUser("me");
	const isAdmin = currentUser?.roles.includes("admin");
	const { logout } = useAuthState();

	// SSO/LDAP users don't have local passwords or 2FA — the identity
	// provider handles these, so we hide the options in the dropdown.
	const isExternalAuth = currentUser?.authSource === "sso" || currentUser?.authSource === "ldap";

	return (
		<header className="app-header">
			<div className="app-header-inner">
				{/* Spacer to push items right */}
				<div className="flex-grow-1" />

				<div className="d-flex align-items-center gap-2">
					<LocalePicker />
					<ThemeSwitcher />

					<div className="nav-item dropdown">
						<a
							href="/"
							className="nav-link d-flex lh-1 p-1"
							data-bs-toggle="dropdown"
							aria-label="Open user menu"
						>
							<span
								className="avatar avatar-sm"
								style={{
									backgroundImage: `url(${currentUser?.avatar || "/images/default-avatar.jpg"})`,
								}}
							/>
							<div className="d-none d-lg-block ps-2">
								<div style={{ fontSize: "0.875rem", fontWeight: 500 }}>{currentUser?.nickname}</div>
								<div className="small text-secondary">
									<T id={isAdmin ? "role.admin" : "role.standard-user"} />
								</div>
							</div>
						</a>
						<div className="dropdown-menu dropdown-menu-end dropdown-menu-arrow">
							<a
								href="?"
								className="dropdown-item"
								onClick={(e) => {
									e.preventDefault();
									showUserModal("me");
								}}
							>
								<IconUser width={18} />
								<T id="user.edit-profile" />
							</a>
							{!isExternalAuth && (
								<>
									<a
										href="?"
										className="dropdown-item"
										onClick={(e) => {
											e.preventDefault();
											showChangePasswordModal("me");
										}}
									>
										<IconLock width={18} />
										<T id="user.change-password" />
									</a>
									<a
										href="?"
										className="dropdown-item"
										onClick={(e) => {
											e.preventDefault();
											showTwoFactorModal("me");
										}}
									>
										<IconShieldLock width={18} />
										<T id="user.two-factor" />
									</a>
								</>
							)}
							<div className="dropdown-divider" />
							<a
								href="?"
								className="dropdown-item"
								onClick={(e) => {
									e.preventDefault();
									logout();
								}}
							>
								<IconLogout width={18} />
								<T id="user.logout" />
							</a>
						</div>
					</div>
				</div>
			</div>
		</header>
	);
}
