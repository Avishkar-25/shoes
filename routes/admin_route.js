var express = require("express");
var exe = require("./../connection");

var router = express.Router();

const Razorpay = require("razorpay");

const razorpay = new Razorpay({
   key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});
// ✅ Middleware (Admin Login Check)
// function check_admin_login(req, res, next) {

//     if (req.session.admin_id) {
//         next();
//     } else {
//         res.redirect("/admin_login");
//     }
// }

function check_admin_login(req, res, next) {
    next(); // bypass login
}
// ================= DASHBOARD =================
// check_admin_login
router.get("/", check_admin_login, async function(req,res){

var total = await exe(`SELECT COUNT(*) as total FROM orders`);
var pending = await exe(`SELECT COUNT(*) as total FROM orders WHERE order_status='Pending'`);
var delivered = await exe(`SELECT COUNT(*) as total FROM orders WHERE order_status='Delivered'`);
var cancelled = await exe(`SELECT COUNT(*) as total FROM orders WHERE order_status='Cancelled'`);

res.render("admin/home.ejs",{
total_orders: total[0].total,
pending_orders: pending[0].total,
delivered_orders: delivered[0].total,
cancelled_orders: cancelled[0].total
});

});

// ================= USERS =================
// check_admin_login
router.get("/users" , async function (req, res) {
    var users = await exe("SELECT * FROM customer");
    res.render("admin/users.ejs", { users });
});

// DELETE user by ID
// DELETE user by ID
router.get('/delete_user/:customer_id', async (req, res) => {
    const customerId = req.params.customer_id;
    try {
        await exe("DELETE FROM customer WHERE customer_id = ?", [customerId]);
        res.redirect('/admin/users'); // Redirect back to users page
    } catch (err) {
        console.error(err);
        res.status(500).send("Error deleting user.");
    }
});
// ================= DELETE USER =================


// ================= PRODUCT BRANDS =================
router.get("/product_brands", check_admin_login, async function (req, res) {
    var result = await exe("SELECT * FROM product_brands");
    res.render("admin/product_brands.ejs", { result });
});

router.post("/save_product_brand", async function (req, res) {
    var d = req.body;
    await exe(
        "INSERT INTO product_brands (product_brand_name, product_brand_status) VALUES (?, ?)",
        [d.product_brand_name, d.product_brand_status]
    );
    res.redirect("/admin/product_brands");
});

router.get("/delete_product_brand/:id", async function (req, res) {
    await exe("DELETE FROM product_brands WHERE product_brand_id = ?", [req.params.id]);
    res.redirect("/admin/product_brands");
});

router.get("/edit_product_brand/:id", async function (req, res) {
    var result = await exe("SELECT * FROM product_brands WHERE product_brand_id = ?", [req.params.id]);
    res.render("admin/edit_product_brand.ejs", { result });
});

router.post("/update_product_brand", async function (req, res) {
    var d = req.body;
    await exe(
        "UPDATE product_brands SET product_brand_name=?, product_brand_status=? WHERE product_brand_id=?",
        [d.product_brand_name, d.product_brand_status, d.product_brand_id]
    );
    res.redirect("/admin/product_brands");
});

// ================= PRODUCT STYLES =================
router.get("/product_styles", check_admin_login, async function (req, res) {
    var result = await exe("SELECT * FROM product_style");
    res.render("admin/product_styles.ejs", { result });
});

router.post("/save_product_style", async function (req, res) {
    let file_name = "";

    if (req.files && req.files.product_style_image) {
        file_name = Date.now() + "_" + req.files.product_style_image.name;
        await req.files.product_style_image.mv("public/styles/" + file_name);
    }

    let d = req.body;
    await exe(
        "INSERT INTO product_style (product_style_name, product_style_status, product_style_image) VALUES (?, ?, ?)",
        [d.product_style_name, d.product_style_status, file_name]
    );

    res.redirect("/admin/product_styles");
});

router.get("/delete_product_style/:id", async function (req, res) {
    await exe("DELETE FROM product_style WHERE product_style_id=?", [req.params.id]);
    res.redirect("/admin/product_styles");
});


