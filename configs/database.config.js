module.exports = {
	name: 'youpark',
	host: '127.0.0.1',
	user: 'root',
	pass: '8888',
	port: 3306,
	timezone: '+08:00',
	dialect: 'mysql',
	operatorsAliases: false,
	dialectOptions: {
        dateStrings: true, //for reading from database
        typeCast: true
    },
};