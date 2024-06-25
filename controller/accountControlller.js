const addressCollection = require('../models/addressModel.js');
const userCollection = require('../models/userModel.js');
const walletCollection = require('../models/walletModel.js');
const cartCollection = require('../models/cartModel.js');
const productCollection = require('../models/productModel.js');
const orderCollection = require('../models/ordersModel.js');
const couponCollection = require('../models/couponModel.js');
const { generateOrderId } = require('../helper/orderId.js');
const AppError = require('../middleware/errorHandling.js');




exports.userProfile = async (req, res, next) => {

  try {
    const userId = req.session.userId
    const userData = await userCollection.user.findById(userId)
    res.render('userPages/userProfile', { userData });

  } catch (error) {
    next(new AppError(error.message, 500))
  }
}




exports.userProfileVerify = async (req, res, next) => {

  try {

    const { username, email, phone } = req.body;

    // Find the user by email
    const findUser = await userCollection.user.findOne({ email: email });

    if (findUser) {
      // Check if another user is using the same phone number
      const findPhone = await userCollection.user.findOne({ phone: phone, email: { $ne: email } });

      if (findPhone) {
        return res.status(400).json({ phoneExist: true });
      }

      // Update user details (assuming you want to update details)
      findUser.username = username;
      findUser.phone = phone;
      await findUser.save();

      return res.status(200).json({ message: 'User profile updated successfully' });

    } else {

      return res.status(404).json({ message: 'User not found' });

    }
  } catch (error) {
    next(new AppError(error.message, 500))

  }
};





//address Get
exports.addressGet = async (req, res, next) => {

  try {

    const userId = req.session.userId
    const proceed = req.session.proceed || null
    const address = await addressCollection.address.find({ userId: userId });

    res.render('userPages/addressPage', { address, proceed });

  } catch (error) {
    next(new AppError(error.message, 500))
  }

}



//edit address Get
exports.editAddress = async (req, res, next) => {

  try {

    const { id } = req.params

    const address = await addressCollection.address.findById(id);

    res.render('userPages/editAddress', { address });

  } catch (error) {
    next(new AppError(error.message, 500))
  }

}



exports.editAddressVerify = async (req, res, next) => {

  try {

    const { addressId } = req.query

    const { name, address1, address2, phone, phone2, city, land, state, pin, addressTitle, setAsDefault } = req.body;

    const addressData = {
      userId: req.session.userId,
      name: name,
      address1: address1,
      address2: address2,
      phone: phone,
      alternatePhone: phone2,
      city: city,
      land: land,
      state: state,
      pincode: pin,
      addressTitle: addressTitle,
      setAsDefault: setAsDefault || false
    }

    const address = await addressCollection.address.findByIdAndUpdate(addressId, addressData, { new: true });

    const proceed = req.session.proceed || null

    res.status(200).json({ success: true, proceed });

  } catch (error) {
    next(new AppError(error.message, 500))
  }
}




//Add address Get
exports.addAddressGet = (req, res, next) => {
  try {

    res.render('userPages/addAddress');

  } catch (error) {
    next(new AppError(error.message, 500))
  }
}



//address verify
exports.addAddressVerify = async (req, res, next) => {

  try {

    const { name, address1, address2, phone, phone2, city, land, state, pin, addressTitle, setAsDefault } = req.body;

    // Create new address
    const newAddress = new addressCollection.address({
      userId: req.session.userId,
      name: name,
      address1: address1,
      address2: address2,
      phone: phone,
      alternatePhone: phone2,
      city: city,
      land: land,
      state: state,
      pincode: pin,
      addressTitle: addressTitle,
      setAsDefault: setAsDefault || false
    });

    await newAddress.save();

    const proceed = req.session.proceed || null

    // Respond with success message
    res.status(200).json({ success: true, proceed });
  } catch (error) {
    next(new AppError(error.message, 500))
  }
};



//delete address
exports.deleteAddress = async (req, res, next) => {
  try {
    const { addressId } = req.query;

    if (!addressId) {
      return res.status(400).json({ success: false, message: 'Address ID is required' });
    }

    const deletedAddress = await addressCollection.address.findByIdAndDelete(addressId);

    if (!deletedAddress) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    res.json({ success: true });

  } catch (error) {
    next(new AppError(error.message, 500))
  }
}



/* ----------    WALLET ------------*/



exports.walletGet = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5; // Number of transactions per page
    const skip = (page - 1) * limit;

    const walletData = await walletCollection.wallet.findOne({
      userId: req.session.userId
    });

    if (!walletData || !walletData.walletTransaction) {
      res.render('userPages/wallet', {
        walletTransaction: [],
        currentPage: page,
        totalPages: 1
      });
      return;
    }

    const totalItems = walletData.walletTransaction.length;
    const totalPages = Math.ceil(totalItems / limit);
    const paginatedTransactions = walletData.walletTransaction.slice(skip, skip + limit);

    res.render('userPages/wallet', {
      walletTransaction: paginatedTransactions,
      currentPage: page,
      totalPages,
      walletData  // Ensure walletData is passed to the template
    });
  } catch (error) {
    next(new AppError(error.message, 500))
  }
};





exports.walletCreation = async (req) => {
  try {
    // console.log(req);

    const walletData = {
      userId: req
    }

    const newWallet = new walletCollection.wallet(walletData)
    await newWallet.save();
    // console.log()

  } catch (error) {
    console.error(error.message)
  }
}



