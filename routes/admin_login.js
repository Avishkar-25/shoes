var express = require("express")
var exe = require('../connection')

var router = express.Router();

router.get("/",function(req,res){
    res.render("admin/login.ejs")
})
router.post("/process_login", async function(req, res){

    const { mobile, password } = req.body;

    var sql = "SELECT * FROM admin WHERE mobile = ? AND status = 'active'";

    try {

        var result = await exe(sql, [mobile]);

        if(result.length > 0){

            var db_password = result[0].password;

            if(password == db_password){

                req.session.admin_id = result[0].admin_id;
                req.session.admin_name = result[0].admin_name;

                res.redirect("/admin");

            } else {
                res.send("Invalid Password");
            }

        } else {
            res.send("Admin not found");
        }

    } catch(err){
        res.send(err);
    }

});

module.exports = router;

