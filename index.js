const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  // bearer token
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri =
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.w9tsbcy.mongodb.net/?retryWrites=true&w=majority`;
  // "mongodb+srv://sportsDB:szYoR69mQdLfEBGE@cluster0.w9tsbcy.mongodb.net/?retryWrites=true&w=majority";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  // try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    client.connect();

    const usersCollection = client.db("sportsDB").collection("users");
    const classesCollection = client.db("sportsDB").collection("classes");
    const cartCollection = client.db("sportsDB").collection("carts");
    const paymentCollection = client.db("sportsDB").collection("payments");

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };

    const verifyInstructor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "instructor") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };
    const verifyUser = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "user") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };


    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);
      const filter = { _id: new ObjectId(payment.classId) };
      const update = { $inc: { enrolledStudent: 1 } };
      const result = await classesCollection.updateOne(filter, update);
      // console.log(result)
      const query = { _id: new ObjectId(payment.cartId) };
      const deleteResult = await cartCollection.deleteOne(query);
      // const paymentCollection
      res.send({ paymentResult, deleteResult });
    });

    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "inr",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

   

    // user role findOut by email ---- useRole hook
    app.get("/users/role/:email", async (req, res) => {
      const email = req.params.email;      
      // if (req.decoded.email !== email) {
      //   res.send({ admin: false });
      // }  
      const query = { email: email };
      const result = await usersCollection.findOne(query);      
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      // console.log(user);
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "user already exists" });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // user ----------- api
    //user api -------------- cart collection apis
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      // const decodedEmail = req.decoded.email;
      // if (email !== decodedEmail) {
      //   return res.status(403).send({ error: true, message: "forbidden access" });
      // }
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/carts", async (req, res) => {
      const item = req.body;
      const result = await cartCollection.insertOne(item);
      res.send(result);
    });

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/enrollClass",verifyJWT,verifyUser, async (req, res) => {
      const email = req.query.email;    
      if (!email) {
        res.send([]);
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }

      const query = { email: email };
      const result = await paymentCollection.find(query).sort({ date: -1 }).toArray();
      res.send(result);
    });



    // instructor api
    app.get("/class",verifyJWT,verifyInstructor, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res
          .status(403)
          .send({ error: true, message: "forbidden access" });
      }

      const query = { instructorEmail: email };
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/class", verifyJWT,verifyInstructor,async (req, res) => {
      const newClass = req.body;
      const result = await classesCollection.insertOne(newClass);
      res.send(result);
    });



    // frontend api  useAllClass --- hook
    app.get("/allClass", async (req, res) => {
      const result = await classesCollection
        .find()
        .sort({ enrolledStudent: -1 })
        .toArray();
      res.send(result);
    });


    // admin api  useAllClassAdmin --- hook
    app.get("/users", async (req, res) => {      
      const result = await usersCollection.find().toArray();
      res.send(result);
    });
    app.get("/admin/users",verifyJWT,verifyAdmin, async (req, res) => {      
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get("/admin/allClass",verifyJWT,verifyAdmin, async (req, res) => {
      const result = await classesCollection
        .find()
        .toArray();
      res.send(result);
    });

     app.patch("/class", async (req, res) => {
      const query1 = req.query.id;
      const query2 = req.query.status;
      const filter = { _id: new ObjectId(query1) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          status: query2,
        },
      };
      const result = await classesCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    app.post("/class/feedback/:id", async (req, res) => {
      const feedback = req.body;
      const id = req.params.id;
      // console.log(feedback.feedback, id);
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          feedback: feedback.feedback,
        },
      };
      const result = await classesCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "instructor",
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

   

    

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  // } 
  // finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  // }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("sports academy is running");
});

app.listen(port, () => {
  console.log(`sports academy on [port] ${port}`);
});
