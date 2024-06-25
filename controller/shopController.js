const productCollection = require('../models/productModel.js');
const categoryCollection = require('../models/categoryModel.js');
const ratingCollection = require('../models/ratingsModel.js');
const { ObjectId } = require('mongodb');
const { getProducts, getCategories, filterProducts } = require('../helper/helperShopPage.js');
const { applyOffer, checkOffer } = require('../helper/offerHelper.js');
const wishlistCollection = require('../models/wishlistModel.js');
const { addToCart } = require('./wishlistController.js');
const AppError = require('../middleware/errorHandling.js');
const userCollection = require('../models/userModel.js');



exports.shopGet = async (req, res, next) => {
  try {

    await checkOffer();
    await applyOffer();
    
    const page = parseInt(req.query.page) || 1; // Get the current page or default to 1
    const productsPerPage = 6; // Number of products per page (2 rows with 3 columns each)

    const { productData, totalPages } = await getProducts(page, productsPerPage);
    const categories = await getCategories();
    const wishlist = await wishlistCollection.wishlist.find({userId:req.session.userId});


    res.render('userPages/shop', {
      productData,
      categories,
      currentPage: page,
      totalPages,
      // addtoCart,
      wishlist,
      queryFilters: {}
    });

  } catch (error) {
    next(new AppError(500));
  }
};




//Filter
exports.filter = async (req, res, next) => {

  const page = Number(req.query.page) || 1;
  const limit = 6;
  const skip = (page - 1) * limit;

  try {

    await checkOffer();
    await applyOffer();
    // console.log('filter: ', req.query);

    const category = req.query.category;
    const priceRange = req.query.price;
    const sort = req.query.sort;
    const productName = req.query.bySearch; // Get the search query from req.query
    //   console.log(productName);
    //   console.log(productName);
    //   console.log(productName);

    const sf = {};
    const categoryData = await categoryCollection.category.find({ isListed: true, isDelete: false });
    //   console.log(categoryData);
    for (let value of categoryData) {
      const categoryName = value.categoryName
      const catId = value._id
      sf[categoryName] = catId
    }

    //   console.log('sf: ',sf);

    const filters = {
      category: sf,

      priceRange: {
        "250-500": { $gte: 250, $lte: 500 },
        "500-1500": { $gte: 500, $lte: 1500 },
        "1500-2500": { $gte: 1500, $lte: 2500 },
      },
      sort: {
        "ascending": { productName: 1 },
        "descending": { productName: -1 },
        "low to heigh": { productPrice: 1 },
        "heigh to low": { productPrice: -1 },
      },
      bySearch: {
        productName: { $regex: productName, $options: "i" }, // Create a regex pattern for case-insensitive search
      },
    };

    let aggregationPipeline = [{ $match: { isListed: true } }];

    if (category) {
      aggregationPipeline.push({
        $match: { parentCategory: filters.category[category] },
      });
    }

    if (priceRange) {
      aggregationPipeline.push({
        $match: { productPrice: filters.priceRange[priceRange] },
      });
    }

    if (productName) {
      aggregationPipeline.push({
        $match: filters.bySearch, // Add search filter
      });
    }

    if (sort) {
      aggregationPipeline.push({ $sort: filters.sort[sort] });
    }


    // Add lookup for ratings and compute average rating
    aggregationPipeline.push(
      {
        $lookup: {
          from: 'ratings',
          localField: '_id',
          foreignField: 'productId',
          as: 'ratings'
        }
      },
      {
        $addFields: {
          averageRating: { $avg: '$ratings.noOfStars' }
        }
      },
      {
        $project: {
          productName: 1,
          parentCategory: 1,
          productImage: 1,
          productPrice: 1,
          productStock: 1,
          isListed: 1,
          productOfferId: 1,
          offerPrice: 1,
          offerApplied:1,
          isDeleted: 1,
          wishlist: 1,
          averageRating: 1
        }
      }
    );

    // console.log(aggregationPipeline);

    const beforeLimit = await productCollection.product.aggregate(aggregationPipeline);
    const totalProductsCount = beforeLimit.length;
    const totalPages = Math.ceil(totalProductsCount / limit);
    const queryFilters = req.query;

    aggregationPipeline.push({ $skip: skip });
    aggregationPipeline.push({ $limit: limit });

    const productData = await productCollection.product.aggregate(aggregationPipeline);
    // console.log('products: ',productData);

    const categories = await categoryCollection.category.find();
    const wishlist = await wishlistCollection.wishlist.find({userId:req.session.userId})
    const productIdArray = []
    if(req.session.userId){
    wishlist.forEach((list) => {
      productIdArray.push(list.productId)
    })
  }

  console.log(productIdArray)

    res.render("userPages/shop", {
      productData,
      categories,
      currentPage: page,
      totalPages,
      queryFilters,
      wishlist
    });

  } catch (error) {
    next(new AppError(500));
  }
};


  /* ---- single product ---- */

exports.singleProduct = async (req,res, next) => {
  try {
      
      const productId = req.query.productId

      const findProduct = await productCollection.product.findById(productId).populate('parentCategory');

   // Fetch ratings for the specific product
   const ratings = await ratingCollection.rating.find({ productId:productId })

   console.log('ratings: ',ratings)
      
      res.render('userPages/singleProduct', { findProduct, ratings });

  } catch (error) {
    next(new AppError(500));
  }
 
}



// exports.addRatings = async (req, res, next) => {
//   try {

//       const { productId, star, ratings } = req.body;

//       const findProduct = await productCollection.product.findById(productId);

//       const userId = req.session.userId

//       // Create a new rating instance
//       const newRating = new ratingCollection.rating({
//           productId: findProduct._id, // Assuming productId is available in the request
//           noOfStars: star,
//           ratingDescription: ratings
//       });

//       // Save the rating to the database
//       await newRating.save();

//       // Send success response to client
//       res.json({ success: true });
      
//   } catch (error) {

//     next(new AppError(500));
//   }
// }


exports.addRatings = async (req, res, next) => {
  try {
      const { productId, star, ratings } = req.body;

      const userId = req.session.userId;
      const user = await userCollection.user.findById(userId);

      // Check if userId is present
      if (!userId) {
          return res.status(401).json({ success: false, message: 'User not logged in' });
      }

      // Find the product and its ratings document
      let productRatings = await ratingCollection.rating.findOne({ productId });

      if (!productRatings) {
          // If no ratings document exists for the product, create a new one
          productRatings = new ratingCollection.rating({
              productId: productId,
              ratings: [{
                  userId: userId,
                  username:user.username,
                  noOfStars: star,
                  ratingDescription: ratings
              }]
          });
      } else {
          // Check if the user has already rated, if so update their rating
          const existingRatingIndex = productRatings.ratings.findIndex(rating => rating.userId.equals(userId));

          if (existingRatingIndex !== -1) {
              // Update existing rating
              productRatings.ratings[existingRatingIndex].noOfStars = star;
              productRatings.ratings[existingRatingIndex].ratingDescription = ratings;
          } else {
              // Add new rating
              productRatings.ratings.push({
                  userId: userId,
                  noOfStars: star,
                  ratingDescription: ratings
              });
          }
      }

      // Save the updated or new rating document
      await productRatings.save();

      // Send success response to client
      res.json({ success: true });

  } catch (error) {
      console.error('Error:', error);
      // Ensure to send a proper HTTP status code on error
      return res.status(500).json({ success: false, message: 'An error occurred while adding the rating' });
  }
};






/* ---- admin side ratings ---- */
exports.rating = async (req,res) => {

  const ratings = await ratingCollection.rating.find({})

  res.render('adminPages/ratings',{ratings});
}