const express = require("express")
const mongo = require("mongodb")
const objectId = require("mongodb").ObjectID
const app = express()
var api = require("./api")

var session = require("express-session");
var bodyparser = require("body-parser");

// content parsers
app.use(bodyparser.urlencoded({
    extended: true
}));
app.use(bodyparser.json({
    extended: true
}))

// middleware
app.use(
    session({
        secret: "Assignmentsecretkey",
        saveUninitialized: true,
        resave: false,
    })
);
app.set("view engine", 'ejs')

const URI = "mongodb+srv://alan:alanray459@resturants.mesk5.mongodb.net/hotels?retryWrites=true&w=majority"

// api routes... see api.js

app.use("/api", api)

app.get("/", (req, res) => {
    res.render("index")
})

app.get("/login", (req, res) => {
    res.render("login")
})


app.post("/login", (req, res) => {
    let user = {
        username: req.body.username,
        password: req.body.password
    }

    console.log(user)
    mongo.connect(URI, {
        useUnifiedTopology: true
    }, (err, client) => {

        var db = client.db("accounts")
        var resultsArray = []
        var coursor = db.collection('users').find(user)

        coursor.forEach((doc, err) => {
            resultsArray.push(doc)
        }, () => {
            console.log(resultsArray.length)
            if (resultsArray.length == 1) {
                req.session.value = 1;
                req.session.user = resultsArray[0].username;
                res.redirect("/home");
            } else {
                req.session.flag = 1;
                res.redirect("/login");
            }
        });


    })

})

app.get("/home", (req, res) => {
    let username = req.session.user
    if (username) {
        mongo.connect(URI, (err, client) => {
            var db = client.db("hotels")
            var resultsArray = []
            var coursor = db.collection('resturants').find()

            coursor.forEach((doc, err) => {
                resultsArray.push(doc)
            }, () => {
                client.close()
                res.render("home", {
                    user: {
                        username: username
                    },
                    restaurants: {
                        records: resultsArray
                    }
                })
            });
        })


    } else {
        res.redirect("/login")
    }
})

app.get("/display/:name", (req, res) => {
    if (req.session.user) {
        let name = req.params.name
        mongo.connect(URI, (err, client) => {
            var db = client.db("hotels")
            var resultsArray = []
            console.log(req.params.name)
            var coursor = db.collection('resturants').find({
                name: name
            })

            coursor.forEach((doc, err) => {
                resultsArray.push(doc)
            }, () => {
                let r = resultsArray[0]
                let rs = []
                var id = `${r._id}`
                console.log(id)
                var coursor = db.collection('ratings').find({
                    restaurant: id
                })

                coursor.forEach((doc, err) => {
                    rs.push(doc)
                }, () => {
                    client.close()
                    r.grades = rs
                    res.render("display", {
                        restaurant: r,
                        user: req.session.user,
                    })
                });



            });
        })
    } else {
        res.redirect("/login")
    }
})


app.get("/rate/:id", (req, res) => {
    if (req.session.user) {
        mongo.connect(URI, (err, client) => {
            var db = client.db("hotels")
            var resultsArray = []
            console.log(req.params.id)
            var coursor = db.collection('resturants').find({
                _id: objectId(req.params.id)
            })

            coursor.forEach((doc, err) => {
                resultsArray.push(doc)
            }, () => {
                client.close()
                console.log(resultsArray)
                res.render("rate", {
                    restaurant: resultsArray[0],
                    user: {
                        username: req.session.user
                    }
                })
            });
        })
    } else {
        res.redirect("/login")
    }
})


app.post("/rate/:id", (req, res) => {
    if (req.session.user) {
        mongo.connect(URI, (err, client) => {
            var db = client.db("hotels")

            let rs = []
            var id = `${req.params.id}`
            console.log(id)
            var coursor = db.collection('ratings').find({
                restaurant: id,
                user: req.body.username
            })

            coursor.forEach((doc, err) => {
                rs.push(doc)
            }, () => {
                if (rs.length == 0) {
                    let score = {
                        user: req.body.username,
                        rating: req.body.rating,
                        restaurant: req.body.restaurant
                    }
                    if (score.rating > 0 && score.rating < 11) {
                        mongo.connect(URI, (err, client) => {

                            var db = client.db("hotels")

                            db.collection("ratings").insertOne(score, (err, response) => {
                                client.close()
                                res.redirect("/home")
                            })

                        })
                    }
                } else {
                    rs.redirect("/home")
                }
            })
        })

    }
})


app.get("/add", (req, res) => {
    if (req.session.user) {
        res.render("add", {
            owner: req.session.user
        })
    } else {
        res.redirect("/login")
    }
})

app.post("/add", (req, res) => {
    if (req.session.user) {
        var record = {
            name: req.body.name,
            borough: req.body.borough,
            cuisine: req.body.cuisine,
            address: {
                street: req.body.street,
                building: req.body.building,
                zipcode: req.body.zipcode,
                coord: req.body.coord,
            },
            owner: req.body.owner,
            image: req.body.image

        }

        mongo.connect(URI, (err, client) => {

            var db = client.db("hotels")

            db.collection("resturants").insertOne(record, (err, response) => {
                client.close()
                res.redirect("/home")
            })

        })
    } else {
        res.redirect("/login")
    }
})


app.get("/delete/:id", (req, res) => {
    if (req.session.user) {
        var _id = req.params.id
        mongo.connect(URI, (err, client) => {

            var db = client.db("hotels")

            db.collection("resturants").deleteOne({
                "_id": objectId(_id)
            }, (err, response) => {
                client.close()
                res.redirect("/home")
            })

        })
    } else {
        res.redirect("/login")
    }
})


app.get("/edit/:id", (req, res) => {
    if (req.session.user) {
        mongo.connect(URI, (err, client) => {
            var db = client.db("hotels")
            var resultsArray = []
            console.log(req.params.id)
            var coursor = db.collection('resturants').find({
                _id: objectId(req.params.id)
            })

            coursor.forEach((doc, err) => {
                resultsArray.push(doc)
            }, () => {
                client.close()
                console.log(resultsArray)
                res.render("edit", {
                    restaurant: resultsArray[0],
                    owner: req.session.user
                })
            });
        })
    } else {
        res.redirect("/login")
    }
})


app.post("/update/:id", (req, res) => {
    if (req.session.user) {
        console.log("BODY--->", req.body)
        var _id = req.body._id
        var record = {
            name: req.body.name,
            borough: req.body.borough,
            cuisine: req.body.cuisine,
            address: {
                street: req.body.street,
                building: req.body.building,
                zipcode: req.body.zipcode,
                coord: req.body.coord,
            },
            owner: req.body.owner,
            image: req.body.image

        }

        mongo.connect(URI, (err, client) => {

            var db = client.db("hotels")

            db.collection("resturants").updateOne({
                "_id": objectId(_id)
            }, {
                $set: record
            }, (err, response) => {
                client.close()
                res.redirect("/home")
            })

        })

    } else {
        res.redirect("/login")
    }
})

// Server runpoints
PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log("Server running at", PORT)
})