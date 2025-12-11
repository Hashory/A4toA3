import { PageSizes, PDFDocument } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";
import {
	ConvertA4toA3MismatchedOrientationError,
	ConvertA4toA3NoPagesError,
	ConvertA4toA3NotA4SizeError,
	convertA4toA3,
} from "./core";

async function createDummyPdf(
	pageCount: number,
	width: number,
	height: number,
): Promise<Uint8Array> {
	const pdfDoc = await PDFDocument.create();
	for (let i = 0; i < pageCount; i++) {
		const page = pdfDoc.addPage([width, height]);
		page.drawText("Test", { x: 50, y: 50, size: 12 });
	}
	return await pdfDoc.save();
}

describe("convertA4toA3", () => {
	it("should throw ConvertA4toA3NoPagesError if the PDF has no pages", async () => {
		// Mock PDFDocument.load to return a document with 0 pages
		// We can't easily create a 0-page PDF with pdf-lib as it ensures at least 1 page on save/load
		const mockDoc = {
			getPages: () => [],
		} as unknown as PDFDocument;

		const loadSpy = vi.spyOn(PDFDocument, "load").mockResolvedValue(mockDoc);

		const pdfBytes = new Uint8Array([]);
		await expect(convertA4toA3(pdfBytes, "single")).rejects.toThrow(
			ConvertA4toA3NoPagesError,
		);

		loadSpy.mockRestore();
	});

	it("should throw ConvertA4toA3NotA4SizeError if the PDF is not A4 size", async () => {
		const pdfBytes = await createDummyPdf(1, PageSizes.A3[0], PageSizes.A3[1]);
		await expect(convertA4toA3(pdfBytes, "single")).rejects.toThrow(
			ConvertA4toA3NotA4SizeError,
		);
	});

	it("should throw ConvertA4toA3MismatchedOrientationError if pages have different orientations", async () => {
		const pdfDoc = await PDFDocument.create();
		pdfDoc.addPage(PageSizes.A4); // Portrait
		pdfDoc.addPage([PageSizes.A4[1], PageSizes.A4[0]]); // Landscape
		const pdfBytes = await pdfDoc.save();

		await expect(convertA4toA3(pdfBytes, "single")).rejects.toThrow(
			ConvertA4toA3MismatchedOrientationError,
		);
	});

	describe("Mode: single", () => {
		it("should convert A4 portrait pages to A3 landscape pages correctly", async () => {
			const pdfBytes = await createDummyPdf(
				2,
				PageSizes.A4[0],
				PageSizes.A4[1],
			);
			const resultBytes = await convertA4toA3(pdfBytes, "single");
			const resultPdf = await PDFDocument.load(resultBytes);
			const pages = resultPdf.getPages();

			expect(pages.length).toBe(1);
			const { width, height } = pages[0].getSize();
			// A4 Portrait (w, h) -> A3 Landscape (2w, h) approx?
			// Logic: A4 Portrait -> A3 Landscape. A3 Landscape width = A3_HEIGHT, height = A3_WIDTH
			// PageSizes.A3 is [841.89, 1190.55] (Portrait)
			// A3 Landscape should be [1190.55, 841.89]

			expect(width).toBeCloseTo(PageSizes.A3[1]);
			expect(height).toBeCloseTo(PageSizes.A3[0]);
		});

		it("should convert A4 landscape pages to A3 portrait pages correctly", async () => {
			const pdfBytes = await createDummyPdf(
				2,
				PageSizes.A4[1],
				PageSizes.A4[0],
			);
			const resultBytes = await convertA4toA3(pdfBytes, "single");
			const resultPdf = await PDFDocument.load(resultBytes);
			const pages = resultPdf.getPages();

			expect(pages.length).toBe(1);
			const { width, height } = pages[0].getSize();
			// A4 Landscape -> A3 Portrait. A3 Portrait width = A3_WIDTH, height = A3_HEIGHT
			expect(width).toBeCloseTo(PageSizes.A3[0]);
			expect(height).toBeCloseTo(PageSizes.A3[1]);
		});

		it("should handle odd number of pages correctly in single mode", async () => {
			const pdfBytes = await createDummyPdf(
				3,
				PageSizes.A4[0],
				PageSizes.A4[1],
			);
			const resultBytes = await convertA4toA3(pdfBytes, "single");
			const resultPdf = await PDFDocument.load(resultBytes);
			const pages = resultPdf.getPages();

			expect(pages.length).toBe(2);
		});
	});

	describe("Mode: double-long", () => {
		it("should process double-long mode correctly (Portrait)", async () => {
			// 4 pages -> 1 sheet (front and back) -> 2 A3 pages
			const pdfBytes = await createDummyPdf(
				4,
				PageSizes.A4[0],
				PageSizes.A4[1],
			);
			const resultBytes = await convertA4toA3(pdfBytes, "double-long");
			const resultPdf = await PDFDocument.load(resultBytes);
			const pages = resultPdf.getPages();

			expect(pages.length).toBe(2);
		});

		it("should process double-long mode correctly (Landscape)", async () => {
			const pdfBytes = await createDummyPdf(
				4,
				PageSizes.A4[1],
				PageSizes.A4[0],
			);
			const resultBytes = await convertA4toA3(pdfBytes, "double-long");
			const resultPdf = await PDFDocument.load(resultBytes);
			const pages = resultPdf.getPages();

			expect(pages.length).toBe(2);
		});
	});

	describe("Mode: double-short", () => {
		it("should process double-short mode correctly (Portrait)", async () => {
			const pdfBytes = await createDummyPdf(
				4,
				PageSizes.A4[0],
				PageSizes.A4[1],
			);
			const resultBytes = await convertA4toA3(pdfBytes, "double-short");
			const resultPdf = await PDFDocument.load(resultBytes);
			const pages = resultPdf.getPages();

			expect(pages.length).toBe(2);
		});

		it("should process double-short mode correctly (Landscape)", async () => {
			const pdfBytes = await createDummyPdf(
				4,
				PageSizes.A4[1],
				PageSizes.A4[0],
			);
			const resultBytes = await convertA4toA3(pdfBytes, "double-short");
			const resultPdf = await PDFDocument.load(resultBytes);
			const pages = resultPdf.getPages();

			expect(pages.length).toBe(2);
		});
	});
});
