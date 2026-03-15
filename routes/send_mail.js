const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendMail(email, subject, message) {

  const msg = {
    to: email,
    from: process.env.EMAIL_FROM,
    subject: subject,
    text: message
  };

  await sgMail.send(msg);
}

module.exports = sendMail;








// const nodemailer = require("nodemailer");


// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: "avishkarghadge84@gmail.com",        // 🔴 तुझा email
//     pass: "qvwd ylnc erfh uwgg"            // 🔴 app password
//   }
// });

// async function sendMail(to_mail, subject, message) {
//   try {
//     await transporter.sendMail({
//       from: "avishkarghadge84@gmail.com",
//       to: to_mail,
//       subject: subject,
//       html: message   // 👉 HTML mail use करतोय
//     });

//     console.log("✅ Mail Sent");
//   } catch (err) {
//     console.log("❌ Error:", err);
//   }
// }

// module.exports = sendMail;