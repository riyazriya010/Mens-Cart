const mongoose = require("mongoose");


const otpSchema = new mongoose.Schema({
    email: { type: String, required: true },
    otp: { type: String, required: true },
    expireAt: { type: Date, required: true },
    generatedAt: { type: Date, required: true },
}, { timestamps: true,strictPopulate: false }
);


exports.otp = mongoose.model('otp',otpSchema);