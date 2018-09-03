var DBConfig  = require('../configs/database.config');
var SZ        = require('sequelize');
var sequelize = new SZ(DBConfig.name, DBConfig.user, DBConfig.pass, DBConfig);

var ChargingLog = sequelize.define('charging_logs', {
	id:        { type: SZ.BIGINT(20).UNSIGNED, allowNull: false, autoIncrement: true, primaryKey: true, field: 'id'},
	user_id:   { type: SZ.BIGINT(20).UNSIGNED, allowNull: true, defaultValue: 0},

	start_time:  { type: SZ.DATE, defaultValue:'0000-00-00 00:00:00', allowNull: false, field: 'start_time'},
	end_time:    { type: SZ.DATE, defaultValue:'0000-00-00 00:00:00', allowNull: false, field: 'end_time'},
	status:      { type: SZ.ENUM('start','end','idontknow'), allowNull: true, defaultValue: 'idontknow'},
	interval:    { type: SZ.INTEGER(5), defaultValue: 0, allowNull: false, field: 'interval'},
	used_watts:  { type: SZ.INTEGER(5), defaultValue:0, allowNull: false, field: 'used_watts'},
	start_watts: { type: SZ.INTEGER(5), defaultValue:0, allowNull: false, field: 'start_watts'},
	end_watts:   { type: SZ.INTEGER(5), defaultValue:0, allowNull: false, field: 'end_watts'},
	deviceid:    { type: SZ.INTEGER(11), defaultValue:0, allowNull: false, field: 'deviceid'},

	created:  { type: SZ.DATE, allowNull: false, field: 'created'},
	modified: { type: SZ.DATE, allowNull: true,  field: 'modified'},
}, {
	timestamp: true, 
	createdAt:'created', 
	updatedAt:'modified'
});

ChargingLog.sync({force: false});

module.exports = ChargingLog;