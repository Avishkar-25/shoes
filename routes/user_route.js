var express = require("express")
var exe = require('./../connection')
// var url = require("url");
var sendMail = require("./send_mail");
// const { log } = require("console");

var router = express.Router();

router.get("/", async function(req,res){
    var sliders = await exe ('select * from slider');
    var trending_products = await exe (`select * from products where product_is_trending = 'yes'`);
    var product_type = await exe (`select * from product_type`);
    var product_style = await exe (`select * from product_style`);
    var high_dicount_products = await exe (`select * from products order by apply_discount_percent desc limit 4`);

    // user session check
    var packet = {
        sliders,
        trending_products,
        product_type,
        product_style,
        high_dicount_products,
        user: req.session.user || null  // ✅ add this
    }

    res.render("user/home.ejs", packet)
})

router.get("/product_list", async function (req, res) {

  var url_data = req.query;
  var sql = `SELECT * FROM products`; 

  if (url_data.cat) {

    if (url_data.cat ==  'Mens') {
      sql = `SELECT * FROM products WHERE product_for = 'Male'`;
    }
    else if (url_data.cat == 'Womens') {
      sql = `SELECT * FROM products WHERE product_for = 'Female'`;
    }
    else if (url_data.cat == 'KidBoys') {
      sql = `SELECT * FROM products 
             WHERE product_for = 'Kids' AND product_kid_type = 'boys'`;
    }
    else if (url_data.cat == 'KidGirls') {
      sql = `SELECT * FROM products 
             WHERE product_for = 'Kids' AND product_kid_type = 'girls'`;
    }
   
  }

  var products = await exe(sql);
  res.render("user/product_list.ejs", { products });
});

router.get("/Sale", async function(req,res){
  res.render("user/sale.ejs");
})

router.get("/product_details/:id", async function(req,res){
  var id = req.params.id;
  var sql = `SELECT * FROM products WHERE product_id = '${id}'`;
  var info = await exe(sql)
  
  // ❌ this is the key
  var is_login = req.session.user_id ? true : false;
  
  var packet = {info,is_login};
  res.render("user/product_details.ejs", packet);
})

router.get("/buy_now/:product_id", check_login, async function(req, res){
    const id = req.params.product_id;
    const url_data = req.query;       // ✅ safer than url.parse()
    url_data.qty = url_data.qty || 1;
    url_data.size = url_data.size || '6';

    const sql = `SELECT * FROM products WHERE product_id = ?`;
    const info = await exe(sql, [id]);

    res.render("user/buy_now.ejs", { info, url_data });
});
router.post("/send_otp_mail", async function(req,res){

    try{

        var otp = Math.floor(100000 + Math.random()*900000);

        var subject = "StepStyle OTP Verification";
        var message = `Your OTP is: ${otp}`;

        await sendMail(req.body.email, subject, message);

        req.session.otp = otp;
        req.session.email = req.body.email;

        console.log("OTP:", otp);

        res.send("OTP SENT");

    }catch(err){

        console.log(err);
        res.send("Email sending failed");

    }

});
 
router.post("/verify_otp", async function(req, res) {

     var email = req.session.email;

     if (req.session.otp == req.body.otp) {

         var sql = `SELECT * FROM customer WHERE email = ?`;
         var check_customer = await exe(sql, [email]);

         if (check_customer.length > 0) {

             req.session.user_id = check_customer[0].customer_id;

             await transfer_data(req, res);

             return res.send({
                 status: true,
                 new_user: false
             });

         } else {

             var sql2 = `INSERT INTO customer (email) VALUES (?)`;
             var result = await exe(sql2, [email]);

             req.session.user_id = result.insertId;

             await transfer_data(req, res);

             return res.send({
                 status: true,
                 new_user: true
             });
         }

     } else {

         return res.send({
             status: false
         });

     }

 });

