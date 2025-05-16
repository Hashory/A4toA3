import { PDFDocument, PageSizes, degrees, type PDFPage, type Rotation } from "pdf-lib";
import { CustomError } from "ts-custom-error";

/**
 * Error thrown when the PDF contains no pages during A4 to A3 conversion.
 */
export class ConvertA4toA3NoPagesError extends CustomError {}

/**
 * Error thrown when the PDF is not A4 size during A4 to A3 conversion.
 */
export class ConvertA4toA3NotA4SizeError extends CustomError {}

/**
 * Error thrown when the PDF pages have mismatched orientations.
 */
export class ConvertA4toA3MismatchedOrientationError extends CustomError {}

/**
 * Convert an A4 PDF to an A3 (2-up) PDF
 * @param src Uint8Array | ArrayBuffer
 * @param mode "single" | "double-long" | "double-short"
 * @returns Promise<Uint8Array>
 * @throws {ConvertA4toA3NoPagesError} If the PDF contains no pages
 * @throws {ConvertA4toA3NotA4SizeError} If the PDF is not A4 size
 */
export async function convertA4toA3(
	src: Uint8Array | ArrayBuffer,
	mode: "single" | "double-long" | "double-short",
): Promise<Uint8Array> {
	const a4PdfDoc = await PDFDocument.load(src);
	const a4Pages = a4PdfDoc.getPages();
	const pageCount = a4Pages.length;

	// **Check** if the PDF contains no pages
	if (pageCount === 0) {
		throw new ConvertA4toA3NoPagesError("The PDF contains no pages.");
	}

	// **Check** if all pages are A4 size and have the same orientation
	const [A4_WIDTH, A4_HEIGHT] = PageSizes.A4;
	const TOLERANCE = 2; // points, to allow for rounding errors
	let firstPageIsPortrait: boolean | undefined = undefined;

	for (const page of a4Pages) {
		const { width, height } = page.getSize();
		const isA4Portrait =
			Math.abs(width - A4_WIDTH) < TOLERANCE &&
			Math.abs(height - A4_HEIGHT) < TOLERANCE;
		const isA4Landscape =
			Math.abs(width - A4_HEIGHT) < TOLERANCE &&
			Math.abs(height - A4_WIDTH) < TOLERANCE;

		if (!isA4Portrait && !isA4Landscape) {
			throw new ConvertA4toA3NotA4SizeError("The PDF is not A4 size.");
		}

		const currentPageIsPortrait = height > width;
		if (firstPageIsPortrait === undefined) {
			firstPageIsPortrait = currentPageIsPortrait;
		} else if (firstPageIsPortrait !== currentPageIsPortrait) {
			throw new ConvertA4toA3MismatchedOrientationError(
				"All pages in the PDF must have the same orientation (all portrait or all landscape).",
			);
		}
	}

	// **Create** a new PDF document for A3
	const a3PdfDoc = await PDFDocument.create();

	const [A3_WIDTH, A3_HEIGHT] = PageSizes.A3;

	// Helper function to draw A4 pages on A3 pages
	const draw = async (
		a3Page: PDFPage,
		a4Page: PDFPage,
		pos: "left" | "right",
		rot180: "rot180" | undefined = undefined,
	) => {
		const embedded = await a3PdfDoc.embedPage(a4Page);
		const dims = embedded.scale(1.0);

		const isPortrait = firstPageIsPortrait ?? true;
		const a3Width = isPortrait ? A3_HEIGHT : A3_WIDTH;
		const a3Height = isPortrait ? A3_WIDTH : A3_HEIGHT;

		let x: number, y: number, rotate: Rotation | undefined;

		if (isPortrait) {
			// A4 Portrait -> A3 Landscape
			if (rot180) {
				x = pos === "left" ? a3Width - dims.width : a3Width;
				y = a3Height;
				rotate = degrees(180);
			} else {
				x = pos === "left" ? 0 : a3Width - dims.width;
				y = 0;
				rotate = undefined;
			}
		} else {
			// A4 Landscape -> A3 Portrait
			if (rot180) {
				x = a3Width;
				y = pos === "left" ? a3Height - dims.height : 0;
				rotate = degrees(180);
			} else {
				x = 0;
				y = pos === "left" ? 0 : a3Height - dims.height;
				rotate = undefined;
			}
		}

		a3Page.drawPage(embedded, { ...dims, x, y, rotate });
	};

	const isPortrait = firstPageIsPortrait ?? true;
	const a3PageSize: [number, number] = isPortrait
		? [A3_HEIGHT, A3_WIDTH] // A3 Landscape
		: [A3_WIDTH, A3_HEIGHT]; // A3 Portrait

	switch (mode) {
		case "single":
			// Single mode: A4 pages are placed on A3 pages
			for (let i = 0; i < pageCount; i += 2) {
				const a3 = a3PdfDoc.addPage(a3PageSize);
				await draw(a3, a4Pages[i], "left");
				if (i + 1 < pageCount) await draw(a3, a4Pages[i + 1], "right");
			}
			break;
		case "double-long":
			// double-long mode:
			// When printing double-sided and cutting an A3 sheet in two, align the long edge.
			for (let i = 0; i < pageCount; i += 4) {
				const front = a3PdfDoc.addPage(a3PageSize);
				await draw(front, a4Pages[i], "left"); // p1
				if (i + 2 < pageCount) await draw(front, a4Pages[i + 2], "right"); // p3

				if (i + 1 < pageCount) {
					const back = a3PdfDoc.addPage(a3PageSize);
					await draw(back, a4Pages[i + 1], "left"); // p2
					if (i + 3 < pageCount) await draw(back, a4Pages[i + 3], "right"); // p4
				}
			}
			break;
		case "double-short":
			// double-short mode:
			// When printing double-sided and cutting an A3 sheet in two, align the short edge.
			for (let i = 0; i < pageCount; i += 4) {
				const front = a3PdfDoc.addPage(a3PageSize);
				await draw(front, a4Pages[i], "left"); // p1
				if (i + 2 < pageCount) await draw(front, a4Pages[i + 2], "right"); // p3

				if (i + 1 < pageCount) {
					const back = a3PdfDoc.addPage(a3PageSize);
					await draw(back, a4Pages[i + 1], "left", "rot180"); // p2
					if (i + 3 < pageCount)
						await draw(back, a4Pages[i + 3], "right", "rot180"); // p4
				}
			}
			break;
	}

	return await a3PdfDoc.save();
}
