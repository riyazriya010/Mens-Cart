const AppError = require('../middleware/errorHandling.js');
const { 
    getTodayRevenue, 
    getTotalOrders, 
    getTotalProducts,
    currentMonth,
    categorySale,
    lastTwoWeekRevenue,
    topProducts,
    topCategory
} = require('../helper/adminDashboard');

const productCollection = require('../models/productModel.js');


exports.adminLoginGet = (req, res, next) => {
    try {
        
        if (res.locals.adminLogged) {
            return res.redirect('/dashboard'); // Redirect to dashboard if already logged in
        }
        res.render('adminPages/loginPage'); // Render login page
    } catch (error) {
        next(new AppError(error.message, 500))
    }
}



exports.adminLoginVerify = (req, res, next) => {
    try {
        
        const { email, password } = req.body
    
        if(email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD){
            req.session.adminVerify = true;
            req.session.save();
            res.json({success:true});
        }else{
            // req.session.adminVerify = false;
            req.session.loginError = true
            res.json({success:false});
        }
    } catch (error) {
        next(new AppError(error.message, 500))
    }
}


//dashboard
exports.dashBoard = (req,res, next) => {
    try {
        
        if(req.session.adminVerify){
    
            res.render("adminPages/dashBoard");
        }else{
    
            res.redirect('/adminLogin');
        }
    } catch (error) {
        next(new AppError(error.message, 500))
    }
    
}

//logout 
exports.adminLogout = (req,res, next) => {
    try {
        
        req.session.destroy((error) => {
            if (error) {
                // console.error('Error destroying session:', err);
                return res.status(500).send('Internal Server Error');
            }
            res.redirect('/adminLogin');
          });
    } catch (error) {
        next(new AppError(error.message, 500))
    }
}




// adminDash board
exports.getData = async (req, res, next) => {
    try {
        const filter = req.query.filter

        const todayRevenue = await getTodayRevenue();
        const totalOrders = await getTotalOrders();
        const totalProducts = await getTotalProducts();
        const currentMonthEarnings = await currentMonth()
        const categorySaleTwoWeeks = await categorySale(filter)
        const lastTwoWeekRevenueData = await lastTwoWeekRevenue(filter)

        return res.status(200).json({ success: true, data:{ 
            todayRevenue, 
            totalOrders, 
            totalProducts,
            currentMonthEarnings,
            categorySaleTwoWeeks,
            lastTwoWeekRevenueData
        } });

    } catch (error) {
        next(new AppError(error.message, 500))
    }
}


// Controller function to fetch and render top products with pagination
exports.topProducts = async (req, res, next) => {
    try {
        // Assume topProducts() fetches the products from database
        const allProducts = await topProducts(); // Fetch all products

        const sortedProd = allProducts.sort((a,b) => b.quantity - a.quantity)

        const pageSize = 5; // Number of products per page
        const page = parseInt(req.query.page) || 1; // Current page number, default to 1

        // Calculate start and end indexes of products for the current page
        const startIndex = (page - 1) * pageSize;
        const endIndex = page * pageSize;

        // Slice the array to get products for the current page
        const products = sortedProd.slice(startIndex, endIndex);

        const productData = await productCollection.product.find()

        // Render the template with products and pagination data
        res.render('adminPages/topProducts', {
            topProducts: products,
            currentPage: page,
            productData,
            totalPages: Math.ceil(allProducts.length / pageSize)
        });
    } catch (error) {
        next(new AppError(error.message, 500))
    }
};





// Controller function to fetch and render top products with pagination
exports.topCategory = async (req, res, next) => {
    try {
        // Assume topProducts() fetches the products from database
        const allCategory = await topCategory(); // Fetch all products

        const sortedCat = allCategory.sort((a,b) => b.quantity - a.quantity)

        const pageSize = 5; // Number of products per page
        const page = parseInt(req.query.page) || 1; // Current page number, default to 1

        // Calculate start and end indexes of products for the current page
        const startIndex = (page - 1) * pageSize;
        const endIndex = page * pageSize;

        // Slice the array to get products for the current page
        const products = sortedCat.slice(startIndex, endIndex);

        // const productData = await productCollection.product.find()

        // Render the template with products and pagination data
        res.render('adminPages/topCategory', {
            topCategory: products,
            currentPage: page,
            // productData,
            totalPages: Math.ceil(allCategory.length / pageSize)
        });
    } catch (error) {
        next(new AppError(error.message, 500))
    }
};




