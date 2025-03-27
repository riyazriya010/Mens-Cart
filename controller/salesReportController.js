// sales report details

// page details at last

const orderCollection = require('../models/ordersModel.js')
const puppeteer = require('puppeteer');
const exceljs = require("exceljs");
const path = require('path');
const fs = require('fs');
const AppError = require('../middleware/errorHandling.js');

const PdfPrinter = require("pdfmake");

const fonts = {
  Roboto: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
  },
};
const printer = new PdfPrinter(fonts);


exports.reportGet = async (req, res, next) => {
  try {
    const { dateForm, dateTo, timeFilter, page } = req.query;
    let filter = {};

    if (dateForm && dateTo) {
      filter.orderDate = { $gte: new Date(dateForm), $lte: new Date(dateTo) };
    }

    if (timeFilter) {
      const now = new Date();
      if (timeFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        filter.orderDate = { $gte: weekAgo, $lte: now };
      } else if (timeFilter === 'onth') {
        const monthAgo = new Date();
        monthAgo.setMonth(now.getMonth() - 1);
        filter.orderDate = { $gte: monthAgo, $lte: now };
      } else if (timeFilter === 'year') {
        const yearAgo = new Date();
        yearAgo.setFullYear(now.getFullYear() - 1);
        filter.orderDate = { $gte: yearAgo, $lte: now };
      }
    }

    const limit = 5;
    const currentPage = parseInt(page) || 1;
    const startIndex = (currentPage - 1) * limit;
    const endIndex = currentPage * limit;

    const orderCount = await orderCollection.orders.countDocuments(filter);
    const totalPages = Math.ceil(orderCount / limit);

    const order = await orderCollection.orders.find(filter, null, { skip: startIndex, limit: limit })
      .sort({ createdAt: -1 })
      .populate('userId')
      .populate('couponApplied');

    res.render('adminPages/sales', { order, currentPage, totalPages }, (err, html) => {
      if (err) {
        console.error(err.message);
        return res.json({ success: false, error: true });
      }
      if (req.xhr) {
        res.json({ success: true, html });
      } else {
        res.send(html);
      }
    });
  } catch (error) {
    next(new AppError(error.message, 500))
  }
};




