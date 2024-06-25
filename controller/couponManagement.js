const { order } = require('paypal-rest-sdk');
const { generateCouponCode } = require('../helper/couponCode.js');
const couponCollection = require('../models/couponModel.js');
const ObjectId = require('mongodb')
const orderCollection = require('../models/ordersModel.js');
const AppError = require('../middleware/errorHandling.js');




// exports.couponGet = async (req,res) => {

//     try {

//         const couponData = await couponCollection.coupon.find({ isDelete:false })

//         const couponDet = await couponCollection.coupon.find({ isDelete:true })

//         res.render('adminPages/couponManagement',{ couponData, couponDet })
        
//     } catch (error) {
//         console.error(error.message);
//     }
// }


exports.couponGet = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        const couponData = await couponCollection.coupon.find({ isDelete: false }).skip(skip).limit(limit);
        const couponDet = await couponCollection.coupon.find({ isDelete: true }).skip(skip).limit(limit);

        const totalActiveCoupons = await couponCollection.coupon.countDocuments({ isDelete: false });
        const totalDeletedCoupons = await couponCollection.coupon.countDocuments({ isDelete: true });

        const totalPages = Math.ceil(Math.max(totalActiveCoupons, totalDeletedCoupons) / limit);

        res.render('adminPages/couponManagement', {
            couponData,
            couponDet,
            currentPage: page,
            totalPages
        });
    } catch (error) {
        next(new AppError(500));
    }
};




exports.addCoupon = async (req, res, next) => {

    try {

        // console.log(req.body);

        const { discountPercentage, startDate, endDate, MinimumPurchase } = req.body

        const couponCode = generateCouponCode()

        // console.log(couponCode);

        const couponData = {
            couponCode:couponCode,
            discountPercentage:discountPercentage,
            startDate:startDate,
            endDate:endDate,
            minimumPurchase:MinimumPurchase
        }

        const newCouponOffer = new couponCollection.coupon(couponData)

        await newCouponOffer.save();

        res.json({ success:true });
        
    } catch (error) {
        next(new AppError(500));
    }
}



exports.editCoupon = async (req, res, next) => {

    try {

        console.log(req.query)
        console.log(req.body)
        const couponId = req.query.couponId
        const { discountPercentage, startDate, endDate, MinimumPurchase } = req.body

        const couponData = {
            discountPercentage:discountPercentage,
            startDate:startDate,
            endDate:endDate,
            minimumPurchase:MinimumPurchase
        }
        
        const updatedCoupon = await couponCollection.coupon.findByIdAndUpdate(
            couponId,
            couponData,
            { new: true, useFindAndModify: false }
        )

        if(!updatedCoupon){
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }

        res.json({ success:true })

    } catch (error) {
        next(new AppError(500));
    }
}




exports.deleteCoupon = async (req, res, next) => {
    try{

        // console.log(req.query)
        const couponId = req.query.couponId
        // console.log(couponId)

        const couponData = await couponCollection.coupon.findByIdAndUpdate(couponId,
            {$set:{ isDelete:true }}
        );

        console.log(couponData)

        if(!couponData){
            return res.status(404).json({ success: false })
        }
        
        res.json({success:true});
    }catch(error){
        next(new AppError(500));
    }
}



exports.restoreCoupon = async (req,res,next) => {
    try {

        const couponId = req.query.couponId
        // console.log(couponId)

        const couponData = await couponCollection.coupon.findByIdAndUpdate(couponId,
            {$set:{ isDelete:false }}
        );

        console.log(couponData)

        if(!couponData){
            return res.status(404).json({ success: false })
        }
        
        res.json({success:true});
        
    } catch (error) {
        next(new AppError(500));
    }
} 



exports.couponApply = async (req,res,next) => {
    try {

        const { couponId, total } = req.query

        const coupon = await couponCollection.coupon.findById( couponId );

        const order = await orderCollection.orders.find()

        if(coupon){
            if(coupon.minimumPurchase > total){
                return res.json({success:false});
            }

            console.log('total: ',total);
            const discount = total * coupon.discountPercentage /100
            const discountedPrice = total - discount
            console.log('discountedPrice: ',discountedPrice);
            req.session.couponDiscountPrice = discountedPrice
            req.session.couponId = coupon._id
            req.session.discountAmount = discount

        }

        res.json({success:true});
        
    } catch (error) {
        next(new AppError(500));
    }
}




exports.removeCoupon = async (req,res,next) => {
    try {

        req.session.couponDiscountPrice = null
        req.session.couponId = null
        req.session.discountAmount = null

        res.json({success:true});
        
    } catch (error) {
        next(new AppError(500));
    }
}
