const mongoose  = require('mongoose');

const addressSchema = new mongoose.Schema({
    userId: { type: mongoose.Types.ObjectId, required: true, ref:'users' },
    name: { type: String, required: true },
    address1: { type: String, required: true },
    address2: { type: String, required: true },
    // addressTitle: { type: String, required: true },
    phone: { type: Number, required: true },
    alternatePhone: { type: Number, required: true },
    city: { type: String, required: true },
    land: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: Number, required: true },
    addressTitle: { type: String, required: true },
    setAsDefault:{type:Boolean,default:false}
  }, { timestamps: true,strictPopulate: false }
);

  exports.address = mongoose.model('address',addressSchema);