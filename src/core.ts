import { PDFDocument, PageSizes, degrees, type PDFPage } from "pdf-lib";
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

	// **Check** if all pages are A4 size
	const [A4_WIDTH, A4_HEIGHT] = PageSizes.A4;
	const TOLERANCE = 2; // points, to allow for rounding errors

	for (const page of a4Pages) {
		const { width, height } = page.getSize();
		const isA4 =
			(Math.abs(width - A4_WIDTH) < TOLERANCE &&
				Math.abs(height - A4_HEIGHT) < TOLERANCE) ||
			(Math.abs(width - A4_HEIGHT) < TOLERANCE &&
				Math.abs(height - A4_WIDTH) < TOLERANCE);
		if (!isA4) {
			throw new ConvertA4toA3NotA4SizeError("The PDF is not A4 size.");
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

		let x = pos === "left" ? 0 : A3_HEIGHT - dims.width;
		let y = 0;
		let rotate = undefined;

		if (rot180 !== undefined) {
			x = pos === "left" ? A3_HEIGHT - dims.width : A3_HEIGHT;
			y = A3_WIDTH;
			rotate = degrees(180);
		}

		a3Page.drawPage(embedded, { ...dims, x, y, rotate });
	};

	switch (mode) {
		case "single":
			// Single mode: A4 pages are placed on A3 pages
			for (let i = 0; i < pageCount; i += 2) {
				const a3 = a3PdfDoc.addPage([A3_HEIGHT, A3_WIDTH]);
				await draw(a3, a4Pages[i], "left");
				if (i + 1 < pageCount) await draw(a3, a4Pages[i + 1], "right");
			}
			break;
		case "double-long":
			// double-long mode:
			// When printing double-sided and cutting an A3 sheet in two, align the long edge.
			for (let i = 0; i < pageCount; i += 4) {
				const front = a3PdfDoc.addPage([A3_HEIGHT, A3_WIDTH]);
				await draw(front, a4Pages[i], "left");

				if (i + 1 < pageCount) {
					const back = a3PdfDoc.addPage([A3_HEIGHT, A3_WIDTH]);
					await draw(back, a4Pages[i + 1], "left");
					if (i + 2 < pageCount) await draw(front, a4Pages[i + 2], "right");
					if (i + 3 < pageCount) await draw(back, a4Pages[i + 3], "right");
				}
			}
			break;
		case "double-short":
			// double-short mode:
			// When printing double-sided and cutting an A3 sheet in two, align the short edge.
			for (let i = 0; i < pageCount; i += 4) {
				const front = a3PdfDoc.addPage([A3_HEIGHT, A3_WIDTH]);
				await draw(front, a4Pages[i], "left");

				if (i + 1 < pageCount) {
					const back = a3PdfDoc.addPage([A3_HEIGHT, A3_WIDTH]);
					await draw(back, a4Pages[i + 1], "left", "rot180");
					if (i + 2 < pageCount) await draw(front, a4Pages[i + 2], "right");
					if (i + 3 < pageCount)
						await draw(back, a4Pages[i + 3], "right", "rot180");
				}
			}
			break;
	}

	return await a3PdfDoc.save();
}
