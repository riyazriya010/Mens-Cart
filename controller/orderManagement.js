// admin side oredr management

//page details at last

const orderCollections = require('../models/ordersModel.js');
const productCollections = require('../models/productModel.js');
const { addingReturnAmountToWallet } = require('../controller/accountControlller.js');
const { ObjectId } = require('mongodb');
const AppError = require('../middleware/errorHandling.js');


exports.orderListing = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit; // Calculate number of orders to skip

        const totalOrders = await orderCollections.orders.countDocuments(); // Get total count of orders
        const totalPages = Math.ceil(totalOrders / limit); // Calculate total number of pages

        // Populate the userId field with user details
        const orders = await orderCollections.orders.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('userId')
            .populate('couponApplied')

        // Function to determine the order status based on product statuses
        async function determineOrderStatus(productStatuses) {
            let hasPending = false;
            let hasShipped = false;
            let hasDelivered = false;
            let hasRequestedtoReturn = false;
            let returnApproved = false;
            let returnRejected = false;
            let hasCancelled = false;

            for (let status of productStatuses) {
                if (status === "Pending") {
                    hasPending = true;
                } else if (status === 'Shipped') {
                    hasShipped = true;
                } else if (status === "Delivered") {
                    hasDelivered = true;
                } else if (status === "requested to return") {
                    hasRequestedtoReturn = true;
                } else if(status === 'Approved Return'){
                    returnApproved = true;
                    // hasCancelled = false;
                } else if(status === "Reject Return"){
                    returnRejected = true;
                    // hasCancelled = false;
                } else if (status === "Cancelled") {
                    hasCancelled = true;
                } else {
                    throw new Error("Unknown status: " + status);
                }
            }

            if (hasPending) {
                return "Pending";
            } else if (hasShipped) {
                return 'Shipped';
            } else if (hasDelivered) {
                return "Delivered";
            } else if (hasRequestedtoReturn) {
                return "requested to return"
            }else if(returnApproved){
                return 'Approved Return'
            }else if(returnRejected){
                return "Reject Return"
            } else if (hasCancelled) {
                return "Cancelled";
            } else {
                return "Unknown";
            }
        }

        // Determine the status for each order and filter out "requested to return" items
        const filteredOrders = [];

        for (let order of orders) {
            order.cartData = order.cartData

            // Check if the cartData is not null or empty
            if (order.cartData.length > 0) {
                let statusArr = order.cartData.map(item => item.status);
                order.orderStatus = await determineOrderStatus(statusArr);
                filteredOrders.push(order); // Add to filtered orders if it has valid cart data
            }
        }

        //    console.log(filteredOrders);

        res.render('adminPages/orderManagement', {
            orders: filteredOrders,
            currentPage: page,
            totalPages
        });

    } catch (error) {
        next(new AppError(error.message, 500))
    }
};



exports.adminOrderDetails = async (req, res, next) => {
    try {
        const orderId = req.params.id;

        const order = await orderCollections.orders.findById(orderId);

        if (!order) {
            return res.status(404).render('404'); // Handle case where order is not found
        }

        const address = order.addressChosen;
        const cart = order.cartData // Filter out products with "requested to return" status

        // Total quantity and subtotal of all products
        let totalQuantity = 0;
        let subtotal = 0;

        cart.forEach(item => {
            totalQuantity += item.productQuantity;
            subtotal += item.totalCostPerProduct * item.productQuantity;
        });

        const productIds = cart.map(item => item.productId);

        async function determineOrderStatus(productStatuses) {
            let hasPending = false;
            let hasShipped = false;
            let hasDelivered = false;
            let hasRequestedtoReturn = false;
            let returnApproved = false;
            let returnRejected = false;
            let hasCancelled = false;

            for (let status of productStatuses) {
                if (status === "Pending") {
                    hasPending = true;
                } else if (status === 'Shipped') {
                    hasShipped = true;
                } else if (status === "Delivered") {
                    hasDelivered = true;
                } else if (status === "requested to return") {
                    hasRequestedtoReturn = true;
                } else if(status === 'Approved Return'){
                    returnApproved = true;
                    // hasCancelled = false;
                } else if(status === "Reject Return"){
                    returnRejected = true;
                    // hasCancelled = false;
                } else if (status === "Cancelled") {
                    hasCancelled = true;
                } else {
                    throw new Error("Unknown status: " + status);
                }
            }

            if (hasPending) {
                return "Pending";
            } else if (hasShipped) {
                return 'Shipped';
            } else if (hasDelivered) {
                return "Delivered";
            } else if (hasRequestedtoReturn) {
                return "requested to return";
            }else if(returnApproved){
                return 'Approved Return'
            }else if(returnRejected){
                return "Reject Return"
            } else if (hasCancelled) {
                return "Cancelled";
            } else {
                return "Unknown";
            }
        }

        let statusArr = cart.map(item => item.status);
        let status = await determineOrderStatus(statusArr);

        async function fetchProductsById(productIds) {
            const products = await productCollections.product.find({ _id: { $in: productIds } });
            return products;
        }

        const products = await fetchProductsById(productIds);

        res.render('adminPages/singleOrderManagement', {
            address,
            order,
            cart,
            products,
            totalQuantity,
            subtotal,
            status
        });

    } catch (error) {
        next(new AppError(error.message, 500))
    }
};




