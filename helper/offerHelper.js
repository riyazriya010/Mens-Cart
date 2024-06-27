const productCollection = require('../models/productModel.js');
const productOfferCollection = require('../models/productOfferModal.js');
const categoryOfferCollection = require('../models/categoryOfferModel.js');




exports.applyOffer = async () => {
  try {
    const productData = await productCollection.product.find().populate('parentCategory');
    const productOfferData = await productOfferCollection.productOffermodel.find();
    const categoryOfferData = await categoryOfferCollection.categoryOfferModel.find();

    for (let i = 0; i < productData.length; i++) {
      let productOffer = null;
      let categoryOffer = null;
      let maxOffer = null;
      let productPercentage = null;
      let categoryPercentage = null;
      let appliedOfferId = null;

      for (let p = 0; p < productOfferData.length; p++) {
        if (productData[i]._id.equals(productOfferData[p].productId)) {
          if (
            productOfferData[p].startDate <= Date.now() &&
            productOfferData[p].endDate > Date.now() &&
            productOfferData[p].currentStatus === true
          ) {
            const offerPercentage =
              Math.floor(
                (Number(productData[i].productPrice) *
                  Number(productOfferData[p].productOfferPercentage)) /
                100
              ) //* -1;
            productOffer = productData[i].productPrice - offerPercentage;
            // console.log('productOfferPercentage: ',productOfferData[p].productOfferPercentage);
            // console.log('offerPercentage: ',offerPercentage)
            // console.log('productOffer: ',productOffer)
            productPercentage =
              Math.abs(Number(productOfferData[p].productOfferPercentage));
          }
        }
      }

      for (let c = 0; c < categoryOfferData.length; c++) {
        if (productData[i].parentCategory._id.equals(categoryOfferData[c].categoryId)) {
          if (
            categoryOfferData[c].startDate <= Date.now() &&
            categoryOfferData[c].endDate > Date.now() &&
            categoryOfferData[c].currentStatus === true
          ) {
            const offerPercentage =
              Math.floor(
                (Number(productData[i].productPrice) *
                  Number(categoryOfferData[c].categoryOfferPercentage)) /
                100
              ) //* -1;
            categoryOffer = productData[i].productPrice - offerPercentage;
            // console.log('categoryOfferPercentage: ',categoryOfferData[c].categoryOfferPercentage);
            // console.log('offerPercentage: ',offerPercentage)
            // console.log('categoryOffer: ',categoryOffer)
            categoryPercentage =
              Math.abs(Number(categoryOfferData[c].categoryOfferPercentage));
          }
        }
      }

      if (productOffer !== null && (categoryOffer === null || productPercentage >= categoryPercentage)) {
        maxOffer = productOffer;
        // console.log('maxOffer P:',maxOffer)
      } else if (categoryOffer !== null && (productOffer === null || categoryPercentage >= productPercentage)) {
        maxOffer = categoryOffer;
        // console.log('maxOffer c:',maxOffer)
      }


      if (maxOffer!== null) {
        const offerPrice = Number(maxOffer);
        let offerApplied = 0;
      
        if (productOffer!== null && productPercentage >= categoryPercentage) {
          offerApplied = productPercentage;
          appliedOfferId = productOfferData.find((offer) => offer.productOfferPercentage === productPercentage)._id;
        } else if (categoryOffer!== null && categoryPercentage >= productPercentage) {
          offerApplied = categoryPercentage;
          appliedOfferId = categoryOfferData.find((offer) => offer.categoryOfferPercentage === categoryPercentage)._id;
        }
      
        await productCollection.product.findByIdAndUpdate(
          productData[i]._id,
          {
            offerPrice,
            offerApplied,
            productOfferId: appliedOfferId,
          },
          { new: true }
        );
      }


    }
  } catch (error) {
    console.error(error.message);
  }
};



exports.checkOffer = async () => {
  try {
    const productData = await productCollection.product.find().populate('parentCategory');
    const productOfferData = await productOfferCollection.productOffermodel.find();
    const categoryOfferData = await categoryOfferCollection.categoryOfferModel.find();

    // Product offer loop
    for (let p = 0; p < productOfferData.length; p++) {

      const currentDate = new Date();

      if (currentDate >= productOfferData[p].endDate) {
        await productOfferCollection.productOffermodel.findByIdAndUpdate(
          productOfferData[p]._id,
          {
            $set: { currentStatus: false }
          }
        );

        for (let i = 0; i < productData.length; i++) {
          if (productData[i].productOfferId.equals(productOfferData[p]._id)) {
            await productCollection.product.findByIdAndUpdate(
              productData[i]._id,
              {
                $set: { offerPrice: null, offerApplied: null }
              }
            );
          }
        }
        
      }else if(new Date(productOfferData[p].startDate) <= currentDate && currentDate < new Date(productOfferData[p].endDate)){
        await productOfferCollection.productOffermodel.findByIdAndUpdate(
          productOfferData[p]._id,
          {
            $set: { currentStatus: true }
          }
        );

        for (let i = 0; i < productData.length; i++) {
          if (productData[i].productOfferId.equals(productOfferData[p]._id)) {
            const discountPrice = (productOfferData[p].productOfferPercentage * productData[i].productPrice)/100
            const offerPrice = productData[i] - discountPrice 
            await productCollection.product.findByIdAndUpdate(
              productData[i]._id,
              {
                $set: {
                   productOfferId: productOfferData[p]._id, 
                  offerPrice: offerPrice, 
                  offerApplied: productOfferData[p].productOfferPercentage 
                }
              }
            );
          }
        }
      }

    }


    // Category offer loop
    for (let c = 0; c < categoryOfferData.length; c++) {
      const currentDate = new Date()

      if (categoryOfferData[c].endDate <= currentDate) {
        
        await categoryOfferCollection.categoryOfferModel.findByIdAndUpdate(
          categoryOfferData[c]._id,
          {
            $set: { currentStatus: false }
          }
        );

        for (let j = 0; j < productData.length; j++) {
          if (productData[j].productOfferId._id.equals(categoryOfferData[c]._id)) {
            await productCollection.product.findByIdAndUpdate(
              productData[j]._id,
              {
                $set: { offerPrice: null, offerApplied: null }
              }
            );
          }
        }
        
      }else if(categoryOfferData[c].endDate > categoryOfferData[c].startDate){
        await categoryOfferCollection.categoryOfferModel.findByIdAndUpdate(
          categoryOfferData[c]._id,
          {
            $set: { currentStatus: true }
          }
        );
        
        for (let i = 0; i < productData.length; i++) {
          if (productData[i].productOfferId.equals(productOfferData[c]._id)) {
            const discountPrice = (categoryOfferData[c].categoryOfferPercentage * productData[i].productPrice)/100
            const offerPrice = productData[i] - discountPrice 
            await productCollection.product.findByIdAndUpdate(
              productData[i]._id,
              {
                $set: { 
                  productOfferId: categoryOfferData[c]._id, 
                  offerPrice: offerPrice, 
                  offerApplied: categoryOfferData[c].categoryOfferPercentage 
                }
              }
            );
          }
        }
      }
    }
  } catch (error) {
    console.error(error.message);
  }
};