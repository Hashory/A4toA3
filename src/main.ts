import {
	convertA4toA3,
	ConvertA4toA3NoPagesError,
	ConvertA4toA3NotA4SizeError,
	ConvertA4toA3MismatchedOrientationError,
} from "./core";

const pdfFileInput = document.getElementById("pdfFile") as HTMLInputElement;
const convertButton = document.getElementById(
	"convertButton",
) as HTMLButtonElement;
const statusDiv = document.getElementById("status") as HTMLDivElement;
const downloadLinkContainer = document.getElementById(
	"downloadLinkContainer",
) as HTMLDivElement;
const loader = document.getElementById("loader") as HTMLDivElement;
const buttonText = document.getElementById("buttonText") as HTMLSpanElement;

let selectedFile: File | null = null;

pdfFileInput.addEventListener("change", (event) => {
	const file = (event.target as HTMLInputElement).files?.[0] ?? null;
	selectedFile = file;
	if (selectedFile && selectedFile.type === "application/pdf") {
		convertButton.disabled = false;
		statusDiv.textContent = "";
		statusDiv.className = "status";
		downloadLinkContainer.innerHTML = "";
	} else {
		convertButton.disabled = true;
		selectedFile = null;
		statusDiv.textContent = "PDFファイルを選択してください。";
		statusDiv.className = "status text-red-600";
		downloadLinkContainer.innerHTML = "";
	}
});

convertButton.addEventListener("click", async () => {
	if (!selectedFile) {
		statusDiv.textContent = "まずPDFファイルを選択してください。";
		statusDiv.className = "status text-red-600";
		return;
	}

	convertButton.disabled = true;
	loader.style.display = "block";
	buttonText.textContent = "変換中...";
	statusDiv.textContent = "PDFを読み込んでいます...";
	statusDiv.className = "status";
	downloadLinkContainer.innerHTML = "";

	try {
		const fileReader = new FileReader();
		fileReader.readAsArrayBuffer(selectedFile);

		fileReader.onload = async (event) => {
			const pdfBytes = (event.target as FileReader).result as ArrayBuffer;

			try {
				statusDiv.textContent = "A4 PDFを処理中...";

				// 印刷モード取得
				const modeRadio = document.querySelector<HTMLInputElement>(
					'input[name="print-setting"]:checked',
				);
				const mode = (modeRadio?.value ?? "single") as
					| "single"
					| "double-long"
					| "double-short";

				statusDiv.textContent = "A3 PDFを作成中...";
				const a3PdfBytes = await convertA4toA3(pdfBytes, mode);

				const blob = new Blob([a3PdfBytes], { type: "application/pdf" });
				const url = URL.createObjectURL(blob);
				const link = document.createElement("a");
				link.href = url;
				const originalFilename =
					selectedFile?.name.replace(/\.pdf$/i, "") ?? "unknown";
				link.download = `${originalFilename}_A3_2up.pdf`;
				link.textContent = "変換されたA3 PDFをダウンロード";
				link.className = "";
				downloadLinkContainer.innerHTML = "";
				downloadLinkContainer.appendChild(link);

				statusDiv.textContent = "変換が完了しました！";
				statusDiv.className = "status text-green-600";

				link.addEventListener("click", () => {
					setTimeout(() => URL.revokeObjectURL(url), 100);
				});
			} catch (err: unknown) {
				console.error("PDF処理エラー:", err);
				if (err instanceof ConvertA4toA3NoPagesError) {
					statusDiv.textContent = "PDFにページがありません。";
				} else if (err instanceof ConvertA4toA3NotA4SizeError) {
					statusDiv.textContent =
						"A4サイズ以外のページが含まれています。A4サイズのみ対応しています。";
				} else if (err instanceof ConvertA4toA3MismatchedOrientationError) {
					statusDiv.textContent =
						"ページの向きが一致しません。すべてのページが同じ向きである必要があります。";
				} else {
					statusDiv.textContent =
						"エラーが発生しました: " +
						(typeof err === "object" && err !== null && "message" in err
							? (err as { message?: string }).message
							: String(err));
				}
				statusDiv.className = "status text-red-600";
			} finally {
				convertButton.disabled = false;
				loader.style.display = "none";
				buttonText.textContent = "変換してA3 PDFを作成";
			}
		};

		fileReader.onerror = (err) => {
			console.error("ファイル読み込みエラー:", err);
			statusDiv.textContent = "ファイルの読み込み中にエラーが発生しました。";
			statusDiv.className = "status text-red-600";
			convertButton.disabled = false;
			loader.style.display = "none";
			buttonText.textContent = "変換してA3 PDFを作成";
		};
	} catch (err: unknown) {
		console.error("予期せぬエラー:", err);
		statusDiv.textContent =
			"予期せぬエラーが発生しました: " +
			(typeof err === "object" && err !== null && "message" in err
				? (err as { message?: string }).message
				: String(err));
		statusDiv.className = "status text-red-600";
		convertButton.disabled = false;
		loader.style.display = "none";
		buttonText.textContent = "変換してA3 PDFを作成";
	}
});
