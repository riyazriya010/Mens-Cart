const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({

    categoryName:{
        type:String,
        required:true
    },
    categoryDescription:{
        type:String,
        required:true
    },
    isListed:{
            type:Boolean,
            default:true,
    },
    isDelete:{
        type:Boolean,
        default:false
    }

}, { timestamps: true,strictPopulate: false }
);

exports.category = mongoose.model('category',categorySchema);