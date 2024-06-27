const couponCollection = require('../models/couponModel.js');

exports.couponCheck = async () => {
    try {

        const coupon = await couponCollection.coupon.find()

        for(let i=0; i<coupon.length; i++){
            const currentDate = new Date()
            if(currentDate >= coupon[i].endDate){
                await couponCollection.coupon.findByIdAndUpdate(
                    coupon[i]._id,
                    { $set: { currentStatus:false } }
                )
            }
        }
        
    } catch (error) {
        console.error(error.message);
    }
}