exports.report = async (req, res, next) => {
  try {

    let startDate, endDate;
    if (req.session.startDate && req.session.endDate) {
      console.log('session start Date: ', req.session.startDate)
      console.log('session end Date: ', req.session.endDate)
      startDate = req.session.startDate;
      endDate = req.session.endDate;
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      endDate = new Date();
    }
    let startDate2, endDate2;
    if (req.session.startDate2 && req.session.endDate2) {
      startDate2 = new Date(req.session.startDate2);
      endDate2 = new Date(req.session.endDate2);
    }

    // var salesDetails =
    //   req.session.salesDetails ||
    //   await orderCollection.orders.find({
    //     orderDate: { $gte: startDate, $lte: endDate },
    //     orderStatus: "Delivered",
    //   })
    //     .sort({ orderDate: -1 })
    //     // .populate({path:cartData,populate:{)
    //     .populate('userId')
    //     .populate('couponApplied');



    //New Updated
    // var salesDetails =
    //   req.session.salesDetails ||
    //   await orderCollection.orders.find({
    //     orderDate: { $gte: startDate, $lte: endDate },
    //     "cartData.status": "Delivered", // Ensure at least one delivered product exists
    //   })
    //     .sort({ orderDate: -1 })
    //     .populate('userId')
    //     .populate('couponApplied')
    //     .lean(); // Convert to plain objects for better manipulation

    // // Filter only the delivered products from cartData
    // salesDetails = salesDetails.map(order => {
    //   order.cartData = order.cartData.filter(product => product.status === "Delivered");
    //   return order;
    // });


    var salesDetails =
      req.session.salesDetails ||
      await orderCollection.orders
        .find({
          orderDate: { $gte: startDate, $lte: endDate },
          "cartData.status": "Delivered", // Ensure at least one delivered product exists
        })
        .sort({ orderDate: -1 })
        .populate("userId")
        .populate("couponApplied")
        .lean(); // Convert to plain objects for better manipulation

    // Process each order and filter only Delivered products
    salesDetails = salesDetails.map((order) => {
      // Keep only Delivered products
      order.cartData = order.cartData.filter((product) => product.status === "Delivered");

      // Recalculate the grand total based on only delivered products
      const deliveredTotal = order.cartData.reduce((total, product) => total + product.totalCostPerProduct, 0);

      // Calculate proportional discount if applicable
      if (order.discountedPrice) {
        const totalOrderPrice = order.grandTotalCost; // The original order total before discount
        const totalDiscount = totalOrderPrice - order.discountedPrice; // Total discount amount

        // Apply proportional discount to each delivered product
        order.cartData = order.cartData.map((product) => {
          const productDiscount = (product.totalCostPerProduct / totalOrderPrice) * totalDiscount;
          product.finalCost = product.totalCostPerProduct - productDiscount;
          return product;
        });

        // Final total is sum of adjusted delivered product prices
        order.finalTotal = order.cartData.reduce((sum, product) => sum + product.finalCost, 0);
      } else {
        order.finalTotal = deliveredTotal;
      }

      return order;
    });

    const totalRevenue = salesDetails.reduce((sum, order) => sum + order.finalTotal, 0);



    ///

    const productsPerPage = 5;
    const totalPages = salesDetails.length / productsPerPage;
    const pageNo = req.query.pages || 1;
    const start = (pageNo - 1) * productsPerPage;
    const end = start + productsPerPage;
    let allSales = salesDetails;
    salesDetails = salesDetails.slice(start, end);
    let totalSales = salesDetails.reduce(
      (total, sale) => total + sale.grandTotalCost,
      0
    );
    let totalSum = [];
    let total = [];
    let totalSum1 = [];
    let total2 = [];
    for (i = 0; i < salesDetails.length; i++) {
      totalSum = salesDetails[i].cartData.map((item) => item.productprice);
      total.push(totalSum);
      totalSum1 = salesDetails[i].cartData.map((item) => item.priceBeforeOffer);
      total2.push(totalSum1);
    }
    let sum = total.flat();
    let sum2 = total2.flat();
    let totalSales1 = sum.reduce((total, sale) => (total = total + sale), 0);
    let totalSales2 = sum2.reduce((total, sale) => (total = total + sale), 0);
    let coupontotal = salesDetails.reduce(
      (total, sale) => (total = total + sale.couponApplied),
      0
    );

    let totalDiscount = coupontotal + totalSales2 - totalSales1;

    req.session.sreportLen = salesDetails.length;

    const products = await orderCollection.orders
      .find({ orderStatus: "Delivered" })
      .populate("userId")
      .sort({ _id: -1 });
    const totalcount = products.reduce((total, item) => total + item.Total, 0);

    console.log('salesDetails: ', salesDetails)

    res.render("adminPages/sales", {
      Sreports: salesDetails,
      totalPages,
      totalRevenue,
      // user,
      orders: [],
      page: 1,
      pages: 1,
      totalcount,
      startDate2,
      endDate2,
      products,
    });
  } catch (error) {
    next(new AppError(error.message, 500))
  }
}




exports.filterOptions = async (req, res, next) => {
  try {
    let { filterOption } = req.body;
    let startDate, endDate;

    if (filterOption === "month") {
      endDate = new Date();
      startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 30);
    } else if (filterOption === "week") {
      let currentDate = new Date();
      let currentDay = currentDate.getDay();
      let diff = currentDate.getDate() - currentDay - 7;
      startDate = new Date(currentDate.setDate(diff));
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    } else if (filterOption === "year") {
      let currentYear = new Date().getFullYear();
      startDate = new Date(currentYear, 0, 1);
      endDate = new Date(currentYear, 11, 31);
    }

    let salesDataFiltered = await orderCollection.orders
      .find({
        orderDate: { $gte: startDate, $lte: endDate },
        orderStatus: "Delivered",
      })
      .sort({ orderDate: -1 })
      .populate('userId')
      .populate('couponApplied');

    req.session.admin = {};
    req.session.admin.dateValues = { startDate, endDate };
    req.session.salesDetails = salesData = JSON.parse(
      JSON.stringify(salesDataFiltered)
    );

    res.status(200).json({ success: true });

  } catch (error) {
    next(new AppError(error.message, 500))
  }
}



