export interface ReportRow {
  actualDimn: number | null;
  view: string;
  shrinkageAllowance: number | null;
  mcIngAllowance: number | null;
  srNo: number | null;
  drgDim: number | null;
  percentage: number | null;
  remark: string;
  id: string;
  dimnToBeMaintained: number | null;
  inchValue?: number | string;
}

export interface Report {
  id: string;
  reportNo: string;
  currentPage: string;
  customerId: string;
  customerName: string;
  date: string;
  description: string;
  detailsOfPattern: string;
  drawingNo: string;
  rows: any[]; // Raw DynamoDB JSON from the CSV
  totalPages: string;
  unitMode: string;
}

// Utility to unmarshal the DynamoDB JSON format found in the CSV
export function unmarshalDynamoRows(rows: any[]): ReportRow[] {
  if (!rows || !Array.isArray(rows)) return [];
  return rows.map((r: any) => {
    const item = r.M || r; // Fallback in case it's already unmarshalled
    if (!item) return {} as ReportRow;
    
    return {
      actualDimn: item.actualDimn?.N ? parseFloat(item.actualDimn.N) : null,
      view: item.view?.S || "",
      shrinkageAllowance: item.shrinkageAllowance?.N ? parseFloat(item.shrinkageAllowance.N) : null,
      mcIngAllowance: item.mcIngAllowance?.N ? parseFloat(item.mcIngAllowance.N) : null,
      srNo: item.srNo?.N ? parseInt(item.srNo.N) : null,
      drgDim: item.drgDim?.N ? parseFloat(item.drgDim.N) : null,
      percentage: item.percentage?.N ? parseFloat(item.percentage.N) : null,
      remark: item.remark?.S || "",
      id: item.id?.S || "",
      dimnToBeMaintained: item.dimnToBeMaintained?.N ? parseFloat(item.dimnToBeMaintained.N) : null,
      inchValue: item.inchValue?.N ? parseFloat(item.inchValue.N) : (item.inchValue?.S || "")
    };
  });
}
