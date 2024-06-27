// category ( add edit delete )

// category Offer Management

//page details last

const categoryCollection = require('../models/categoryModel.js');
const categoryOfferCollection = require('../models/categoryOfferModel.js');
const AppError = require('../middleware/errorHandling.js');



// Category Get
exports.categoryGet = async (req, res, next) => {
    if (req.session.adminVerify) {
        try {
            const categoryId = req.query.editId;
            let categoryToEdit = null;

            if (categoryId) {
                categoryToEdit = await categoryCollection.category.findById(categoryId);
            }

            // Pagination setup
            const page = parseInt(req.query.page) || 1;
            const limit = 4; // Number of categories per page
            const skip = (page - 1) * limit;

            let categoryData;
            let totalCategories;
            const searchQuery = req.query.searchQuery || null;
            // const searchQuery = req.query.searchQuery || req.query.search || null;

            if (searchQuery) {
                // Perform a search query in your MongoDB collection
                categoryData = await categoryCollection.category.find({
                    categoryName: { $regex: searchQuery, $options: 'i' },
                    isDelete: false
                }).skip(skip).limit(limit);
                totalCategories = await categoryCollection.category.countDocuments({
                    categoryName: { $regex: searchQuery, $options: 'i' },
                    isDelete: false
                });
            } else {
                totalCategories = await categoryCollection.category.countDocuments({ isDelete: false });
                categoryData = await categoryCollection.category.find({ isDelete: false }).skip(skip).limit(limit);
            }

            const totalPages = Math.ceil(totalCategories / limit);

            const data = {
                categoryData,
                categoryToEdit,
                currentPage: page,
                totalPages,
                searchQuery
            };

            res.render("adminPages/categoryPage", data);
        } catch (error) {
            next(new AppError(error.message, 500))
        }
    } else {
        res.redirect('/adminLogin');
    }
};




