
// =================== variable declaration ======================

var express = require("express");
var session = require('express-session');
//var cookieParser = require('cookie-parser');
var app  = new express();
var server = require("http").createServer(app);
var io = require("socket.io").listen(server);
var path = require('path');
var bodyParser = require("body-parser");
var err  = null;
var fs = require('fs');
var JSON = require('json');
var crypto = require('crypto');
var encryption_code = "123@viks";

var socketUsers = [];

var user_groups = [];



//================= middlewared declaration ==========================


//listning the server
var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP;

server.listen(server_port, server_ip_address, function () {
  //console.log( "Listening on " + server_ip_address + ", port " + server_port )
});

/* server.listen(server_port, server_ip_address, function () {
    //console.log( "Listening on " + server_ip_address + ", port " + server_port )
}); */
/*  
server.listen(5000);
 */
// setting up session middleware
app.use(session({secret: 'secretdata'}));

//setting view engine
app.set('view engine','ejs');
app.set('views',path.join(__dirname,'client')); 

//using strict loction for resoureces accessing
app.use(express.static(path.join(__dirname, 'public')));


// ================== page redirection handling =============================

// ========================== deafult get request when app starts =======================
app.get('/',(req,res)=>{
    if(req.session.username){
        res.redirect('/dashboard');
    }else{ 
        res.render('views/login',{error:err});
    }
}); 


// ====================== redirecting to register page ===================================
app.get('/register',(req,res)=>{
    res.render("views/register", {error: ""});
});

// ========================== handling logout event ================================================

app.post("/afterlogout",(req,res)=>{
    req.on('data', (data)=>{
        var dat =data;
        
        if(req.session.username == dat){
            console.log("logged out "+dat);
            req.session.username=null;
            res.end("ok");            
        }        
    });
});
/* 
// ===================== event handler to hande new group creation =================================== // need to implement in socket =========================     
app.post("/add_new_group", (req,res)=>{
    //console.log("going");
    req.on("data",(data)=>{
        var dat = data.toString();
        var group_object  = {
            name:dat,
            users_init:{socket.nickname}
        }; 
        //console.log(dat);
        // ============================== adding group in user group ==============================
        user_groups.push(group_object);


    });
});
 */
//===================== evnt handling after a new user is registered ===================
app.post("/afterRegstration",(req,res)=>{
   // console.log("working");
    req.on('data', (data)=>{
        var dat = ""+data;

        var username = JSON.parseLookup(JSON.parseLookup(dat, '&')[0], '=')[1];
        var password = JSON.parseLookup(JSON.parseLookup(dat, '&')[1], '=')[1];
        
        var password = crypto.createHmac('sha256', encryption_code)  
        .update(password)  
        .digest('hex');
        fs.readFile("client/res/users.txt", function (err, filedata) { 
            if(err) throw err;
            var flag =0 ;
            var data  = JSON.parseLookup(filedata.toString(),",");

            data.forEach(element => {
                var currentuser = (JSON.parseLookup(element,":")[0]).toString().trim().substring(1);
                var currentpass = (JSON.parseLookup(element,":")[1]).toString().trim();
                if(username == currentuser){
                    flag ++; 
                }                
            });
            if(flag){
                res.end("user already exists.. try again with different user name..");
            }else{
                fs.appendFileSync("client/res/users.txt", "{"+ username +" : " + password +"},");
                res.end("ok");
            }
        });
    });
});
 
// ===================== event handling after user atempta to login =============================
app.post('/afterlogin',(req,res)=>{
    req.on('data',(data)=>{
       
        var dat = "" + data;
        var user_name = dat.substring(9,dat.indexOf('&'));
        var password= dat.substring(dat.indexOf('&')+10);

        password = crypto.createHmac('sha256', encryption_code)  
        .update(password)  
        .digest('hex');
        var error = "";


        fs.readFile("client/res/users.txt", function (err, filedata) { 
            if(err) throw err;
            var flag =0 ;
            var data  = JSON.parseLookup(filedata.toString(),",");

           
            //console.log(data);
            data.forEach(element => {
                var currentuser = (JSON.parseLookup(element,":")[0]).toString().trim().substring(1);
                var currentpass = (JSON.parseLookup(element,":")[1]).toString().trim();
                if(user_name == currentuser && password == currentpass.substring(0,currentpass.length-1)){
                    flag ++; 
                }                
            });
            if(flag!=0){
                req.session.username = user_name;
                console.log("logged in");
                res.end("true");
            }
            else{
                console.log("login failed");
                res.end("flase");
            }
        }); 
    });
    
});


// ======================== event handling before going to dashboard ============================
app.get("/dashboard",(req,res)=>{  
    console.log("going to dashboard");
    if(req.session.username){
        res.render("views/dashboard",{uname : req.session.username});
    }
    else{
        res.render("views/login",{error : "need to sign in first"});
    }

});

// ==================== default locatin handling if the location is not found ==========================
app.get('/*',(req,res)=>{
    //console.log("");
    res.render("res/error404");
 });
 


 //=========================  socket coding =======================

