/**
 * Local Avatar Generator
 *
 * Generates SVG-based initials avatars locally without any external service.
 * No data is sent to third-party servers (privacy-safe).
 *
 * Supports optional LDAP thumbnailPhoto for users with LDAP-provided photos.
 */

import crypto from "node:crypto";

/**
 * Generate a deterministic color from a string (email)
 * @param {String} str
 * @returns {String} HSL color string
 */
const stringToColor = (str) => {
	const hash = crypto.createHash("md5").update(str.toLowerCase().trim()).digest("hex");
	const hue = Number.parseInt(hash.substring(0, 4), 16) % 360;
	return `hsl(${hue}, 55%, 45%)`;
};

/**
 * Extract initials from a name or email
 * @param {String} name
 * @param {String} [email]
 * @returns {String} 1-2 character initials
 */
const getInitials = (name, email) => {
	if (name && name.trim()) {
		const parts = name.trim().split(/\s+/);
		if (parts.length >= 2) {
			return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
		}
		return parts[0][0].toUpperCase();
	}
	if (email) {
		const local = email.split("@")[0];
		return local[0].toUpperCase();
	}
	return "?";
};

/**
 * Generate an SVG avatar with initials
 * Returns a data URI that can be used directly in img src
 *
 * @param {String} email - User email (used for color generation)
 * @param {String} [name] - User name (used for initials)
 * @returns {String} SVG data URI
 */
const generateAvatar = (email, name) => {
	const color = stringToColor(email || "default");
	const initials = getInitials(name, email);
	const fontSize = initials.length > 1 ? 40 : 48;

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
<rect width="96" height="96" rx="48" fill="${color}"/>
<text x="48" y="48" dy=".35em" text-anchor="middle" fill="white" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-size="${fontSize}" font-weight="600">${initials}</text>
</svg>`;

	return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
};

/**
 * Simple URL-safe avatar path (for use in API responses)
 * Returns the data URI directly
 *
 * @param {String} email
 * @param {Object} [options] - Unused, kept for API compatibility with gravatar
 * @returns {String}
 */
const url = (email, options) => {
	return generateAvatar(email);
};

export default {
	generateAvatar,
	url,
	getInitials,
	stringToColor,
};
