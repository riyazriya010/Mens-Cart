const mongoose = require("mongoose");

const userModel = new mongoose.Schema({
    username:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    phone:{
        type:Number,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    isBlocked:{
        type:Boolean,
        default:false,
    },
    isVerified:{
        type:Boolean,
        default:false,
    },
    isLogged:{
        type:Boolean,
        default:false
    },
    referralCode:{
        required:false,
        type:String
    },
    referralUserId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'users'
    },
}, { timestamps: true,strictPopulate: false }
);

exports.user = new mongoose.model("user",userModel);