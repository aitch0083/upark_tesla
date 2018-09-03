var DBConfig  = require('../configs/database.config');
var SZ        = require('sequelize');
var sequelize = new SZ(DBConfig.name, DBConfig.user, DBConfig.pass, DBConfig);

var Simulator = sequelize.define('simulator', {
	id:       { type: SZ.BIGINT(20).UNSIGNED, allowNull: false, autoIncrement: true, primaryKey: true, field: 'id'},
	deviceid: { type: SZ.INTEGER(11), allowNull: false, field: 'deviceid'},
	value1:   { type: SZ.INTEGER(11), allowNull: false, field: 'value1'},
	value2:   { type: SZ.INTEGER(11), allowNull: false, field: 'value2'},
	value3:   { type: SZ.INTEGER(11), allowNull: false, field: 'value3'},
	created:  { type: SZ.DATE, allowNull: false, field: 'created'},
	modified: { type: SZ.DATE, allowNull: true,  field: 'modified'},
}, {
	timestamp: false,
	tableName: 'simulator',
	createdAt:'created', 
	updatedAt:'modified'
});

Simulator.sync({force: false});

module.exports = Simulator;