io.sockets.on('connection', (socket) =>{
   //============================= when a new user logs in to the socket( auto after comming to the dashboard) ========================
    socket.on("add user",(data)=>{
        //socketUsers.push(data.user);
        //console.log(data);
        //fs.readFile("client/res/userlogs.txt");
        var indexOfUSer = socketUsers.findIndex(socketUsers => socketUsers.name === data.user);
        
        if(indexOfUSer == -1){
            var obj = {name:data.user,count:1,userSocket: socket };
            socketUsers.push(obj);     
            indexOfUSer++;      
        }
        else{
            socketUsers[indexOfUSer].count+=1;
            socketUsers[indexOfUSer].userSocket = socket;
        }

        console.log(socketUsers[indexOfUSer].name +" : "+ socketUsers[indexOfUSer].count);
        //var indexOfUSer = socketUsers.findIndex(socketUsers => socketUsers.hello === data.user);
        socket.nickname = data.user;
        
        var date = new Date().toString("yyyyMMddHHmmss").replace(/T/, ' ').replace(/\..+/, '').substring(4);
        console.log(socket.nickname + " connected !! at " +date);
        //fs.appendFileSync("client/res/userlogs.txt","username : "+socket.nickname + " logged at : "+date+",\n");
        
        // sending all active users
        sendUsersOnline();
        update_Group_List_At_USer_Side();
        update_Group_participant_List_At_USer_Side();

    });

    //=================== when user sends broadcast message ===================================
    socket.on('sendingmsg',(data)=>{
        io.sockets.emit("servmsg",{user: socket.nickname,msg : data.msg.toString().trim()});
        console.log(data);        
    });

    // ========================== when user sends private message ====================================
    socket.on("private_message_sending",(data)=>{
        console.log(data.to+" : "+data.msg);
        var indexOfUSer = socketUsers.findIndex(socketUsers => socketUsers.name === data.to);
        //socket.emit("private_msg_recieve",{user: socket.nickname,msg :data.msg});
        socketUsers[indexOfUSer].userSocket.emit("private_msg_recieve",{user: socket.nickname,msg :data.msg});
       
    });

    

    // =========================== on adding new group to socket =============================
    socket.on("add_new_group", (data)=>{

        if(data.name != null){
            var dat = data.name.toString();
            //console.log(dat);
            //================= validating if group already exists or not ================
            var indexOfGroup = user_groups.findIndex(user_groups => user_groups.name === dat);
            if(indexOfGroup != -1){//=========== if group name alredy exists =========
                socket.emit("socket_error_msg", {msg :"group already exists. Try another name"});
            }
            else{//============== if group name does not exists =============
                var group_object  = {
                    name:dat,
                    users_init:[socket.nickname]
                }; 
                user_groups.push(group_object);// adding user created group in socket variable 
                update_Group_List_At_USer_Side();// updatin group list at users end

                io.sockets.emit("Group_participant_list_update",{grp_name : dat, participants : group_object.users_init});
            }
            
        }
    });
    // ==================== on adding a new user to the group ==================
    socket.on("add_participant",function(data, callback){
        //====== getting the index of the group =====
        var indexOfGroup = user_groups.findIndex(user_groups => user_groups.name === data.grp_name);
        var index_of_user = user_groups[indexOfGroup].users_init.indexOf(data.p_name);
        if(index_of_user != -1){
            callback("user already exists");
        }
        else{
            //callback("adding user please wait.....");
            var indexOfUSer = socketUsers.findIndex(socketUsers => socketUsers.name === data.p_name);
            if(indexOfUSer==-1){
                callback("invalid user try a valid user name");
            }
            else{
                user_groups[indexOfGroup].users_init.push(data.p_name);
                callback("user_added..");   
                io.sockets.emit("Group_participant_list_update",{grp_name : data.grp_name, participants : user_groups[indexOfGroup].users_init});
            }
        }
    });

    //============================= handling event is user sends an group message ================
    socket.on('group_message_send', function(data, callback){
        //console.log(data);
        //====== getting the index of the group =====
        var indexOfGroup = user_groups.findIndex(user_groups => user_groups.name === data.grp_name);
        //========= sending message to every user in the group =================
        user_groups[indexOfGroup].users_init.forEach(element=>{
            //============== getting reference of all the members in the group ================
            var indexofuser = socketUsers.findIndex(socketUsers => socketUsers.name === element);
            socketUsers[indexofuser].userSocket.emit("grp_message_delivery", data);
                     
        });
    });

    // =============================== when user disconnects ====================================
    socket.on('disconnect',()=>{
        //console.log("user disconnected");       
        var indexOfUSer = socketUsers.findIndex(socketUsers => socketUsers.name === socket.nickname);
        //console.log(socket.nickname+ " at " +socketUsers.indexOf(socket.nickname)+ " disconnected");    
       // console.log(socketUsers[indexOfUSer].name +" disconnected!! ");
        if(indexOfUSer!=-1){
            if(socketUsers[indexOfUSer].count==1){
                socketUsers.splice(indexOfUSer,1);
            }
            else{
                socketUsers[indexOfUSer].count--;
            }
        }
        //sending all active users .
        sendUsersOnline();
        //console.log(socketUsers.length + "remianing");
    });

    //========================= function to return online users ============================
    function sendUsersOnline(){
        var onlineUsers = [];
        socketUsers.forEach(element => {
            /* if(element.name!= socket.nickname) */
            onlineUsers.push(element.name);
        });
        io.sockets.emit("user status changed" ,onlineUsers);
    }

    //======================= function to return all the groups currently made in socket ===================
    function update_Group_List_At_USer_Side(){
        var Groups_online = [];
        user_groups.forEach(element => {
            /* if(element.name!= socket.nickname) */
            //console.log(element.name);
            Groups_online.push(element.name);
        });
        io.sockets.emit("Group_list_update" ,Groups_online);
    }
    //=================== function to update user list in the currently updated grp ========================
    function update_Group_participant_List_At_USer_Side(){
        user_groups.forEach(element=>{
            io.sockets.emit("Group_participant_list_update",{grp_name : element.name, participants : element.users_init});
        });
    }
}); 
 
