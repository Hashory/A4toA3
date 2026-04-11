<script lang="ts">
	let { children } = $props();
</script>

{@render children()}

<style>
	:global(body) {
		font-family: sans-serif;
		background: #f3f4f6;
		min-height: 100vh;
		margin: 0;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		word-break: auto-phrase;
	}

	@media (max-width: 600px) {
		:global(body) {
			display: block;
			padding: 0;
		}
	}
</style>
