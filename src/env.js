const env = import.meta.env
const api_url = env.VITE_API_URL ?? "http://localhost:8000/api"

export {
	api_url,
}