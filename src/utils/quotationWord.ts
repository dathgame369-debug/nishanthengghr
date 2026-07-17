import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  BorderStyle,
  AlignmentType,
  HeadingLevel,
  ShadingType,
  VerticalAlign,
  convertInchesToTwip,
  PageOrientation,
} from "docx";
import { saveAs } from "file-saver";
import { Quotation, QuotationItem } from "@/types/quotation";
import { getCompanyInfo } from "@/utils/companySettings";

function money(n: number): string {
  return (n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Twips helper: 1 inch = 1440 twips
const PT = (pt: number) => pt * 20; // points to half-points (twips for font)

function border(style: BorderStyle = BorderStyle.SINGLE, size = 6, color = "999999") {
  return { style, size, color };
}

function noBorder() {
  return { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
}

function cell(
  text: string,
  opts: {
    bold?: boolean;
    fontSize?: number;
    alignment?: AlignmentType;
    shading?: boolean;
    borders?: "all" | "none" | "header";
    width?: number; // percent
    color?: string;
    verticalAlign?: VerticalAlign;
    italic?: boolean;
  } = {}
): TableCell {
  const {
    bold = false,
    fontSize = 20, // half-points (10pt)
    alignment = AlignmentType.LEFT,
    shading = false,
    borders = "all",
    width,
    color,
    verticalAlign = VerticalAlign.TOP,
    italic = false,
  } = opts;

  const bAll = border();
  const bNone = noBorder();

  const borderConfig =
    borders === "none"
      ? { top: bNone, bottom: bNone, left: bNone, right: bNone }
      : borders === "header"
      ? { top: bAll, bottom: bAll, left: bAll, right: bAll }
      : { top: bAll, bottom: bAll, left: bAll, right: bAll };

  const lines = text.split("\n");

  return new TableCell({
    children: lines.map(
      (line, i) =>
        new Paragraph({
          alignment,
          spacing: { before: i === 0 ? 40 : 0, after: 0 },
          children: [
            new TextRun({
              text: line,
              bold,
              size: fontSize,
              color: color || (shading ? "FFFFFF" : "000000"),
              italics: italic,
              font: "Times New Roman",
            }),
          ],
        })
    ),
    borders: borderConfig,
    shading: shading
      ? { type: ShadingType.SOLID, color: "14285A", fill: "14285A" }
      : undefined,
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    verticalAlign,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
  });
}

export async function generateQuotationWord(q: Quotation, items: QuotationItem[]) {
  const company = getCompanyInfo();

  // ── Header paragraph (company name) ──────────────────────────────────────
  const headerPara = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 },
    children: [
      new TextRun({
        text: (company.name || "").toUpperCase(),
        bold: true,
        size: 52, // 26pt
        font: "Times New Roman",
        color: "14285A",
      }),
    ],
  });

  const taglinePara = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 20 },
    children: [
      new TextRun({
        text: "MFRS OF : ALL KINDS OF WOODEN AND ALUMINUM PATTERNS",
        bold: false,
        italics: true,
        size: 18,
        font: "Times New Roman",
        color: "555555",
      }),
    ],
  });

  const addressPara = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 20 },
    children: [
      new TextRun({
        text: company.address || "",
        size: 18,
        font: "Times New Roman",
        color: "333333",
      }),
    ],
  });

  const phonePara = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
    children: [
      new TextRun({
        text: company.phone || "",
        size: 18,
        font: "Times New Roman",
        color: "333333",
      }),
    ],
  });

  // ── QUOTATION banner ──────────────────────────────────────────────────────
  const bannerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 60, after: 60 },
                children: [
                  new TextRun({
                    text: "QUOTATION",
                    bold: true,
                    size: 32,
                    color: "FFFFFF",
                    font: "Times New Roman",
                  }),
                ],
              }),
            ],
            shading: { type: ShadingType.SOLID, color: "14285A", fill: "14285A" },
            borders: {
              top: border(BorderStyle.SINGLE, 6, "14285A"),
              bottom: border(BorderStyle.SINGLE, 6, "14285A"),
              left: border(BorderStyle.SINGLE, 6, "14285A"),
              right: border(BorderStyle.SINGLE, 6, "14285A"),
            },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
          }),
        ],
      }),
    ],
  });

  const spacer = new Paragraph({ spacing: { after: 120 }, children: [] });
  const smallSpacer = new Paragraph({ spacing: { after: 60 }, children: [] });

  // ── Meta + To block (two-column table) ───────────────────────────────────
  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          // Left: TO block
          new TableCell({
            children: [
              new Paragraph({
                spacing: { after: 20 },
                children: [new TextRun({ text: "To,", bold: true, size: 20, font: "Times New Roman", color: "666666" })],
              }),
              new Paragraph({
                spacing: { after: 20 },
                children: [new TextRun({ text: `${q.customerName}`, bold: true, size: 22, font: "Times New Roman" })],
              }),
              new Paragraph({
                spacing: { after: 20 },
                children: [new TextRun({ text: q.customerAddress || "", size: 20, font: "Times New Roman" })],
              }),
              ...(q.customerGst
                ? [
                    new Paragraph({
                      spacing: { after: 0 },
                      children: [
                        new TextRun({ text: `GSTIN: ${q.customerGst}`, bold: true, size: 20, font: "Times New Roman" }),
                      ],
                    }),
                  ]
                : []),
            ],
            borders: {
              top: border(), bottom: border(), left: border(), right: border(),
            },
            width: { size: 62, type: WidthType.PERCENTAGE },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
          }),
          // Right: meta rows
          new TableCell({
            children: [
              new Paragraph({
                spacing: { after: 0 },
                children: [
                  new TextRun({ text: `Quote No.: ${q.quotationNumber}`, size: 20, font: "Times New Roman" }),
                ],
              }),
              new Paragraph({
                spacing: { after: 0 },
                children: [
                  new TextRun({ text: `Date: ${q.quotationDate}`, size: 20, font: "Times New Roman" }),
                ],
              }),
              new Paragraph({
                spacing: { after: 0 },
                children: [
                  new TextRun({ text: `Your Ref: ${q.yourRef || "-"}`, size: 20, font: "Times New Roman" }),
                ],
              }),
              new Paragraph({
                spacing: { after: 0 },
                children: [
                  new TextRun({ text: `Due On: ${q.dueOn || "-"}`, size: 20, font: "Times New Roman" }),
                ],
              }),
            ],
            borders: {
              top: border(), bottom: border(), left: border(), right: border(),
            },
            width: { size: 38, type: WidthType.PERCENTAGE },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
          }),
        ],
      }),
    ],
  });

  // ── Items table ───────────────────────────────────────────────────────────
  const headerRow = new TableRow({
    children: [
      cell("Sl. No.", { bold: true, shading: true, alignment: AlignmentType.CENTER, fontSize: 20, width: 7, color: "FFFFFF" }),
      cell("Description", { bold: true, shading: true, alignment: AlignmentType.CENTER, fontSize: 20, color: "FFFFFF" }),
      cell("Qty", { bold: true, shading: true, alignment: AlignmentType.CENTER, fontSize: 20, width: 10, color: "FFFFFF" }),
      cell("Rate Per", { bold: true, shading: true, alignment: AlignmentType.CENTER, fontSize: 20, width: 15, color: "FFFFFF" }),
      cell("Amount", { bold: true, shading: true, alignment: AlignmentType.RIGHT, fontSize: 20, width: 15, color: "FFFFFF" }),
    ],
  });

  const itemRows = items.map(
    (it) =>
      new TableRow({
        children: [
          cell(String(it.slNo), { alignment: AlignmentType.CENTER, fontSize: 20, width: 7 }),
          cell(it.description || "", { alignment: AlignmentType.LEFT, fontSize: 20 }),
          cell(it.qty || "", { alignment: AlignmentType.CENTER, fontSize: 20, width: 10 }),
          cell(it.rate ? money(it.rate) : "", { alignment: AlignmentType.RIGHT, fontSize: 20, width: 15 }),
          cell(it.amount ? money(it.amount) : "", { alignment: AlignmentType.RIGHT, fontSize: 20, width: 15 }),
        ],
      })
  );

  // Add a few blank rows for a more "Word-like" feel (like in the reference image)
  const blankRows = Array.from({ length: Math.max(0, 5 - items.length) }, () =>
    new TableRow({
      height: { value: convertInchesToTwip(0.35), rule: "atLeast" },
      children: [
        cell("", { fontSize: 20, width: 7 }),
        cell("", { fontSize: 20 }),
        cell("", { fontSize: 20, width: 10 }),
        cell("", { fontSize: 20, width: 15 }),
        cell("", { fontSize: 20, width: 15 }),
      ],
    })
  );

  const itemsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...itemRows, ...blankRows],
  });

  // ── Terms ─────────────────────────────────────────────────────────────────
  const termsPara = new Paragraph({
    spacing: { before: 240, after: 40 },
    children: [
      new TextRun({ text: "Terms : ", bold: true, size: 20, font: "Times New Roman" }),
    ],
  });

  const termsLines = (q.terms || "").split("\n").map(
    (line) =>
      new Paragraph({
        spacing: { after: 20 },
        children: [new TextRun({ text: line, size: 20, font: "Times New Roman" })],
      })
  );

  // ── Signature ─────────────────────────────────────────────────────────────
  const sigTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [] })],
            borders: { top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder() },
            width: { size: 60, type: WidthType.PERCENTAGE },
          }),
          new TableCell({
            children: [
              new Paragraph({
                spacing: { after: 400 },
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: `For ${company.name || ""}`, bold: true, size: 20, font: "Times New Roman" }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: "Authorised Signatory", size: 18, color: "666666", font: "Times New Roman" })],
              }),
            ],
            borders: { top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder() },
            width: { size: 40, type: WidthType.PERCENTAGE },
            margins: { top: 80, bottom: 80, left: 0, right: 0 },
          }),
        ],
      }),
    ],
  });

  // ── Assemble document ─────────────────────────────────────────────────────
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.7),
              bottom: convertInchesToTwip(0.7),
              left: convertInchesToTwip(0.9),
              right: convertInchesToTwip(0.9),
            },
          },
        },
        children: [
          headerPara,
          taglinePara,
          addressPara,
          phonePara,
          bannerTable,
          spacer,
          metaTable,
          smallSpacer,
          itemsTable,
          termsPara,
          ...termsLines,
          spacer,
          sigTable,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `Quotation_${q.quotationNumber.replace(/[\/\\]/g, "_")}.docx`;
  saveAs(blob, filename);
}
