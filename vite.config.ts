import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';
import sitemap from 'vite-plugin-sitemap';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd());
	const siteUrl = env.VITE_SITE_URL || 'https://a4toa3.pages.dev';
	return {
		plugins: [
			sveltekit(),
			sitemap({
				hostname: siteUrl,
				dynamicRoutes: ['/'],
				readable: true,
				outDir: 'build'
			})
		]
	};
});