router.get("/edit_product_style/:id", async (req, res) => {

    const id = req.params.id;

    const result = await exe("SELECT * FROM product_style WHERE product_style_id = ?", [id]);

    res.render("admin/edit_product_style.ejs", {
        style: result[0]
    });

});
router.post("/update_product_style", async function (req, res) {

    let d = req.body;
    let file_name = d.old_image; // keep old image by default

    if (req.files && req.files.product_style_image) {
        file_name = Date.now() + "_" + req.files.product_style_image.name;
        await req.files.product_style_image.mv("public/styles/" + file_name);
    }

    await exe(
        "UPDATE product_style SET product_style_name=?, product_style_status=?, product_style_image=? WHERE product_style_id=?",
        [d.product_style_name, d.product_style_status, file_name, d.product_style_id]
    );

    res.redirect("/admin/product_styles");
});

// ================= PRODUCT TYPES =================
router.get("/product_types", check_admin_login, async function (req, res) {
    var result = await exe("SELECT * FROM product_type");
    res.render("admin/product_type.ejs", { result });
});

router.post("/save_product_type", async function (req, res) {
    let file_name = "";

    if (req.files && req.files.product_type_image) {
        file_name = Date.now() + "_" + req.files.product_type_image.name;
        await req.files.product_type_image.mv("public/types/" + file_name);
    }

    let d = req.body;
    await exe(
        "INSERT INTO product_type (product_type_name, product_type_status, product_type_image) VALUES (?, ?, ?)",
        [d.product_type_name, d.product_type_status, file_name]
    );

    res.redirect("/admin/product_types");
});

router.get("/edit_product_type/:id", async function (req, res) {

    let id = req.params.id;

    let result = await exe("SELECT * FROM product_type WHERE product_type_id = ?", [id]);

    res.render("admin/edit_product_type.ejs", {
        type: result[0]
    });

});
router.post("/update_product_type", async function (req, res) {

    let file_name = "";
    let d = req.body;

    // keep old image by default
    file_name = d.old_image;

    // if new image uploaded
    if (req.files && req.files.product_type_image) {
        file_name = Date.now() + "_" + req.files.product_type_image.name;
        await req.files.product_type_image.mv("public/types/" + file_name);
    }

    await exe(
        "UPDATE product_type SET product_type_name=?, product_type_status=?, product_type_image=? WHERE product_type_id=?",
        [d.product_type_name, d.product_type_status, file_name, d.product_type_id]
    );

    res.redirect("/admin/product_types");
});
// ================= ADD PRODUCTS =================
router.get("/add_products", check_admin_login, async function (req, res) {
    var brands = await exe("SELECT * FROM product_brands");
    var styles = await exe("SELECT * FROM product_style");
    var types = await exe("SELECT * FROM product_type");

    res.render("admin/add_products.ejs", { brands, styles, types });
});

router.post("/save_product", async function (req, res) {
    let d = req.body;
    let file_name = "";

    if (req.files && req.files.product_main_image) {
        file_name = Date.now() + "_" + req.files.product_main_image.name;
        await req.files.product_main_image.mv("public/product/" + file_name);
    }

    let discount = 0;
    if (d.product_market_price && d.product_price) {
        discount =
            ((d.product_market_price - d.product_price) /
                d.product_market_price) *
            100;
    }

    await exe(
    `INSERT INTO products 
    (product_name, product_market_price, apply_discount_percent, product_price,
    product_description, product_main_image, product_brand_id, product_style_id,
    product_type_id, product_stock, product_color, product_for, product_kid_type, status, product_added_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW())`,
    [
        d.product_name,
        d.product_market_price,
        discount,
        d.product_price,
        d.product_description,
        file_name,
        d.product_brand_id,
        d.product_style_id,
        d.product_type_id,
        d.product_stock,
        d.product_color,
        d.product_for,       // ✅ add this
        d.product_kid_type || null // ✅ add this
    ]
);
    res.redirect("/admin/add_products");
});