//category add
exports.categoryAdd = async (req, res, next) => {
    try {
        const { categoryname, categorydescription } = req.body;

        function normalizeCategoryName(name) {
            return name.trim().toLowerCase().replace(/\s+/g, ' ');
        }

        // Normalize the input product name
        const categoryName = normalizeCategoryName(req.body.categoryname);

        // Check if a product with the same normalized name already exists
        const categoryExist = await categoryCollection.category.findOne({
            categoryName: { $regex: new RegExp(`^${categoryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        });

        // const categoryExist = await categoryCollection.category.findOne({ categoryName: categoryname });

        if (categoryExist) {
            return res.status(400).json({ categoryExist: true });
        }

        const newCategory = new categoryCollection.category({
            categoryName: categoryname.trim().replace(/\s+/g, ' '),
            categoryDescription: categorydescription.trim().replace(/\s+/g, ' '),
        });

        await newCategory.save();

        res.json({ success: true });

    } catch (error) {
        next(new AppError(error.message, 500))
    }
};



// Category Edit
exports.categoryEdit = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { categoryName, categoryDescription } = req.body;

        if (!categoryName || !categoryDescription) {
            return res.status(400).json({ success: false, message: 'Category name and description are required' });
        }

        function normalizeCategoryName(name) {
            return name.trim().toLowerCase().replace(/\s+/g, ' ');
        }

        // Normalize the input category name for comparison purposes
        const normalizedCategoryName = normalizeCategoryName(categoryName);

        // Check if a category with the same normalized name already exists, excluding the category with the given id
        const categoryExist = await categoryCollection.category.findOne({
            _id: { $ne: id }, // Exclude the category with the given id
            categoryName: { $regex: new RegExp(`^${normalizedCategoryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        });

        if (categoryExist) {
            return res.status(400).json({ categoryExist: true });
        }

        const trimmedCategoryDescription = categoryDescription.trim().replace(/\s+/g, ' ');

        const updatedCategory = await categoryCollection.category.findByIdAndUpdate(id, {
            categoryName: categoryName.trim().replace(/\s+/g, ' '), // Use the original name with preserved casing
            categoryDescription: trimmedCategoryDescription,
        }, { new: true }); // Optionally return the updated document

        if (!updatedCategory) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        res.json({ success: true });
    } catch (error) {
        next(new AppError(error.message, 500))
    }
};





// Category Delete
exports.categoryDelete = async (req, res, next) => {
    try {
        const { id } = req.params;

        const deletedCategory = await categoryCollection.category.findByIdAndUpdate(id, {
            isDelete: true
        });

        if (!deletedCategory) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        res.json({ success: true });

    } catch (error) {
        next(new AppError(error.message, 500))
    }
};





// Category Search
exports.categorySearch = async (req, res, next) => {
    try {
        
        if (req.session.adminVerify) {
            try {
                // Directly call the categoryGet function
                await exports.categoryGet(req, res);
            } catch (error) {
                next(new AppError(500));
            }
        } else {
            res.redirect('/adminLogin');
        }
    } catch (error) {
        next(new AppError(error.message, 500))
    }
};




//unListing category
exports.unList = async (req, res, next) => {
    try {
        const categoryId = req.query.categoryId;

        const categoryUpdate = await categoryCollection.category.findByIdAndUpdate(
            categoryId,
            { $set: { isListed: false } },
            { new: true }
        );

        if (categoryUpdate) {

            // req.session.loginVerify = false;

            // req.session.userId  = null

            res.send({ success: true });
        } else {
            res.send({ userNotExist: true });
        }

        console.log(categoryUpdate);

    } catch (error) {
        next(new AppError(error.message, 500))
    }
};





//Listing category
exports.List = async (req, res, next) => {
    try {
        const categoryId = req.query.categoryId;

        const categoryUpdate = await categoryCollection.category.findByIdAndUpdate(
            categoryId,
            { $set: { isListed: true } },
            { new: true }
        );

        if (categoryUpdate) {

            res.send({ success: true });

        } else {

            res.send({ userNotExist: true });
        }

        // console.log(categoryUpdate);

    } catch (error) {
        next(new AppError(error.message, 500))
    }
};


                  //   category Offer Management ( add edit delete)


exports.categoryOfferManagement = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        const categoryData = await categoryCollection.category.find()
        const categoryOfferData = await categoryOfferCollection.categoryOfferModel.find().skip(skip).limit(limit);

        const totalCategories = await categoryCollection.category.countDocuments();
        const totalCategoryOffers = await categoryOfferCollection.categoryOfferModel.countDocuments();

        const totalPages = Math.ceil(Math.max(totalCategories, totalCategoryOffers) / limit);

        res.render('adminPages/categoryOfferManagement', {
            categoryData,
            categoryOfferData,
            currentPage: page,
            totalPages
        });
    } catch (error) {
        next(new AppError(error.message, 500))
    }
};





exports.addCategoryOffer = async (req, res, next) => {

    try {

        const { categoryName, categoryOfferPercentage, categoryOfferStartDate, categoryOfferEndDate } = req.body

        const categoryData = await categoryCollection.category.findOne({ categoryName: categoryName })

        const categoryOfferData = {
            categoryId: categoryData._id,
            categoryName: categoryName,
            categoryOfferPercentage: categoryOfferPercentage,
            startDate: categoryOfferStartDate,
            endDate: categoryOfferEndDate
        }
        // console.log('categoryOfferData: ', categoryOfferData);

        const newCategoryOffer = new categoryOfferCollection.categoryOfferModel(categoryOfferData)

        await newCategoryOffer.save();

        res.json({ success: true });

    } catch (error) {
        next(new AppError(error.message, 500))
    }
}



exports.editOffer = async (req, res, next) => {
    try {
        // console.log('cat edit offer');
      const { categoryName, categoryOfferPercentage, startDate, endDate, categoryOfferId } = req.body;
  
      const categoryOffer = await categoryOfferCollection.categoryOfferModel.findById(categoryOfferId);
  
      if (!categoryOffer) {
        return res.status(404).json({ success: false, message: 'Category offer not found' });
      }
  
      const categoryOfferData = {
        categoryName: categoryName,
        categoryOfferPercentage: categoryOfferPercentage,
        startDate: startDate,
        endDate: endDate,
        currentStatus: true // Update current status
      };
  
      const updatedCategoryOffer = await categoryOfferCollection.categoryOfferModel.findOneAndUpdate(
        { _id: categoryOfferId },
        categoryOfferData,
        { new: true, useFindAndModify: false }
      );
  
      if (!updatedCategoryOffer) {
        return res.status(404).json({ success: false, message: 'Category offer not found' });
      }
  
      res.json({ success: true, data: updatedCategoryOffer });
  
    } catch (error) {
        next(new AppError(error.message, 500))
    }
  };


  // categoryGet
  // categoryAdd
  // categoryEdit
  // categoryDelete
  // categorySearch
  // unList
  // List
  // categoryOfferManagement
  // addCategoryOffer
  // editOffer

  /*------- category Offer Management ----*/
  
  // categoryOfferManagement
  // addCategoryOffer
  // editOffer

