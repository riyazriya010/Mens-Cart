const mongoose = require('mongoose');

const ratingsSchema = new mongoose.Schema({

    productId:{ type:mongoose.Types.ObjectId, required:true, ref:'product' },
    ratings:[ 
        {
        userId:{ type:mongoose.Types.ObjectId, required:true, ref:'user' },
        username:{ type:String, required:true},
        noOfStars:{ type:Number, required:true },
        ratingDescription:{ type:String,required:true },
        }
     ], 
}, { timestamps: true,strictPopulate: false }
);

exports.rating = mongoose.model('ratings',ratingsSchema);