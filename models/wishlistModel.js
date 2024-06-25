const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema({
  userId: { type: mongoose.Types.ObjectId, required: true, ref: 'users'},
  productId: { type: mongoose.Types.ObjectId, required: true, ref: 'products'},
  addedToCart: {type:Boolean,default:false}
}, { timestamps: true,strictPopulate: false }
);


exports.wishlist = mongoose.model('wishlist',wishlistSchema)