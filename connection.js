require("dotenv").config();

var mysql = require("mysql2");
var util = require("util");

var connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

var exe = util.promisify(connection.query).bind(connection);

module.exports = exe;