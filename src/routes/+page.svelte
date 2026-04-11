<script lang="ts">
	import {
		ConvertA4toA3MismatchedOrientationError,
		ConvertA4toA3NoPagesError,
		ConvertA4toA3NotA4SizeError,
		convertA4toA3,
	} from "../core";

	type PrintMode = "single" | "double-long" | "double-short";
	type StatusTone = "default" | "error" | "success";

	let selectedFile = $state<File | null>(null);
	let mode = $state<PrintMode>("single");
	let statusMessage = $state("");
	let statusTone = $state<StatusTone>("default");
	let downloadUrl = $state("");
	let downloadFilename = $state("");
	let isConverting = $state(false);

	const revokeDownloadUrl = () => {
		if (downloadUrl) {
			URL.revokeObjectURL(downloadUrl);
			downloadUrl = "";
		}
		downloadFilename = "";
	};

	const setStatus = (message: string, tone: StatusTone = "default") => {
		statusMessage = message;
		statusTone = tone;
	};

	const handleFileChange = (event: Event) => {
		const file = (event.currentTarget as HTMLInputElement).files?.[0] ?? null;
		revokeDownloadUrl();

		if (file?.type === "application/pdf") {
			selectedFile = file;
			setStatus("");
			return;
		}

		selectedFile = null;
		if (file) {
			setStatus("PDFファイルを選択してください。", "error");
		}
	};

	const readFileAsArrayBuffer = (file: File) =>
		new Promise<ArrayBuffer>((resolve, reject) => {
			const fileReader = new FileReader();
			fileReader.addEventListener("load", () => {
				if (fileReader.result instanceof ArrayBuffer) {
					resolve(fileReader.result);
					return;
				}

				reject(new Error("ファイルの読み込み結果が不正です。"));
			});
			fileReader.addEventListener("error", () => {
				reject(fileReader.error ?? new Error("ファイルの読み込みに失敗しました。"));
			});
			fileReader.readAsArrayBuffer(file);
		});

	const toArrayBuffer = (bytes: Uint8Array) => {
		const buffer = new ArrayBuffer(bytes.byteLength);
		new Uint8Array(buffer).set(bytes);
		return buffer;
	};

	const formatErrorMessage = (err: unknown) => {
		if (err instanceof ConvertA4toA3NoPagesError) {
			return "PDFにページがありません。";
		}
		if (err instanceof ConvertA4toA3NotA4SizeError) {
			return "A4サイズ以外のページが含まれています。A4サイズのみ対応しています。";
		}
		if (err instanceof ConvertA4toA3MismatchedOrientationError) {
			return "ページの向きが一致しません。すべてのページが同じ向きである必要があります。";
		}
		if (err instanceof Error) {
			return `エラーが発生しました: ${err.message}`;
		}

		return `エラーが発生しました: ${String(err)}`;
	};

	const convertPdf = async () => {
		if (!selectedFile) {
			setStatus("まずPDFファイルを選択してください。", "error");
			return;
		}

		isConverting = true;
		revokeDownloadUrl();
		setStatus("PDFを読み込んでいます...");

		try {
			const pdfBytes = await readFileAsArrayBuffer(selectedFile);
			setStatus("A4 PDFを処理中...");
			const a3PdfBytes = await convertA4toA3(pdfBytes, mode);

			setStatus("A3 PDFを作成中...");
			const blob = new Blob([toArrayBuffer(a3PdfBytes)], { type: "application/pdf" });
			const originalFilename = selectedFile.name.replace(/\.pdf$/i, "");
			downloadUrl = URL.createObjectURL(blob);
			downloadFilename = `${originalFilename}_A3_2up.pdf`;
			setStatus("変換が完了しました！", "success");
		} catch (err) {
			console.error("PDF処理エラー:", err);
			setStatus(formatErrorMessage(err), "error");
		} finally {
			isConverting = false;
		}
	};
</script>

<svelte:head>
	<title>A4toA3 - PDF変換</title>
	<meta
		name="description"
		content="A4サイズのPDFの2ページ分を、1枚のA3用紙に並べて配置した新しいPDFを作成します。"
	/>
</svelte:head>

