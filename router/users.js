//Express JS Router
const express = require("express");
const router = express.Router();

const User = require("../schemas/UserSchema");

router.get("/", (req, res) => {
  res.send("hello");
});

router.get("/:username", (req, res) => {
  User.findOne({ username: req.params.username }).then(foundUser => {
    res.send(foundUser);
  });
});

router.post("/:username", (req, res) => {
  User.findOne({ username: req.params.username })
    .then(foundUser => {
      foundUser.watchedStocks = req.body;
      foundUser
        .save()
        .then(() => {})
        .catch(err => {
          console.log(err);
        });
    })
    .catch(err => {
      console.log(err);
    });
});

module.exports = router;
