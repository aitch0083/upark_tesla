var DBConfig  = require('../configs/database.config');
var SZ        = require('sequelize');
var sequelize = new SZ(DBConfig.name, DBConfig.user, DBConfig.pass, DBConfig);

var User = sequelize.define('users', {
	id:        { type: SZ.BIGINT(20).UNSIGNED, allowNull: false, autoIncrement: true, primaryKey: true, field: 'id'},
	firstname: { type: SZ.STRING(30), allowNull: false, field: 'firstname'},
	lastname:  { type: SZ.STRING(30), allowNull: false, field: 'lastname'},
	email:     { type: SZ.STRING(80), allowNull: false, field: 'email'},
	phone:     { type: SZ.STRING(30), allowNull: false, field: 'phone'},
	handphone: { type: SZ.STRING(30), allowNull: false, field: 'handphone'}
}, {
	timestamp: false, 
	indexes: [
		{
			unique: true,
			fields: ['email']
		}
	]
});

User.sync({force: false});

module.exports = User;