const express = require("express");
const router = express.Router();
const cors = require("cors");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
//----------==========> server used to send  emails <==========----------
const app = express();
dotenv.config();
app.use(cors());
app.use(express.json());
app.use("/", router);
const PORT = process.env.Port || 5000;
app.get("/", (req, res) =>
  res.status(200).send("Thompson solomon mail server is up and running 🚀")
);
const contactEmail = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

contactEmail.verify((error) => {
  if (error) {
    console.log(error);
  } else {
    console.log("Ready to Send");
  }
});

//Route for sending new mail
router.post("/contact", (req, res) => {
  const name = req.body.name;
  const email = req.body.email;
  const message = req.body.message;
  const phone = req.body.phone;
  const mail = {
    from: name,
    to: process.env.EMAIL_USER,
    subject: "Contact Form Submission - Portfolio",
    html: `<p>Name: ${name}</p>
             <p>Email: ${email}</p>
             <p>Phone: ${phone}</p>
             <p>Message: ${message}</p>`,
  };
  contactEmail.sendMail(mail, (error) => {
    if (error) {
      res.json(error);
    } else {
      console.log("sent");
      res.json({ code: 200, status: "Message Sent" });
    }
  });
});

app.listen(PORT, () => console.log(`Server Running at port ${PORT}`));
