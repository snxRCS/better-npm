const defaultImg = "/images/default-avatar.jpg";

/**
 * Generate initials-based SVG avatar as a data URI
 */
function generateInitialsAvatar(name?: string): string {
	if (!name) return defaultImg;
	const parts = name.trim().split(/\s+/);
	const initials = parts.length >= 2
		? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
		: parts[0][0].toUpperCase();

	// Deterministic color from name
	let hash = 0;
	for (let i = 0; i < name.length; i++) {
		hash = name.charCodeAt(i) + ((hash << 5) - hash);
	}
	const hue = Math.abs(hash) % 360;
	const color = `hsl(${hue}, 55%, 45%)`;
	const fontSize = initials.length > 1 ? 40 : 48;

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="${color}"/><text x="48" y="48" dy=".35em" text-anchor="middle" fill="white" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="${fontSize}" font-weight="600">${initials}</text></svg>`;

	return `data:image/svg+xml;base64,${btoa(svg)}`;
}

interface Props {
	url?: string;
	name?: string;
}

export function AvatarFormatter({ url, name }: Props) {
	// Use provided URL if it's a data URI or valid path, otherwise generate initials
	const imgUrl = url && url.length > 0 ? url : generateInitialsAvatar(name);

	return (
		<div className="d-flex py-1 align-items-center">
			<span
				title={name}
				className="avatar avatar-2 me-2"
				style={{
					backgroundImage: `url(${imgUrl})`,
				}}
			/>
		</div>
	);
}

// Keep old name as alias for backwards compatibility
export const GravatarFormatter = AvatarFormatter;
