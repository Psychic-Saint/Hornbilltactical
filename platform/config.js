/* Hornbill Tactical Operations Platform — connection config
   Backend: Supabase project "Hornbill Tactical Ops Platform" */
window.HT_CONFIG = {
  SUPABASE_URL: "https://cqacsvtzkhcuztnjbway.supabase.co",
  // Public anon key — safe to expose; all access is enforced by Row-Level Security.
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxYWNzdnR6a2hjdXp0bmpid2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4MTY2MTYsImV4cCI6MjEwMjM5MjYxNn0.aMEfMJlHsL2bouUvQCXCVwyKLLMmBz4Y5QYJL-nIFYw",
  PHONE: "063 205 1836",
  EMERGENCY: "063 205 1836",
  // Company details used on generated invoices — edit these to your real details.
  COMPANY: {
    name: "Hornbill Tactical",
    tagline: "Security · Response · Accountability",
    address: "Monument Park, Pretoria, Gauteng, South Africa",
    email: "accounts@hornbilltactical.co.za",
    phone: "063 205 1836",
    reg: "Reg: 2026/000000/07",
    vat: "VAT: 4000000000",
    vatRate: 0.15,
    bank: "Bank: FNB · Acc: 0000000000 · Branch: 250655 · Ref: invoice number",
  },
  // Feature flags (backend must also be configured for these to fully work)
  DRIVE_ENABLED: false, // flip true once the Google service account secrets are set on Supabase
};
