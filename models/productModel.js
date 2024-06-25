const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({

    productName:{ type:String, required:true },
    parentCategory:{ type:mongoose.Types.ObjectId, required:true, ref:'category' },
    productImage:[ { type:String } ],
    productPrice:{ type:Number, required:true },
    productStock:{ type:Number, required:true },
    isListed:{ type:Boolean, default:true },
    productOfferId:{ type:mongoose.Types.ObjectId, default:null },
    offerPrice:{ type:Number, default:null },
    offerApplied:{type:Number,default:null},
    isDeleted:{ type:Boolean, default:false },
    wishlist:{ type:Boolean,default:false }

}, { timestamps: true,strictPopulate: false }
);

exports.product = mongoose.model('products',productSchema);