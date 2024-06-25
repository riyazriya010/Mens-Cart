const productCollection = require('../models/productModel.js');
const categoryCollection = require('../models/categoryModel.js');
const ratingCollection = require('../models/ratingsModel.js');
const productOfferCollection = require('../models/productOfferModal.js');
const categoryOfferCollection = require('../models/categoryOfferModel.js');
const { ObjectId } = require('mongodb');



//shop Get
async function getProducts(page, productsPerPage) {
  const totalProducts = await productCollection.product.countDocuments({
    isDeleted: false,
    isListed: true
  });

  const totalPages = Math.ceil(totalProducts / productsPerPage);

  const productData = await productCollection.product.aggregate([
    {
      $match: {
        isDeleted: false,
        isListed: true
      }
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'parentCategory',
        foreignField: '_id',
        as: 'parentCategory'
      }
    },
    {
      $unwind: '$parentCategory'
    },
    {
      $match: {
        'parentCategory.isListed': true
      }
    },
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
      $lookup: {
        from: 'productOffers',
        localField: '_id',
        foreignField: 'productId',
        as: 'ratings'
      }
    },
    {
      $project: {
        productName: 1,
        parentCategory: '$parentCategory.categoryName',
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
    },
    {
      $skip: (page - 1) * productsPerPage
    },
    {
      $limit: productsPerPage
    }
  ]);

  // console.log('offerPrice: ',productData.offerPrice)

  return { productData, totalPages };
}

//category
async function getCategories() {
  return await categoryCollection.category.find();
}




//filter Products
async function filterProducts(query, page, limit) {
  const skip = (page - 1) * limit;

  const category = query.category;
  const priceRange = query.price;
  const sort = query.sort;
  const productName = query.bySearch;

  const sf = {};
  const categoryData = await categoryCollection.category.find({ isListed: true, isDelete: false });
  for (let value of categoryData) {
    const categoryName = value.categoryName;
    const catId = value._id;
    sf[categoryName] = catId;
  }

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
      "low to high": { productPrice: 1 },
      "high to low": { productPrice: -1 },
    },
    bySearch: {
      productName: { $regex: productName, $options: "i" },
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
      $match: filters.bySearch,
    });
  }

  if (sort) {
    aggregationPipeline.push({ $sort: filters.sort[sort] });
  }

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

  const beforeLimit = await productCollection.product.aggregate(aggregationPipeline);
  const totalProductsCount = beforeLimit.length;
  const totalPages = Math.ceil(totalProductsCount / limit);

  aggregationPipeline.push({ $skip: skip });
  aggregationPipeline.push({ $limit: limit });

  const productData = await productCollection.product.aggregate(aggregationPipeline);

  return { productData, totalPages };
}

module.exports = {
  getProducts,
  getCategories,
  filterProducts
};