// ✅ FIX: OTP verify के बाद cart data को database में डालने के लिए function
async function transfer_data(req,res,next){

  var carts = req.cookies.cart;

  if(!carts){
    console.log("❌ No cart cookie found");
    return; // ⛔ STOP
  }

  try{
    carts = JSON.parse(carts);
  }catch(e){
    console.log("❌ Invalid cart format");
    return;
  }

  if(carts.length == 0){
    console.log("❌ Cart is empty");
    return;
  }

  console.log("✅ CART DATA:", carts);

  for(var i=0; i<carts.length; i++){

    var customer_id = req.session.user_id;
    var product_id = carts[i].product_id;
    var qty = carts[i].qty;
    var size = carts[i].size;

    if(!product_id){
      console.log("❌ product_id missing:", carts[i]);
      continue;
    }

    var sql = `INSERT INTO carts (customer_id,product_id,qty,size) VALUES (?,?,?,?)`;

    await exe(sql,[customer_id,product_id,qty,size]);
  }

  res.clearCookie("cart");
}

// router.post("/customer_login", async function(req, res){
//     var d = req.body;
//     var sql = "SELECT * FROM customer WHERE email=? AND password=?";
//     var result = await exe(sql,[d.login_email, d.login_password]);

//     if(result.length > 0){
//         req.session.user = result[0]; // for user info
//         req.session.user_id = result[0].customer_id; // ✅ add this
//         res.redirect("/");
//     } else {
//         res.send("Invalid Email or Password");
//     }
// });
// router.post("/customer_login", async function(req, res){
//     var d = req.body;
//     var sql = "SELECT * FROM customer WHERE email=? AND password=?";
//     var result = await exe(sql,[d.login_email, d.login_password]);

//     if(result.length > 0){
//         req.session.user = result[0]; // ✅ important
//         res.redirect("/"); // home page la redirect kar
//     } else {
//         res.send("Invalid Email or Password");
//     }
// });


