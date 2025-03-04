const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Types.ObjectId, required: true, ref: 'user' },
    orderId:{ type:String, required:true },
    orderDate: { type: Date, default: Date.now },
    paymentType: { type: String, required: true},
    orderStatus: { type: String, required: true, default: 'Pending' },
    addressChosen: { type: Array, required: true }, // Embed the address schema
    cartData: { type: Array, required: true  },
    grandTotalCost: { type: Number, required: true  },
    paymentId: { type: String,default: null },
    couponApplied: { type: mongoose.Types.ObjectId , default: null, ref: 'coupons' },
    discountedPrice: { type: Number, default:null },
    cancelReason:{type:String,default: null},
    returnReason:{type:String,default: null}
} , { timestamps: true,strictPopulate: false }
)
exports.orders=mongoose.model('order',orderSchema)
