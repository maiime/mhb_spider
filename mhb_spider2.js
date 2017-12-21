/**
 * author: maii
 * create time: 2017年12月21日10:16:51
 */
const fs = require('fs');
let fetch = require('node-fetch');
let mysql = require('promise-mysql');
let mysql_config = require('./config/config');
let moment = require('moment');
let schedule = require('node-schedule');

// 类
class MHB_Spider {
	constructor() {
		this.index = 0;
		this.time = (moment() / 1000)|0;
		this.serverListData = {};
		this.serverList = null;
		this.flag = {};
	}
	/**
	 * 拉取服务器列表数据
	 */
	async	fetch_server_list_data() {
		let res = await fetch('http://res.xyq.cbg.163.com/js/server_list_data.js');
		let body = await res.text();
		let json = body.replace(/\s+/g, '').replace('varproduct_name="xyq";varserver_data=', '').replace(';', '');
		Object.assign(this.serverListData, JSON.parse(json));
	}
	/**
	 * 存储服务器列表数据
	 */
	async save_fetch_server_list_data() {
		let serverList = Object.values(this.serverListData);
		this.serverList = serverList.map(item => ({
			area_id: item[0][2],
			area_name: item[0][0],
			area_pos: item[0][1],
			server: item[1]
		}));
		await fs.writeFileSync('./config/server.json',JSON.stringify(this.serverList));
	}
	/**
	 * 获取指定服务器mhb单价
	 * @param {Number} server_id 服务器id
	 */
	async	fetch_mhb_price(server_id) {
		let res = await fetch(`http://xyq-android2.cbg.163.com/app2-cgi-bin/xyq_search.py?act=super_query&page=1&kindid=23&serverid=${server_id}&search_type=query&platform=android&app_version=2.3.1&device_id=xyq.6d5c26bdfbf8c9c9&sdk_version=22&device_name=m3+note&app_version_code=2314&os_version=5.1&package_name=com.netease.xyqcbg&os_name=m3note`);
		let data = await res.json();
		if (data.status === 1) {
			let str = data.equip_list[0].desc_sumup_short.substr(3, 6);
			return str;
		} else {
			this.fetch_mhb_price(server_id);
		}
	}
	/**
	 * 将指定服务器mhb单价写入数据库
	 * @param {Number} server_id 服务器ID
	 * @param {Float} price 单价
	 */
	async	save_mhb_price(server_id, price){
		let sql = await mysql.createConnection(mysql_config);
		let result = await sql.query(`INSERT INTO mhb_price_2 (server_id,time,price) VALUES(${server_id},'${this.time}',${price})`);
		sql.end();
	}
	async run() {
		await this.fetch_server_list_data();
		await this.save_fetch_server_list_data();
		for (let i = 0; i < this.serverList.length; i++) {
			for (let j = 0; j < this.serverList[i].server.length; j++) {
				let server_id = this.serverList[i].server[j][0];
				if (!this.flag[server_id]) {
					let price = await this.fetch_mhb_price(server_id);
					await this.save_mhb_price(server_id, price);
					this.flag[server_id] = true;
					console.log(this.serverList[i].server[j][1] + ':' + (price*3000).toFixed(2) + '(元)');
				}
			}
		}
	}
}


// 定时任务
let rule = new schedule.RecurrenceRule();
rule.hour = 20;
rule.minute = 0;
schedule.scheduleJob(rule, function(){
	let s = new MHB_Spider();
	s.run();
});