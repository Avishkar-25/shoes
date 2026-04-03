const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendMail(to_mail, subject, message) {
  try {
    await transporter.sendMail({
      from: `"Shoes Store" <${process.env.EMAIL_USER}>`,
      to: to_mail,
      subject: subject,
      html: message
    });

    console.log("✅ Mail Sent");
  } catch (err) {
    console.log("❌ Error:", err);
  }
}

module.exports = sendMail;