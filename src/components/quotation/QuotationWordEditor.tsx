/**
 * QuotationWordEditor
 *
 * Renders the quotation as one or more A4-sized "pages" inside the editor.
 * The header (company info, customer, meta) is displayed read-only and sourced
 * from the parent form state. The items table is fully free-text — Sl.No,
 * Description, Qty, Rate Per, Amount are all plain text with no calculations.
 *
 * Page overflow is detected by estimating row heights from the description text
 * and the actual measured header height, then splitting items across pages.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Quotation, QuotationItem } from "@/types/quotation";
import { getCompanyInfo } from "@/utils/companySettings";

/* ─────────────────────────────────────────────────────────────────────────────
   A4 at 96 DPI  =  794 × 1123 px    (210mm × 297mm)
   ───────────────────────────────────────────────────────────────────────────── */
const A4_W = 794;
const A4_H = 1123;
const MX   = 56;   // horizontal margin, each side  (≈ 15 mm)
const MY   = 52;   // vertical margin, each side    (≈ 14 mm)

// Inner content dimensions
const CONTENT_W = A4_W - MX * 2;   // 682 px

// Table column widths (px)
const COL_SL   = 40;
const COL_QTY  = 64;
const COL_RATE = 92;
const COL_AMT  = 92;
const COL_DESC = CONTENT_W - COL_SL - COL_QTY - COL_RATE - COL_AMT; // 394 px

// Column-header row height (px)
const COL_HDR_H = 30;

// Default estimate for page-1 header (company + customer) height.
// Will be replaced by the actual measured value after first render.
const HEADER_H_DEFAULT = 300;

// Approximate chars per line in the description column
// Times New Roman 12pt ≈ 7.0 px/char
const CHARS_PER_LINE = Math.floor(COL_DESC / 7.0); // ≈ 56

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface Props {
  form: Quotation;
  items: QuotationItem[];
  onChange: (items: QuotationItem[]) => void;
}

type TextMap = Record<string, string>;

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function newItem(slNo: number, quotationId: string): QuotationItem {
  return {
    id: crypto.randomUUID(),
    quotationId,
    slNo,
    description: "",
    qty: "",
    rate: 0,
    amount: 0,
    subLines: [],
  };
}

/**
 * Estimate the rendered pixel height of a table row based on its description.
 * Used to pre-calculate page breaks before DOM measurement.
 */
