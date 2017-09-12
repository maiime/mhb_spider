var express = require('express');
var app = express();
var server_data = require('./config/server.json');
var mysql = require('mysql');
var mysql_config = require('./config/config');

app.set('views','./views');
app.set('view engine','jade');
app.use(express.static(__dirname + '/static'));
app.get('/', function(req, res){
  res.render('layout');
});
app.get('/:id', function(req, res){
  get_data(req.params.id).then(_res => {
    res.render('layout',{
      obj: _res,
      server_data: server_data
    });
  })
});

app.listen(3000);

function get_data(server_id) {
  return new Promise((resolve, reject) => {
    var sql = mysql.createConnection(mysql_config);
    sql.connect();
    sql.query(`SELECT * FROM mhb_price WHERE server_id = '${server_id}'`,(err, res) => {
      if(!err){
        resolve(res);
      }else{
        reject(`写入数据库失败: ${err}`);
      }
    })
    sql.end();
  })
}