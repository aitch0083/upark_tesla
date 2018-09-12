var https   = require('https');
var express = require('express');
var router  = express.Router();
var mqtt    = require('mqtt');
var moment  = require('moment');
var SZ      = require('sequelize');

var User        = require('../models/User');
var ChargingLog = require('../models/ChargingLog');
var Promise     = SZ.Promise;
var now         = moment();

const user_id = 1;

ChargingLog.belongsTo(User, {foreignKey:'user_id', as:'User'});

const mqtt_server = 'mqtt://13.230.197.60';

const client_rawdata = mqtt.connect(mqtt_server, {
	username: 'innoUser1',
	password: 'Inno+789'
});

const client_smartmeter = mqtt.connect(mqtt_server, {
	username: 'innoUser1',
	password: 'Inno+789'
});

const ab2str = function (buf) {
  return String.fromCharCode.apply(null, new Uint16Array(buf));
};

const str2ab = function (str) {
  let buf     = new ArrayBuffer(str.length*2); // 2 bytes for each char
  let bufView = new Uint16Array(buf);

  for (let i = 0, strLen = str.length; i < strLen; i++) {
  	bufView[i] = str.charCodeAt(i);
  }
  return buf;
};

const rawdata    = '/v1/device/5732153917/rawdata';
const smartmeter = '/v1/device/5732153917/sensor/smartMeter/rawdata';

client_rawdata.on('connect', function () {
  client_rawdata.subscribe(rawdata);
  client_rawdata.publish(rawdata, 'Hello mqtt. This is the test from API server.');
});

client_rawdata.on('message', function(topic, message){
	if(router.socket_io !== undefined){//check "bin/www" for the injection
		router.socket_io.emit('mqtt_stream', {
			topic: topic,
			message: ab2str(message)
		});
	}
});

client_smartmeter.on('connect', function () {
  client_smartmeter.subscribe(smartmeter);
  // client_smartmeter.publish(smartmeter, 'Hello mqtt. This is the test from API server.');
});

router.options("/*", function(req, res, next){
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
	res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
	res.send(200);
});

router.get('/', function(req, res, next){
	res.json({
		success: true,
		message: 'hello~'
	});
});

router.post('/setLever', function(req, res, next){
	let lever = (parseInt(req.body.lever) !== 0 && parseInt(req.body.lever) !== 1) ? null : parseInt(req.body.lever);

	if(lever === null){
		res.json({
			success: false,
			message: 'Invalid parameter'
		});
	}

	const _req = https.get('https://apia.chushagyokanri.upark.tw/api_devices/setLockStatus/10/' + lever, (_res) => {

		const { statusCode } = _res;
  		const contentType = _res.headers['content-type'];

  		let error;
		if (statusCode !== 200) {
			error = new Error('Request Failed.\n' +
		                  `Status Code: ${statusCode}`);
		} else if (!/^application\/json/.test(contentType)) {
			error = new Error('Invalid content-type.\n' +
		                  `Expected application/json but received ${contentType}`);
		}

		if (error) {
			res.json({
				success: false,
				message: error.message
			});

			next();
			return;
		}

		_res.setEncoding('utf8');

		let rawData = '';
		_res.on('data', (chunk) => { rawData += chunk; });
		_res.on('end', () => {
			try {
				const parsedData = JSON.parse(rawData);
				// console.log(parsedData);
				res.json({
					success: true,
					data: rawData,
					message: rawData
				});
			} catch (e) {
				// console.error(e.message);
				res.json({
					success: false,
					message: e.message
				});
			}
		});

	}).on('error', (e) => {
	  // console.error(`problem with request: ${e.message}`);
	  	res.json({
			success: false,
			message: e.message
		});
	});
});

router.get('/getLever', function(req, res, next){

	const _req = https.get('https://apia.chushagyokanri.upark.tw/api_devices/getLockStatus/10', (_res) => {

		const { statusCode } = _res;
  		const contentType = _res.headers['content-type'];

  		let error;
		if (statusCode !== 200) {
			error = new Error('Request Failed.\n' +
		                  `Status Code: ${statusCode}`);
		} else if (!/^application\/json/.test(contentType)) {
			error = new Error('Invalid content-type.\n' +
		                  `Expected application/json but received ${contentType}`);
		}

		if (error) {
			res.json({
				success: false,
				message: error.message
			});

			next();
			return;
		}

		_res.setEncoding('utf8');

		let rawData = '';
		_res.on('data', (chunk) => { rawData += chunk; });
		_res.on('end', () => {
			try {
				const parsedData = JSON.parse(rawData);
				// console.log(parsedData);
				res.json({
					success: true,
					data: parsedData,
					message: rawData
				});
			} catch (e) {
				// console.error(e.message);
				res.json({
					success: false,
					message: e.message
				});
			}
		});

	}).on('error', (e) => {
	  // console.error(`problem with request: ${e.message}`);
	  	res.json({
			success: false,
			message: e.message
		});
	});

	// _req.end();
});