exports.statusChange = async (req, res, next) => {

    try {

        const object = JSON.parse(req.query.object);
        const { productId, orderId, value } = object
        // console.log(productId, orderId, value);

        if (!ObjectId.isValid(orderId) || !ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: 'Invalid orderId or productId' });
        }

        const orderObjectId = new ObjectId(orderId);
        const productObjectId = new ObjectId(productId);

        const result = await orderCollections.orders.updateOne(
            {
                _id: orderObjectId,
                "cartData.productId": productObjectId
            },
            {
                $set: { "cartData.$.status": value }
            }
        );

        if (result.matchedCount === 0) {
            console.log('Update failed: Product not found or already status changed');
            return res.status(400).json({ success: false, message: 'Product not found or already status changed' });
        }

        // console.log('Update successful:', result);
        return res.json({ success: true });

    } catch (error) {
        next(new AppError(error.message, 500))
    }
}



exports.returnManagement = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        const orders = await orderCollections.orders.find();

        let filteredCartData = [];
        let productIds = [];
        let orderDates = [];

        orders.forEach(order => {
            const cartData = order.cartData.filter(item => item.status === "requested to return");
            if (cartData.length > 0) {
                filteredCartData = filteredCartData.concat(cartData);
                const matchingCartData = order.cartData.find(item => item.status === "requested to return");
                if (matchingCartData) {
                    productIds.push(matchingCartData.productId); // Assuming productId is unique
                    orderDates.push(order.orderDate);
                }
            }
        });

        const products = await productCollections.product.find({ _id: { $in: productIds } });

        const totalItems = filteredCartData.length;
        const paginatedCartData = filteredCartData.slice(skip, skip + limit);
        const totalPages = Math.ceil(totalItems / limit);

        res.render('adminPages/returnManagement', {
            cartData: paginatedCartData,
            products,
            orderDates,
            currentPage: page,
            totalPages
        });
    } catch (error) {
        next(new AppError(error.message, 500))
    }
};





exports.returnApprovedOrReject = async (req, res, next) => {
    try {
        const object = JSON.parse(req.query.object);

        const { productId, cartId, value } = object;

        if (!ObjectId.isValid(productId) || !ObjectId.isValid(cartId)) {
            return res.status(400).json({ success: false, message: 'Invalid orderId or productId' });
        }

        const productObjectId = new ObjectId(productId);
        const cartObjectId = new ObjectId(cartId);

        // Find and update the order
        const order = await orderCollections.orders.findOneAndUpdate(
            // Filter criteria
            { "cartData._id": cartObjectId, "cartData.productId": productObjectId },
            // Update operation
            { $set: { "cartData.$.status": value } },
            // Options
            { new: true } // To return the modified document
        );

        // console.log('not updated')

        if (!order) {
            // If order not found
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        
        if(value === "Approved Return"){
        
        const orderDatas = await orderCollections.orders.findOne(
            { "cartData._id": cartObjectId, "cartData.productId": productObjectId }
        )

        const amount = orderDatas.discountedPrice || orderDatas.grandTotalCost
        // console.log('return anount: ',amount);

        if(orderDatas.paymentType === "Wallet" || "PayPal" || "Cash On Delivery"){
            const cod = await addingReturnAmountToWallet(req, amount);
            // console.log('return cod: ',cod);
        }

    }

        res.json({ success: true, order });

    } catch (error) {
        next(new AppError(error.message, 500))
    }
};



// orderListing
// adminOrderDetails
// statusChange
// returnManagement
// returnApprovedOrReject