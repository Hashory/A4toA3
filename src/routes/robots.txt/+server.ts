const siteUrl = process.env.VITE_SITE_URL || "https://a4toa3.pages.dev";

export const prerender = true;

export const GET = () =>
	new Response(`User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`, {
		headers: {
			"content-type": "text/plain; charset=utf-8",
		},
	});
