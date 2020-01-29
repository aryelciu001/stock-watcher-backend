const mon = require("mongoose");

const UserSchema = new mon.Schema({
  username: String,
  watchedStocks: Object
});

const User = mon.model("User", UserSchema);

module.exports = User;