//report Download PDF
// exports.SaledReportDownloadPDF = async (req, res, next) => {
//   try {
//     let startDate, endDate;
//     if (req.session.startDate && req.session.endDate) {
//       startDate = req.session.startDate;
//       endDate = req.session.endDate;
//     } else {
//       startDate = new Date();
//       startDate.setDate(startDate.getDate() - 7);
//       endDate = new Date();
//     }

//     const salesData = await orderCollection.orders
//       .find({
//         orderDate: { $gte: startDate, $lte: endDate },
//         orderStatus: "Delivered",
//       })
//       .sort({ orderDate: -1 })
//       .populate('userId')
//       .populate('couponApplied');

//     const browser = await puppeteer.launch({
//       channel: "chrome",
//     });

//     const page = await browser.newPage();

//     let htmlContent = `

//   <h1 style="text-align: center;">Sales Report</h1>
//   <table style="width:100%; border-collapse: collapse;" border="1">

// <tr>
//   <th>Order ID</th>
//   <th>UserName</th>
//   <th>Order Date</th>
//   <th>Products</th>
//   <th>Product Offer</th>
//   <th>Quantity</th>
//   <th>Before Offer</th>
//   <th>Total Cost</th>
//   <th>Payment Method</th>
//   <th>Status</th>
//   <th>Coupons</th>
//   <th>Before Coupon</th>
//   <th>Ordered Price</th>
// </tr>`;

//     salesData.forEach((order) => {
//       let i = 0;
//       htmlContent += `
//   <tr>
//     <td rowspan="${order.cartData.length}" style="text-align: center;">${order.orderId
//         }</td>
//     <td rowspan="${order.cartData.length}" style="text-align: center;">${order.userId.username
//         }</td>
//     <td rowspan="${order.cartData.length
//         }" style="text-align: center;">${formatDate(order.orderDate)}</td>
// `;

//       order.cartData.forEach((cartItem) => {
//         htmlContent += `
//     <td style="text-align: center;">${cartItem.productName}</td>
//     <td style="text-align: center;">${cartItem.offerApplied
//             ? `${cartItem.offerApplied}%`
//             : "Nil"
//           }</td>
//     <td style="text-align: center;">${cartItem.productQuantity}</td>
//     <td style="text-align: center;">Rs.${cartItem.productPrice}</td>
//     <td style="text-align: center;">Rs.${cartItem.offerPrice
//             ? `${cartItem.offerPrice}`
//             : `${cartItem.productPrice}`
//           }</td>
//   `;

//         if (i === 0) {
//           htmlContent += `
//       <td rowspan="${order.cartData.length}" style="text-align: center;">${order.paymentType
//             }</td>
//       <td rowspan="${order.cartData.length}" style="text-align: center;">${order.orderStatus
//             }</td>
//       <td rowspan="${order.cartData.length}" style="text-align: center;">${order.couponApplied
//               ? `${order.couponApplied.discountPercentage}%`
//               : "Nil"
//             }</td>
//       <td rowspan="${order.cartData.length}" style="text-align: center;">${order.grandTotalCost}</td>
//         <td rowspan="${order.cartData.length
//             }" style="text-align: center;">Rs.${order.discountedPrice
//               ? `${order.discountedPrice}`
//               : `${order.grandTotalCost}`
//             }</td>
//     `;
//         }

//         htmlContent += `
//   </tr>
// `;
//         i++;
//       });
//     });

//     htmlContent += "</table>";

//     await page.setContent(htmlContent);
//     const pdfBuffer = await page.pdf({ format: "A4" });
//     res.setHeader("Content-Type", "application/pdf");
//     res.setHeader("Content-Length", pdfBuffer.length);
//     res.setHeader("Content-Disposition", "attachment; filename=salesReport.pdf");
//     res.send(pdfBuffer);

//     await browser.close();
//   } catch (error) {
//     next(new AppError(error.message, 500))
//   }
// }

