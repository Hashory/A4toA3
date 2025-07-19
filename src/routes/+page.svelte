<script lang="ts">
	import {
		ConvertA4toA3MismatchedOrientationError,
		ConvertA4toA3NoPagesError,
		ConvertA4toA3NotA4SizeError,
		convertA4toA3,
	} from '$lib/core';

	let selectedFile: File | null = null;
	let status = '';
	let statusClass = 'status';
	let downloadUrl: string | null = null;
	let downloadFilename = '';
	let converting = false;
	let mode: 'single' | 'double-long' | 'double-short' = 'single';

	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0] ?? null;
		selectedFile = file;
		if (selectedFile && selectedFile.type === 'application/pdf') {
			status = '';
			statusClass = 'status';
			downloadUrl = null;
		} else {
			selectedFile = null;
			status = 'PDFファイルを選択してください。';
			statusClass = 'status text-red-600';
			downloadUrl = null;
		}
	}

	async function handleConvert() {
		if (!selectedFile) {
			status = 'まずPDFファイルを選択してください。';
			statusClass = 'status text-red-600';
			return;
		}

		converting = true;
		status = 'PDFを読み込んでいます...';
		statusClass = 'status';
		downloadUrl = null;

		try {
			const pdfBytes = await selectedFile.arrayBuffer();

			status = 'A4 PDFを処理中...';
			const a3PdfBytes = await convertA4toA3(pdfBytes, mode);

			const blob = new Blob([a3PdfBytes], { type: 'application/pdf' });
			const url = URL.createObjectURL(blob);
			downloadUrl = url;
			downloadFilename = `${selectedFile.name.replace(/\.pdf$/i, '')}_A3_2up.pdf`;
			status = '変換が完了しました！';
			statusClass = 'status text-green-600';
		} catch (err: unknown) {
			console.error('PDF処理エラー:', err);
			if (err instanceof ConvertA4toA3NoPagesError) {
				status = 'PDFにページがありません。';
			} else if (err instanceof ConvertA4toA3NotA4SizeError) {
				status = 'A4サイズ以外のページが含まれています。A4サイズのみ対応しています。';
			} else if (err instanceof ConvertA4toA3MismatchedOrientationError) {
				status = 'ページの向きが一致しません。すべてのページが同じ向きである必要があります。';
			} else {
				status =
					'エラーが発生しました: ' +
					(typeof err === 'object' && err !== null && 'message' in err
						? (err as { message?: string }).message
						: String(err));
			}
			statusClass = 'status text-red-600';
		} finally {
			converting = false;
		}
	}
</script>

<svelte:head>
	<title>A4toA3 - PDF変換</title>
	<meta
		name="google-site-verification"
		content="ZLatOGFlJDcAyP3LJeRpdapIxF1pQCS4sCcUkhjKWbs"
	/>
	<meta name="msvalidate.01" content="E22C1602D7393293AD1E6C1FBF381229" />
</svelte:head>

<div class="container">
	<h1 class="title">A4 to A3</h1>
	<p class="description">
		このツールは、A4サイズのPDFの2ページ分を、1枚のA3用紙に並べて配置した新しいPDFを作成します。
		<br />
		<span class="privacy-note"
			>※PDFファイルは外部サーバー等に送信されず、このブラウザ内だけで処理されます。</span
		>
	</p>
	<div class="github-link-top">
		<a
			href="https://github.com/Hashory/A4toA3"
			target="_blank"
			rel="noopener noreferrer"
			class="github-link"
		>
			<img
				src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
				alt="GitHub"
				class="github-icon"
			/>
			<span>GitHubでソースを見る</span>
		</a>
	</div>
	<div class="hint-box">
		<h2 class="hint-title">💡 コンビニ印刷のヒント</h2>
		<p>A3サイズは、A4サイズを2枚並べたサイズです。</p>
		<p>
			コンビニのマルチコピー機では、A4用紙2枚を印刷するよりも、A3用紙1枚を印刷する方が料金が安くなる場合が多いです。
			<br />
			※2025年4月現在
		</p>
		<div class="table-scroll">
			<table class="price-table">
				<thead>
					<tr>
						<th>店舗</th>
						<th>A3片面</th>
						<th>A4片面</th>
						<th>A3両面</th>
						<th>A4両面</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>セブン‐イレブン</td>
						<td>10円</td>
						<td>10円</td>
						<td>20円</td>
						<td>20円</td>
					</tr>
					<tr>
						<td>ローソン</td>
						<td>10円</td>
						<td>10円</td>
						<td>20円</td>
						<td>20円</td>
					</tr>
					<tr>
						<td>ファミリーマート</td>
						<td>10円</td>
						<td>10円</td>
						<td>20円</td>
						<td>20円</td>
					</tr>
					<tr>
						<td>ミニストップ</td>
						<td>10円</td>
						<td>5円</td>
						<td>20円</td>
						<td>10円</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>

	<div class="form-group">
		<label for="pdfFile" class="label">A4 PDFファイルを選択:</label>
		<input
			type="file"
			id="pdfFile"
			accept=".pdf"
			class="file-input"
			required
			on:change={handleFileChange}
		/>
	</div>

	<div class="form-group">
		<label class="label">印刷面:</label>
		<div class="radio-group">
			<div class="radio-item">
				<input
					id="print-single"
					name="print-setting"
					type="radio"
					value="single"
					bind:group={mode}
				/>
				<label for="print-single">片面印刷</label>
			</div>
			<div class="radio-item">
				<input
					id="print-double-long"
					name="print-setting"
					type="radio"
					value="double-long"
					bind:group={mode}
				/>
				<label for="print-double-long">両面印刷（A4 長辺とじ）</label>
			</div>
			<div class="radio-item">
				<input
					id="print-double-short"
					name="print-setting"
					type="radio"
					value="double-short"
					bind:group={mode}
				/>
				<label for="print-double-short">両面印刷（A4 短辺とじ）</label>
			</div>
		</div>
		<p class="note">
			*両面印刷を選択した場合は、A3用紙の印刷時に「両面印刷 長辺とじ」を選択してください。
		</p>
	</div>

	<button class="convert-btn" disabled={!selectedFile || converting} on:click={handleConvert}>
		{#if converting}
			<div class="loader"></div>
			<span>変換中...</span>
		{:else}
			<span>変換してA3 PDFを作成</span>
		{/if}
	</button>

	<div class="status {statusClass}">{status}</div>
	{#if downloadUrl}
		<div class="download-link">
			<a href={downloadUrl} download={downloadFilename}>変換されたA3 PDFをダウンロード</a>
		</div>
	{/if}
</div>
