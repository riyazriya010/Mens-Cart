const express = require('express');
const userRouter = express.Router();
const userController = require("../controller/userController.js");
const passport = require('passport');
const shopController = require('../controller/shopController.js');
const middleware = require("../middleware/userLog.js");
const cartController = require('../controller/cartController.js');
const accountController = require('../controller/accountControlller.js');
const orderController = require('../controller/orderController.js');
const wishlistController = require('../controller/wishlistController.js')
const iconDataMiddleware = require("../middleware/icon.js");
const paypalController = require('../service/payPal.js');
const couponController = require('../controller/couponManagement.js');


// common user Auth
userRouter.use(middleware.isLogged);
userRouter.use(iconDataMiddleware.Icon);


//user's
userRouter.get('/',userController.landingPage);
userRouter.get('/login',middleware.redirectIfLoggedIn,userController.loginGet);
userRouter.post('/loginVerify',userController.loginVerify);
userRouter.get('/signup',middleware.redirectIfLoggedIn,userController.signupGet);
userRouter.post('/signupVerify',userController.signupVerify);
userRouter.get('/logout',userController.logout);
userRouter.get('/otp',middleware.redirectIfLoggedIn,userController.optGet);
userRouter.post('/otpVerify',userController.otpVerify);
userRouter.get('/resendOtp',userController.resendOtp);
userRouter.get('/getRemainingTime', userController.getRemainingTime);
userRouter.get('/auth/google',passport.authenticate('google',{ scope:['email', 'profile'], prompt: 'select_account' }));
userRouter.get('/google/callback',passport.authenticate('google',{failureRedirect:'https://menscart.site/login'}),userController.googleCallback);
userRouter.get('/userProfile',middleware.redirectNotLoggedIn,accountController.userProfile);
userRouter.post('/userProfileVerify',accountController.userProfileVerify);
userRouter.get('/about',middleware.redirectIfLoggedIn,userController.aboutGet);


//forget Password
userRouter.get('/recoverEmail',middleware.redirectIfLoggedIn,userController.emailGet);
userRouter.post('/emailVerify',userController.emailVerify);
userRouter.get('/recoverOtp',userController.otpGetForget);
userRouter.post('/forgetVerifyOtp',userController.forgetVerifyOtp);
userRouter.get('/otp/resend',userController.otpResend)
userRouter.get('/recoverPassword',userController.recoverPasswordGet);
userRouter.post('/recoverPassVerify',userController.recoverPassVerify);



//shop
userRouter.get('/shop',shopController.shopGet);
// userRouter.get('/shop/filter',shopController.applyFilter);
userRouter.get('/filterProduct',shopController.filter);



//singleProduct
userRouter.get('/singleProduct',shopController.singleProduct);
userRouter.post('/admin/addRating',shopController.addRatings);



//cart
userRouter.get('/cart',middleware.redirectNotLoggedIn,cartController.cartGet);
userRouter.post('/cart/addToCart',cartController.addToCart)
userRouter.delete('/cart/deleteCart',cartController.deleteCartItem);
userRouter.delete('/deleteAll',cartController.deleteAll);
userRouter.put('/cart/increase',cartController.increaseQty);
userRouter.put('/cart/decrease',cartController.decreaseQty);
userRouter.get('/cart/emptyCart',middleware.redirectNotLoggedIn,cartController.emptyCart);


//wishlist
userRouter.get('/wishlist',middleware.redirectNotLoggedIn,wishlistController.wishlistGet);
userRouter.post('/wishlist/addItem/:id',wishlistController.additemToWishlist);
userRouter.post('/wishlist/product/addToCart',wishlistController.addToCart);
userRouter.delete('/wishlist/deleteItem',wishlistController.deleteItem);
userRouter.get('/wishlist/emptyList',middleware.redirectNotLoggedIn,wishlistController.emptyWishlist);


//address
userRouter.get('/address',middleware.redirectNotLoggedIn,accountController.addressGet);
userRouter.get('/editAddress/:id',middleware.redirectNotLoggedIn,accountController.editAddress);
userRouter.put('/edit/addressVerify',accountController.editAddressVerify);
userRouter.get('/addAdress',middleware.redirectNotLoggedIn,accountController.addAddressGet);
userRouter.post('/addressVerify',accountController.addAddressVerify);
userRouter.delete('/address/delete',accountController.deleteAddress);


//checkout proceeds
userRouter.get('/checkout/address',middleware.redirectNotLoggedIn,orderController.checkoutAddress);
userRouter.get('/checkout/payment',middleware.redirectNotLoggedIn,orderController.checkoutPayment);
userRouter.get('/checkout/placeOrder',middleware.redirectNotLoggedIn,orderController.checkoutOrder);
userRouter.post('/cart/proceedCheckout',orderController.proceedCheckout);
userRouter.post('/checkout/addressSelected',orderController.addressSelected);
userRouter.post('/checkout/paymentSelected',orderController.paymentSelected);
userRouter.post('/checkout/placeOrder',orderController.placeOrder);
userRouter.get('/failed/payment',paypalController.rePayment);
userRouter.get('/orderPlaced',middleware.redirectNotLoggedIn,orderController.orderPlaced);
userRouter.get('/orderPlaced/paypal',middleware.redirectNotLoggedIn,paypalController.paymentSuccess);
userRouter.get('/order/paymentFailed',middleware.redirectNotLoggedIn,paypalController.failedPayment)
// userRouter.post('/checkout/address/select2',checkoutController.addressSelect2);


//orders
userRouter.get('/order',middleware.redirectNotLoggedIn,orderController.orderGet);
userRouter.get('/order/singleOrder/:id',middleware.redirectNotLoggedIn,orderController.orderDetailsPage);
userRouter.get('/order/singleOrder/downloadInvoice/:id',orderController.downloadInvoice);
userRouter.post('/order/cancel',orderController.cancelOrder);
userRouter.put('/order/return',orderController.returnOrder);
userRouter.put('/coupon/apply',couponController.couponApply);
userRouter.put('/coupon/remove',couponController.removeCoupon);


//wallet
userRouter.get('/wallet',middleware.redirectNotLoggedIn,accountController.walletGet);

module.exports = userRouter;