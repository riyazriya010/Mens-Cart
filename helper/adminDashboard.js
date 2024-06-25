const orderCollection = require('../models/ordersModel.js');
const productCollection = require('../models/productModel.js');
const categoryCollection = require('../models/categoryModel.js');
const useCollection = require('../models/userModel.js');
const { order } = require('paypal-rest-sdk');
const AppError = require('../middleware/errorHandling.js');



//getTodayRevenue
exports.getTodayRevenue = async (req, res, next) => {
    try {

        const today = new Date();
        // const yesterday = new Date();
        // yesterday.setDate(today.getDate() - 2);
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));



        const orderData = await orderCollection.orders.aggregate([
            {
                $match: {
                    orderDate: { $gte: startOfDay, $lte: endOfDay },
                    orderStatus: 'Delivered'
                }
            },
            {
                $group: {
                    _id: "",
                    totalRevenue: {
                        $sum: {
                            $cond: {
                                if: { $ne: ["$discountedPrice", null] }, // Check if discountedPrice is not null
                                then: "$discountedPrice", // Use discountedPrice if not null
                                else: "$grandTotalCost" // Use grandTotalCost if discountedPrice is null
                            }
                        }
                    }
                }
            }
        ]);

        return orderData; // Return the data to be used in the controller

    } catch (error) {
        next(new AppError(error.message, 500))
    }
}



//getTotalOrders
exports.getTotalOrders = async (req, res, next) => {
    try {

        const totalOrders = await orderCollection.orders.find({
            orderStatus: 'Delivered'
        });

        // console.log('totalOrders: ',totalOrders)

        return totalOrders

    } catch (error) {
        next(new AppError(error.message, 500))
    }
}



//getTotalProducts
exports.getTotalProducts = async (req, res, next) => {
    try {

        const totalProducts = await orderCollection.orders.aggregate([
            { $match: { orderStatus: 'Delivered' } },

            {
                $project: {
                    cartSize: { $size: '$cartData' }
                }
            },

            {
                $group: {
                    _id: "",
                    getTotalProducts: {
                        $sum: '$cartSize'
                    }
                }

            }
        ])

        return totalProducts

    } catch (error) {
        next(new AppError(error.message, 500))
    }
}




//cuurentMonth Revenue
exports.currentMonth = async (req, res, next) => {
    try {

        // const today = new Date();
        // const past30Days = new Date();
        // past30Days.setDate(today.getDate() - 30);
        // console.log('past30Days: ',past30Days)
        // console.log('today: ',today)

        const today = new Date();
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000); // subtract 1 day to get yesterday
        const past30Days = new Date();
        past30Days.setDate(today.getDate() - 30);

        const monthEarning = await orderCollection.orders.aggregate([
            {
                $match: {
                    $and: [
                        { orderStatus: 'Delivered' },
                        { orderDate: { $gt: past30Days, $lt: yesterday } }]
                },

            },

            {
                $group: {
                    _id: "",
                    currentMonth: {
                        $sum: {
                            $cond: {
                                if: { $ne: ["$discountedPrice", null] }, // Check if discountedPrice is not null
                                then: "$discountedPrice", // Use discountedPrice if not null
                                else: "$grandTotalCost" // Use grandTotalCost if discountedPrice is null
                            }
                        }
                    }
                }
            }
        ])

        return monthEarning

    } catch (error) {
        next(new AppError(error.message, 500))
    }
}




//categorySale Last Two Weeks
exports.categorySale = async (filter) => {
    try {

        let destination

        if (filter === 'Monthly') {

                const today = new Date();
                startOfToday = new Date(today.setHours(0, 0, 0, 0));
                const startOfYesterday = new Date(startOfToday);
                startOfYesterday.setDate(startOfToday.getDate() - 1);

                destination = new Date(startOfYesterday);
                destination.setDate(startOfYesterday.getDate() - 30);

            } else if (filter === 'Yearly') {

                const today = new Date();
                startOfToday = new Date(today.setHours(0, 0, 0, 0));
                const startOfYesterday = new Date(startOfToday);
                startOfYesterday.setDate(startOfToday.getDate() - 1);

                destination = new Date(startOfYesterday);
                destination.setFullYear(startOfYesterday.getFullYear() - 1);

            }else {
            const today = new Date();
            startOfToday = new Date(today.setHours(0, 0, 0, 0));
            const startOfYesterday = new Date(startOfToday);
            startOfYesterday.setDate(startOfToday.getDate() - 1);

            destination = new Date(startOfToday);
            destination.setDate(startOfToday.getDate() - 14);

        }

        const orderCursor = await orderCollection.orders.aggregate([
            {
                $match: {
                    $and: [
                        { orderStatus: 'Delivered' },
                        { orderDate: { $gt: destination, $lt: startOfToday } }]
                },
            },
        ]).exec();

        const categorySales = {}

        orderCursor.forEach(order => {
            order.cartData.forEach(element => {
                if (categorySales[element.categoryName]) {
                    categorySales[element.categoryName] += element.productQuantity
                } else {
                    categorySales[element.categoryName] = element.productQuantity
                }
            });

        });

        return categorySales

    } catch (error) {
        console.error(error.message);
        // next(new AppError(500));
    }
}



