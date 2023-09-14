const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 8000;

// middleware
app.use(cors());
app.use(express.json());
require("dotenv").config();
app.get("/", (req, res) => {
  res.send("doctor server is running");
});

app.listen(port, () => {
  console.log(`doctor is running on port ${port}`);
});
//
//

// mongodb codes

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = process.env.URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.DB_SECRET_KEY, (err, decoded) => {
    if (err) {
      res.status(401).send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    const serviceCollection = client.db("carDoctor").collection("services");

    app.post("/jwt", (req, res) => {
      const user = req.body;

      const token = jwt.sign(user, process.env.DB_SECRET_KEY, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    app.get("/services", async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // get data by specific user::>
    app.get("/bookings", verifyJWT, async (req, res) => {
      const decoded = req.decoded;
      if (decoded?.email !== req.query.email) {
        return res.status(403).send({ error: 1, message: "Forbidden Access" });
      }

      let query = {};
      if (req.query?.email) {
        query = { mail: req.query.email };
      }
      const result = await BookingsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = {
        projection: { title: 1, price: 1, name: 1, service_id: 1, img: 1 },
      };
      const result = await serviceCollection.findOne(filter, options);

      res.json(result);
    });
    const BookingsCollection = client.db("carDoctor").collection("bookings");
    app.post("/bookings", async (req, res) => {
      const data = req.body;
      const result = await BookingsCollection.insertOne(data);
      res.send(result);
    });
    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const updateData = req.body;
      const filter = { _id: new ObjectId(id) };
      // const option = { upsert: true };
      const updateUsersData = {
        $set: {
          status: updateData.status,
        },
      };
      const result = await BookingsCollection.updateOne(
        filter,
        updateUsersData
      );
      res.send(result);
    });
    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await BookingsCollection.deleteOne(filter);
      res.send(result);
    });
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
