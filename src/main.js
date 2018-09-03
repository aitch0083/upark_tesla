import Vue from 'vue';
import Vuesax from 'vuesax';
import BootstrapVue from 'bootstrap-vue';
import VueResource from 'vue-resource';
import App from './App.vue';

import 'vuesax/dist/vuesax.css'; //Vuesax styles
import 'material-icons/iconfont/material-icons.css'; //Material ICONs

import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-vue/dist/bootstrap-vue.css';

let MyPi = (Vue, options) => {

  let _video = null;
  let _signaturePad = null;
	
	Vue.directive('focus', {
		inserted: (el) => {
			$(el).focus();
		}
	});

	Vue.filter('capitalize', function (value) {
		if (!value) return ''
		value = value.toString()
		return value.charAt(0).toUpperCase() + value.slice(1)
	});

	Vue.filter('cap', function (value) {
		if (!value) return ''
		value = value.toString()
		return value.toUpperCase();
	});  

	Vue.filter('psum', function(list, key1, key2){

		return list.reduce(function(total, item) {
        	return total + item[key1] * item[key2]
    	}, 0);

	});

	Vue.filter('notrimmer', function(value){
		if(!value){
			return value;
		}

		return value.substr(-6);
	});

	Vue.filter('nochopper', function(value){
		if(!value){
			return value;
		}

		return value.substr(5);
	});

	Vue.filter('smalldate', function(value){
		if(!value){
			return value;
		}

		return moment(value, 'DD/MM/YYYY').format('DD/MM/YY HH:mm');
	});

	Vue.filter('abbr', function(value){
		if(!value){
			return value;
		}

		return value.length > 5 ? value.substr(0, 5) + '..' : value;
	});
};

Vue.use(Vuesax);
Vue.use(VueResource);
Vue.use(BootstrapVue);
Vue.use(MyPi);

Vue.config.productionTip = false;

new Vue({
	render: h => h(App)
}).$mount('#app');
