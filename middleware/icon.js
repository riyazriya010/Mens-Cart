const wishlistCollections = require('../models/wishlistModel.js')
const cartCollections = require('../models/cartModel.js');

exports.Icon = async (req, res, next) => {
  try {
    const wishlist = await wishlistCollections.wishlist.find({userId:req.session.userId});  // Changed res to req
    const cart = await cartCollections.cart.find({userId:req.session.userId});

    // Store the data in res.locals
    res.locals.iconData = {
      wishlistCount: wishlist.length,
      cartCount: cart.length,
    };

    next(); // Call the next middleware or route
  } catch (error) {
    console.error(error.message);
    next(error); // Pass the error to the next middleware
  }
}
