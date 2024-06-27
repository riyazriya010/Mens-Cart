//  user side order controller

//page details in last


const orderCollection = require('../models/ordersModel.js');
const productCollection = require('../models/productModel.js');
const cartCollection = require('../models/cartModel.js');
const { ObjectId } = require('mongodb');
const userCollections = require('../models/userModel.js');
const addressCollections = require('../models/addressModel.js');
const { generateOrderId } = require('../helper/orderId.js');
const paypalPayment = require('../service/payPal.js');
const couponCollection = require('../models/couponModel.js');
const { walletBuy, addingCancellAmountToWallet } = require('../controller/accountControlller.js');
const AppError = require('../middleware/errorHandling.js');
const { invoicePdf } = require("../service/invoicePdf");
const { couponCheck } = require('../helper/couponHelper.js');


///orderget
exports.orderGet = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit; // Calculate the number of orders to skip

        const totalOrders = await orderCollection.orders.countDocuments({ userId: req.session.userId }); // Get total count of orders
        const totalPages = Math.ceil(totalOrders / limit); // Calculate total number of pages

        const orders = await orderCollection.orders.find({ userId: req.session.userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('addressChosen')
            .populate('couponApplied');

        // console.log(orders);

        // Function to determine the order status based on product statuses
        async function determineOrderStatus(productStatuses) {
            let hasPending = false;
            let hasShipped = false;
            let hasDelivered = false;
            let requestedtoReturn = false;
            let returnApproved = false;
            let returnRejected = false;
            let hasCancelled = false;

            for (let status of productStatuses) {
                if (status === "Pending") {
                    hasPending = true;
                    // hasCancelled = false;
                } else if (status === 'Shipped') {
                    hasShipped = true;
                    // hasCancelled = false;
                } else if (status === "Delivered") {
                    hasDelivered = true;
                    // hasCancelled = false;
                } else if (status === "requested to return") {
                    requestedtoReturn = true;
                    // hasCancelled = false;
                } else if (status === 'Approved Return') {
                    returnApproved = true;
                    // hasCancelled = false;
                } else if (status === "Reject Return") {
                    returnRejected = true;
                    // hasCancelled = false;
                } else if (status === "Cancelled") {
                    hasCancelled = true
                    // Continue checking other statuses
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
            } else if (requestedtoReturn) {
                return "requested to return"
            } else if (returnApproved) {
                return 'Approved Return'
            } else if (returnRejected) {
                return "Reject Return"
            } else if (hasCancelled) {
                return "Cancelled";
            } else {
                return "Unknown";
            }
        }

        const updates = orders.map(async order => {
            let statusArr = order.cartData.map(item => item.status);
            order.orderStatus = await determineOrderStatus(statusArr); // Use 'orderStatus' for consistency with template
            // console.log('order.orderStatus: ',order.orderStatus);
            return {
                updateOne: {
                    filter: { _id: order._id },
                    update: { $set: { orderStatus: order.orderStatus } }
                }
            };
        });
        
        // Then, you need to wait for all the promises to resolve
        const updatesArray = await Promise.all(updates);
        
        // Finally, you can use the bulkWrite method to update the database
        await orderCollection.orders.bulkWrite(updatesArray);

        res.render('userPages/orders', {
            orders,
            currentPage: page,
            totalPages
        });
    } catch (error) {
        next(new AppError(error.message, 500))
    }
};





exports.orderDetailsPage = async (req, res, next) => {
    try {
        // Get the order ID from the request parameters
        const orderId = req.params.id;

        // Fetch the order from the database
        const order = await orderCollection.orders.findById(orderId);
        

        if (!order) {
            return res.status(404).render('404'); // Handle case where order is not found
        }

        const address = order.addressChosen;
        const cart = order.cartData;

        //total quantity and sub total of all products
        let totalQuantity = 0
        let subtotal = 0;

        cart.forEach(item => {
            totalQuantity += item.productQuantity;
            subtotal += item.totalCostPerProduct;
        });

        const productIds = cart.map(item => item.productId);

        async function determineOrderStatus(productStatuses) {

            // Initialize flags for each status
            let hasPending = false;
            let hasShipped = false;
            let hasDelivered = false;
            let requestedtoReturn = false;
            let returnApproved = false;
            let returnRejected = false;
            let hasCancelled = false;

            // Loop through the product statuses
            for (let status of productStatuses) {
                if (status === "Pending") {
                    hasPending = true;
                    // hasCancelled = false; // If there's a pending, not all are cancelled
                } else if (status === 'Shipped') {
                    hasShipped = true;
                    // hasCancelled = false;  // If there's a Shipped, not all are cancelled
                } else if (status === "Delivered") {
                    hasDelivered = true;
                    // hasCancelled = false; // If there's a delivered, not all are cancelled
                } else if (status === "requested to return") {
                    requestedtoReturn = true;
                    // hasCancelled = false;
                } else if (status === 'Approved Return') {
                    returnApproved = true;
                    // hasCancelled = false;
                } else if (status === "Reject Return") {
                    returnRejected = true;
                    // hasCancelled = false;
                } else if (status === "Cancelled") {
                    hasCancelled = true
                    // Continue checking other statuses
                } else {
                    throw new Error("Unknown status: " + status);
                }
            }

            // Determine the final order status based on the flags
            if (hasPending) {
                return "Pending";
            } else if (hasShipped) {
                return 'Shipped'
            } else if (hasDelivered) {
                return "Delivered";
            } else if (requestedtoReturn) {
                return "requested to return"
            } else if (returnApproved) {
                return 'Approved Return'
            } else if (returnRejected) {
                return "Reject Return"
            } else if (hasCancelled) {
                return "Cancelled";
            } else {
                return "Unknown";
            }

        }

        let statusArr = []
        cart.forEach(item => {
            statusArr.push(item.status)
        })

        //calculating 14 days form now by data
        let futureDate = order.orderDate
        futureDate.setDate(futureDate.getDate() + 14)

        //store the future date in variable
        let fourteenDaysFromNow = false

        if (order.orderDate === futureDate) {
            fourteenDaysFromNow = true
        }

        let status;

        determineOrderStatus(statusArr).then(resolvedStatus => {
            status = resolvedStatus;
            // You can perform any further actions with the resolved status here
        }).catch(error => {
            console.error(error); // Handle any errors
        });


        // Function to fetch products by their IDs using Mongoose
        async function fetchProductsById(productIds) {
            const product = await productCollection.product.find({ _id: { $in: productIds } })
            return product
        }



        // Fetch the product details
        const products = await fetchProductsById(productIds);


        // Render the page with the order, cart, and product details
        res.render('userPages/singleOrder', { order, orderId, cart, products, totalQuantity, subtotal, status, address, fourteenDaysFromNow });

    } catch (error) {
        next(new AppError(error.message, 500))
    }
};



//Download Invoice
exports.downloadInvoice = async (req,res,next) => {
    try {

        const orderId = req.params.id
        // console.log('orderId: ',orderId)

        const order = await orderCollection.orders.findById(orderId)
        .populate('userId')
        .populate('couponApplied');

        if (!order) {
            return next(new AppError("Order not found", 404));
          }


          //Extract OrderNumber
          const order_id = order.orderId;

           // Construct filename with order number
        const filename = `MensCart_order_invoice_${order_id}.pdf`;

        const stream = res.writeHead(200, {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=${filename}`,
          });


          // the the details sending to the ../service/invoicePdf

          invoicePdf(
            (chunk) => stream.write(chunk),
            () => stream.end(),
            order
          );

        
    } catch (error) {
        next(new AppError(error.message, 500))
    }
}



exports.cancelOrder = async (req, res, next) => {

    try {

        // console.log(req.query);

        const { productId, productQuantity, orderId, reason } = req.query;

        //checking orderId and productId are valid ObjectIds
        if (!ObjectId.isValid(orderId) || !ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: 'Invalid orderId or productId' });
        }

        const orderObjectId = new ObjectId(orderId);
        const productObjectId = new ObjectId(productId);

        // console.log(`Updating order with ID: ${orderObjectId} for product ID: ${productObjectId}`);

        const orderDatas = await orderCollection.orders.findById(orderObjectId)

        const amount = orderDatas.discountedPrice || orderDatas.grandTotalCost

        if(orderDatas.paymentType === "Wallet" || "PayPal"){
            const cod = await addingCancellAmountToWallet(req, amount);
            console.log(cod);
        }

        const result = await orderCollection.orders.updateOne(
            {
                _id: orderObjectId,
                "cartData.productId": productObjectId
            },
            {
                $set: {
                     "cartData.$.status": "Cancelled",
                     
                     "cartData.$.cancelReason": reason
                    }
            }
        );

        if (result.matchedCount === 0) {
            // console.log('Update failed: Product not found or already cancelled');
            return res.status(400).json({ success: false, message: 'Product not found or already cancelled' });
        }

        // console.log('Update successful:', result);

        // Retrieve current product quantity
        const product = await productCollection.product.findById(productId);
        if (!product) {
            // console.log('Product not found');
            return res.status(400).json({ success: false, message: 'Product not found' });
        }

        // Update product quantity
        const newProductQuantity = product.productStock + parseInt(productQuantity);
        await productCollection.product.findByIdAndUpdate(productId, { productStock: newProductQuantity });

        // console.log('Product quantity updated successfully');
        return res.json({ success: true });

    } catch (error) {
        next(new AppError(error.message, 500))
    }
};




//return order
exports.returnOrder = async (req, res, next) => {
    try {
       
        const { orderId, productId, reason } = req.body
        // console.log('reason: ',reason)

        // Ensure the orderId and productId are valid ObjectId instances
        if (!ObjectId.isValid(orderId) || !ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: 'Invalid orderId or productId' });
        }

        const orderObjectId = new ObjectId(orderId);
        const productObjectId = new ObjectId(productId);


        // Find and update the specific product in the cartData array
        const result = await orderCollection.orders.updateOne(
            {
                _id: orderObjectId,
                "cartData.productId": productObjectId
            },
            {
                $set: {
                    "cartData.$.status": "requested to return",
                    "cartData.$.returnReason": reason
                }
            }
        );

        // console.log('result: ',result);

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'Order or Product not found' });
        }

        // console.log(`Order ${orderId}, Product ${productId}: status changed to 'requested to return'`);

        // Return a success response
        return res.json({ success: true });

    } catch (error) {
        next(new AppError(error.message, 500))
    }
};




/* ---- checkout functionalities ----- */

//checout Address
exports.checkoutAddress = async (req, res, next) => {

    try {

        const userId = req.session.userId
        const address = await addressCollections.address.find({ userId: userId });
        // console.log(address);

        res.render('userPages/checkOut-1', { address });

    } catch (error) {
        next(new AppError(error.message, 500))
    }
}



//checkout payment method
exports.checkoutPayment = async (req, res, next) => {
    try {
        res.render('userPages/checkOut-2')
    } catch (error) {
        next(new AppError(error.message, 500))
    }
}



exports.orderPlaced = (req, res, next) => {
    try {

        res.render('userPages/orderPlaced')

    } catch (error) {
        next(new AppError(error.message, 500))
    }
}



//checout placeOrder
exports.checkoutOrder = async (req, res, next) => {
    try {
        
        const address = await addressCollections.address.findById(req.session.addressId);
        const cartData = await cartCollection.cart.find({ userId: req.session.userId }).populate('productId');
        const paymentMethod = req.session.paymentMethod;
        const total = req.session.grandTotal;
        const grandTotal = req.session.couponDiscountPrice || req.session.grandTotal;
        const coupon = await couponCollection.coupon.find({ currentStatus: true, isDelete: false });

        let couponApplied = false;
        let couponId = false;
        let discountAmount = false;

        if (req.session.couponDiscountPrice && req.session.couponId && req.session.discountAmount) {

            couponApplied = true;
            couponId = req.session.couponId;
            discountAmount = req.session.discountAmount;
        }

        // Calculate subtotal and total number of items
        let subtotal = 0;
        let totalItems = 0;
        cartData.forEach(item => {
            const price = item.productId.offerPrice || item.productId.productPrice;
            subtotal += item.productQuantity * price;
            totalItems += item.productQuantity;
        });

         res.render('userPages/checkOut-3', { 
            address, 
            paymentMethod, 
            grandTotal, 
            cartData, 
            subtotal, 
            totalItems, 
            coupon, 
            couponApplied, 
            couponId, 
            discountAmount, 
            total 
        });

    } catch (error) {
        console.error(error); // Log the full error for debugging
        next(new AppError(error.message, 500))
    }
}




//proceed to checkout
exports.proceedCheckout = async (req, res, next) => {

    try {

        req.session.grandTotal = req.query.grandTotal

        req.session.proceed = true;

        return res.json({ success: true });

    } catch (error) {

        next(new AppError(error.message, 500))
    }
}



//address selected
exports.addressSelected = async (req, res, next) => {

    try {

        req.session.addressId = req.query.addressId

        req.session.proceed = false;

        return res.json({ success: true });

    } catch (error) {
        next(new AppError(error.message, 500))
    }
}



exports.paymentSelected = async (req, res, next) => {

    try {

        const paymentMethod = req.query.method;

        if(req.session.grandTotal > 1000 && paymentMethod === 'Cash On Delivery'){
            return res.json({success:false, CODNotAllowd:true});
        }

        if (!paymentMethod) {
            return res.status(400).json({ success: false, message: 'No payment method selected' });
        }

        // Store the payment method in the session
        req.session.paymentMethod = paymentMethod;

        return res.json({ success: true });

    } catch (error) {
        next(new AppError(error.message, 500))
    }

}





exports.placeOrder = async (req, res, next) => {

    try {

        //paypal buying
        if (req.session.paymentMethod === "PayPal") {
            // console.log('return to paypal');
            const paypalLink = await paypalPayment.payAmount(req);
            // console.log('paypal: ', paypalLink);
            return res.json({ success: true, paypalLinkGot: true, paypalLink: paypalLink });
        }

        //wallet buying
        if(req.session.paymentMethod === "Wallet"){

            const walletBuying = await walletBuy(req);
            // console.log('walletBuying: ',walletBuying);
            if(!walletBuying){
                // console.log('no money')
                return res.status(200).json({ success: false, noMoney: true });
            }
            // console.log('money')
           return res.status(200).json({ success: true });
        }

        // console.log('returned to back')

        const addressId = req.session.addressId2 || req.session.addressId
        const address = await addressCollections.address.findById(addressId);

        const cartItems = await cartCollection.cart.find({ userId: req.session.userId });


        // Reducing the quantity from the product collection
        for (const item of cartItems) {
            await productCollection.product.findByIdAndUpdate(
                item.productId,
                { $inc: { productStock: -item.productQuantity } }
            );
        }


        //generating orderId
        const orderId = generateOrderId();

        if (req.session.couponId && req.session.couponDiscountPrice) {

            const coupon = await couponCollection.coupon.findById(req.session.couponId)

            const order = new orderCollection.orders({
                userId: req.session.userId,
                orderId: orderId,
                orderDate: Date.now(),
                addressChosen: address,
                paymentType: req.session.paymentMethod,
                cartData: cartItems,
                couponApplied:coupon._id,
                discountedPrice: req.session.couponDiscountPrice,
                grandTotalCost: req.session.grandTotal
            });


            //creating cart colelction
            await order.save();


            // Deleting cart items for the user
            await cartCollection.cart.deleteMany({ userId: req.session.userId });


        req.session.couponDiscountPrice = null
        req.session.couponId = null
        req.session.discountAmount = null

         return res.status(200).json({ success: true });

        }

        const order = new orderCollection.orders({
            userId: req.session.userId,
            orderId: orderId,
            orderDate: Date.now(),
            addressChosen: address,
            paymentType: req.session.paymentMethod,
            cartData: cartItems,
            grandTotalCost: req.session.couponDiscountPrice || req.session.grandTotal
        });

        //creating cart colelction
        await order.save();


        // Deleting cart items for the user
        await cartCollection.cart.deleteMany({ userId: req.session.userId });

        res.status(200).json({ success: true });

    } catch (error) {
        next(new AppError(error.message, 500))
    }

};



// orderGet
// orderDetailsPage
// downloadInvoice [ ..service/invoicePdf ]
// cancelOrder
// returnOrder

  /*--- checkout pages ---- */

// checkoutAddress
// checkoutPayment
// orderPlaced
// checkoutOrder
// proceedCheckout
// addressSelected
// paymentSelected
// placeOrder [ ../service/paypal ]  [ ../controller/accountController ]

