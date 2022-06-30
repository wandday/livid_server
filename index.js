const express = require ('express');
const app = express();
const Joi = require ('joi');
const bcrypt = require('bcryptjs') ;
app.use(express.json());
const { joiPassword } = require('joi-password');

const cors = require('cors')
app.use(cors())


const mysql = require('mysql2/promise')
const dotenv = require('dotenv');
dotenv.config();


// DATABASE SETTINGS

const pool = mysql.createPool({
    host:  process.env.host,
    user: process.env.user,
    database: process.env.database,
    password: process.env.password,
    waitForConnections: process.env.waitForConnections,
    connectionLimit: process.env.connectionLimit,
    queueLimit: process.env.queueLimit,
  });
  
  if(pool.state === 'disconnected'){
    console.log("Server Down")
  }else{
    console.log("Connected to database")
  }



// VALIDATIONS

// User Validation
function validateUsers(user){
  const schema =  Joi.object({
    first_name: Joi.string().min(3).required(),
    last_name: Joi.string().min(3).required(),
    email: Joi.string().email().min(3).required(),

    // role: Joi.string().min(3).required(),
    password: joiPassword.string()
    .minOfSpecialCharacters(1)
    .minOfLowercase(1)
    .minOfUppercase(1)
    .minOfNumeric(1)
    .noWhiteSpaces()
    .required(),
  })
  return schema.validate(user)
}


//Hashing Password
const hashPassword = async (userPassword) => {
  const convertedUserPassword = userPassword.toString();
  const harshPassword = await bcrypt.hash(convertedUserPassword, 10);
  return harshPassword;
};


//Movie Validation
function validateMovies(movies){
  const schema =  Joi.object({
    url: Joi.string().min(3).required(),
    poster: Joi.string().min(3).required(),
    scene: Joi.string().min(3).required(),
    title: Joi.string().min(3).required(),
    genre: Joi.string().min(3).required(),
    price: Joi.required(),
    duration: Joi.string().min(3).required(),
    year: Joi.required(),
    description: Joi.string().min(3).required(),
    cast: Joi.string().min(3).required(),
    producer: Joi.string().min(3).required(),
    writer: Joi.string().min(3).required(),
    director: Joi.string().min(3).required(),
    notice: Joi.string().min(3).required(),
    
  })
  return schema.validate(movies)
}


// Compare password
const matchPassword = async (enteredPassword, existingHashedPassword ) => {
  return await bcrypt.compare(enteredPassword, existingHashedPassword)
}



// END POINTS  

// CREATE USER END POINT

app.post('/api/users', async (req, res) => {
    const {error} = validateUsers(req.body);
    if (error)  return  res.status(400).send({error: error.details[0].message });
    
    const {first_name, last_name, email, password } = req.body
    try{
        const harshedPassword = await hashPassword(password)
        const userExist = await pool.query('select email from users where email=?', [email])
        if (userExist[0].length > 0){
            res.status(400).send('User already exist')
        } else{
            const result = await pool.query('INSERT into users SET first_name=?, last_name=?, email=?, password=?, role=?',  [first_name, last_name, email, harshedPassword, 'user'])
            console.log(result[0])

            res.send(result[0]);
        }

    } catch(error){
        console.log(error)
        res.status(500).send(error)
    }

});


// LOGIN USER END POINT
app.post('/api/users/login', async (req, res) =>{
  const {email, password} = req.body

  let user = await pool.query('select * from users where email=?', [email])
  user = user[0][0]

if (user && (await matchPassword(password, user.password))){
  res.status(200)

  // If login Successfully

  res.json({
    id: user.user_id,
    name: user.first_name,
    lastName: user.last_name,
    email: user.email,
    wallet_balance: user.wallet_balance, 
  })
} else{
  res.status(401).send('Invalid Credentials')
}
})

// UPLOAD MOVIE ENDPOINT
app.post('/api/admin/movies', async (req, res) => {
  const {error} = validateMovies(req.body);
  if (error)  return  res.status(400).send({error: error.details[0].message });
  
  const { url, poster, scene, title, genre, price, duration, year, description, cast, producer, writer, director, notice } = req.body
  try{
      const movieExist = await pool.query('select title from movies where title=?', [title])
      console.log(movieExist)
      if (movieExist[0].length > 0){
          res.status(400).send('Movie already exist')
      } else{
          const result = await pool.query('INSERT into movies SET url=?, poster=?, scene=?, title=?, genre=?, price=?, duration=?, year=?, description=?,cast=?, producer=?, writer=?, director=?, notice=?', [ url, poster, scene, title, genre, price, duration, year, description, cast, producer, writer, director, notice])
          console.log(result[0])

          res.send(result[0]);
        }

  } catch(error){
      console.log(error)
      res.status(500).send(error)
  }

});


// GETTING ALL MOVIES
app.get('/api/users/movies', async (req, res) => {
  try{
      const allMovies= await pool.query('select * from movies')
      res.status(200).send({message: "movies fetched sucessfully", data : allMovies[0]})

  }catch(err){
   res.status(500).send({message: "errro occured", data: err})
  }
});


// GETTING LATEST MOVIES
app.get('/api/users/movies/latest', async (req, res) => {
  try{
      const latestMovies= await pool.query('select * from movies ORDER BY created DESC limit 4')
      res.status(200).send({message: "movies fetched sucessfully", data : latestMovies[0]})

  }catch(err){
   res.status(500).send({message: "errro occured", data: err})
  }

});


// GETTING TOP MOVIE FOR MOBILE
app.get('/api/users/movies/topmovie', async (req, res) => {
  try{
      const TopMovies= await pool.query('select * from movies where istopmovie=1')
      res.status(200).send({message: "movies fetched sucessfully", data : TopMovies[0][0]})

  }catch(err){
   res.status(500).send({message: "errro occured", data: err})
  }

});



//GETTING INDIVIDUAL MOVIES
app.get('/api/user/movies/:id', async (req, res) => {
  try{
      const movieId = req.params.id
      const singleMovie= await pool.query('select * from movies where movie_id=?', [movieId])
      res.status(200).send({message: "Movie fetched sucessfully", data : singleMovie[0][0]})

  }catch(err){
   res.status(500).send({message: "errro occured", data: err})
  }

});


// UPDATING WALLET BALANCE END POINT
app.put('/api/user/:id', async (req, res) => {
  try{
      let {wallet_balance} = req.body
      const userId = req.params.id
      let updateWallet  = await pool.query('update users set wallet_balance=? where user_id=?', [wallet_balance, userId])
      res.status(200).send({message: "Wallet balance updated sucessfully", data : updateWallet[0][0]})

  }catch(err){
   res.status(500).send({message: "errro occured", data: err})
  };

});



//CREATING PURCHASED MOVIE
app.post('/api/movie/purchased', async (req, res) => {  
  const {movie_id , user_id, first_name, movie_title} = req.body
  try{
      const result = await pool.query('INSERT into purchased_movie SET movie_id=?, user_id=?, first_name=?, movie_title=?',  [movie_id, user_id, first_name, movie_title])
      console.log(result[0])

      res.send(result[0]);
    }
    catch(error){
      console.log(error)
      res.status(500).send(error)
    }
});





//FETCHING PURCHASE MOVIE
app.get('/api/movie/paid/:id', async (req, res) => {
  
  try{
    const user_id  = req.params.id 
    
    const purchasedMovies= await pool.query('select * from purchased_movie where user_id=?', [user_id ])
      res.status(200).send({message: "movies fetched sucessfully", data : purchasedMovies[0]})

  }catch(err){
   res.status(500).send({message: "errro occured", data: err})
  }

});





const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}...`));
