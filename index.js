const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
// const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);

const port = process.env.PORT || 5000;

// sportsDB
// szYoR69mQdLfEBGE
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
  "mongodb+srv://sportsDB:szYoR69mQdLfEBGE@cluster0.w9tsbcy.mongodb.net/?retryWrites=true&w=majority";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const usersCollection = client.db("sportsDB").collection("users");
    const classesCollection = client.db("sportsDB").collection("classes");

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });



    app.get("/users",  async (req, res) => {
      console.log('object')
        const result = await usersCollection.find().toArray();
        res.send(result);
      });

    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log(user)
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "user already exists" });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // instructor api 
    app.get("/class", async (req, res) => {
      // const email = req.query.email;
      const email = "jony@gmail.com";

      if (!email) {
        res.send([]);
      }

      // const decodedEmail = req.decoded.email;
      // if (email !== decodedEmail) {
      //   return res
      //     .status(403)
      //     .send({ error: true, message: "porviden access" });
      // }

      const query = { instructorEmail: email };
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/class", async (req, res) => {
      const newClass = req.body;
      const result = await classesCollection.insertOne(newClass);
      res.send(result);
    });

    // admin api 
    app.get("/allClass", async (req, res) => {      
      const result = await classesCollection.find().sort( { students: -1 } ).toArray()
      ;
      res.send(result);
    });

    // app.patch("/user/:id", async (req, res) => {  
    //   const id = req.params.id;
    //   const filter = { _id: new ObjectId(id) };
    //   const options = { upsert: true };
    //   const updateDoc = {
    //     $set: {
    //       role: 'query2',
    //     },
    //   };
    //   const result = await classesCollection.updateOne(filter, updateDoc,options);
    //   res.send(result);

    //   const result = await classesCollection.find().toArray();
    //   res.send(result);
    // });
    // app.patch("/user", async (req, res) => {
    //   const query1 = req.query.id;
    //   const query2 = req.query.role;     
    //   console.log(query1,query2) 
    //   const filter = { _id: new ObjectId(query1) };
    //   const options = { upsert: true };
    //   const updateDoc = {
    //     $set: {
    //       role: query2,
    //     },
    //   };
    //   const result = await classesCollection.updateOne(filter, updateDoc,options);
    //   res.send(result);
    // });
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
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
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "instructor",
        },
      };
  
      const result = await usersCollection.updateOne(filter, updateDoc);
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
      const result = await classesCollection.updateOne(filter, updateDoc,options);
      res.send(result);
    });

    app.post("/class/feedback/:id", async (req, res) => {            
      const feedback = req.body; 
      const id = req.params.id; 
      console.log(feedback.feedback,id)
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          feedback: feedback.feedback,
        },
      };
      const result = await classesCollection.updateOne(filter, updateDoc,options);
      res.send(result);
    });


    // Send a ping to confirm a successful connection
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

app.get("/", (req, res) => {
  res.send("sports academy is running");
});

app.listen(port, () => {
  console.log(`sports academy on [port] ${port}`);
});
