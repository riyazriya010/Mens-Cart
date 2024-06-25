const PDFDocument = require('pdfkit');

module.exports = {
  invoicePdf: (dataCallback, endCallback, order) => {
    let doc = new PDFDocument({ size: 'A4', margin: 50 });

    generateHeader(doc);
    generateCustomerInformation(doc, order);
    generateInvoiceTable(doc, order);
    generateFooter(doc);

    doc.on('data', dataCallback);
    doc.on('end', endCallback);

    doc.end();
  },
};

function generateHeader(doc) {
  // Set the font and size to measure the text
  doc.font('Helvetica-Bold').fontSize(20);

  // Measure the width of the text
  const text = "Men's Cart";
  const textWidth = doc.widthOfString(text);
  const textHeight = doc.heightOfString(text);

  // Draw black rectangle as background with calculated width
  doc
    .fillColor('#000000') // Set fill color to black
    .rect(110, 47, textWidth + 10, textHeight + 5) // Adjusted dimensions and positions
    .fill();

  // Add white bold text on top of the black background
  doc
    .fillColor("#FFFFFF")
    .text(text, 115, 52); // Adjusted text position to fit inside the rectangle

  // Add the address text
  doc
    .fillColor("#444444")  // Change text color back to default
    .font('Helvetica')  // Change font back to regular
    .fontSize(10)
    .text("BetaSpace-4th Floor, Desabandhu St., Ramnagar,", 200, 65, {
      align: "right",
    })
    .text("Coimbatore, TN- 6100025", 200, 80, { align: "right" })
    .moveDown();
}

function generateFooter(doc) {
  doc.fontSize(10).text("Thank You! Shop with us again :)", 50, 750, {
    align: "center",
    width: 500,
  });
}

function generateCustomerInformation(doc, order) {
  const { orderId, orderDate, grandTotalCost, addressChosen, userId } = order;

  doc
    .fontSize(12)
    .text(`Order Number: ${orderId}`, 50, 100)
    .text(
      `Order Date: ${new Date(orderDate).toLocaleDateString()}`,
      50,
      115
    )
    .text(`Total Price: ${grandTotalCost}`, 50, 130)
    .text(`Name: ${userId.username}`, 300, 100)
    .text(`Phone: ${addressChosen[0].phone}`, 300, 130)
    .text(`Address: ${addressChosen[0].address1}`, 300, 115)
    .moveDown();
}

function generateInvoiceTable(doc, order) {
  let i,
    invoiceTableTop = 170;

  doc.font("Helvetica-Bold");
  generateTableRow(
    doc,
    invoiceTableTop,
    "Item",
    "Price",
    "Quantity",
    "Discount",
    "Subtotal"
  );

  generateHr(doc, invoiceTableTop + 20);
  doc.font("Helvetica");

  for (i = 0; i < order.cartData.length; i++) {
    const item = order.cartData[i];
    const price = item.productPrice;
    // const offerApplied = `${item.offerApplied}%` || 'Nil';
    const offerApplied = item.offerApplied !== null ? `${item.offerApplied}%` : "Nil";
    const subTotal = item.totalCostPerProduct;
    const position = invoiceTableTop + (i + 1) * 30;
    generateTableRow(
      doc,
      position,
      item.productName,
      price,
      item.productQuantity,
      offerApplied,
      subTotal
    );

    generateHr(doc, position + 20);
  }

//   const discount = `${order.couponApplied?.discountPercentage}%` || "Nil";
  const discount = order.couponApplied?.discountPercentage !== undefined ? `${order.couponApplied.discountPercentage}%` : "Nil";
  const grandTotal = order.discountedPrice || order.grandTotalCost;

  const discountPosition = invoiceTableTop + (i + 1) * 30;
  doc.font("Helvetica-Bold");
  generateTableRow(
    doc,
    discountPosition,
    "",
    "",
    "",
    "Coupon Discount",
    discount
  );

  const totalPosition = discountPosition + 20;
  doc.font("Helvetica-Bold");
  generateTableRow(
    doc,
    totalPosition,
    "",
    "",
    "",
    "Grand Total",
    grandTotal
  );
}

function generateTableRow(doc, y, item, price, quantity, discount, subtotal) {
  doc
    .fontSize(10)
    .text(item, 50, y)
    .text(price, 200, y, { width: 90, align: "right" })
    .text(quantity, 280, y, { width: 90, align: "right" })
    .text(discount, 360, y, { width: 90, align: "right" })
    .text(subtotal, 440, y, { width: 90, align: "right" });
}

function generateHr(doc, y) {
  doc.strokeColor("#aaaaaa").lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
}