router.get("/edit_product/:id", async function (req, res) {

    let id = req.params.id;

    let product = await exe("SELECT * FROM products WHERE product_id = ?", [id]);

    let brands = await exe("SELECT * FROM product_brands");
    let styles = await exe("SELECT * FROM product_style");
    let types = await exe("SELECT * FROM product_type");

    res.render("admin/edit_product.ejs", {
        product: product[0],
        brands,
        styles,
        types
    });

});
router.post("/update_product", async function (req, res) {

   let d = req.body;
let file_name = d.old_image;

// Image upload
if (req.files && req.files.product_main_image) {
    file_name = Date.now() + "_" + req.files.product_main_image.name;
    await req.files.product_main_image.mv("public/product/" + file_name);
}

// Discount calculation
let discount = 0;
if (d.product_market_price && d.product_price) {
    discount =
        ((d.product_market_price - d.product_price) /
            d.product_market_price) * 100;
}

d.offer_expiry_date = d.offer_expiry_date || null;
d.product_added_date = d.product_added_date || null;
if (d.product_for !== "kids") {
    d.product_kid_type = null;
}
d.product_for = d.product_for;
await exe(
    `UPDATE products SET 
        product_name=?, 
        product_market_price=?, 
        apply_discount_percent=?, 
        product_price=?, 
        product_description=?, 
        product_main_image=?, 
        product_rating=?, 
        product_is_trending=?, 
        product_brand_id=?, 
        product_style_id=?, 
        product_type_id=?, 
        product_for=?, 
        product_kid_type=?, 
        offer_expiry_date=?, 
        product_added_date=?, 
        product_stock=?, 
        product_color=?, 
        status=? 
    WHERE product_id=?`,
    [
        d.product_name,
        d.product_market_price,
        discount,
        d.product_price,
        d.product_description,
        file_name,
        d.product_rating,
        d.product_is_trending,
        d.product_brand_id,
        d.product_style_id,
        d.product_type_id,
        d.product_for,
        d.product_kid_type,
        d.offer_expiry_date,
        d.product_added_date,
        d.product_stock,
        d.product_color,
        d.status,
        d.product_id
    ]
);

    res.redirect("/admin/products_list");

});

// ================= PRODUCT LIST =================
router.get("/products_list", check_admin_login, async function (req, res) {
    var result = await exe("SELECT * FROM products");
    res.render("admin/products_list.ejs", { result });
});
 // ================= PRODUCT Edit LIST =================



router.get("/delete_product/:id", async function (req, res) {
    await exe("DELETE FROM order_products WHERE product_id=?", [req.params.id]);
    await exe("DELETE FROM products WHERE product_id=?", [req.params.id]);
    res.redirect("/admin/products_list");
});

// ================= PROMOTIONAL BANNERS =================
router.get("/promotional_banners", check_admin_login, async function (req, res) {
    var banners = await exe("SELECT * FROM promotional_banners");
    res.render("admin/promotional_banners.ejs", { banners });
});

router.post("/save_banner", async function (req, res) {
    let file_name = "";

    if (req.files && req.files.banner_image) {
        file_name = Date.now() + "_" + req.files.banner_image.name;
        await req.files.banner_image.mv("public/banners/" + file_name);
    }

    let d = req.body;

    await exe(
        "INSERT INTO promotional_banners (banner_image, banner_title, banner_link) VALUES (?, ?, ?)",
        [file_name, d.banner_title, d.banner_link]
    );

    res.redirect("/admin/promotional_banners");
});

// ================= SLIDER =================
router.get("/slider_images", check_admin_login, function (req, res) {
    res.render("admin/slider_images.ejs");
});

router.post("/save_slider", async function (req, res) {
    let file_name = "";

    if (req.files && req.files.slider_image) {
        file_name = Date.now() + "_" + req.files.slider_image.name;
        await req.files.slider_image.mv("public/slider/" + file_name);
    }

    let d = req.body;

    await exe(
        "INSERT INTO slider (slider_image, slider_title, slider_description, slider_button, slider_button_link) VALUES (?, ?, ?, ?, ?)",
        [file_name, d.slider_title, d.slider_description, d.slider_button, d.slider_button_link]
    );

    res.redirect("/admin/slider_images");
});


;router.get("/slider_images_list", async function (req, res) {

    let result = await exe("SELECT * FROM slider");

    res.render("admin/slider_images_list.ejs", { result });

});

