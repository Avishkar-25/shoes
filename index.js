// npm i express ejs mysql2 express-fileupload express-session
// npm install nodemailer
var express = require("express");
var bodyparser = require("body-parser");
var session = require("express-session");
var cookieParser = require('cookie-parser');
var upload = require("express-fileupload");
require("dotenv").config();
var user_route = require('./routes/user_route');
var admin_route = require('./routes/admin_route');
var admin_login = require('./routes/admin_login');


// const session = require("express-session");
// const MySQLStore = require("express-mysql-session")(session);
var app = express();

app.use(express.json());
app.use(cookieParser());
app.use(bodyparser.urlencoded({extended:true}));
app.use(upload());
app.use(express.static("public/"))

app.set("view engine","ejs");
app.use(session({
    secret:"sdncsndn",
    resave:true,
    saveUninitialized:true
}))





app.use((req, res, next) => {

    // user data
    res.locals.user = req.session.user || null;

    // login status
    res.locals.is_login = req.session.user_id ? true : false;

    next();
});

app.use('/admin_login',admin_login)
app.use('/admin',admin_route)
app.use('/',user_route);


// const PORT = process.env.PORT || 3000;
app.listen(process.env.PORT || 3000)
