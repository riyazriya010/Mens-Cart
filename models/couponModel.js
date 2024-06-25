const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  couponCode: { type: String, required: true },
  discountPercentage: { type: Number, min: 5, max: 90, required: true },
  startDate: {type: Date, required: true, default: new Date().toLocaleString()},
  endDate: { type: Date, required: true },
  minimumPurchase: { type: Number, required: true },
//   maximumDiscount: { type: Number, required: true },
  currentStatus: { type: Boolean, required: false, default: true },
  isDelete: { type: Boolean, required: false, default: false },
}, { timestamps: true,strictPopulate: false }
);

exports.coupon = mongoose.model("coupons", couponSchema);