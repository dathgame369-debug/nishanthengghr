import csv
import json
import os

def escape_sql(val):
    if val is None or val == '':
        return 'NULL'
    # Escape single quotes
    val = str(val).replace("'", "''")
    return f"'{val}'"

def main():
    reports_csv = r'd:\Software\nishanthengghr\Report\Reports.csv'
    company_csv = r'd:\Software\nishanthengghr\Report\Company Details.csv'
    output_sql = r'd:\Software\nishanthengghr\supabase\migrations\seed_reports.sql'

    if not os.path.exists(reports_csv) or not os.path.exists(company_csv):
        print("CSV files not found!")
        return

    with open(output_sql, 'w', encoding='utf-8') as f:
        f.write("-- Seed data for customers\n")
        with open(company_csv, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                id_val = row.get('id')
                address = row.get('address')
                companyName = row.get('companyName')
                contactNumber = row.get('contactNumber')
                email = row.get('email')
                
                f.write(f"INSERT INTO customers (id, name, address, phone, email, gst_number, contact_person, status, number_prefix) VALUES ({escape_sql(id_val)}, {escape_sql(companyName)}, {escape_sql(address)}, {escape_sql(contactNumber)}, {escape_sql(email)}, '', '', 'Active', '') ON CONFLICT (id) DO NOTHING;\n")

        f.write("\n-- Seed data for reports\n")
        with open(reports_csv, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                report_no = row.get('reportNo')
                current_page = row.get('currentPage')
                customer_id = row.get('customerId')
                customer_name = row.get('customerName')
                date_val = row.get('date')
                if not date_val: date_val = None
                description = row.get('description')
                details_of_pattern = row.get('detailsOfPattern')
                drawing_no = row.get('drawingNo')
                id_val = row.get('id')
                if not id_val:
                    id_val = 'report_' + str(abs(hash(report_no)))

                rows_json = row.get('rows')
                total_pages = row.get('totalPages')
                unit_mode = row.get('unitMode')
                
                f.write(f"INSERT INTO reports (id, report_no, current_page, customer_id, customer_name, date, description, details_of_pattern, drawing_no, rows, total_pages, unit_mode) VALUES ({escape_sql(id_val)}, {escape_sql(report_no)}, {escape_sql(current_page)}, {escape_sql(customer_id)}, {escape_sql(customer_name)}, {escape_sql(date_val) if date_val else 'NULL'}, {escape_sql(description)}, {escape_sql(details_of_pattern)}, {escape_sql(drawing_no)}, {escape_sql(rows_json)}, {escape_sql(total_pages)}, {escape_sql(unit_mode)}) ON CONFLICT (id) DO NOTHING;\n")

    print(f"Generated {output_sql} successfully.")

if __name__ == '__main__':
    main()
