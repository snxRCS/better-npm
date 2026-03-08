import {
	IconBook,
	IconChevronDown,
	IconDeviceDesktop,
	IconHome,
	IconLock,
	IconMenu2,
	IconSettings,
	IconShield,
	IconUser,
	IconX,
} from "@tabler/icons-react";
import React, { useState } from "react";
import { HasPermission, NavLink } from "src/components";
import { T } from "src/locale";
import {
	ACCESS_LISTS,
	ADMIN,
	CERTIFICATES,
	DEAD_HOSTS,
	type MANAGE,
	PROXY_HOSTS,
	REDIRECTION_HOSTS,
	type Section,
	STREAMS,
	VIEW,
} from "src/modules/Permissions";

interface MenuItem {
	label: string;
	icon?: React.ElementType;
	to?: string;
	items?: MenuItem[];
	permissionSection?: Section | typeof ADMIN;
	permission?: typeof VIEW | typeof MANAGE;
}

const menuItems: MenuItem[] = [
	{
		to: "/",
		icon: IconHome,
		label: "dashboard",
	},
	{
		icon: IconDeviceDesktop,
		label: "hosts",
		items: [
			{
				to: "/nginx/proxy",
				label: "proxy-hosts",
				permissionSection: PROXY_HOSTS,
				permission: VIEW,
			},
			{
				to: "/nginx/redirection",
				label: "redirection-hosts",
				permissionSection: REDIRECTION_HOSTS,
				permission: VIEW,
			},
			{
				to: "/nginx/stream",
				label: "streams",
				permissionSection: STREAMS,
				permission: VIEW,
			},
			{
				to: "/nginx/404",
				label: "dead-hosts",
				permissionSection: DEAD_HOSTS,
				permission: VIEW,
			},
		],
	},
	{
		to: "/access",
		icon: IconLock,
		label: "access-lists",
		permissionSection: ACCESS_LISTS,
		permission: VIEW,
	},
	{
		to: "/certificates",
		icon: IconShield,
		label: "certificates",
		permissionSection: CERTIFICATES,
		permission: VIEW,
	},
	{
		to: "/users",
		icon: IconUser,
		label: "users",
		permissionSection: ADMIN,
	},
	{
		to: "/audit-log",
		icon: IconBook,
		label: "auditlogs",
		permissionSection: ADMIN,
	},
	{
		to: "/settings",
		icon: IconSettings,
		label: "settings",
		permissionSection: ADMIN,
	},
];

function SidebarItem({ item, onNavigate }: { item: MenuItem; onNavigate?: () => void }) {
	const [expanded, setExpanded] = useState(false);

	if (item.items && item.items.length > 0) {
		return (
			<HasPermission
				key={`item-${item.label}`}
				section={item.permissionSection}
				permission={item.permission || VIEW}
				hideError
			>
				<li className="sidebar-nav-item">
					<button
						type="button"
						className={`sidebar-nav-link sidebar-nav-group-toggle ${expanded ? "active" : ""}`}
						onClick={() => setExpanded(!expanded)}
					>
						<span className="sidebar-nav-icon">
							{item.icon && React.createElement(item.icon, { size: 20, stroke: 1.5 })}
						</span>
						<span className="sidebar-nav-label">
							<T id={item.label} />
						</span>
						<IconChevronDown
							size={16}
							className={`sidebar-nav-chevron ${expanded ? "rotated" : ""}`}
						/>
					</button>
					{expanded && (
						<ul className="sidebar-nav-sub">
							{item.items.map((subitem, idx) => (
								<HasPermission
									key={`${idx}-${subitem.to}`}
									section={subitem.permissionSection}
									permission={subitem.permission || VIEW}
									hideError
								>
									<li className="sidebar-nav-item">
										<NavLink
											to={subitem.to}
											className="sidebar-nav-link sidebar-nav-sublink"
											onClick={onNavigate}
										>
											<span className="sidebar-nav-label">
												<T id={subitem.label} />
											</span>
										</NavLink>
									</li>
								</HasPermission>
							))}
						</ul>
					)}
				</li>
			</HasPermission>
		);
	}

	return (
		<HasPermission
			key={`item-${item.label}`}
			section={item.permissionSection}
			permission={item.permission || VIEW}
			hideError
		>
			<li className="sidebar-nav-item">
				<NavLink to={item.to} className="sidebar-nav-link" onClick={onNavigate}>
					<span className="sidebar-nav-icon">
						{item.icon && React.createElement(item.icon, { size: 20, stroke: 1.5 })}
					</span>
					<span className="sidebar-nav-label">
						<T id={item.label} />
					</span>
				</NavLink>
			</li>
		</HasPermission>
	);
}

export function SiteMenu() {
	const [mobileOpen, setMobileOpen] = useState(false);

	const closeMobile = () => setMobileOpen(false);

	return (
		<>
			{/* Mobile toggle button */}
			<button
				type="button"
				className="sidebar-mobile-toggle"
				onClick={() => setMobileOpen(!mobileOpen)}
				aria-label="Toggle navigation"
			>
				{mobileOpen ? <IconX size={22} /> : <IconMenu2 size={22} />}
			</button>

			{/* Mobile overlay */}
			{mobileOpen && (
				// biome-ignore lint/a11y/useKeyWithClickEvents: Overlay dismiss
				// biome-ignore lint/a11y/noStaticElementInteractions: Overlay dismiss
				<div className="sidebar-overlay" onClick={closeMobile} />
			)}

			<aside className={`app-sidebar ${mobileOpen ? "open" : ""}`}>
				<div className="sidebar-brand">
					<NavLink to="/" onClick={closeMobile}>
						<img
							src="/images/logo-no-text.svg"
							width={32}
							height={32}
							alt="Logo"
							className="sidebar-brand-logo"
						/>
						<span className="sidebar-brand-text">Better NPM</span>
					</NavLink>
				</div>

				<nav className="sidebar-nav">
					<ul className="sidebar-nav-list">
						{menuItems.map((item) => (
							<SidebarItem key={item.label} item={item} onNavigate={closeMobile} />
						))}
					</ul>
				</nav>
			</aside>
		</>
	);
}