router.get("/edit_slider/:id", async function (req, res) {

    let id = req.params.id;

    let result = await exe("SELECT * FROM slider WHERE slider_id = ?", [id]);

    res.render("admin/edit_slider.ejs", {
        slider: result[0]
    });

});
router.post("/update_slider", async function (req, res) {

    let d = req.body;

    let file_name = d.old_image; // keep old image

    // if new image uploaded
    if (req.files && req.files.slider_image) {
        file_name = Date.now() + "_" + req.files.slider_image.name;
        await req.files.slider_image.mv("public/slider/" + file_name);
    }

    await exe(
        "UPDATE slider SET slider_image=?, slider_title=?, slider_description=?, slider_button=?, slider_button_link=? WHERE slider_id=?",
        [file_name, d.slider_title, d.slider_description, d.slider_button, d.slider_button_link, d.slider_id]
    );

    res.redirect("/admin/slider_images_list");

});
router.get("/delete_slider/:id", async function (req, res) {

    let id = req.params.id;

    await exe("DELETE FROM slider WHERE slider_id = ?", [id]);

    res.redirect("/admin/slider_images_list");

});
// ================= ORDERS =================

// Pending Orders
router.get("/pending_orders", check_admin_login, async function (req, res) {

    var orders = await exe(`
        SELECT * FROM orders 
        WHERE order_status='Pending'
    `);

    res.render("admin/pending_orders.ejs", { orders });

});

router.get("/dispatch_orders", check_admin_login, async function (req, res) {

    var orders = await exe(`
        SELECT * FROM orders 
        WHERE order_status='Dispatched'
    `);

    res.render("admin/dispatch_orders.ejs", { orders });

});
// Dispatch Orders
router.get("/dispatch_orders/:id", check_admin_login, async function (req, res) {

    var id = req.params.id;

    // ✅ Order status Pending → Dispatched
    await exe(`
        UPDATE orders 
        SET order_status='Dispatched'
        WHERE order_id='${id}'
    `);

    // ✅ Dispatch orders page reload
    res.redirect("/admin/dispatch_orders");

});
router.get("/delivered_orders", check_admin_login, async function (req, res) {

    var orders = await exe(`
        SELECT * FROM orders 
        WHERE order_status='Delivered'
    `);
    res.render("admin/delivered_orders.ejs", { orders });

});


// Cancelled Orders
router.get("/cancelled_orders", check_admin_login, async function (req, res) {
    var orders = await exe(`
        SELECT * FROM orders 
        WHERE order_status='Cancelled'
    `);
    res.render("admin/cancelled_orders.ejs", { cancelled_orders: orders });

});


// Return Orders
router.get("/return_orders", check_admin_login, async function (req, res) {

    var orders = await exe(`
        SELECT * FROM orders 
        WHERE order_status='Return'
    `);
    res.render("admin/return_orders.ejs", { orders });
});

router.get("/dispatch_order/:order_id", async function(req,res){

var order_id = req.params.order_id;

// random 4 digit OTP
var otp = Math.floor(1000 + Math.random() * 9000);

await exe(`
UPDATE orders
SET order_status='Dispatched',
delivery_otp=?
WHERE order_id=?
`,[otp,order_id]);

console.log("Delivery OTP :", otp);

res.redirect("/admin/orders");

});
router.get("/deliver_order/:id", check_admin_login, async function(req,res){

    var order_id = req.params.id;

    await exe(`
        UPDATE orders 
        SET order_status='Delivered'
        WHERE order_id='${order_id}'
    `);

    res.redirect("/admin/dispatch_orders");

});

router.get("/refund/:payment_id",check_admin_login, async function(req,res){

try{

var payment_id = req.params.payment_id;

// fetch payment
var payment = await razorpay.payments.fetch(payment_id);

console.log("Payment Status:", payment.status);

// capture if authorized
if(payment.status === "authorized"){

    await razorpay.payments.capture(payment_id, payment.amount);
    payment = await razorpay.payments.fetch(payment_id);

}

// check captured
if(payment.status !== "captured"){

    return res.send("Payment not captured. Refund not possible.");

}

// refund payment
var refund = await razorpay.payments.refund(payment_id,{
    amount: payment.amount
});

console.log("Refund Success:", refund);


// update order
await exe(`
    UPDATE orders
    SET 
    order_status='Refunded',
    payment_status='refunded'
    WHERE transaction_id='${payment_id}'
`);

res.redirect("/admin/cancelled_orders");

}
catch(err){

console.log("Refund Error:",err);
res.send("Refund Failed");

}

});


// ================= EXPORT =================
module.exports = router;