exports.SaledReportDownloadPDF = async (req, res, next) => {
  try {
    let startDate, endDate;
    if (req.session.startDate && req.session.endDate) {
      startDate = req.session.startDate;
      endDate = req.session.endDate;
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      endDate = new Date();
    }

    // Fetch sales data
    let salesDetails = await orderCollection.orders
      .find({
        orderDate: { $gte: startDate, $lte: endDate },
        "cartData.status": "Delivered",
      })
      .sort({ orderDate: -1 })
      .populate("userId")
      .populate("couponApplied")
      .lean();

    // Process each order to filter only delivered products
    salesDetails = salesDetails.map((order) => {
      order.cartData = order.cartData.filter((product) => product.status === "Delivered");

      const deliveredTotal = order.cartData.reduce((total, product) => total + product.totalCostPerProduct, 0);

      if (order.discountedPrice) {
        const totalOrderPrice = order.grandTotalCost;
        const totalDiscount = totalOrderPrice - order.discountedPrice;

        order.cartData = order.cartData.map((product) => {
          const productDiscount = (product.totalCostPerProduct / totalOrderPrice) * totalDiscount;
          product.finalCost = product.totalCostPerProduct - productDiscount;
          return product;
        });

        order.finalTotal = order.cartData.reduce((sum, product) => sum + product.finalCost, 0);
      } else {
        order.finalTotal = deliveredTotal;
      }

      return order;
    });

    const totalRevenue = salesDetails.reduce((sum, order) => sum + order.finalTotal, 0);

    // Set up fonts
    const fonts = {
      Roboto: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
      },
    };

    const printer = new PdfPrinter(fonts);

    // Define the table header
    const tableBody = [
      [
        { text: "Order ID", style: "tableHeader" },
        { text: "UserName", style: "tableHeader" },
        { text: "Order Date", style: "tableHeader" },
        { text: "Products", style: "tableHeader" },
        { text: "Product Offer", style: "tableHeader" },
        { text: "Quantity", style: "tableHeader" },
        { text: "Before Offer", style: "tableHeader" },
        { text: "Total Cost", style: "tableHeader" },
        { text: "Payment Method", style: "tableHeader" },
        { text: "Status", style: "tableHeader" },
        { text: "Coupons", style: "tableHeader" },
        { text: "Ordered Price", style: "tableHeader" },
      ],
    ];

    // Populate table data
    salesDetails.forEach((order) => {
      order.cartData.forEach((cartItem, index) => {
        tableBody.push([
          index === 0 ? { text: order.orderId, rowSpan: order.cartData.length, style: "tableCell" } : "",
          index === 0 ? { text: order.userId.username, rowSpan: order.cartData.length, style: "tableCell" } : "",
          index === 0
            ? { text: new Date(order.orderDate).toLocaleDateString("en-GB"), rowSpan: order.cartData.length, style: "tableCell" }
            : "",
          { text: cartItem.productName, style: "tableCell" },
          { text: cartItem.offerApplied ? `${cartItem.offerApplied}%` : "-", style: "tableCell" },
          { text: cartItem.productQuantity, style: "tableCell" },
          { text: `${cartItem.productPrice}`, style: "tableCell" },
          { text: cartItem.offerPrice ? `₹${cartItem.offerPrice}` : `${cartItem.productPrice}`, style: "tableCell" },
          index === 0 ? { text: order.paymentType, rowSpan: order.cartData.length, style: "tableCell" } : "",
          index === 0 ? { text: order.orderStatus, rowSpan: order.cartData.length, style: "tableCell" } : "",
          index === 0 ? { text: order.couponApplied ? `${order.couponApplied.discountPercentage}%` : "-", rowSpan: order.cartData.length, style: "tableCell" } : "",
          index === 0 ? { text: `${order.finalTotal}`, rowSpan: order.cartData.length, style: "tableCell" } : "",
        ]);
      });
    });

    // Define document structure
    const docDefinition = {
      pageSize: "A4",
      pageMargins: [10, 10, 10, 10],
      content: [
        { text: "Sales Report", style: "header" },
        {
          style: "tableExample",
          table: {
            headerRows: 1,
            widths: [
              "8%", "10%", "10%", "12%", "8%", "6%", "8%", "8%", "10%", "8%", "8%", "10%",
            ],
            body: tableBody,
          },
          layout: "lightHorizontalLines",
        },
        {
          text: `Total Revenue: ${totalRevenue}`,
          style: "totalRevenue",
          margin: [0, 10, 0, 0],
        },
      ],
      styles: {
        header: {
          fontSize: 14,
          bold: true,
          alignment: "center",
          margin: [0, 0, 0, 10],
        },
        tableHeader: {
          bold: true,
          fontSize: 10,
          fillColor: "#f2f2f2",
          alignment: "center",
        },
        tableCell: {
          fontSize: 9,
          margin: [2, 2, 2, 2],
        },
        totalRevenue: {
          fontSize: 12,
          bold: true,
          alignment: "right",
        },
      },
    };

    // Generate PDF and send response
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=salesReport.pdf");
    
    pdfDoc.pipe(res);
    pdfDoc.end();

  } catch (error) {
    next(new AppError(error.message, 500));
  }
};






