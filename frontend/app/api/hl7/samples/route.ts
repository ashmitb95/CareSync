export async function GET() {
  const samples = [
    {
      type: "ADT^A01",
      label: "ADT^A01 — Patient Admission",
      description: "Patient John Doe admitted to surgical ward",
      raw: `MSH|^~\\&|EPIC|MHC|LABADT|DH|20230901080000||ADT^A01|MSG00001|P|2.5\rEVN|A01|20230901080000\rPID|1||PT-456789^^^MHC^MR||NGUYEN^MINH^T||19620315|M|||123 MAPLE ST^^COLUMBUS^OH^43215||6145551234|||M||PT-456789|\rNK1|1|NGUYEN^LISA^B|SPO|123 MAPLE ST^^COLUMBUS^OH^43215|6145555678\rPV1|1|I|MED^305^1^UAMC^^^^3||||12345^SMITH^JOHN^M^MD|67890^JOHNSON^SARAH^L^MD||MED|||ADM|A0|`,
    },
    {
      type: "ADT^A03",
      label: "ADT^A03 — Patient Discharge",
      description: "Patient discharged home after hospitalization",
      raw: `MSH|^~\\&|EPIC|MHC|LABADT|DH|20230906160000||ADT^A03|MSG00002|P|2.5\rEVN|A03|20230906160000\rPID|1||PT-456789^^^MHC^MR||NGUYEN^MINH^T||19620315|M|||123 MAPLE ST^^COLUMBUS^OH^43215||6145551234\rPV1|1|I|MED^305^1^UAMC^^^^3||||12345^SMITH^JOHN^M^MD|||MED||DIS|01|A0|\rDG1|1||44054006^Type 2 diabetes mellitus^SCT|Type 2 diabetes mellitus|20230901|A`,
    },
    {
      type: "ORM^O01",
      label: "ORM^O01 — Lab Order",
      description: "Order for HbA1c and metabolic panel",
      raw: `MSH|^~\\&|EPIC|MHC|LABSYS|LAB|20230905090000||ORM^O01|MSG00003|P|2.5\rPID|1||PT-456789^^^MHC^MR||NGUYEN^MINH^T||19620315|M|||123 MAPLE ST^^COLUMBUS^OH^43215\rORC|NW|ORD-789456|||||^^^20230905090000^^R\rOBR|1|ORD-789456||4548-4^Hemoglobin A1c^LN|||20230905090000|||||||||12345^SMITH^JOHN^M^MD`,
    },
    {
      type: "ORU^R01",
      label: "ORU^R01 — Lab Result",
      description: "HbA1c result 8.2% (HIGH) with GFR result",
      raw: `MSH|^~\\&|LABSYS|LAB|EPIC|MHC|20230906110000||ORU^R01|MSG00004|P|2.5\rPID|1||PT-456789^^^MHC^MR||NGUYEN^MINH^T||19620315|M\rOBR|1|ORD-789456||4548-4^Hemoglobin A1c^LN|||20230905090000|||||||20230906110000\rOBX|1|NM|4548-4^Hemoglobin A1c^LN||8.2|%|4.0-5.6|H|||F|||20230906110000\rOBX|2|NM|33914-3^GFR^LN||42|mL/min/1.73m2|60-120|L|||F|||20230906110000`,
    },
    {
      type: "SIU^S12",
      label: "SIU^S12 — Appointment Scheduled",
      description: "Nephrology follow-up appointment scheduled",
      raw: `MSH|^~\\&|EPIC|MHC|SCHED|DH|20231001080000||SIU^S12|MSG00005|P|2.5\rSCH|APT-12345||APT-12345||||Nephrology Follow-up|ROUTINE|30|MIN|^^^20231020140000^20231020143000\rPID|1||PT-456789^^^MHC^MR||NGUYEN^MINH^T||19620315|M|||123 MAPLE ST^^COLUMBUS^OH^43215\rAIG|1||67890^JOHNSON^SARAH^L^MD^DR|MD`,
    },
  ];
  return Response.json(samples);
}
