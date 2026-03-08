import { useLocation, useNavigate } from "react-router-dom";

interface Props {
	children: React.ReactNode;
	to?: string;
	className?: string;
	isDropdownItem?: boolean;
	onClick?: () => void;
}
export function NavLink({ children, to, className, isDropdownItem, onClick }: Props) {
	const navigate = useNavigate();
	const location = useLocation();

	// Determine the default class based on context
	const defaultClass = isDropdownItem ? "dropdown-item" : "nav-link";
	const baseClass = className || defaultClass;

	// Check if the link is active (exact match for "/" to avoid matching everything)
	const isActive = to
		? to === "/"
			? location.pathname === "/"
			: location.pathname.startsWith(to)
		: false;

	const finalClass = isActive ? `${baseClass} active` : baseClass;

	return (
		<a
			className={finalClass}
			href={to}
			onClick={(e) => {
				e.preventDefault();
				if (onClick) {
					onClick();
				}
				if (to) {
					navigate(to);
				}
			}}
		>
			{children}
		</a>
	);
}
