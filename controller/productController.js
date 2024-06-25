const productCollection = require("../models/productModel.js");
const categoryCollection = require("../models/categoryModel.js");
const productOfferCollection = require('../models/productOfferModal.js');
const ObjectId = require('mongodb');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const AppError = require('../middleware/errorHandling.js');



exports.productGet = async (req, res, next) => {
    if (req.session.adminVerify) {

        try {

            const categoryData = await categoryCollection.category.find({}).populate('categoryName')

            // Pagination setup
            const page = parseInt(req.query.page) || 1;
            const limit = 4; // Number of categories per page
            const skip = (page - 1) * limit;

            let productData;
            let totalProduct;
            const searchQuery = req.query.searchQuery || null;

            if (searchQuery) {
                // Perform a search query in your MongoDB collection
                productData = await productCollection.product.find({
                    productName: { $regex: searchQuery, $options: 'i' },
                    isDeleted: false
                }).populate("parentCategory").skip(skip).limit(limit)
                totalProduct = await productCollection.product.countDocuments({
                    productName: { $regex: searchQuery, $options: 'i' },
                    isDeleted: false
                });
            } else {
                totalProduct = await productCollection.product.countDocuments({ isDeleted: false }).populate("parentCategory")
                productData = await productCollection.product.find({ isDeleted: false }).populate("parentCategory").skip(skip).limit(limit);
            }

            const totalPages = Math.ceil(totalProduct / limit);



            res.render("adminPages/productListing", {
                productData,
                totalProduct,
                currentPage: page,
                totalPages,
                searchQuery,
                categoryData
            });

        } catch (error) {
            next(new AppError(error.message, 500))
        }

    } else {
        res.redirect('/adminLogin');
    }

}



exports.addProductGet = async (req, res, next) => {
    try {
        
        const categoryData = await categoryCollection.category.find({}).populate('categoryName')
    
        res.render('adminPages/productAdd',{ categoryData });
    } catch (error) {
        next(new AppError(error.message, 500))
    }

}



