// cart

//details in page last

const cartCollection = require('../models/cartModel.js');
const categoryCollection = require('../models/categoryModel.js');
const productCollection = require('../models/productModel.js');
const AppError = require('../middleware/errorHandling.js');



exports.cartGet = async (req, res, next) => {
    try {

      const cartData = await cartCollection.cart.find({ userId: req.session.userId }).populate('productId');

      if(cartData.length === 0){
        return res.redirect('/cart/emptyCart');
      }
  
      let totalItems = 0;
      let grandTotal = 0;
      let outOfStockItems = [];
  
      // Loop through the cart items and check actual available quantities
      for (const item of cartData) {
        const product = item.productId;
        const price = product.offerPrice || product.productPrice
  
        if (product.productStock < item.productQuantity) {
          // If available quantity is less than cart quantity, adjust it
          outOfStockItems.push({ productName: product.productName, requestedQuantity: item.productQuantity, availableQuantity: product.productStock });
  
          // Update the cart item to reflect the actual available quantity
          await cartCollection.cart.updateOne({ _id: item._id }, { $set: { productQuantity: product.productStock, totalCostPerProduct: product.productStock * price } });
  
          item.productQuantity = product.productStock;
          item.totalCostPerProduct = product.productStock * price;
        }
  
        totalItems += item.productQuantity;
        grandTotal += item.totalCostPerProduct;
      }
  
      res.render("userPages/cartPage", { cartData, totalItems, grandTotal, outOfStockItems });
  
    } catch (error) {
      next(new AppError(error.message, 500))
    }
  };




exports.addToCart = async (req, res, next) => {
    try {
      if (!req.session.userId) {
        return res.json({ success: false, userNotLogged: true });
      }
  
      const { productId, qty } = req.query;
      const productData = await productCollection.product.findById(productId);
      const price = productData.offerPrice || productData.productPrice
  
      if (productData) {
        const cartItem = await cartCollection.cart.findOne({ userId: req.session.userId, productId: productId });
        const currentQuantityInCart = cartItem ? cartItem.productQuantity : 0;
  
        if ((parseInt(qty) + currentQuantityInCart) > productData.productStock) {
          // console.log("Max quantity reached");
          return res.json({ success: false, maxQuantityReached: true });
        }
  
        const categoryData = await categoryCollection.category.findById(productData.parentCategory);
        const existingCartItem = await cartCollection.cart.findOne({ userId: req.session.userId, productId: productId });
  
        if (existingCartItem) {
          existingCartItem.productQuantity += parseInt(qty);
          existingCartItem.totalCostPerProduct = existingCartItem.productQuantity * price
          await existingCartItem.save();
        } else {
          await cartCollection.cart.create({
            userId: req.session.userId,
            productId: productData._id,
            productName: productData.productName,
            categoryName: categoryData.categoryName,
            productPrice:productData.productPrice,
            productQuantity: qty,
            totalCostPerProduct: qty * price,
            offerPrice:productData.offerPrice,
            offerApplied:productData.offerApplied
          });
        }
        res.json({ success: true });
      } else {
        res.json({ success: false });
      }
    } catch (error) {
      next(new AppError(error.message, 500))
    }
  };




exports.increaseQty = async (req, res, next) => {
    try {
      
        const productId = req.query.productId;
        const productData = await productCollection.product.findById(productId);
        const price = productData.offerPrice || productData.productPrice
        const cartItem = await cartCollection.cart.findOne({ productId: productId });

        if (cartItem.productQuantity + 1 > productData.productStock) {
            return res.status(200).json({ maxLimitReached: true });
        }

         await cartCollection.cart.updateOne(
            { productId: productId },
            {
                $inc: {
                    productQuantity: 1,
                    totalCostPerProduct: price
                }
            }
        );
        res.status(200).json({ maxLimitReached: false });
    } catch (error) {
      next(new AppError(error.message, 500))
    }
}




//decrease the qty
exports.decreaseQty = async (req, res, next) => {
    try {
        const productId = req.query.productId;
        const cartItem = await cartCollection.cart.findOne({ productId: productId });

        if (!cartItem) {
            return res.status(404).send('Cart item not found');
        }

        if (cartItem.productQuantity <= 1) {
            return res.status(200).json({ minLimitReached: true });
        }

        const productData = await productCollection.product.findById(productId);
        const price = productData.offerPrice || productData.productPrice
        
        if (!productData) {
            return res.status(404).send('Product not found');
        }

        const newQuantity = cartItem.productQuantity - 1;
        const newTotalCost = newQuantity * price

       await cartCollection.cart.updateOne(
            { productId: productId },
            {
                $set: {
                    productQuantity: newQuantity,
                    totalCostPerProduct: newTotalCost
                }
            }
        );
        res.status(200).json({ minLimitReached: false });
    } catch (error) {
      next(new AppError(error.message, 500))
    }
}



//delete cart items
exports.deleteCartItem = async (req, res, next) => {
    try {
        const cartData = await cartCollection.cart.findOne({ productId: req.query.productId });

        if (cartData) {
            await cartData.deleteOne();
            // console.log("deleted");
            // return res.status(200).send(); // Send a success status

            const cart = await cartCollection.cart.find({ userId:req.session.userId });

            if(cart.length === 0){
              return res.json({success:true, cartEmpty:true});
            }else{
              return res.json({ success:true });
            }
        }

        // console.log("not deleted");
        return res.status(404).send(); // Send a not found status if the item wasn't found

    } catch (error) {
      next(new AppError(error.message, 500))
    }
}







//delete all items from cart
exports.deleteAll = async (req,res, next) => {
    try{

        const result = await cartCollection.cart.deleteMany({ userId: req.session.userId });

        if (result.deletedCount > 0) {
            // console.log(`${result.deletedCount} items deleted`);
            return res.status(200).send(); // Send a success status
        } else {
            // console.log("No items found to delete");
            return res.status(404).send(); // Send a not found status if no items were found
        }

    }catch(error) {
      next(new AppError(error.message, 500))
    }
}

exports.emptyCart = async (req,res,next) => {
  try {
    const isCart = await cartCollection.cart.find({ userId:req.session.userId })

    if(isCart.length === 0){
      return res.render('userPages/emptyCart');
    } 
    res.redirect('/cart');

  } catch (error) {
    next(new AppError(error.message, 500))
  }
}


// cartGet
// addToCart
// increaseQty
// decreaseQty
// deleteAll
// deleteCartItem