router.post('/setCharging', function(req, res, next){
	let charging    = (parseInt(req.body.charging) !== 0 && parseInt(req.body.charging) !== 1) ? null : parseInt(req.body.charging);
	let deviceid    = req.body.deviceid || null;
	let watts       = req.body.watts || 0;
	let user_id     = req.body.user_id || null;

	if(charging === null || deviceid === null || user_id === null){
		res.json({
			success: false,
			message: 'Invalid parameters'
		});
	}

    //console.info('charging: ', charging);

	let string = `deviceid=${deviceid}&value1=${charging}`;

	if(charging === 1){ //to start

		let now = moment();

		//create a new chargin log
		ChargingLog.create({
			user_id,
			deviceid,

			start_time: now.format('YYYY-MM-DD HH:mm:ss'),
			end_time: '0000-00-00 00:00:00',
			status: 'start',
			interval: 0,
			used_watts: 0,
			start_watts: watts,
			end_watts: 0
		})
		.then(function(record){

			client_smartmeter.publish(smartmeter, string);
			res.json({
				success: true,
				message: 'Charging started',
				record
			});
		})
		.catch(function(error){
			res.json({
				success: false,
				error: error,
				message: 'Unable to start charging'
			});
		});

	} else { //to close
		//find the previous charging record
		let conditions = {
			user_id,
			deviceid,
			status: 'start',
			end_watts: 0,
			interval: 0
		};

		let now = moment();

		ChargingLog.findOne({
			where: conditions,
			order: [["id", "desc"]],
			limit: 1,
			include: [
				{ model:User, as:'User', required: true, attributes:['id', 'firstname', 'lastname'] }
			]
		})
		.then(function(record){

			//calculate the following:
			let startTime = moment(record.start_time, 'YYYY-MM-DD HH:mm:ss');
			let dd        = moment.duration(now.diff(startTime));

			//console.info('record.start_time:', record.start_time,', startTime:', startTime.format('YYYY-MM-DD HH:mm:ss'));
			// console.info('find dd:', dd.minutes());

			record.updateAttributes({
				end_watts: watts,
				interval: dd.minutes()  + (dd.hours() * 60),
				used_watts: (watts - record.start_watts),
				status: 'end',
				end_time: now.format('YYYY-MM-DD HH:mm:ss')
			}).then(function(record){

				client_smartmeter.publish(smartmeter, string);

				res.json({
					success: true,
					message: 'Charging stopped',
					record
				});
			}).catch(function(error){

				console.info('error @ /setCharging PUT:', error);

				res.json({
					success: false,
					error: error
				});
			});
		})
		.catch(function(error){

			console.info('error @ /setCharging POST:', error);

			res.json({
				success: false,
				error: error
			});
		});
	}//eo to-close

	// res.json({
	// 	success: true,
	// 	message: 'Done'
	// });
});

router.get('/getCharging', function(req, res, next){
	let deviceid = req.query.deviceid || null;
	let user_id  = req.query.user_id || null;

	if(deviceid === null || user_id === null){
		res.json({
			success: false,
			message: 'Invalid parameters'
		});
	}

	let conditions = {
		user_id,
		deviceid
	};

	let now = moment();

	Promise.join(
		ChargingLog.findAll({
			attributes:[
				'id',
				[SZ.fn('sum', SZ.col('used_watts')), 'total_watts'],
				[SZ.fn('sum', SZ.col('interval')), 'total_interval'],
				'deviceid',
				'user_id'
			],
			where: conditions,
			order: [["id", "desc"]],
			group: ['user_id', 'deviceid'],
			limit: 1,
			include: [
				{ model:User, as:'User', required: true, attributes:['id', 'firstname', 'lastname'] }
			]
		}),

		User.findOne({
			attributes: ['id', 'firstname', 'lastname'],
			where: {
				id: user_id
			}
		})
	).spread(function(record, user){

		ChargingLog.findOne({
			where: conditions,
			order: [["id", "desc"]],
			limit: 1
		}).then(function(latest_record){

			var return_record = { 
				total_interval: 0, 
				total_watts: 0, 
				User: user,
				time_elipsed: '00:00'
			};

			if(record.length){
				return_record = record.pop();
			}

			var st = moment(latest_record.start_time, 'YYYY-MM-DD HH:mm:ss');
	        var et = latest_record.end_time !== '0000-00-00 00:00:00' ? moment(latest_record.end_time, 'YYYY-MM-DD HH:mm:ss') : moment();
	        
	        var dd = moment.duration(et.diff(st));
	        var mm = dd.minutes() + (dd.hours() * 60);
	        mm = mm >= 10 ? (mm) : '0' + mm;
	        var ms = dd.seconds() >= 10 ? dd.seconds() : '0' + dd.seconds();

	        res.json({
				success: true,
				message: 'Latest charging record',
				record: return_record,
				time_elipsed: `${mm}:${ms}`,
				latest_record,
			});

		}).catch(function(error){

			console.info('error @ /getCharging GET:', error);
			res.json({
				success: false,
				error: error
			});
		});

	}).catch(function(error){

		console.info('error @ /getCharging GET:', error);

		res.json({
			success: false,
			error: error
		});
	});

});

router.get('/listChargings', function(req, res, next){
	let deviceid = req.query.deviceid || null;
	let user_id  = req.query.user_id || null;
	let start    = req.query.start || null;
	let end      = req.query.end || null;

	if(deviceid === null || user_id === null || start === null || end === null){
		res.json({
			success: false,
			message: 'Invalid parameters'
		});
	}

	let conditions = {
		user_id,
		deviceid,
		status: 'end',
		start_time: {
			[SZ.Op.gte]: start
		},
		end_time: {
			[SZ.Op.lte]: end
		},
	};

	let now = moment();

	ChargingLog.findAll({
		where: conditions,
		order: [["id", "desc"]],
	}).then(function(records){

		res.json({
			success: true,
			message: 'Latest charging records',
			records
		});

	}).catch(function(error){

		console.info('error @ /listChargings GET:', error);

		res.json({
			success: false,
			error: error
		});
	});
});//eo listChargings

module.exports = router;