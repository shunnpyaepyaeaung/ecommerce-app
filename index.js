const express = require('express');
const app = express();
const sqlite3 = require('sqlite3').verbose();
var bodyParser = require('body-parser');
var session = require('express-session');
var multer  = require('multer');
var md5 = require('md5');
const PORT = process.env.PORT || 5003;


var storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/images')
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    }
  })

var upload = multer({ storage : storage });

let db = new sqlite3.Database('./productdb.db', (err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Connected to the productdb database.');
  });
 
app.use(session({ secret: 'shunn', cookie: { maxAge: 60000 }}))

app.use(express.static(__dirname+'/public'))

app.use(bodyParser.urlencoded({
    extended: false
}));


app.set("view engine", "ejs");

app.get('/index',(req,res)=>{
    console.log(req.session.userid)
    db.all('select username from usertable where uid=?',[req.session.userid],(err,rows)=>{
        res.render('index',{
            current_user_id: req.session.userid ? req.session.userid : "",
            current_user_name: req.session.username ? req.session.username: "",
        })
    })
})

app.get('/login',(req,res)=>{
    res.render('login',{
        current_user_id: req.session.userid,
        current_user_name: req.session.username,
    })
})

app.get('/userregister',(req,res)=>{
    res.render('register')
})

app.post('/register',(req,res)=>{
    var username = req.body.username;
    var email = req.body.email;
    var password = md5(req.body.password);
    db.run('insert into usertable (uid,username,email,password) values (NULL,?,?,?) ',[username,email,password],(err)=>{
        if(err){
            console.log('Something wrong while registering the user account')
        }
        else{
            console.log('user created successfully')
        }
    })
    res.redirect('/login')
})

app.post('/authentication',(req,res)=>{
    var username = req.body.username;
    var password = md5(req.body.password);
    db.all(`SELECT * FROM usertable WHERE username=? AND password=?`,[username, password],(err,rows)=>{
        if(err){
            res.send('Wrong database')
        }else{
            if(rows.length === 0){
                res.send('Invalid username or password')
            }else{
                req.session.username = rows[0].username;
                req.session.userid = rows[0].uid;
                res.redirect('/product')
            }
        }
    })
})


app.get('/product',(req,res)=>{
    var category = req.query.category;
    db.all(`select * from product where category =?`,[category],(err,rows)=>{
        res.render('products',{
            data: rows,
            current_user_id: req.session.userid ? req.session.userid : "",
            current_user_name: req.session.username ? req.session.username: "",
        })
    })
})

app.get('/logout',(req,res)=>{
    req.session.userid = null;
    res.redirect('/login')
})

app.get('/search',(req,res)=>{
    var pname = req.query.pname;
    console.log(pname)
    db.all(`select * from product where pname like '%${pname}%'`,[],(err,rows)=>{
        if(rows){
            res.render('products',{
                data:rows,
                pname,
                current_user_id: req.session.userid ? req.session.userid : "",
                current_user_name: req.session.username ? req.session.username: "",
            })
        } 
    })
}) 

app.get('/viewproduct',(req,res)=>{
    var quantity = req.query.quantity;
    db.all('select * from product where pid=?',[req.query.pid],(err,rows)=>{
        res.render('viewproduct',{
            data:rows,
            quantity,
            current_user_id: req.session.userid ? req.session.userid : "",
            current_user_name: req.session.username ? req.session.username: "",
        })
    })
})

app.get('/addcart',(req,res)=>{
    var uid = req.session.userid;
    var pid = req.query.pid;
    var quantity = req.query.quantity;
    db.all('select * from cart where pid =? and uid=?',[pid,uid],(err,rows)=>{
        if(rows.length > 0){
            res.redirect('/addtocart')
        }
        else{
            db.run('insert into cart values (NULL,?,?,?)',[uid,pid,quantity],(err)=>{
                if(err){
                    console.log('Something wrong with database while user adding to cart')
                }
                else{
                    console.log('Adding to cart successfully')
                }
                res.redirect('/addtocart')
            })
        }
    })
    
})


app.get('/addtocart',(req,res)=>{
    db.all(`select product.pid, pname, author, price, filename, quantity from product inner join cart on product.pid = cart.pid where cart.uid='${req.session.userid}'`,[],(err,rows)=>{
        // console.log(rows)
        res.render('addtocart',{
            data:rows,
            current_user_id: req.session.userid ? req.session.userid : "",
            current_user_name: req.session.username ? req.session.username : "",
        })
    })
})

app.get('/removecart',(req,res)=>{
    var pid = req.query.pid;
    db.run('delete from cart where pid = ?',[pid],(err)=>{
        if(err){
            console.log('remove cart failure')
        }
        else{
            console.log('Remove product from cart successfully')
        }
    })
    res.redirect('/addtocart')
})

app.get('/adminview',(req,res)=>{
    db.all('select * from product',[],(err,rows)=>{
        res.render('insertproduct',{
            data:rows
        })
    })
})



app.get('/updateproduct',(req,res)=>{
    db.all('select * from product where pid=?',[req.query.pid],(err,rows)=>{
        // console.log(rows)
        res.render('updateproduct',{
            data:rows
        })
    })
})

app.get('/update',(req,res)=>{
    var pid = req.query.pid;
    var pname = req.query.pname;
    var author = req.query.author;
    var price = req.query.price;
    var description = req.query.description;
    var category = req.query.category;
    var filename = req.query.filename;
    console.log(pid, pname, price, description, category, filename)

    db.run('update product set pname=?,author=?, price=?,description=?, category=?, filename=? where pid=?',[pname, author, price, description, category, filename,pid],(err)=>{
        if(err){
            console.log('Something wrong with database while updating')
        }else{
            console.log('Updated Successfully')
        }
    })
    res.redirect('/insertproduct')
})

app.get('/deleteproduct',(req,res)=>{
    var pid = req.query.pid;
    db.run('delete from product where pid = ?',[pid],(err)=>{
        if(err){
            console.log("Something wrong with database while deleting")
        }else{
            console.log("Deleted successfully")
        }
    })
    res.redirect('/insertproduct')
})

app.get('/insertproduct',(req,res)=>{
    db.all('select * from product',[],(err,rows)=>{
        res.render('insertproduct',{
            data:rows
        })
    })
})


app.post('/addproduct',upload.single('filename'),(req,res)=>{
    var productname = req.body.productname;
    var author = req.body.author;
    var price = req.body.price;
    var description = req.body.description;
    var category = req.body.category;
    var filename = req.file.filename;
    db.run('insert into product (pid, pname,author, price, description, category, filename) values (NULL,?,?,?,?,?,?)',[productname,author, price, description,category, filename],function(err){
        if(err){
            console.log('Something wrong with database')
        }
        else{
            console.log('product added successfully')
        }
    })
    res.redirect('/adminview')
})

app.listen(PORT);