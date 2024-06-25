const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({

    userId: { type: mongoose.Types.ObjectId, required: true, ref: 'users' },
    productId: { type: mongoose.Types.ObjectId, required: true, ref: 'products' },
    productName:{type:String,required: true},
    categoryName:{type:String,required: true},
    productPrice: {type:String,required:true},
    productQuantity: { type: Number, required: true, default: 1, min: 1 },
    offerPrice: { type: Number, default:null },
    offerApplied: { type: Number, default:null },
    totalCostPerProduct: { type: Number },
    status: { type: String, default: 'Pending' },
    returnReason:{type:String, default:null},
    cancelReason:{ type: String, default:null }

}, { timestamps: true,strictPopulate: false }
)

exports.cart = new mongoose.model('cart',cartSchema);