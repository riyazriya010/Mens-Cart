const paypal = require('paypal-rest-sdk');
const addressCollections = require('../models/addressModel');
const orderCollections = require('../models/ordersModel');
const cartCollections = require('../models/cartModel');
const productCollections = require('../models/productModel');
const { generateOrderId } = require('../helper/orderId.js');
const couponCollection = require('../models/couponModel.js');
const { default: axios } = require("axios");
require('dotenv').config();



const { PAYPAL_MODE, PAYPAL_CLIENT_KEY, PAYPAL_SECRET_KEY } = process.env;

paypal.configure({

    mode: PAYPAL_MODE,  //sandbox or live
    client_id: PAYPAL_CLIENT_KEY,
    client_secret: PAYPAL_SECRET_KEY
})


exports.rePayment = async (req, res) => {
    try {
      let total = parseFloat(req.query.total);
  
      if (isNaN(total)) {
        throw new Error('Invalid total amount');
      }
  
      const response = await axios.get(
        "https://v6.exchangerate-api.com/v6/2e1bfb179c5d9ddf916b90d0/latest/USD"
      );
  
      const exchangeRates = response.data;
      if (exchangeRates.conversion_rates && exchangeRates.conversion_rates.INR) {
        const usdToInrRate = exchangeRates.conversion_rates.INR;
        total = total / usdToInrRate;
      } else {
        console.log("USD to INR conversion rate not available");
      }
  
      const orderId = req.query.orderId;
    //   const pendingPayment = await orderCollections.orders.findById(orderId);
  
      const create_payment_json = {
        "intent": "sale",
        "payer": {
          "payment_method": "paypal"
        },
        "redirect_urls": {
          "return_url": `http://localhost:3005/orderPlaced/paypal?orderId=${orderId}`,
          "cancel_url": `http://localhost:3005/order/paymentFailed?orderId=${orderId}`
        },
        "transactions": [{
          "item_list": {
            "items": [{
              "name": "Book",
              "sku": "001",
              "price": total.toFixed(2),
              "currency": "USD",
              "quantity": 1
            }]
          },
          "amount": {
            "currency": "USD",
            "total": total.toFixed(2)
          },
          "description": "Payment for order"
        }]
      };
  
      const paymentLink = await new Promise((resolve, reject) => {
        paypal.payment.create(create_payment_json, function (error, payment) {
          if (error) {
            console.error('PayPal Error:', error.response);
            reject(error);
          } else {
            req.session.paymentId = payment.id;
  
            for (let i = 0; i < payment.links.length; i++) {
              if (payment.links[i].rel === "approval_url") {
                return resolve(payment.links[i].href);
              }
            }
            reject(new Error('No approval_url found in PayPal response'));
          }
        });
      });
  
      res.json({ paypalLink: paymentLink });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ error: error.message });
    }
  };

  




exports.payAmount = async (req) => {
    try {
        
        let total =  parseFloat(req.session.grandTotal);
        console.log('total: ', total); // Ensure this logs 'number'

        if (isNaN(total)) {
            throw new Error('Invalid total amount');
        }

        const response = await axios.get(
            "https://v6.exchangerate-api.com/v6/2e1bfb179c5d9ddf916b90d0/latest/USD"
        );
        const exchangeRates = response.data;
        if (exchangeRates.conversion_rates && exchangeRates.conversion_rates.INR) {
            const usdToInrRate = exchangeRates.conversion_rates.INR;
            total = total / usdToInrRate;
        } else {
            console.log("USD to INR conversion rate not available");
        }

       

        const create_payment_json = {
            "intent": "sale",
            "payer": {
                "payment_method": "paypal"
            },
            "redirect_urls": {
                "return_url": `http://localhost:3005/orderPlaced/paypal`,
                "cancel_url": `http://localhost:3005/order/paymentFailed`
            },
            "transactions": [{
                "item_list": {
                    "items": [{
                        "name": "Book",
                        "sku": "001",
                        "price": total.toFixed(2),
                        "currency": "USD",
                        "quantity": 1
                    }]
                },
                "amount": {
                    "currency": "USD",
                    "total": total.toFixed(2)
                },
                "description": "Hat for the best team ever"
            }]
        };
        console.log('Creating PayPal payment...');

        return new Promise((resolve, reject) => {
            paypal.payment.create(create_payment_json, function (error, payment) {
                if (error) {
                    console.error('PayPal Error:', error.response);
                    reject(error);
                } else {
                    console.log('Payment created successfully:', payment);
                    req.session.paymentId = payment.id;

                    for (let i = 0; i < payment.links.length; i++) {
                        if (payment.links[i].rel === "approval_url") {
                            console.log('link: ', payment.links[i].href);
                            return resolve(payment.links[i].href);
                        }
                    }
                    reject(new Error('No approval_url found in PayPal response'));
                }
            });
        })
    } catch (error) {
        console.log('catch error');
        console.error(error.message);
        throw new Error(error.message);
    }
};



