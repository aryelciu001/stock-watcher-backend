//setting up
const ex = require("express");
const app = ex();
const bp = require("body-parser");
app.use(bp.json());
app.use(bp.urlencoded({ extended: true }));
app.use(bp.text({ type: "application/json" }));
const secret = require("./config/password");

//Setting up Headers
app.use(function(req, res, next) {
  // Website you wish to allow to connect
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Request methods you wish to allow
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );

  // Request headers you wish to allow
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader("Access-Control-Allow-Credentials", true);

  // Pass to next layer of middleware
  next();
});

//Setting up mongoose
const mon = require("mongoose");
const url = `mongodb+srv://alfredoryelcius:${secret.mongodb}@stock-watcher-backend-tfkjf.mongodb.net/test?retryWrites=true&w=majority`;
mon.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mon.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("db connected");
});

//Using mongoose model
const User = require("./schemas/UserSchema");

app.get("/", (req, res) => {
  res.send("hello");
});

app.post("/", (req, res) => {
  console.log(req.body);
});

//Express JS Router
// /users/
const usersRoute = require("./router/users");
app.use("/users", usersRoute);

//Function to fetch data from api
async function fetchData() {
  const axios = require("axios");
  const url = "https://stock-market-web-scrapper.herokuapp.com/python";
  return axios.get(url);
}

//Nodemailer setup
const nodemailer = require("nodemailer");
async function sendEmail(msg) {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: secret.nodemailerEmail, // generated ethereal user
      pass: secret.nodemailerPassword // generated ethereal password
    }
  });

  let info = await transporter.sendMail({
    from: "ryelalfredo@gmail.com", // sender address
    to: "ryelalfredo@gmail.com", // list of receivers
    subject: "Stock Watcher Notification", // Subject line
    text: msg,
    html: msg // html body
  });
}

//function to notify user about the price
function notify(theStock, report) {
  var notifyFlag = false;
  if (theStock.notification.date === undefined) {
    var date = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
    theStock.notification = {};
    theStock.notification.date = new Date(date);
    theStock.notification.report = report;
    notifyFlag = true;
  } else {
    var newDate = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Jakarta"
    });
    newDate = new Date(newDate);
    if (newDate - theStock.notification.date > 60 * 60 * 1000) {
      //report
      //update report
      theStock.notification.date = newDate;
      theStock.notification.report = report;
      notifyFlag = true;
    }
  }
  if (notifyFlag) {
    sendEmail(report);
  }
  return theStock;
}

//function to check the price of stocks
function checkWatchedStocks(APIStocks, watchedStock) {
  //from stock API
  var theStock = APIStocks[watchedStock.name];
  var curPrice = Number(theStock["Price"]);

  //from database
  var priceHigh = watchedStock.priceHigh;
  var priceLow = watchedStock.priceLow;
  var name = watchedStock.name;

  if (curPrice > priceHigh) {
    watchedStock = notify(
      watchedStock,
      `${name} is at ${curPrice}, higher than your set high`
    );
  } else if (curPrice < priceLow) {
    watchedStock = notify(
      watchedStock,
      `${name} is at ${curPrice}, lower than your set low`
    );
  }
  return watchedStock;
}

const port = process.env.PORT || 7000;
app.listen(port, () => {
  console.log(`App listening to port ${port}`);
  //long polling for notification
  setInterval(() => {
    //Schedule
    var run = false;
    var date = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
    var day = new Date(date).getDay();
    var hour = new Date(date).getHours();
    var minute = new Date(date).getMinutes();

    if (day > 0 && day < 6) {
      if (day === 5) {
        if (
          (hour >= 9 && hour < 12 && minute < 30) ||
          (hour >= 13 && minute > 30 && hour < 16)
        ) {
          run = true;
        }
      } else {
        if ((hour >= 9 && hour < 12) || (hour >= 13 && hour < 16)) {
          run = true;
        }
      }
    }

    if (run) {
      fetchData().then(response => {
        var data = response.data;
        User.find({}).then(users => {
          users.map(user => {
            user.watchedStocks.map(watchedStock => {
              user.watchedStocks = [
                ...user.watchedStocks.filter(
                  el => el.name !== watchedStock.name
                ),
                checkWatchedStocks(data, watchedStock)
              ];
            });
            user.save();
          });
        });
      });
    }
  }, 5000);
});
