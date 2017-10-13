/**
 * author: maii
 * Date: 2017-09-06 11:25:34
 * spider
 */
const fs = require('fs');
var rp = require('request-promise');
var cheerio = require('cheerio');
var mysql = require('mysql');
var mysql_config = require('./config/config');
const moment = require('moment');
// 定时任务
var schedule = require('node-schedule');
var rule = new schedule.RecurrenceRule();
rule.hour = 20;
rule.minute = 0;
class Spider {
	/**
	 * 初始化
	 */
	constructor () {

	}

	/**
	 * 拉取服务器数据
	 */
	fetch_server_data (){
		return new Promise((resolve, reject) => {
			rp('http://res.xyq.cbg.163.com/js/server_list_data.js').then(res => {
				var data = res.replace(/\s+/g, '').replace('varproduct_name="xyq";varserver_data=', '').replace(';', '');
				this.server_data = JSON.parse(data);
				resolve(data);
			})
		})	
	}

	/**
	 * 获取指定服务器mhb单价
	 * @param {Number} server_id 服务器id
	 */
	get_mhb_price(server_id) {
		console.log('正在获取单价:'+server_id);
		return new Promise((resolve, reject) => {
			rp(`http://xyq-android2.cbg.163.com/app2-cgi-bin/xyq_search.py?act=super_query&page=1&kindid=23&serverid=${server_id}&search_type=query&platform=android&app_version=2.3.1&device_id=xyq.6d5c26bdfbf8c9c9&sdk_version=22&device_name=m3+note&app_version_code=2314&os_version=5.1&package_name=com.netease.xyqcbg&os_name=m3note`).then((res) => {
				var data = JSON.parse(res);
				if(data.status == 1){
					var str = data.equip_list[0].desc_sumup_short;
					str = str.substr(3);
					var _index = str.indexOf('(');
					str = str.substr(0, _index);
					resolve(str);
				}else{
					reject(data);
				}
			})
		})
	}

	/**
	 * 将指定服务器mhb单价写入数据库
	 * @param {Number} server_id 服务器ID
	 * @param {Float} price 单价
	 */
	save_mhb_price(server_id, price){
		return new Promise((resolve, reject) => {
			var sql = mysql.createConnection(mysql_config);
			sql.connect();
			sql.query(`INSERT INTO mhb_price (server_id,time,price) VALUES(${server_id},'${this.date}',${price})`,(err, res) => {
				if(!err){
					console.log(moment(new Date()).format('YYYY-MM-DD HH:mm')+':save_success!');
					resolve();
				}else{
					reject(`写入数据库失败: ${err}`);
				}
			})
			sql.end();
		})
		
	}
	async run() {
		await this.fetch_server_data();
		for(let item in this.server_data){
			let arr = this.server_data[item][1];
			for(let i = 0;i<arr.length;i++){
				let server_id = arr[i][0];
				if(!this.got_price_list[server_id]){
					this.got_price_list[server_id] = arr[i][1];
					var price = await this.get_mhb_price(server_id);
					await this.save_mhb_price(server_id, price);
				}
			}
		}
		fs.writeFileSync('./config/server.json',JSON.stringify(this.got_price_list));
	}
	data_is_in_mysql() {
		return new Promise((resolve, reject) => {
			var sql = mysql.createConnection(mysql_config);
			sql.connect();
			sql.query(`SELECT * FROM mhb_price WHERE time = '${this.date}'`,(err, res) => {
				if(!err){
					resolve(res.length);
				}else{
					reject(`写入数据库失败: ${err}`);
				}
			})
			sql.end();
		})
	}
	async init() {
		this.server_data = {};
		this.date = moment(new Date()).format('YYYY-MM-DD');
		this.got_price_list = {};
		var is_insert = await this.data_is_in_mysql();
		if(!is_insert){
			this.run();
		}else{
			console.log('数据库已存在今天的数据！');
		}
	}
}
 
var mhb = new Spider();
schedule.scheduleJob(rule, function(){
    mhb.init();
});