//add product
exports.addProduct = async (req, res,next) => {
    try {

        function normalizeProductName(name) {
            return name.trim().toLowerCase().replace(/\s+/g, ' ');
        }

        // Normalize the input product name
        const productName = normalizeProductName(req.body.productName);

        const category = await categoryCollection.category.findOne({ categoryName: req.body.productCategory });

        const productData = {
            productName: req.body.productName.trim().replace(/\s+/g, ' '),
            parentCategory: category._id,
            productImage: req.files.map(file => file.filename), // Assuming you save the filenames
            productPrice: req.body.price,
            productStock: req.body.stock
        };


        // Check if a product with the same normalized name already exists
        const existProduct = await productCollection.product.findOne({
            productName: { $regex: new RegExp(`^${productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        });

        // const existProduct = await productCollection.product.findOne({
        //     productName: productData.productName
        // });

        if (existProduct) {

            return res.json({ productExist: true });
        }

        const newProduct = new productCollection.product(productData);

        await newProduct.save();

        res.json({ success: true });

    } catch (error) {
        next(new AppError(error.message, 500))
    }
};




// Render Edit Product Page
exports.renderEditProductPage = async (req, res, next) => {
    try {
        const { id } = req.params;
        const productData = await productCollection.product.findById(id).populate('parentCategory');

        if (!productData) {
            return res.status(404).send('Product not found');
        }

        res.render('adminPages/productEdit', { productData });
    } catch (error) {
        next(new AppError(error.message, 500))
    }
};





// Product Edit
exports.editProduct = async (req, res, next) => {
    try {
        const category = await categoryCollection.category.findOne({ categoryName: req.body.productCategory });
        if (!category) {
            return res.status(400).json({ error: 'Category not found' });
        }

        const { id } = req.params;

        const productData = {
            productName: req.body.productName.trim(),
            parentCategory: category._id,
            productPrice: req.body.productPrice.trim(),
            productStock: req.body.stock.trim()
        }

        // Check if new images are uploaded
        if (req.files && req.files.length > 0) {
            // Get existing product images if available
            const existingProduct = await productCollection.product.findById(id);
            const existingImages = existingProduct.productImage || [];

            // Append new image filenames to the existing product images
            productData.productImage = existingImages.concat(req.files.map(file => file.filename));
        }

        // Update the product in the database using Mongoose
        const updatedProduct = await productCollection.product.findByIdAndUpdate(id, productData, { new: true })

        if (!updatedProduct) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        

        res.json({ success: true });
    } catch (error) {
        next(new AppError(error.message, 500))
    }
};





//product Search
exports.productSearch = async (req, res, next) => {
    try {
        
        if (req.session.adminVerify) {
            try {
                // Directly call the productGet function
                await exports.productGet(req, res);
            } catch (error) {
                // console.error('Error searching categories:', error);
                res.status(500).render('500');
            }
        } else {
            res.redirect('/adminLogin');
        }

    } catch (error) {
        next(new AppError(error.message, 500))
    }
};




//unListing product
exports.unList = async (req, res, next) => {
    try {
        const productId = req.query.productId;

        const productUpdate = await productCollection.product.findByIdAndUpdate(
            productId,
            { $set: { isListed: false } },
            { new: true }
        );

        if (productUpdate) {

            // req.session.loginVerify = false;

            // req.session.userId  = null

            res.send({ success: true });
        } else {
            res.send({ userNotExist: true });
        }

        // console.log(productUpdate);

    } catch (error) {
        next(new AppError(error.message, 500))
    }
};



//Listing Product
exports.List = async (req, res, next) => {
    try {
        const productId = req.query.productId;

        const productUpdate = await productCollection.product.findByIdAndUpdate(
            productId,
            { $set: { isListed: true } },
            { new: true }
        );

        if (productUpdate) {

            res.send({ success: true });

        } else {

            res.send({ userNotExist: true });
        }

        // console.log(productUpdate);

    } catch (error) {
        next(new AppError(error.message, 500))
    }
};



exports.deleteProduct = async (req, res, next) => {
    try {
        const { id } = req.params;

        const deletedProduct = await productCollection.product.findByIdAndUpdate(id, {
            isDeleted: true
        });

        if (!deletedProduct) {
            return res.status(404).json({ success: false, message: 'Prodcut not found' });
        }

        res.json({ success: true });

    } catch (error) {
        next(new AppError(error.message, 500))
    }
};




//delete Image
exports.deleteImage = async (req, res, next) => {

    // console.log(req.query)
    try {
        const { productId, imageIndex } = req.query;

        // console.log(productId, imageIndex)

        if (!productId || imageIndex === undefined) {
            return res.status(400).json({ message: 'Product ID and Image Index are required' });
        }

        const product = await productCollection.product.findById(productId);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const imagePath = path.join(__dirname, '../public/assets/uploadimages/uploads', product.productImage[imageIndex]);

        // Remove image from filesystem
        fs.unlink(imagePath, (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Failed to delete image' });
            }
        });

        // Remove image from product's image array
        product.productImage.splice(imageIndex, 1);
        await product.save();

        res.status(200).json({ message: 'Image deleted successfully' });

    } catch (error) {
        next(new AppError(error.message, 500))
    }
};



exports.productOfferManagement = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        const productData = await productCollection.product.find()
        const productOfferData = await productOfferCollection.productOffermodel.find()
            .populate('productId')
            .skip(skip)
            .limit(limit);

        const totalProducts = await productCollection.product.countDocuments();
        const totalProductOffers = await productOfferCollection.productOffermodel.countDocuments();

        const totalPages = Math.ceil(Math.max(totalProducts, totalProductOffers) / limit);

        res.render('adminPages/productOfferManagement', {
            productData,
            productOfferData,
            currentPage: page,
            totalPages
        });
    } catch (error) {
        next(new AppError(error.message, 500))
    }
};





exports.addProductOffer = async (req, res, next) => {
    try {
      const { productId, productOfferPercentage, startDate, endDate } = req.body;
  
      const productData = await productCollection.product.findById(productId);
  
      const productOfferData = {
        productId: productId,
        productName: productData.productName,
        productOfferPercentage: productOfferPercentage,
        startDate: startDate,
        endDate: endDate
      };
  
      const newProductOffer = new productOfferCollection.productOffermodel(productOfferData);
  
      await newProductOffer.save();
  
      res.json({ success: true }); // return success response
  
    } catch (error) {
        next(new AppError(error.message, 500))
    }
  };




  exports.editProductOffer = async (req, res, next) => {
    try {
      // Extract the productOfferId from the query
      const { productOfferId } = req.query;
      const { productName, productOfferPercentage, startDate, endDate } = req.body;
  
      // Ensure productOfferId is provided
      if (!productOfferId) {
        return res.status(400).json({ success: false, message: 'Product offer ID is required' });
      }
  
      // Prepare the data to update
      const productOfferData = {
        productName,
        productOfferPercentage: productOfferPercentage.trim(),
        startDate,
        endDate,
      };
  
      // Find and update the product offer
      const updatedProductOfferData = await productOfferCollection.productOffermodel.findOneAndUpdate(
        { _id: productOfferId },
        productOfferData,
        { new: true, useFindAndModify: false }
      );
  
      // Check if the product offer was found and updated
      if (!updatedProductOfferData) {
        return res.status(404).json({ success: false, message: 'Product offer not found' });
      }
  
      // Respond with success
      res.json({ success: true, data: updatedProductOfferData });
      
    } catch (error) {
      // Log the error and respond with a server error status
      next(new AppError(error.message, 500))
    }
  };
  