function estimateRowH(desc: string): number {
  if (!desc.trim()) return 30; // empty row
  const paragraphs = desc.split("\n");
  const totalLines = paragraphs.reduce((acc, para) => {
    return acc + Math.max(1, Math.ceil((para.length || 1) / CHARS_PER_LINE));
  }, 0);
  return totalLines * 19 + 12; // 19 px/line + 12 px cell padding
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export function QuotationWordEditor({ form, items, onChange }: Props) {
  const company = getCompanyInfo();
  const headerRef = useRef<HTMLDivElement>(null);

  // Actual measured height of the page-1 header section
  const [headerH, setHeaderH] = useState(HEADER_H_DEFAULT);

  // Free-text overrides for rate and amount (stored as strings)
  const [rateTexts, setRateTexts] = useState<TextMap>({});
  const [amtTexts,  setAmtTexts]  = useState<TextMap>({});

  /* ── Measure the page-1 header height after render ─────────────────────── */
  useEffect(() => {
    if (!headerRef.current) return;
    const h = headerRef.current.offsetHeight;
    if (Math.abs(h - headerH) > 4) setHeaderH(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form.customerName,
    form.customerAddress,
    form.customerGst,
    form.quotationNumber,
    form.quotationDate,
    form.yourRef,
    form.dueOn,
    company.name,
    company.address,
    company.phone,
    company.gstNumber,
  ]);

  /* ── Sync the free-text maps when items are added / removed ─────────────── */
  useEffect(() => {
    setRateTexts(prev => {
      const next: TextMap = {};
      items.forEach(it => {
        next[it.id] = it.id in prev ? prev[it.id] : (it.rate ? String(it.rate) : "");
      });
      return next;
    });
    setAmtTexts(prev => {
      const next: TextMap = {};
      items.forEach(it => {
        next[it.id] = it.id in prev ? prev[it.id] : (it.amount ? String(it.amount) : "");
      });
      return next;
    });
  }, [items]);

  /* ── Item mutation helpers ──────────────────────────────────────────────── */
  const setItem = useCallback(
    (idx: number, patch: Partial<QuotationItem>) =>
      onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it))),
    [items, onChange],
  );

  const addRow = useCallback(() => {
    onChange([...items, newItem(items.length + 1, form.id)]);
  }, [items, form.id, onChange]);

  const removeRow = useCallback(
    (idx: number) =>
      onChange(
        items.filter((_, i) => i !== idx).map((it, i) => ({ ...it, slNo: i + 1 })),
      ),
    [items, onChange],
  );

  /* ── Page-break calculation ─────────────────────────────────────────────── */
  const { pages, pageOffsets } = useMemo(() => {
    // Remaining height for item rows on each page type
    const page1Available = A4_H - MY * 2 - headerH - COL_HDR_H - 8;
    const pageNAvailable = A4_H - MY * 2 - COL_HDR_H - 8;

    const pgs: QuotationItem[][] = [];
    const offsets: number[] = [];
    let cur: QuotationItem[] = [];
    let accumulated = 0;
    let avail = page1Available;
    let off = 0;

    items.forEach((it, idx) => {
      const h = estimateRowH(it.description);
      if (idx > 0 && accumulated + h > avail && cur.length > 0) {
        pgs.push(cur);
        offsets.push(off);
        off += cur.length;
        cur = [it];
        accumulated = h;
        avail = pageNAvailable;
      } else {
        cur.push(it);
        accumulated += h;
      }
    });

    if (cur.length > 0) {
      pgs.push(cur);
      offsets.push(off);
    }
    if (pgs.length === 0) {
      pgs.push([]);
      offsets.push(0);
    }

    return { pages: pgs, pageOffsets: offsets };
  }, [items, headerH]);

  /* ── Shared style tokens ────────────────────────────────────────────────── */
  const FF = "Times New Roman, serif";
  const FS = 12;
  const BORDER = "1px solid #aaa";

  const tdBase: React.CSSProperties = {
    border: BORDER,
    padding: "4px 6px",
    verticalAlign: "top",
    fontFamily: FF,
    fontSize: FS,
    boxSizing: "border-box",
  };

  const thBase: React.CSSProperties = {
    ...tdBase,
    fontWeight: 700,
    textAlign: "center",
    background: "transparent",
    height: COL_HDR_H,
    whiteSpace: "nowrap",
  };

  const inputBase: React.CSSProperties = {
    display: "block",
    width: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    fontFamily: FF,
    fontSize: FS,
    padding: 0,
    lineHeight: "1.55",
    resize: "none",
    overflow: "hidden",
    minHeight: 18,
    color: "#000",
  };

  /* ── Auto-grow a textarea ───────────────────────────────────────────────── */
  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  /* ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div
      style={{
        background: "#d1d5db",
        borderRadius: 12,
        padding: "24px 16px",
        overflowX: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
          minWidth: A4_W + 32,
        }}
      >
        {/* ── A4 pages ──────────────────────────────────────────────────── */}
        {pages.map((pgItems, pgIdx) => {
          const pgOffset = pageOffsets[pgIdx];
          const isFirstPage = pgIdx === 0;
          const isLastPage  = pgIdx === pages.length - 1;

          return (
            <div
              key={pgIdx}
              style={{
                width: A4_W,
                minHeight: A4_H,
                background: "#fff",
                boxShadow: "0 3px 28px rgba(0,0,0,0.20)",
                padding: `${MY}px ${MX}px`,
                boxSizing: "border-box",
                fontFamily: FF,
                position: "relative",
              }}
            >
              {/* ── Page 1: Company header + customer meta ──────────────── */}
              {isFirstPage && (
                <div ref={headerRef} style={{ marginBottom: 8 }}>
                  {/* Company name */}
                  <div style={{ textAlign: "center", marginBottom: 6 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 22,
                        color: "#14285A",
                        letterSpacing: 0.5,
                        fontFamily: FF,
                      }}
                    >
                      {(company.name || "").toUpperCase()}
                    </div>
                    <div
                      style={{
                        fontStyle: "italic",
                        fontSize: 10,
                        color: "#555",
                        marginTop: 2,
                        fontFamily: FF,
                      }}
                    >
                      MFRS OF : ALL KINDS OF WOODEN AND ALUMINUM PATTERNS
                    </div>
                    {company.address && (
                      <div style={{ fontSize: 10, color: "#333", marginTop: 2, fontFamily: FF }}>
                        {company.address}
                      </div>
                    )}
                    {company.phone && (
                      <div style={{ fontSize: 10, color: "#333", fontFamily: FF }}>
                        {company.phone}
                      </div>
                    )}
                    {company.gstNumber && (
                      <div style={{ fontSize: 10, color: "#333", fontFamily: FF, fontWeight: 700, marginTop: 1 }}>
                        GSTIN: {company.gstNumber}
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div style={{ borderBottom: "2px solid #14285A", margin: "8px 0" }} />

                  {/* QUOTATION banner */}
                  <div
                    style={{
                      background: "#14285A",
                      color: "#fff",
                      textAlign: "center",
                      fontWeight: 700,
                      fontSize: 14,
                      padding: "6px 0",
                      marginBottom: 10,
                      fontFamily: FF,
                    }}
                  >
                    QUOTATION
                  </div>

                  {/* Customer + Meta two-column block */}
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      marginBottom: 10,
                    }}
                  >
                    <tbody>
                      <tr>
                        {/* Left: customer */}
                        <td
                          style={{
                            width: "62%",
                            border: "1px solid #bbb",
                            padding: "8px 10px",
                            verticalAlign: "top",
                            fontFamily: FF,
                          }}
                        >
                          <div style={{ fontSize: 10, color: "#777", marginBottom: 2 }}>To,</div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>
                            M/s. {form.customerName || "—"}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              marginTop: 2,
                              whiteSpace: "pre-line",
                              lineHeight: 1.5,
                            }}
                          >
                            {form.customerAddress}
                          </div>
                          {form.customerGst && (
                            <div style={{ fontWeight: 700, fontSize: 11, marginTop: 3 }}>
                              GSTIN: {form.customerGst}
                            </div>
                          )}
                        </td>

                        {/* Right: meta */}
                        <td
                          style={{
                            width: "38%",
                            border: "1px solid #bbb",
                            padding: "8px 10px",
                            verticalAlign: "top",
                            fontSize: 11,
                            fontFamily: FF,
                            lineHeight: 1.7,
                          }}
                        >
                          <div>
                            <strong>Quote No.:</strong> {form.quotationNumber}
                          </div>
                          <div>
                            <strong>Date:</strong> {form.quotationDate}
                          </div>
                          <div>
                            <strong>Your Ref:</strong> {form.yourRef || "—"}
                          </div>
                          <div>
                            <strong>Due On:</strong> {form.dueOn || "—"}
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── Items table ─────────────────────────────────────────── */}
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  tableLayout: "fixed",
                }}
              >
                <colgroup>
                  <col style={{ width: COL_SL }} />
                  <col />
                  <col style={{ width: COL_QTY }} />
                  <col style={{ width: COL_RATE }} />
                  <col style={{ width: COL_AMT }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ ...thBase, width: COL_SL }}>Sl. No.</th>
                    <th style={{ ...thBase, textAlign: "center" }}>Description</th>
                    <th style={{ ...thBase, width: COL_QTY }}>Qty</th>
                    <th style={{ ...thBase, width: COL_RATE }}>Rate Per</th>
                    <th style={{ ...thBase, width: COL_AMT, textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {pgItems.map((it, li) => {
                    const gi = pgOffset + li; // global index
                    return (
                      <tr key={it.id} className="group">
                        {/* Sl.No */}
                        <td
                          style={{
                            ...tdBase,
                            width: COL_SL,
                            textAlign: "center",
                            position: "relative",
                          }}
                        >
                          <span style={{ fontFamily: FF, fontSize: FS }}>{it.slNo}</span>
                          {/* Delete button — positioned outside the left edge of the table */}
                          <button
                            onClick={() => removeRow(gi)}
                            title="Delete row"
                            style={{
                              position: "absolute",
                              top: "50%",
                              left: -24,
                              transform: "translateY(-50%)",
                              fontSize: 10,
                              color: "#dc2626",
                              background: "#fee2e2",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              lineHeight: 1,
                              padding: "2px 4px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            ✕
                          </button>
                        </td>

                        {/* Description — auto-growing textarea */}
                        <td style={tdBase}>
                          <textarea
                            value={it.description}
                            rows={1}
                            onChange={e => {
                              setItem(gi, { description: e.target.value });
                              autoGrow(e.target);
                            }}
                            onFocus={e => autoGrow(e.target)}
                            placeholder="Description…"
                            style={{ ...inputBase, textAlign: "left" }}
                          />
                        </td>

                        {/* Qty — free text textarea */}
                        <td style={{ ...tdBase, width: COL_QTY }}>
                          <textarea
                            value={it.qty}
                            rows={1}
                            onChange={e => {
                              setItem(gi, { qty: e.target.value });
                              autoGrow(e.target);
                            }}
                            onFocus={e => autoGrow(e.target)}
                            style={{ ...inputBase, textAlign: "center" }}
                          />
                        </td>

                        {/* Rate Per — free text textarea */}
                        <td style={{ ...tdBase, width: COL_RATE }}>
                          <textarea
                            value={rateTexts[it.id] ?? ""}
                            rows={1}
                            onChange={e => {
                              const v = e.target.value;
                              setRateTexts(p => ({ ...p, [it.id]: v }));
                              setItem(gi, { rate: parseFloat(v.replace(/,/g, "")) || 0 });
                              autoGrow(e.target);
                            }}
                            onFocus={e => autoGrow(e.target)}
                            style={{ ...inputBase, textAlign: "right" }}
                          />
                        </td>

                        {/* Amount — free text textarea */}
                        <td style={{ ...tdBase, width: COL_AMT }}>
                          <textarea
                            value={amtTexts[it.id] ?? ""}
                            rows={1}
                            onChange={e => {
                              const v = e.target.value;
                              setAmtTexts(p => ({ ...p, [it.id]: v }));
                              setItem(gi, { amount: parseFloat(v.replace(/,/g, "")) || 0 });
                              autoGrow(e.target);
                            }}
                            onFocus={e => autoGrow(e.target)}
                            style={{ ...inputBase, textAlign: "right" }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* ── Terms on last page (read-only, from form state) ──────── */}
              {isLastPage && form.terms && (
                <div style={{ marginTop: 18, fontFamily: FF, fontSize: 11 }}>
                  <strong>Terms:</strong>
                  <div style={{ whiteSpace: "pre-line", marginTop: 3, lineHeight: 1.6 }}>
                    {form.terms}
                  </div>
                </div>
              )}

              {/* ── Page number ──────────────────────────────────────────── */}
              <div
                style={{
                  position: "absolute",
                  bottom: 18,
                  right: MX,
                  fontSize: 9,
                  color: "#aaa",
                  fontFamily: FF,
                }}
              >
                {pgIdx + 1} / {pages.length}
              </div>
            </div>
          );
        })}

        {/* ── Add Row button ─────────────────────────────────────────────── */}
        <button
          onClick={addRow}
          style={{
            background: "#14285A",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 32px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
            fontFamily: "inherit",
            marginTop: -12,
            boxShadow: "0 2px 8px rgba(20,40,90,0.25)",
          }}
        >
          + Add Row
        </button>
      </div>
    </div>
  );
}
