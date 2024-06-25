const wishlistCollection = require('../models/wishlistModel.js');
const productCollection = require('../models/productModel.js');
const cartCollections = require('../models/cartModel.js');
const AppError = require('../middleware/errorHandling.js');


exports.wishlistGet = async (req, res, next) => {

    try {

        const wishlistData = await wishlistCollection.wishlist.find({ userId: req.session.userId }).populate('productId')
        // console.log(wishlistData)

        res.render('userPages/wishlist', { wishlistData });

    } catch (error) {
        next(new AppError(500));
    }
}


exports.additemToWishlist = async (req, res, next) => {
    try {

        if (!req.session.userId) {
            return res.json({ success: false, userNotLogged: true });
        }

        const productId = req.params.id
        console.log(productId);

        const wishlist = await wishlistCollection.wishlist.findOne({productId:productId})

        if(wishlist){
            return res.json({success:false, productAlreadyExist:true});
        }

        const wishlistData = {
            userId: req.session.userId,
            productId: productId
        }

        const newWishlist = new wishlistCollection.wishlist(wishlistData);
        await newWishlist.save();

        res.json({ success: true })

    } catch (error) {
        next(new AppError(500));
    }
}


exports.addToCart = async (req, res, next) => {
    try {

        const productId = req.query.productId

        console.log(productId)

        const productData = await productCollection.product.findById(productId).populate('parentCategory')
        console.log(productData)

        if(productData.productStock === 0){
            return res.json({success:false, outOfStock:true});
        }

        const cart = await cartCollections.cart.findOne({ userId: req.session.userId, productId: productId })

        if (cart) {

            if (cart.productQuantity >= productData.productStock) {
                return res.json({ success: false, maxQuantityReached: true })
            }
            cart.productQuantity += 1

            await cart.save();

        } else {

            await cartCollections.cart.create({
                userId: req.session.userId,
                productId: productData._id,
                productName: productData.productName,
                categoryName: productData.parentCategory.categoryName,
                productPrice: productData.productPrice,
                productQuantity: 1,
                totalCostPerProduct: 1 * productData.productPrice,
            })

        }

        const wishlist = await wishlistCollection.wishlist.updateOne(
            {productId:productId},
            {$set:{addedToCart:true}}
        )

        res.json({ success: true })

    } catch (error) {
        next(new AppError(500));
    }
}


//delete item
exports.deleteItem = async (req,res, next) => {
    try {

        const productId = req.query.productId

        const wishlist = await wishlistCollection.wishlist.findOneAndDelete({
            productId:productId
        })

        if(!wishlist){
            return res.json({success:false, prodcutNotFound:true})
        }

        res.json({success:true})
        
    } catch (error) {
        next(new AppError(500));
    }
}