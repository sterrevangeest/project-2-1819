console.log("test");

var express = require("express");
var app = express();
var port = process.env.PORT || 8000;

var bodyParser = require("body-parser");
var fetch = require("node-fetch");
var ejs = require("ejs");

require("dotenv").config();
app.set("view engine", "ejs");

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true
  })
);

var compression = require("compression");
app.use(compression());

var minifyHTML = require("express-minify-html");
app.use(
  minifyHTML({
    override: true,
    exception_url: false,
    htmlMinifier: {
      removeComments: true,
      collapseWhitespace: true,
      collapseBooleanAttributes: true,
      removeAttributeQuotes: true,
      removeEmptyAttributes: true,
      minifyJS: true
    }
  })
);

app.use((req, res, next) => {
  res.append("Access-Control-Allow-Origin", ["*"]);
  res.append("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
  res.append("Access-Control-Allow-Headers", "Content-Type");
  res.append("Cache-Control", "max-age=" + 365 * 24 * 60 * 60);
  next();
});

var minify = require("express-minify");
app.use(minify());

app.use(express.static("public"));

//ROUTES
//render form
app.get("/form", function(req, res) {
  res.render("pages/form");
});

//post form
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
        return Math.round(item.measurements.temperature / 100) / 10;
      });
      var mic_levels = data.map(function(item) {
        return Math.round(item.measurements.mic_level / 100);
      });
      var ambient_light = data.map(function(item) {
        return item.measurements.ambient_light / 1000;
      });

      var mic_levelPercentage = mic_levels.map(function(item) {
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

      var rooms = data.map(function(rooms) {
        return rooms.room_name;
      });

      var sorted = data
        .map(function(x, i) {
          return {
            name: x.room_name,
            measurements: x.measurements,
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

      var sorted2 = data
        .map(function(x, i) {
          return {
            name: x.room_name,
            measurements: x.measurements,
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

      var sorted3 = data
        .map(function(x, i) {
          return {
            name: x.room_name,
            measurements: x.measurements,
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

      var sortedArrays = sorted.concat(sorted2, sorted3);

      const groupBy = key => array =>
        array.reduce((objectsByKeyValue, obj) => {
          const value = obj[key];
          objectsByKeyValue[value] = (objectsByKeyValue[value] || []).concat(
            obj
          );
          return objectsByKeyValue;
        }, {});

      const groupByName = groupBy("name");

      var dataByName = [groupByName(sortedArrays)];
      var arr = [];

      var groupAgain = dataByName.map(function(item, i) {
        for (var i = 0; i < rooms.length; i++) {
          var bell = item[rooms[i]];
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
      });

      var sumRankingValues = arr.map(function(item, i) {
        var ranking =
          item.temperatureRank + item.mic_levelRank + item.ambientlightRank;
        var ranking2 = 100 - ranking;
        console.log(ranking2);
        var calculatePercentage = Math.round(ranking * 100);
        console.log(
          "Ranking",
          ranking,
          "calculatePercentage",
          calculatePercentage
        );
        arr[i].ranking = ranking2;

        if (item.measurements.occupancy === false) {
          arr[i].ranking = ranking2;
        }
        return arr;
      });

      var sortRanking = arr.sort((a, b) => (b.ranking > a.ranking ? 1 : -1));

      var currentdate = new Date();
      var datetime =
        "Last Sync: " +
        currentdate.getDate() +
        "/" +
        (currentdate.getMonth() + 1) +
        "/" +
        currentdate.getFullYear() +
        " @ " +
        currentdate.getHours() +
        ":" +
        currentdate.getMinutes() +
        ":" +
        currentdate.getSeconds();
      //console.log(sortRanking);
      res.render("pages/index", {
        data: sortRanking,
        time: datetime
      });
    })
    .catch(function(error) {
      console.log(error);
    });
});

app.listen(port);
