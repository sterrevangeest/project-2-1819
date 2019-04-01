console.log("test");

const express = require("express");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 8000;
const fetch = require("node-fetch");
var ejs = require("ejs");
app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/", function(request, response) {
  fetch("http://mirabeau.denniswegereef.nl/api/v1/rooms")
    .then(function(res) {
      return res.json();
    })
    .then(function(json) {
      var data = json.data;
      var measurements = data.map(function(item) {
        return item.measurements;
      });
      var data = data.map(function(item) {
        return {
          roomName: item.room_name,
          url: item.room_name.toLowerCase().replace(/ /g, "_"),
          measurements: item.measurements
        };
      });
      response.render("pages/index", {
        data: data
      });
    });
});

app.get("/room/:id", function(request, response) {
  console.log(request.params);

  response.render("pages/room", {});
  console.log(
    "url",
    "http://mirabeau.denniswegereef.nl/api/v1/rooms/" + request.params.id
  );
  fetch("http://mirabeau.denniswegereef.nl/api/v1/rooms/" + request.params.id)
    .then(function(res) {
      return res.json();
    })
    .then(function(json) {
      console.log(json);
      // var data = json.data;
      // var measurements = data.map(function(item) {
      //   return item.measurements;
      // });
      // console.log(measurements);
      // response.render("pages/index", {
      //   data: data,
      //   measurements: measurements
      // });
    });
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
