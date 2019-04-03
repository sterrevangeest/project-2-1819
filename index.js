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

      var temperatureGoal = req.body.temperature;
      var mic_levelGoal = req.body.mic_level;
      var ambient_lightGoal = req.body.ambient_light;

      var temperatures = data.map(function(item) {
        return item.measurements.temperature / 1000;
      });
      var mic_levels = data.map(function(item) {
        return item.measurements.mic_level;
      });
      var ambient_light = data.map(function(item) {
        return item.measurements.ambient_light / 1000;
      });

      var mic_levelPercentage = temperatures.map(function(item) {
        var value = ((mic_levelGoal - item) / item) * 100;
        if (value < 0) {
          return Math.abs(value);
        }
        return value;
      });

      var temperaturePercentage = temperatures.map(function(item) {
        var value = ((temperatureGoal - item) / item) * 100;
        if (value < 0) {
          return Math.abs(value);
        }
        return value;
      });

      var ambient_lightPercentage = ambient_light.map(function(item) {
        var value = ((ambient_lightGoal - item) / item) * 100;
        if (value < 0) {
          return Math.abs(value);
        }
        return value;
      });

      var xs = data.map(function(rooms) {
        return rooms.room_name;
      });

      var sorted = xs
        .map(function(x, i) {
          return {
            name: x,
            temperatureScore: temperaturePercentage[i],
            temperature: temperatures[i]
          };
        })
        .sort(function(a, b) {
          var c = a.temperatureScore - b.temperatureScore;
          return c ? c : a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
        })
        .map(function(x, i) {
          x.temperatureRank = i;
          return x;
        });

      var sorted2 = xs
        .map(function(x, i) {
          return {
            name: x,
            ambient_lightScore: ambient_lightPercentage[i],
            ambient_light: ambient_light[i]
          };
        })
        .sort(function(a, b) {
          var c = a.ambient_lightScore - b.ambient_lightScore;
          return c ? c : a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
        })
        .map(function(x, i) {
          // data[i].ambientlightRank = i;
          x.ambientlightRank = i;
          return x;
        });

      var sorted3 = xs
        .map(function(x, i) {
          return {
            name: x,
            mic_levelScore: mic_levelPercentage[i],
            mic_level: mic_levels[i]
          };
        })
        .sort(function(a, b) {
          var c = a.mic_levelScore - b.mic_levelScore;
          return c ? c : a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
        })
        .map(function(x, i) {
          x.mic_levelRank = i;
          return x;
        });
      // console.log(sorted);
      // console.log(sorted2);
      // console.log(sorted3);

      var combine = sorted.concat(sorted2, sorted3);

      const groupBy = key => array =>
        array.reduce((objectsByKeyValue, obj) => {
          const value = obj[key];
          objectsByKeyValue[value] = (objectsByKeyValue[value] || []).concat(
            obj
          );
          return objectsByKeyValue;
        }, {});

      const groupByBrand = groupBy("name");

      var arrObj = [groupByBrand(combine)];

      var arr = [];

      var testen = arrObj.map(function(item, i) {
        console.log(i);
        for (var i = 0; i < xs.length; i++) {
          // console.log(xs[i]);
          var bell = item[xs[i]];
          var resultObject = bell.reduce(function(result, currentObject) {
            for (var key in currentObject) {
              if (currentObject.hasOwnProperty(key)) {
                result[key] = currentObject[key];
              }
            }
            return result;
          }, {});

          arr.push(resultObject);
        }
        // return resultObject;
      });
      // console.log("arr", arr);

      var newranking = arr.map(function(item, i) {
        var ranking =
          item.temperatureRank + item.mic_levelRank + item.ambientlightRank;
        arr[i].ranking = ranking;
        return arr;
      });

      // console.log(arr);

      var sort = arr.sort((a, b) => (a.ranking > b.ranking ? 1 : -1));

      console.log(sort);

      res.render("pages/nieuweindex", {
        data: sort
      });
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