//payment Success
exports.paymentSuccess = async (req, res) => {
    try {

        console.log('payapl Came');
        const addressId = req.session.addressId2 || req.session.addressId
        const address = await addressCollections.address.findById(addressId);
        const cartItems = await cartCollections.cart.find({ userId: req.session.userId });

        //failed re payment
        if (req.query.orderId) {
            console.log('orderId: ',req.query.orderId)
            const orderId = req.query.orderId
            const order = await orderCollections.orders.findByIdAndUpdate(orderId,{
                paymentType: 'Paypal'
            })
            console.log('order: ',order);

            // Reducing the quantity from the product collection
            for (const item of cartItems) {
                await productCollections.product.findByIdAndUpdate(
                    item.productId,
                    { $inc: { productStock: -item.productQuantity } }
                );
            }

           return res.render('userPages/orderPlaced');
        }

        console.log('paypal crossed the fail payment')
        // Reducing the quantity from the product collection
        for (const item of cartItems) {
            await productCollections.product.findByIdAndUpdate(
                item.productId,
                { $inc: { productStock: -item.productQuantity } }
            );
        }


        //generating orderId
        const orderId = generateOrderId();

        if (req.session.couponId && req.session.couponDiscountPrice) {

            const coupon = await couponCollection.coupon.findById(req.session.couponId)

            const order = new orderCollections.orders({
                userId: req.session.userId,
                orderId: orderId,
                orderDate: Date.now(),
                addressChosen: address,
                paymentType: req.session.paymentMethod,
                cartData: cartItems,
                couponApplied: coupon._id,
                discountedPrice: req.session.couponDiscountPrice,
                grandTotalCost: req.session.grandTotal
            });


            //creating cart colelction
            await order.save();

console.log('crossed save');
            // Deleting cart items for the user
            await cartCollections.cart.deleteMany({ userId: req.session.userId });

            req.session.couponDiscountPrice = null
            req.session.couponId = null
            req.session.discountAmount = null

            res.render('userPages/orderPlaced');
        }else{

        const order = new orderCollections.orders({
            userId: req.session.userId,
            orderId: orderId,
            orderDate: Date.now(),
            addressChosen: address,
            paymentType: req.session.paymentMethod,
            cartData: cartItems,
            grandTotalCost: req.session.grandTotal
        });

        //creating cart colelction
        await order.save();


        // Deleting cart items for the user
        await cartCollections.cart.deleteMany({ userId: req.session.userId });


        //   res.status(200).json({ message: "Order placed successfully" });
        res.render('userPages/orderPlaced');
      }

    } catch (error) {
        console.error(error.message);
    }
}




exports.failedPayment = async (req, res) => {
    try {



        const addressId = req.session.addressId2 || req.session.addressId
        const address = await addressCollections.address.findById(addressId);
        const cartItems = await cartCollections.cart.find({ userId: req.session.userId });


        if(req.query.orderId){
            return res.render('userPages/paymentFailed');
        }


        //generating orderId
        const orderId = generateOrderId();

        if (req.session.couponId && req.session.couponDiscountPrice) {

            const coupon = await couponCollection.coupon.findById(req.session.couponId)

            const order = new orderCollections.orders({
                userId: req.session.userId,
                orderId: orderId,
                orderDate: Date.now(),
                addressChosen: address,
                paymentType: "Payment Failed",
                cartData: cartItems,
                couponApplied: coupon._id,
                discountedPrice: req.session.couponDiscountPrice,
                grandTotalCost: req.session.grandTotal
            });


            //creating cart colelction
            await order.save();


            // Deleting cart items for the user
            await cartCollections.cart.deleteMany({ userId: req.session.userId });

            req.session.couponDiscountPrice = null
            req.session.couponId = null
            req.session.discountAmount = null

            res.render('userPages/paymentFailed');
        }else{

        const order = new orderCollections.orders({
            userId: req.session.userId,
            orderId: orderId,
            orderDate: Date.now(),
            addressChosen: address,
            paymentType: "Payment Failed",
            cartData: cartItems,
            grandTotalCost: req.session.grandTotal
        });

        //creating cart colelction
        await order.save();


        // Deleting cart items for the user
        await cartCollections.cart.deleteMany({ userId: req.session.userId });


        res.render('userPages/paymentFailed');
      }

    } catch (error) {
        console.error(error.message);
    }
}
