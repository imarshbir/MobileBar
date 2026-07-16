import { Order } from '@/types';

// xlsx is a sizeable library (~300KB) that only the admin Orders page
// needs — dynamically importing it here means customers browsing the
// storefront never download it; it's fetched on demand the first time
// an admin actually clicks "Export to Excel."
export async function exportOrdersToExcel(orders: Order[], filenamePrefix = 'mobile-bar-sales') {
  const XLSX = await import('xlsx');

  // Column mapping against the client's Sale_sheet.xlsx template. Every
  // populated cell traces to a real column in `orders`; every blank is a
  // field the current schema genuinely doesn't collect yet (documented
  // per-column below) rather than a fabricated value. If any of these
  // need to start being tracked (structured address fields, GSTIN,
  // per-line invoice numbering), that's a schema addition, not something
  // this export layer should invent on its own.
  const rows = orders.map((o, i) => {
    const created = new Date(o.created_at);
    return {
      'S.No.': i + 1,
      'Order ID': o.id,
      'Order Date': created.toLocaleDateString('en-IN'),
      'Order Time': created.toLocaleTimeString('en-IN'),
      // No invoice-numbering system exists yet — this is a readable
      // placeholder derived from the real order id/date, not a
      // separately tracked value. Swap for real invoice numbers once
      // the business has an invoicing flow.
      'Invoice No.': `INV-${o.id.slice(0, 8).toUpperCase()}`,
      'Invoice Date': created.toLocaleDateString('en-IN'),
      'Order Status': o.status,
      'Payment Status': o.payment_status,
      // No separate fulfillment-tracking field exists distinct from
      // Order Status — this system tracks one status, so both columns
      // reflect it rather than leaving Fulfillment Status blank.
      'Fulfillment Status': o.status,
      'Customer Name': o.customer_name,
      'Mobile No.': o.customer_mobile,
      Email: o.customer_email,
      'GSTIN (if B2B)': '', // not collected — no B2B flow yet
      'Shipping Name': o.customer_name,
      // orders.shipping_address is a single free-text field today, not
      // split into line1/line2/landmark/city/state/pincode — those
      // structured fields exist on customer_addresses but orders
      // aren't linked to a specific saved address row. Full address
      // goes in Address Line 1 rather than guessing a split.
      'Address Line 1': o.shipping_address,
      'Address Line 2': '',
      Landmark: '',
      City: '',
      State: '',
      Pincode: '',
      Country: 'India',
      'Discount(%)': '', // product-level discount % isn't captured per order line
      'Coupon Code': o.coupon_code ?? '',
      'Coupon Discount(Amount)': o.coupon_discount,
      'Taxable Value': o.taxable_value,
      'GST %': o.gst_percent,
      'GST Amount': o.gst_amount,
      'Shipping Charges': o.shipping_charges,
      'Shipping GST': '', // shipping GST isn't tracked as a separate line
      'Total Amount': o.total_price,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 6 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 12 },
    { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 22 },
    { wch: 14 }, { wch: 18 }, { wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 12 },
    { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 20 },
    { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  const dateStamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${filenamePrefix}-${dateStamp}.xlsx`);
}