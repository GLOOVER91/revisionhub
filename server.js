const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

app.use(session({
  secret: 'revisionhub_secret',
  resave: false,
  saveUninitialized: true
}));

// ===== DATABASE (TEMP) =====
let users = [];
let quizzes = [
  { subject: "Math", question: "2+2=?", options:["3","4","5"], answer:"4" }
];

// ===== ADMIN =====
const admin = {
  username: 'mike',
  password: bcrypt.hashSync('admin123', 10)
};

// ===== AUTH =====
function isAdmin(req,res,next){
  if(req.session.role==='admin') return next();
  res.status(403).send('Denied');
}
function isUser(req,res,next){
  if(req.session.role) return next();
  res.status(401).send('Login');
}

// ===== REGISTER =====
app.post('/register', async(req,res)=>{
 const {username,password,phone}=req.body;
 const hash=await bcrypt.hash(password,10);
 users.push({username,password:hash,phone,premium:false,score:0});
 res.send({success:true});
});

// ===== LOGIN =====
app.post('/login', async(req,res)=>{
 const {username,password}=req.body;

 if(username===admin.username && await bcrypt.compare(password,admin.password)){
   req.session.role='admin';
   return res.send({role:'admin'});
 }

 const user=users.find(u=>u.username===username);
 if(user && await bcrypt.compare(password,user.password)){
   req.session.role='user';
   req.session.username=username;
   return res.send({role:'user'});
 }

 res.send({error:'Invalid'});
});

// ===== QUIZ =====
app.get('/quiz',isUser,(req,res)=> res.send(quizzes));

app.post('/submit',isUser,(req,res)=>{
 const {answer}=req.body;
 const user=users.find(u=>u.username===req.session.username);

 if(answer===quizzes[0].answer){
   user.score+=10;
 }
 res.send({score:user.score});
});

// ===== AI =====
app.post('/ai', async(req,res)=>{
 try{
  const r=await axios.post("https://api.openai.com/v1/chat/completions",{
   model:"gpt-4o-mini",
   messages:[
    {role:"system",content:"You are a KCSE tutor"},
    {role:"user",content:req.body.question}
   ]
  },{
   headers:{Authorization:`Bearer YOUR_OPENAI_API_KEY`}
  });

  res.send({answer:r.data.choices[0].message.content});
 }catch{
  res.send({answer:"AI error"});
 }
});

app.listen(3000,()=>console.log("Server running"));
