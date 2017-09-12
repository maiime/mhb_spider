var express = require('express');
var app = express();
var server_data = require('./config/server.json');
var mysql = require('mysql');
var mysql_config = require('./config/config');
const moment = require('moment');
const port = 3000;

app.set('views','./views');
app.set('view engine','jade');
app.use(express.static(__dirname + '/static'));

app.get('/', function(req, res){
  get_data(192).then(_res => {
    res.render('layout',{
      obj: _res,
      server_data: server_data
    });
  })
});

app.get('/:id', function(req, res){
  get_data(req.params.id).then(_res => {
    res.render('layout',{
      obj: _res,
      server_data: server_data
    });
  })
});

app.listen(port);
console.log('服务已启动，请访问：http://127.0.0.1:'+port);
/**
 * 
 * @param {Number} server_id 服务器id
 */
function get_data(server_id) {
  return new Promise((resolve, reject) => {
    var sql = mysql.createConnection(mysql_config);
    sql.connect();
    sql.query(`SELECT * FROM mhb_price WHERE server_id = '${server_id}'`,(err, res) => {
      if(!err){
        let time = res.map(item => {
          return moment(new Date(item.time)).format('YYYY-MM-DD');
        });
        let price = res.map(item => {
          return Number(item.price*3000).toFixed(2);
        });
        resolve({
          time,
          price,
          server_id
        });
      }else{
        reject(`写入数据库失败: ${err}`);
      }
    })
    sql.end();
  })
}