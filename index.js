console.log("test");

const express = require("express");
const app = express();
var bodyParser = require("body-parser");
app.use(bodyParser());

require("dotenv").config();
const port = process.env.PORT || 8000;
const fetch = require("node-fetch");
var ejs = require("ejs");
app.set("view engine", "ejs");
app.use(express.static("public"));

// app.get("/", function(req, res) {
//   res.render("pages/index", {});
// });

// app.get("/", function(req, res) {
//   fetch("http://mirabeau.denniswegereef.nl/api/v1/rooms")
//     .then(function(response) {
//       return response.json();
//     })
//     .then(function(json) {
//       var data = json.data;
//
//       // var data = data.sort(function(a, b) {
//       //   var a = a.measurements.temperature;
//       //   var b = b.measurements.temperature;
//       //   if (filterId === "warm") {
//       //     return a - b;
//       //   } else if (filterId === "koud") {
//       //     return b - a;
//       //   }
//       // });
//
//       var measurements = data.find(function(item) {
//         console.log(Object.keys(item.measurements));
//         var keys = Object.keys(item.measurements);
//
//         console.log(keys);
//         return keys;
//       });
//
//       delete measurements.measurements.batt;
//       delete measurements.measurements.uv_index;
//       delete measurements.measurements.occupancy;
//
//       console.log("M.M", measurements.measurements);
//
//       var data = data.map(function(item) {
//         return {
//           roomName: item.room_name,
//           url: item.room_name.toLowerCase().replace(/ /g, "_"),
//           measurements: item.measurements
//         };
//       });
//
//       res.render("pages/index", {
//         data: data,
//         measurements: measurements.measurements
//       });
//     });
// });

app.get("/form", function(req, res) {
  res.render("pages/form");
});

app.get("/index/:id", function(req, res) {
  var filterId = req.params.id;
  fetch("http://mirabeau.denniswegereef.nl/api/v1/rooms")
    .then(function(response) {
      return response.json();
    })
    .then(function(json) {
      var data = json.data;

      var measurements = data.map(function(item) {
        return item.measurements;
      });

      var measurementsKeys = data.find(function(item) {
        console.log(Object.keys(item.measurements));
        var keys = Object.keys(item.measurements);
        return keys;
      });

      delete measurementsKeys.measurements.batt;
      delete measurementsKeys.measurements.uv_index;
      delete measurementsKeys.measurements.occupancy;

      var data = data.sort(function(a, b) {
        var a = a.measurements[filterId];
        var b = b.measurements[filterId];
        return a - b;
      });

      var data = data.map(function(item) {
        return {
          roomName: item.room_name,
          url: item.room_name.toLowerCase().replace(/ /g, "_"),
          measurements: item.measurements
        };
      });

      res.render("pages/index", {
        data: data,
        measurements: measurementsKeys.measurements,
        filterId: filterId,
        meas: measurements
      });
    });
});

app.post("/postform", function(req, res) {
  fetch("http://mirabeau.denniswegereef.nl/api/v1/rooms")
    .then(function(response) {
      return response.json();
    })
    .then(function(json) {
      var data = json.data;
      console.log(req.body);
      var temperatures = data.map(function(item) {
        return item.measurements.temperature;
      });
      var mic_levels = data.map(function(item) {
        return item.measurements.mic_level;
      });
      var ambient_light = data.map(function(item) {
        return item.measurements.ambient_light;
      });

      var temperatureGoal = req.body.temperature;

      var closest = temperatures.reduce(function(prev, curr) {
        return Math.abs(curr - temperatureGoal) <
          Math.abs(prev - temperatureGoal)
          ? curr
          : prev;
      });

      console.log(closest);

      console.log(temperatures);
      // console.log(mic_levels);
      // console.log(ambient_light);

      res.render("pages/nieuweindex", {});
    });
});

// app.get("/room/:id", function(req, res) {
//   console.log(req.params);
//
//   fetch("http://mirabeau.denniswegereef.nl/api/v1/room/" + req.params.id)
//     .then(function(res) {
//       return res.json();
//     })
//     .then(function(json) {
//       var data = json.data;
//       console.log(data);
//       res.render("pages/room", {
//         data: data
//       });
//     });
// });

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