//last Two Weeks Revenue
exports.lastTwoWeekRevenue = async (filter) => {
    try {

        let destination
        // let past30DaysFromYesterday
        // let past1YearFromYesterday
        // let startOfToday

        if (filter === 'Monthly') {

                const today = new Date();
                startOfToday = new Date(today.setHours(0, 0, 0, 0));
                const startOfYesterday = new Date(startOfToday);
                startOfYesterday.setDate(startOfToday.getDate() - 1);

                destination = new Date(startOfYesterday);
                destination.setDate(startOfYesterday.getDate() - 30);

        } else if (filter === 'Yearly') {

                const today = new Date();
                startOfToday = new Date(today.setHours(0, 0, 0, 0));
                const startOfYesterday = new Date(startOfToday);
                startOfYesterday.setDate(startOfToday.getDate() - 1);

                destination = new Date(startOfYesterday);
                destination.setFullYear(startOfYesterday.getFullYear() - 1);
            
        } else {
            const today = new Date();
            startOfToday = new Date(today.setHours(0, 0, 0, 0));
            const startOfYesterday = new Date(startOfToday);
            startOfYesterday.setDate(startOfToday.getDate() - 1);

            destination = new Date(startOfToday);
            destination.setDate(startOfToday.getDate() - 14);
        }

        const orderCursor = await orderCollection.orders.aggregate([
            {
                $match: {
                    $and: [
                        { orderStatus: 'Delivered' },
                        { orderDate: { $gt: destination, $lt: startOfToday } }
                    ]
                }
            },
            {
                $project: {
                    _id: 1,
                    orderDate: 1,
                    discountedPrice: { $ifNull: ["$discountedPrice", null] },
                    grandTotalCost: { $ifNull: ["$grandTotalCost", null] }
                }
            },
            {
                $sort: {
                    "orderDate": 1
                }
            }
        ]).exec()

        // const ordersData = await orderCursor.toArray();

        const arr = []

        await orderCursor.forEach(element => {
            const { orderDate, discountedPrice, grandTotalCost } = element;
            const price = discountedPrice !== null ? discountedPrice : grandTotalCost;
            arr.push({ orderDate, price });
        });

        return arr;

    } catch (error) {
        console.error(error.message);
        throw new Error("Error fetching last two weeks orders");
    }

}



//top Products
exports.topProducts = async (req, res) => {
    try {

        const topProduct = await orderCollection.orders.aggregate([
            {
                $match: { orderStatus: 'Delivered' }
            },
            {
                $unwind: '$cartData'
            },
            {
                $group: {
                    _id: '$cartData.productId',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: 10
            },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            {
                $unwind: '$product'
            },
            {
                $project: {
                    _id: 0,
                    productId: '$_id',
                    count: 1,
                    productName: '$product.productName',
                    productPrice: '$product.offerPrice'
                }
            }
        ]);

        console.log('topProduct: ', topProduct)

        return topProduct

    } catch (error) {
        console.error(error.message);
        throw new Error("Error fetching last two weeks orders");
    }
}



//top Category
exports.topCategory = async (req, res, next) => {
    try {
        const topCategories = await orderCollection.orders.aggregate([
            {
                $match: { orderStatus: 'Delivered' }
            },
            {
                $unwind: '$cartData'
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'cartData.productId',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            {
                $unwind: '$product'
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'product.parentCategory',
                    foreignField: '_id',
                    as: 'category'
                }
            },
            {
                $unwind: '$category'
            },
            {
                $group: {
                    _id: '$category.categoryName',
                    quantity: { $sum: 1 }
                }
            },
            {
                $sort: { quantity: -1 }
            },
            {
                $limit: 10
            }
        ]);

        return topCategories
    } catch (error) {
        console.error(error.message);
        throw new Error("Error fetching last two weeks orders");
    }
};