<main class="container">
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
		<h2 class="hint-title">コンビニ印刷のヒント</h2>
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
			accept=".pdf,application/pdf"
			class="file-input"
			required
			onchange={handleFileChange}
		/>
	</div>

	<div class="form-group">
		<span class="label">印刷面:</span>
		<div class="radio-group">
			<div class="radio-item">
				<input id="print-single" name="print-setting" type="radio" value="single" bind:group={mode} />
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

	<button class="convert-btn" disabled={!selectedFile || isConverting} onclick={convertPdf}>
		{#if isConverting}
			<span class="loader" aria-hidden="true"></span>
		{/if}
		<span>{isConverting ? "変換中..." : "変換してA3 PDFを作成"}</span>
	</button>

	<div class:error={statusTone === "error"} class:success={statusTone === "success"} class="status">
		{statusMessage}
	</div>

	{#if downloadUrl}
		<div class="download-link">
			<a href={downloadUrl} download={downloadFilename} onclick={() => setTimeout(revokeDownloadUrl, 100)}>
				変換されたA3 PDFをダウンロード
			</a>
		</div>
	{/if}
</main>

<style>
	.container {
		background: #fff;
		padding: 2rem;
		border-radius: 0.75rem;
		box-shadow: 0 2px 16px rgba(0, 0, 0, 0.08);
		width: 100%;
		max-width: 32rem;
	}

	.title {
		font-size: 1.5rem;
		font-weight: bold;
		margin-bottom: 1.5rem;
		text-align: center;
		color: #1f2937;
	}

	.description {
		margin-bottom: 1.2rem;
		padding: 0.75rem 1rem;
		font-size: 0.98rem;
		text-align: center;
		color: #334155;
	}

	.privacy-note {
		display: block;
		margin-top: 0.5em;
		font-size: 0.92em;
		color: #2563eb;
		text-align: center;
	}

	.github-link-top {
		display: flex;
		justify-content: center;
		margin-bottom: 1.1rem;
	}

	.github-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5em;
		background: #f3f4f6;
		border: 1px solid #d1d5db;
		border-radius: 0.5em;
		padding: 0.35em 0.9em 0.35em 0.7em;
		color: #24292f;
		font-weight: 500;
		font-size: 0.98rem;
		text-decoration: none;
		transition:
			background 0.18s,
			border 0.18s,
			color 0.18s;
		box-shadow: 0 1px 4px rgba(30, 64, 175, 0.04);
	}

	.github-link:hover {
		background: #e0e7ef;
		border-color: #2563eb;
		color: #2563eb;
	}

	.github-icon {
		width: 20px;
		height: 20px;
		vertical-align: middle;
		margin-right: 0.2em;
	}

	.hint-box {
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: #eff6ff;
		border: 1px solid #bfdbfe;
		border-radius: 0.5rem;
		font-size: 0.95rem;
		color: #1e40af;
	}

	.hint-title {
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.form-group {
		margin-bottom: 1.25rem;
	}

	.label {
		display: block;
		font-size: 0.97rem;
		font-weight: 500;
		color: #374151;
		margin-bottom: 0.5rem;
	}

	.file-input {
		display: block;
		width: 100%;
		max-width: 100%;
		box-sizing: border-box;
		font-size: 0.97rem;
		color: #374151;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		padding: 0.5rem;
		background: #f9fafb;
		cursor: pointer;
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
	}

	.file-input:focus {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 2px #bfdbfe;
	}

	.file-input::-webkit-file-upload-button {
		margin-right: 1rem;
		padding: 0.5em 1em;
		border: none;
		border-radius: 0.375rem;
		background: #eff6ff;
		color: #2563eb;
		font-weight: 600;
		font-size: 0.97rem;
		cursor: pointer;
		transition: background 0.2s;
	}

	.file-input:hover::-webkit-file-upload-button,
	.file-input:focus::-webkit-file-upload-button {
		background: #dbeafe;
	}

	.file-input::file-selector-button {
		margin-right: 1rem;
		padding: 0.5em 1em;
		border: none;
		border-radius: 0.375rem;
		background: #eff6ff;
		color: #2563eb;
		font-weight: 600;
		font-size: 0.97rem;
		cursor: pointer;
		transition: background 0.2s;
	}

	.file-input:hover::file-selector-button,
	.file-input:focus::file-selector-button {
		background: #dbeafe;
	}

	.radio-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.radio-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.97rem;
	}

	.note {
		margin-top: 0.5rem;
		font-size: 0.85rem;
		color: #45474f;
	}

	.convert-btn {
		width: 100%;
		background: #2563eb;
		color: #fff;
		font-weight: bold;
		padding: 0.75rem 1rem;
		border: none;
		border-radius: 0.5rem;
		font-size: 1rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
		gap: 0.5rem;
	}

	.convert-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.convert-btn:not(:disabled):hover {
		background: #1d4ed8;
	}

	.loader {
		border: 4px solid #f3f3f3;
		border-top: 4px solid #3498db;
		border-radius: 50%;
		width: 24px;
		height: 24px;
		animation: spin 1s linear infinite;
		margin-right: 8px;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}

		100% {
			transform: rotate(360deg);
		}
	}

	.status {
		margin-top: 1rem;
		font-size: 0.97rem;
		text-align: center;
		min-height: 1.5em;
	}

	.status.error {
		color: #dc2626;
	}

	.status.success {
		color: #16a34a;
	}

	.download-link {
		margin-top: 1rem;
		text-align: center;
	}

	.download-link a {
		display: inline-block;
		background: #16a34a;
		color: #fff;
		font-weight: bold;
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		text-decoration: none;
		transition: background 0.2s;
	}

	.download-link a:hover {
		background: #15803d;
	}

	.table-scroll {
		width: 100%;
		overflow-x: auto;
	}

	.price-table {
		min-width: 540px;
		width: 100%;
		border-collapse: collapse;
		margin: 1rem 0 0.5rem 0;
		font-size: 0.95rem;
		background: #f8fafc;
		border-radius: 0.4rem;
		overflow: hidden;
		box-shadow: 0 1px 4px rgba(30, 64, 175, 0.04);
	}

	.price-table th,
	.price-table td {
		border: 1px solid #dbeafe;
		padding: 0.5em 0.7em;
		text-align: left;
		vertical-align: middle;
	}

	.price-table th {
		background: #e0e7ef;
		color: #1e293b;
		font-weight: 600;
	}

	.price-table tr:nth-child(even) td {
		background: #f1f5f9;
	}

	.price-table td {
		color: #334155;
		line-height: 1.5;
	}

	@media (max-width: 600px) {
		.container {
			padding: 1.2rem 0.7rem;
			border-radius: 0;
			box-shadow: none;
		}
	}
</style>
