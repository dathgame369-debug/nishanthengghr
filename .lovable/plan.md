# Plan: Payslip Enhancement + Quotation Management Module

This is a large, multi-part build. I'll split it into two phases so we can ship incrementally and validate each.

## Phase 1 — Payslip Generator Enhancement (extend existing HR module)

**Filters (multi-select):**
- Months (single / multiple / range)
- Years (single / multiple)
- Employees (single / multiple / all)
- Department, Designation, Employment Status
- Date Range, Select All, Reset

**Actions:** Preview, Download PDF, Download Excel, Bulk Generate.

**PDF combinations supported:** single emp × 1 month, single emp × N months, N emps × N months, all emps × selected months.

**Excel export columns:** Employee details, Dept, Designation, Attendance, Working Days, Leave Days, Earnings, Deductions, Net Salary, Month, Year.

**Payslip layout sections:** Company info, Employee info (name, ID, dept, designation, joining date, bank, PF/UAN), Earnings (Basic, HRA, Special, Medical, Travel, OT, Incentives, Bonus, Other), Deductions (PF, ESI, Prof Tax, Advance Recovery, Loan Recovery, Other), Summary (Gross, Total Deductions, Net, Net in Words), Employer + Employee signatures.

> Note: existing schema only tracks `monthlySalary`, `presentDays`, `holidays`, `otHours`, `bonus`, `welfareAmount`, `advanceDeduction`. New earnings/deductions fields (HRA, PF, ESI, bank, UAN, etc.) will render as 0 / blank unless we also extend the employee + payroll schemas. **I'll add optional columns to `employees` (bank_account, ifsc, pf_number, uan, esi_number) and render the new sections from existing values + zeros for now.** Full breakdown entry can come in a follow-up if you want.

## Phase 2 — Quotation Management (new top-level module)

**Sidebar reorganization:** group existing items under "HR Management"; add "Quotation Management" group with Dashboard / Create / List / Customers / Templates; keep Settings.

**New DB tables (Lovable Cloud):**
- `customers` (company_name, address, city, state, country, pincode, contact_person, designation, mobile, email, gst_number, pan_number, website, status, notes)
- `quotations` (quotation_number, dates, customer_id, validity, all charges, totals, amount_in_words, terms, notes, status, created_by)
- `quotation_items` (description, drawing_number, qty, unit, rate, amount, remarks, sort_order)
- `quotation_status_history` (old_status, new_status, remarks, changed_by)
- `quotation_terms_templates` (category, name, content) — for reusable terms
- `quotation_settings` (number format, e.g. `VS/NEW/{seq}/{fy}`)

All with RLS: authenticated users full access (matches existing pattern).

**Pages:**
- **Quotation Dashboard:** totals by status, monthly value, recent list, monthly trend chart (Recharts line), status distribution (pie).
- **Customers:** CRUD table with search/filter, create/edit dialog with all listed fields.
- **Create/Edit Quotation:** header (company branding, auto-number, dates, ref, validity), customer picker + delivery address, item table (add/delete/duplicate/reorder rows), live calc (subtotal, discount, freight, packing, insurance, GST CGST/SGST/IGST, other, round-off, grand total, amount in words), terms section with template insertion, approval section (prepared/checked/approved/seal placeholders), status workflow.
- **Quotation List:** filters (number, customer, date range, status, creator, amount range), columns, row actions (view/edit/duplicate/PDF/print/delete/change status with history entry).
- **Templates:** manage reusable T&C by category.

**PDF:** A4 quotation generator using jsPDF + autoTable, matching uploaded sample structure (header w/ logo, customer block, item table, tax summary, totals, amount in words, terms, signatures, page numbers).

**Auto-numbering:** sequence per financial year, format from settings (default `VS/NEW/{seq}/{fy}`).

**Permissions:** since auth is currently single-user (no roles table), I'll keep all routes accessible to authenticated users now and note the roles split as a future step (would need `user_roles` table + `has_role` function). Tell me if you want that built now.

## Suggested execution order

1. Phase 1 (Payslip filters + new layout sections + Excel/PDF updates + employee schema fields).
2. Phase 2a (DB migrations for all quotation tables + settings).
3. Phase 2b (Sidebar restructure + Customers CRUD + Quotation Dashboard).
4. Phase 2c (Create/Edit Quotation + live calc + auto-numbering + status workflow).
5. Phase 2d (Quotation List + PDF generator + Templates).

## Open questions before I start

1. **Quotation PDF reference** — I don't see the uploaded quotation PDF in this turn. Can you re-upload it so I can match the exact layout?
2. **New payslip fields (HRA, PF, ESI, bank, UAN, etc.)** — should I:
   a) Add full input fields to Employee + Payroll forms so values can be entered, or
   b) Just render the new sections in the payslip layout with 0 / blank until you ask for the data entry side?
3. **Permissions / roles** — build the Admin / HR Manager / Employee role system now (adds login complexity), or defer?
4. **Scope confirmation** — OK to ship Phase 1 first, then Phase 2 in a follow-up message? This is too large for one safe change.