const orderCollection = require('../models/ordersModel'); // Adjust the path as necessary

exports.getSalesReportData = async (query) => {
    // Your logic to fetch sales report data based on the query parameters
    const orders = await orderCollection.orders.find({ /* your query logic */ }).populate('userId');
    return orders;
};