//formating the date
const formatDate = (date) => {
  // Implement your date formatting function here
  return date.toISOString().split("T")[0]; // Example implementation
};


//filter based on date
exports.filterDate = async (req, res, next) => {
  try {
    const startOfDay = (date) => {
      return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        6,
        0,
        0,
        0
      );
    };

    const endOfDay = (date) => {
      return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        23,
        59,
        59,
        999
      );
    };
    if (req.body.filterDateFrom && req.body.filterDateTo) {
      let startDate = new Date(req.body.filterDateFrom);
      let endDate = new Date(req.body.filterDateTo);
      startDate = startOfDay(new Date(startDate));
      endDate = endOfDay(new Date(endDate));
      if (startDate > endDate) {
        res.send({ dateInvalid: true });
      }
      const salesData = await orderCollection.orders
        .find({
          orderDate: { $gte: startDate, $lte: endDate },
          orderStatus: "Delivered",
        })
        .sort({ orderDate: -1 })
        // .populate({
        //   path: "cartData.productId",
        //   model: "products",
        //   as: "productDetails",
        // })
        .populate('userId')
        .populate('couponApplied');

      console.log('filtered Data: ', salesData)

      req.session.salesDetails = salesData;
      req.session.filterDates = { datevalues: {} };
      req.session.startDate = startDate;
      req.session.endDate = endDate;
      req.session.startDate2 = startDate;
      req.session.endDate2 = endDate;
      req.session.filterDates.datevalues = { startDate, endDate };
      req.session.save();
      res.send({ success: true });
    }
  } catch (error) {
    next(new AppError(error.message, 500))
  }
}



exports.removeAllFillters = async (req, res, next) => {
  try {
    req.session.salesDetails = null;
    req.session.startDate2 = null;
    req.session.endDate2 = null;
    res.redirect("/admin/report");
  } catch (error) {
    next(new AppError(error.message, 500))
  }
}


