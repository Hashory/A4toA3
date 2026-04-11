const siteUrl = process.env.VITE_SITE_URL || "https://a4toa3.pages.dev";

export const prerender = true;

export const GET = () =>
	new Response(
		`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\t<url>\n\t\t<loc>${siteUrl}/</loc>\n\t</url>\n</urlset>\n`,
		{
			headers: {
				"content-type": "application/xml; charset=utf-8",
			},
		},
	);