exports.addReferalMoney = async (oldUser) => {
  try {

    const user1 = await walletCollection.wallet.updateOne(
      { userId: oldUser },
      {
        $inc: { walletBalance: 100 },
        $push: {
          walletTransaction: {
            transactionDate: new Date(),
            transactionAmount: 100,
            transactionType: 'Credited (referal)'
          }
        }
      }
    );


  } catch (error) {
    console.error(error.message)
  }
};


exports.newUserAddMoney = async (newUser) => {
  try {

    const user2 = await walletCollection.wallet.updateOne(
      { userId: newUser },
      {
        $inc: { walletBalance: 100 },
        $push: {
          walletTransaction: {
            transactionDate: new Date(),
            transactionAmount: 100,
            transactionType: 'Credited (referal)'
          }
        }
      }
    );

  } catch (error) {
    console.error(error.message)
  }
}




//walletBuying
exports.walletBuy = async (req) => {
  try {

    // console.log('walletBuy')
    const wallet = await walletCollection.wallet.findOne({ userId: req.session.userId });
    // console.log('wallet: ', wallet);

    const totalAmount = req.session.couponDiscountPrice || req.session.grandTotal

    if (wallet.walletBalance < totalAmount) {
      // console.log('no wallet money: ', wallet.walletBalance);
      return false
    }


    const addressId = req.session.addressId2 || req.session.addressId
    const address = await addressCollection.address.findById(addressId);

    const cartItems = await cartCollection.cart.find({ userId: req.session.userId });


    // Reducing the quantity from the product collection
    for (const item of cartItems) {
      await productCollection.product.findByIdAndUpdate(
        item.productId,
        { $inc: { productStock: -item.productQuantity } }
      );
    }


    //generating orderId
    const orderId = generateOrderId();

    if (req.session.couponId && req.session.couponDiscountPrice) {

      const coupon = await couponCollection.coupon.findById(req.session.couponId)

      const order = new orderCollection.orders({
        userId: req.session.userId,
        orderId: orderId,
        orderDate: Date.now(),
        addressChosen: address,
        paymentType: req.session.paymentMethod,
        cartData: cartItems,
        couponApplied: coupon._id,
        discountedPrice: req.session.couponDiscountPrice,
        grandTotalCost: req.session.grandTotal
      });


      //creating cart colelction
      await order.save();


      // Deleting cart items for the user
      await cartCollection.cart.deleteMany({ userId: req.session.userId });


      // Update wallet balance
      await walletCollection.wallet.findByIdAndUpdate(wallet._id, {
        $inc: { walletBalance: -totalAmount }
      });

      // Add new transaction to wallet transaction array
      await walletCollection.wallet.findByIdAndUpdate(wallet._id, {
        $push: {
          walletTransaction: {
            transactionDate: Date.now(),
            transactionAmount: totalAmount,
            transactionType: 'Debited (purchase)'
          }
        }
      });


      req.session.couponDiscountPrice = null
      req.session.couponId = null
      req.session.discountAmount = null


      return true

    }

    const order = new orderCollection.orders({
      userId: req.session.userId,
      orderId: orderId,
      orderDate: Date.now(),
      addressChosen: address,
      paymentType: req.session.paymentMethod,
      cartData: cartItems,
      grandTotalCost: req.session.grandTotal
    });

    //creating cart colelction
    await order.save();


    // Deleting cart items for the user
    await cartCollection.cart.deleteMany({ userId: req.session.userId });

    // Update wallet balance
    await walletCollection.wallet.findByIdAndUpdate(wallet._id, {
      $inc: { walletBalance: -totalAmount }
    });

    // Add new transaction to wallet transaction array
    await walletCollection.wallet.findByIdAndUpdate(wallet._id, {
      $push: {
        walletTransaction: {
          transactionDate: Date.now(),
          transactionAmount: totalAmount,
          transactionType: 'Debited (purchase)'
        }
      }
    });


    return true;

  } catch (error) {
    console.error(error.message)
  }
}



//return order amount adding to the wallet
exports.addingCancellAmountToWallet = async (req, amount) => {
  try {
    // console.log('adding')
    // console.log('wallet: ', amount)
    const userId = req.session.userId
    // console.log('adding....')
    const wallet = await walletCollection.wallet.findOneAndUpdate(
      { userId },
      { $inc: { walletBalance: amount } }
    )

    // Add new transaction to wallet transaction array
    await walletCollection.wallet.findByIdAndUpdate(wallet._id, {
      $push: {
        walletTransaction: {
          transactionDate: Date.now(),
          transactionAmount: amount,
          transactionType: 'Credited (cancelled product)'
        }
      }
    });

    return true
  } catch (error) {
    console.error(error.message)
  }
}




//return order amount adding to the wallet
exports.addingReturnAmountToWallet = async (req, amount) => {
  try {
    // console.log('adding')
    // console.log('wallet: ', amount)
    const userId = req.session.userId
    // console.log('adding....')
    const wallet = await walletCollection.wallet.findOneAndUpdate(
      { userId },
      { $inc: { walletBalance: amount } }
    )

    // Add new transaction to wallet transaction array
    await walletCollection.wallet.findByIdAndUpdate(wallet._id, {
      $push: {
        walletTransaction: {
          transactionDate: Date.now(),
          transactionAmount: amount,
          transactionType: 'Credited (return product)'
        }
      }
    });

    return true
  } catch (error) {
    console.error(error.message)
  }
}

