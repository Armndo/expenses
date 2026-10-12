const env = import.meta.env
const api_url = env.VITE_API_URL ?? "http://localhost:8000"

/**
 * Environment the build talks to, taken from the API URL so it holds for a deployed build and for `npm run dev`
 * alike: `DEVELOP` (`.dev.`), `STAGING` (`.sta.`), `LOCAL` (localhost) and "" for production, where nothing changes.
 */
const env_name = (() => {
	const host = (() => { try { return new URL(api_url).hostname } catch { return "" } })()

	if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost")) return "LOCAL"
	if (/(^|\.)dev\./.test(host)) return "DEVELOP"
	if (/(^|\.)sta\./.test(host)) return "STAGING"

	return ""
})()

export {
	api_url,
	env_name,
}