//excel download
exports.salesReportDownload = async (req, res, next) => {
  try {
    let startDate, endDate;
    if (
      req.session.filterDates?.datevalues?.startDate &&
      req.session.filterDates?.datevalues?.endDate
    ) {
      startDate = req.session.filterDates.datevalues.startDate;
      endDate = req.session.filterDates.datevalues.endDate;
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      endDate = new Date();
    }

    let salesData = await orderCollection.orders
      .find({
        orderDate: { $gte: startDate, $lte: endDate },
        orderStatus: "Delivered",
      })
      .sort({ orderDate: -1 })
      // .populate({
      //   path: "cartData.productId",
      //   model: "products",
      //   as: "productDetails",
      // })
      .populate('userId')
      .populate('couponApplied');

    if (!salesData || !Array.isArray(salesData)) {
      console.error("salesData is undefined or not an array");
    }

    salesData = salesData.map((v) => {
      v.orderDateFormatted = formatDate(v.orderDate);
      return v;
    });
    const workBook = new exceljs.Workbook();
    const sheet = workBook.addWorksheet("book");
    sheet.columns = [
      {
        header: "Order Number",
        key: "orderNumber",
        width: 15,
        style: { alignment: { horizontal: "center", vertical: "middle" } },
      },
      {
        header: "UserName",
        key: "userName",
        width: 20,
        style: { alignment: { horizontal: "center", vertical: "middle" } },
      },
      {
        header: "Order Date",
        key: "orderDate",
        width: 20,
        style: { alignment: { horizontal: "center", vertical: "middle" } },
      },
      {
        header: "Products",
        key: "products",
        width: 30,
        style: { alignment: { horizontal: "center", vertical: "middle" } },
      },
      {
        header: "Product Offer",
        key: "productOffer",
        width: 20,
        style: { alignment: { horizontal: "center", vertical: "middle" } },
      },
      {
        header: "Quantity",
        key: "quantity",
        width: 15,
        style: { alignment: { horizontal: "center", vertical: "middle" } },
      },
      {
        header: "Before Offer",
        key: "beforeOffer",
        width: 20,
        style: { alignment: { horizontal: "center", vertical: "middle" } },
      },
      {
        header: "Total Cost",
        key: "totalCost",
        width: 20,
        style: { alignment: { horizontal: "center", vertical: "middle" } },
      },
      {
        header: "Payment Method",
        key: "paymentMethod",
        width: 20,
        style: { alignment: { horizontal: "center", vertical: "middle" } },
      },
      {
        header: "Status",
        key: "status",
        width: 15,
        style: { alignment: { horizontal: "center", vertical: "middle" } },
      },
      {
        header: "Coupons",
        key: "coupons",
        width: 20,
        style: { alignment: { horizontal: "center", vertical: "middle" } },
      },
      {
        header: "Before Coupon",
        key: "beforeCoupon",
        width: 20,
        style: { alignment: { horizontal: "center", vertical: "middle" } },
      },
      {
        header: "Ordered Price",
        key: "orderedPrice",
        width: 20,
        style: { alignment: { horizontal: "center", vertical: "middle" } },
      },
    ];

    let currentRow = 1;

    salesData.forEach((order) => {
      order.cartData.forEach((cartItem, index) => {
        const row = sheet.addRow([
          index === 0 ? order.orderId : "",
          index === 0 ? order.userId.username : "",
          index === 0 ? order.orderDate : "",
          cartItem.productName,
          cartItem.offerApplied
            ? `${cartItem.offerApplied}%`
            : "Nil",
          cartItem.productQuantity,
          `Rs.${cartItem.productPrice}`,
          cartItem.offerPrice
            ? `${cartItem.offerPrice}`
            : `${cartItem.productPrice}`
          ,
          index === 0 ? order.paymentType : "",
          index === 0 ? order.orderStatus : "",
          index === 0
            ? order.couponApplied
              ? `${order.couponApplied.discountPercentage}%`
              : "Nil"
            : "",
          index === 0 ? `Rs.${order.grandTotalCost}` : "",
          index === 0
            ? order.discountedPrice
              ? `Rs.${order.discountedPrice}`
              : `Rs.${order.grandTotalCost}`
            : "",
        ]);
      });
    });
    let startIndex = 1;
    let endIndex;
    salesData.forEach((order, orderIndex) => {
      startIndex += 1;
      endIndex = startIndex + order.cartData.length - 1;
      sheet.mergeCells(`A${startIndex}:A${endIndex}`);
      sheet.mergeCells(`B${startIndex}:B${endIndex}`);
      sheet.mergeCells(`C${startIndex}:C${endIndex}`);
      sheet.mergeCells(`I${startIndex}:I${endIndex}`);
      sheet.mergeCells(`J${startIndex}:J${endIndex}`);
      sheet.mergeCells(`K${startIndex}:K${endIndex}`);
      sheet.mergeCells(`L${startIndex}:L${endIndex}`);
      sheet.mergeCells(`M${startIndex}:M${endIndex}`);

      sheet.getCell(`A${startIndex}:M${endIndex}`).style.alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      startIndex += order.cartData.length - 1;
    });

    const totalOrders = salesData.length;
    const totalSales = salesData.reduce(
      (total, sale) => total + sale.grandTotalCost,
      0
    );
    const totalDiscount = salesData.reduce((total, sale) => {
      let discountAmount = sale.cartData.reduce((discount, cartItem) => {
        let productPrice = cartItem.productPrice;
        let priceBeforeOffer = cartItem.productPrice;
        let discountPercentage = cartItem.offerApplied || 0;
        let actualAmount = productPrice * cartItem.productQuantity;
        let paidAmount =
          actualAmount - (actualAmount * discountPercentage) / 100;
        return discount + (actualAmount - paidAmount);
      }, 0);
      return total + discountAmount;
    }, 0);

    sheet.addRow({});
    sheet.addRow({ "Total Orders": totalOrders });
    sheet.addRow({ "Total Sales": "₹" + totalSales });
    sheet.addRow({ "Total Discount": "₹" + totalDiscount });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=salesReport.xlsx"
    );

    await workBook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(new AppError(error.message, 500))
  }
};


// reportGet
// report
// filterOptions
// SaledReportDownloadPDF
// filterDate
// removeAllFillters
// salesReportDownload