function check_login(req,res,next){
  // otp chi garaj nahi login sathi
  // req.session.user_id = 5
    if(req.session.user_id)
      next();
    else
      res.redirect("/");
}
router.post("/checkout_order", check_login, async function(req,res){
  try{
    const d = req.body;
    const customer_id = req.session.user_id;
    const country = 'India';

    // 🔹 product info database मधून घेतो
    const product_info = await exe(`SELECT * FROM products WHERE product_id = ?`, [d.product_id]);

    const product_price = Number(product_info[0].product_price);
    const product_qty = Number(d.product_qty);
    const total_amount = product_price * product_qty;

    // 🔹 IMPORTANT
    // जर stock पेक्षा जास्त qty order केली तर order block करतो
    if(product_info[0].product_stock < product_qty){
        return res.send("Product Out Of Stock");
    }

    const payment_method = "Online";
    const payment_status = "Pending";
    const order_status = "Pending";
    const order_date = new Date().toISOString().slice(0,10);

    // 🔹 order insert
    const sql = `INSERT INTO orders
      (customer_id, country, state, city, area, landmark, pincode,
       product_market_price, product_discount, product_price, product_name,
       product_qty, product_size, payment_method, payment_status, order_date,
       order_status, total_amount, full_name, mobile)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

    const result = await exe(sql, [
      customer_id,
      country,
      d.state,
      d.city,
      d.address,
      d.landmark || '',
      d.pincode,
      product_info[0].product_market_price,
      product_info[0].apply_discount_percent,
      product_price,
      product_info[0].product_name,
      product_qty,
      d.product_size,
      payment_method,
      payment_status,
      order_date,
      order_status,
      total_amount,
      d.full_name,
      d.mobile
    ]);

    const order_id = result.insertId;

    // 🔹 IMPORTANT PART
    // Customer ने order केला आहे म्हणून product_stock कमी करतो
    await exe(`
      UPDATE products
      SET product_stock = product_stock - ${product_qty}
      WHERE product_id = '${d.product_id}'
    `);

    res.redirect("/accept_payment/" + order_id);

  }catch(err){
    console.log("Checkout Error:", err);
    res.send("Something went wrong!");
  }
});
// GET accept_payment page
router.get("/accept_payment/:order_id", check_login, async function(req,res){
    var id = req.params.order_id;
    var sql = `SELECT * FROM orders WHERE order_id = '${id}'`;
    var order_info = await exe(sql);
    res.render("user/accept_payment.ejs", { order_info: order_info[0] });
});

router.post("/payment_success/:order_id", check_login, async function(req,res){
    var id = req.params.order_id;

    // 🔹 Payment update
    var sql = `UPDATE orders 
               SET payment_status = 'paid',
                   transaction_id = '${req.body.razorpay_payment_id}'
               WHERE order_id = '${id}'`;
    await exe(sql);

    // 🔹 Send email etc (existing code)
    res.redirect("/my_orders");
});


// router.post("/payment_success/:order_id",check_login,async function(req,res){

//    var id = req.params.order_id;
//    var sql = `UPDATE orders SET payment_status = 'paid',transaction_id   = '${req.body.razorpay_payment_id}' WHERE order_id = '${id}'`;
//    var result = await exe(sql);
//    res.redirect("/my_orders")
// })
router.get("/my_orders", check_login, async function (req,res) {

var sql = `
SELECT * FROM orders
WHERE customer_id = ?
AND order_status != 'cancelled'
ORDER BY order_id DESC
`;

var orders = await exe(sql,[req.session.user_id]);

var packet = {orders};

console.log(orders);

res.render("user/my_order.ejs",packet);

});

// DELETE order by ID
router.get('/cancle_order/:order_id', async (req, res) => {
    const orderId = req.params.order_id;

    try {
        await exe("UPDATE orders SET order_status = 'cancelled' WHERE order_id = ?", [orderId]);

        res.redirect('/my_orders');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error cancelling order.");
    }
});
// router: routes/user.js
router.get("/print_order/:order_id", check_login, async function (req, res) {
    try {
        // 🔹 Fetch order for logged-in user
        let sqlOrder = `SELECT * FROM orders WHERE customer_id = ? AND order_id = ?`;
        let orders = await exe(sqlOrder, [req.session.user_id, req.params.order_id]);

        if (orders.length === 0) {
            return res.render("user/print_order.ejs", { orders: [] });
        }

        // 🔹 Fetch products for each order
        for (let i = 0; i < orders.length; i++) {
            let sqlProducts = `SELECT * FROM order_products WHERE order_id = ?`;
            let products = await exe(sqlProducts, [orders[i].order_id]);
            orders[i].products = products; // attach products array to order
        }

        res.render("user/print_order.ejs", { orders });
    } catch (err) {
        console.log(err);
        res.send("Error fetching order!");
    }
});


// 🛒 ADD TO CART
router.get("/add_to_cart/:product_id", async function(req,res){

  var product_id = req.params.product_id;

  // ✅ URL query (qty, size)
  var url_data = req.query;

  // ✅ default values (important fix)
  var qty = url_data.qty || 1;
  var size = url_data.size || '';

  // ==============================
  // 🔐 LOGIN USER (DB Cart)
  // ==============================
  if(req.session.user_id){

    var customer_id = req.session.user_id;

    // ✅ check existing item
    var sql = `SELECT * FROM carts WHERE customer_id=? AND product_id=? AND size=?`;
    var info = await exe(sql,[customer_id,product_id,size]);

    if(info.length > 0){

      // ✅ increase qty
      var new_qty = Number(info[0].qty) + Number(qty);

      await exe(
        `UPDATE carts SET qty=? WHERE customer_id=? AND product_id=? AND size=?`,
        [new_qty,customer_id,product_id,size]
      );

    }else{

      // ✅ insert new item
      await exe(
        `INSERT INTO carts (customer_id,product_id,qty,size) VALUES (?,?,?,?)`,
        [customer_id,product_id,qty,size]
      );
    }

    res.redirect(`/product_details/${product_id}`);
  }

  // ==============================
  // 👤 GUEST USER (COOKIE Cart)
  // ==============================
  else{

    var cart = req.cookies.cart;

    // ✅ parse cookie safely
    if(cart){
      try{
        cart = JSON.parse(cart);
        if(!Array.isArray(cart)) cart = [];
      }catch(e){
        cart = [];
      }
    }else{
      cart = [];
    }

    var already = false;

    // ✅ check existing item
    for (var i=0; i<cart.length; i++){
      if(cart[i].product_id == product_id && cart[i].size == size){

        // ✅ increase qty
        cart[i].qty = Number(cart[i].qty) + Number(qty);
        already = true;
      }
    }

    // ✅ new item
    if(!already){
      cart.push({
        product_id: product_id,
        qty: qty,
        size: size
      });
    }

    // ✅ save cookie (7 days)
    res.cookie("cart", JSON.stringify(cart), {
      maxAge: 1000 * 60 * 60 * 24 * 7
    });

    res.redirect(`/product_details/${product_id}`);
  }
});


router.get("/cart", async function (req, res) {

  var carts = [];

  // ==============================
  // 🔐 LOGIN USER
  // ==============================
  if (req.session.user_id) {

    var customer_id = req.session.user_id;

    // ✅ get cart from DB
    carts = await exe(`SELECT * FROM carts WHERE customer_id=?`, [customer_id]);
  }

  // ==============================
  // 👤 GUEST USER
  // ==============================
  else {

    if (req.cookies.cart) {
      try {
        carts = JSON.parse(req.cookies.cart);

        if (!Array.isArray(carts)) carts = [];

      } catch (err) {
        carts = [];
      }
    }
  }

  var cart_data = [];

  // ==============================
  // 🔄 LOOP CART ITEMS
  // ==============================
  for (var i = 0; i < carts.length; i++) {

    // ✅ product info fetch
    var pinfo = await exe(
      `SELECT * FROM products WHERE product_id=?`,
      [carts[i].product_id]
    );

    if (pinfo.length > 0) {

      var obj = {

        // ✅ delete साठी id (DB / cookie)
        "cart_id": (carts[i].cart_id) ? carts[i].cart_id : i,

        "product_name": pinfo[0].product_name,
        "product_image": pinfo[0].product_main_image,
        "product_price": pinfo[0].product_price,
        "product_discount": pinfo[0].apply_discount_percent,

        "qty": carts[i].qty,
        "size": carts[i].size
      };

      cart_data.push(obj);
    }
  }

  var is_login = req.session.user_id ? true : false;

  var packet = { cart_data, is_login };

  res.render("user/cart.ejs", packet);
});


router.get("/delete_cart/:id", async function(req, res) {
  var id = req.params.id;

  if (req.session.user_id) {
    // ✅ Login user → DB मधून delete
    var user_id = req.session.user_id;

    var sql = `DELETE FROM carts WHERE cart_id = ? AND customer_id = ?`;
    await exe(sql, [id, user_id]);

    res.redirect("/cart");

  } else {
    // ✅ Guest user → cookies मधून delete
    var carts = JSON.parse(req.cookies.cart || "[]");

    carts.splice(id, 1);

    res.cookie("cart", JSON.stringify(carts));
    res.redirect("/cart");
  }
});

router.post("/place_order", check_login, async function(req, res){

  var customer_id = req.session.user_id;
  var full_name = req.body.full_name;
  var mobile = req.body.mobile;
  var country = 'India';
  var state = req.body.state;
  var city = req.body.city;
  var area = req.body.address;
  var pincode = req.body.pincode;

  // ✅ Get user cart total
  var sql_total = `
    SELECT SUM(carts.qty * products.product_price) AS total_amount
    FROM carts 
    JOIN products ON carts.product_id = products.product_id
    WHERE carts.customer_id = ?
  `;
  var user_cart_total = await exe(sql_total, [customer_id]);
  var total_amount = user_cart_total[0].total_amount || 0;

  var payment_method = "online";
  var payment_status = "pending";
  var order_date = new Date().toISOString().slice(0,10);
  var order_status = "placed";

  // ✅ Insert into orders table
  var sql_order = `
    INSERT INTO orders
    (customer_id,country,state,city,area,pincode,
     total_amount,payment_method,payment_status,
     order_date,order_status,full_name,mobile)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `;

  var result_order = await exe(sql_order,[
    customer_id,
    country,
    state,
    city,
    area,
    pincode,
    total_amount,
    payment_method,
    payment_status,
    order_date,
    order_status,
    full_name,
    mobile
  ]);

  var order_id = result_order.insertId;

  // ✅ Fetch cart data with alias for size
  var sql_cart = `
    SELECT carts.*, products.product_name, products.product_market_price, 
           products.apply_discount_percent, products.product_price AS db_price,
           carts.size AS cart_size
    FROM carts 
    JOIN products ON carts.product_id = products.product_id
    WHERE carts.customer_id = ?
  `;

  var carts = await exe(sql_cart, [customer_id]);

  // ✅ Insert each cart item into order_products
  for(var i=0;i<carts.length;i++){

    var product_id = carts[i].product_id;
    var product_name = carts[i].product_name;
    var product_size = carts[i].cart_size;           // <- alias fixes empty issue
    var product_market_price = carts[i].product_market_price;
    var product_discount = carts[i].apply_discount_percent;
    var product_price = carts[i].db_price;           // take from products table
    var product_qty = carts[i].qty;
    var product_total = product_qty * product_price;

    var sql_order_product = `
      INSERT INTO order_products
      (order_id,customer_id,product_id,product_name,product_size,
       product_market_price,product_discount,product_price,product_qty,product_total)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `;

    await exe(sql_order_product,[
      order_id,
      customer_id,
      product_id,
      product_name,
      product_size,
      product_market_price,
      product_discount,
      product_price,
      product_qty,
      product_total
    ]);
  }

  // ✅ Clear user cart
  var sql_clear = `DELETE FROM carts WHERE customer_id = ?`;
  await exe(sql_clear, [customer_id]);

  // ✅ Redirect to payment page
  res.redirect("/accept_payment/" + order_id);
});

// PROFILE ROUTE
router.get("/profile", check_login, async function(req,res){

var user_id = req.session.user_id;

var result = await exe(`
SELECT * FROM customer
WHERE customer_id = ?
`,[user_id]);

res.render("user/profile.ejs",{result});

});
router.get("/edit_profile", check_login, async function(req, res) {
    const user_id = req.session.user_id;
    const sql = `SELECT * FROM customer WHERE customer_id = ?`;
    const result = await exe(sql, [user_id]);

    if(result.length === 0){
        return res.send("User not found");
    }

    res.render("user/edit_profile.ejs", { result });
});

router.post("/update_profile", check_login, async function(req, res) {

    const user_id = req.session.user_id;

    const name = req.body.name;
    const email = req.body.email;
    const mobile = req.body.mobile;

    // Update database
    const sql = `UPDATE customer 
                 SET name=?, email=?, mobile=? 
                 WHERE customer_id=?`;

    await exe(sql, [name, email, mobile, user_id]);

    // ✅ Session update (error avoid)
    if(req.session.user){
        req.session.user.name = name;
        req.session.user.email = email;
        req.session.user.mobile = mobile;
    }

    res.redirect("/profile");

});

router.get("/order_tracking/:order_id", async function(req,res){

 var order_id = req.params.order_id;

 var result = await exe(`
 SELECT * FROM orders
 WHERE order_id='${order_id}'
 `);

if(result.length == 0){
return res.send("Order Not Found");
}

res.render("user/order_tracking",{order:result[0]});

});

router.post("/pay/:order_id", async (req, res) => {
    try {
        const orderId = req.params.order_id;

        // 🔹 Get order details from DB
        const order = await db.query("SELECT * FROM orders WHERE order_id = ?", [orderId]);
        if (!order[0]) return res.send("Order not found");

        // 🔹 Create Razorpay order
        const options = {
            amount: order[0].total_amount * 100, // paisa
            currency: "INR",
            receipt: `order_rcptid_${orderId}`
        };
        const payment = await razorpay.orders.create(options);

        // 🔹 Send payment details to frontend (or redirect to checkout page)
        res.render("payment_page", { payment, order: order[0] });
    } catch (err) {
        console.log(err);
        res.status(500).send("Something went wrong");
    }
});
router.post("/verify_delivery_otp", async function(req,res){

var order_id = req.body.order_id;
var otp = req.body.otp;

var result = await exe(`
SELECT delivery_otp FROM orders
WHERE order_id=?
`,[order_id]);

if(result.length>0 && result[0].delivery_otp == otp){

await exe(`
UPDATE orders
SET order_status='Delivered'
WHERE order_id=?
`,[order_id]);

res.redirect("/my_orders");

}else{

res.send("Invalid OTP");

}

});









// Logout route
router.get("/logout", function(req, res) {
    // Destroy session
    req.session.destroy(function(err) {
        if (err) {
            console.log(err);
            return res.send("Error logging out");
        }
        // Redirect to home or login page
        res.redirect("/"); // change to your login/home page
    });
});
module.exports = router;