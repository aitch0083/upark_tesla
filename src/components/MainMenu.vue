<template>
  <div class="centerx">
    <vs-row
     vs-align="flex-start"
     vs-type="flex" vs-justify="center" vs-w="12">

      <vs-col vs-type="flex" vs-justify="center" vs-align="center" vs-w="6" vs-xs="12">
        <vs-card v-if="show_main">

          <vs-card-body>
            <h2 class="center_align">
              Tesla展示間充電樁
              <i class="show-history-btn material-icons" @click="showHistory">toc</i>
            </h2>

            <div class="gauge-container">
              <canvas id="gauge-canvas"></canvas>
            </div>

            <div id="statitics-box">
              <span class="time_passed">{{time_passed}}</span>
              <hr/>
              <span class="watts_used">本次累計{{watts_used}}KW</span>
            </div>

            <div class="chargin-status-div" :class="charging?'charging':'primary'">{{charging ? '充電中' : '已停止'}}</b></div>

            <h5 class="controls-caption center_align">
              <i class="material-icons">expand_more</i>
              控制介面
              <i class="material-icons">expand_more</i>
            </h5>

            <div class="sub-controls">
              <b-button
                class="half-btn"
                :pressed.sync="lever" 
                @click="onLeverClick"
                variant="warning">
                <p><i class="material-icons">{{lever ? 'arrow_downward' : 'arrow_upward'}}</i></p>
                {{lever ? '放下地鎖' : '升起地鎖'}}
              </b-button>
            
              <b-button
                class="half-btn"
                :pressed.sync="charging" 
                @click="onChargingClick"
                variant="primary">
                <p><i class="material-icons">{{charging ? 'stop' : 'battery_charging_full'}}</i></p>
                {{charging ? '停止充電' : '開始充電'}}
              </b-button>
            </div>

            <div class="avatar-card">
              
              <ul class="avatar-list">
                <li>用戶資料：{{current_user}}</li>
                <li>授權狀況：共享開放</li>
                <li>收費金流：NTD 50/H</li>
                <li>總共用電：{{total_watts}}KW</li>
                <li>總共時間：{{total_interval}}Mins</li>
              </ul>

            </div>

            <p class="hidden">TOTAL WATTS: {{total_watts}}</p>
            <p class="hidden">TOTAL INTVL: {{total_interval}}</p>

          </vs-card-body><!-- EO vs-card-body::MAIN -->

          </vs-card>

          <vs-card v-if="show_history">
            <vs-card-body v-if="show_history">

              <h2 class="center_align">
                Statistics
                <i class="show-history-btn material-icons" @click="showMain">swap_horizontal_circle</i>
              </h2>

              <hr/>

              <div class="time_filter_container">
                <h3><span class="current_year">{{current_year}}</span></h3>
                <!-- <dropdown :options="months" 
                          :selected="selected_month" 
                          v-on:updateOption="updateMonth" 
                          :placeholder="'月份'">
                </dropdown> -->

                <b-form-select 
                  v-model="selected_month" 
                  :options="months"
                  @change="updateMonth" 
                  class="xs-2" />

                <!-- <dropdown :options="weeks" 
                          :selected="selected_week" 
                          v-on:updateOption="updateWeek" 
                          :placeholder="'星期'"
                          :markedEvents="['change-option']">
                </dropdown> -->

                <b-form-select 
                  v-model="selected_week" 
                  :options="weeks" 
                  @change="updateWeek" 
                  class="xs-5" />
              </div>

              <canvas id="chart-canvas"></canvas>

              <div v-if="false && filter_days" class="filter_days">
                <ul>
                  <li v-for="filter_day in filter_days" @click="changeDate(filter_day.date)">
                    <span class="day-of-week">{{filter_day.week_label}}</span>
                    <span class="date-of-week" :class="selected_date === filter_day.date ? 'marked-blue' : ''">{{filter_day.date_label}}</span>
                  </li>
                </ul>
              </div>

              <vs-list v-if="false" v-for="entry in charging_history">
                <vs-list-item :vs-title="entry.modified">
                  <p>起始瓦數：{{entry.start_watts}}KW</p>
                  <p>結束瓦數：{{entry.end_watts}}KW</p>
                  <p>消耗瓦數：{{entry.used_watts}}KW</p>
                  <p>使用時間：{{entry.interval}}分鐘</p>
                </vs-list-item>
              </vs-list>

            </vs-card-body>
          </vs-card><!-- EO vs-card-body::HISTORY -->

      </vs-col>

    </vs-row>
  </div>
</template>

<script>

import _ from 'lodash';
import moment from 'moment';
import dropdown from './Dropdown';
import EventBus from '../EventBus';

const user_id       = 1;//for development only
const action_prefix = 'http://13.230.197.60:8081/api/';
// const action_prefix = 'http://localhost:8081/api/';
const socket        = io().connect();//for test: http://localhost:8081

const parser = (app, data) => {
  //topic: "/v1/device/5732153917/rawdata",
  //message: "timestamp=1532320225&deviceid=42087&value1=0&value2=25220&value3=0"

  if(data.topic === undefined || data.message === undefined){
    throw "Invalid data format";
  }

  app.mqtt_topic = data.topic;

  let nest = data.message.split("&");

  if(_.isArray(nest) && nest.length > 0){

    if(app.mqtt_updating){
      return;
    }

    // let result = [];
    app.mqtt_result = {};

    nest.forEach((v, idx) => {
      let idx_of_delimiter = v.indexOf('=');
      let key              = v.substr(0, idx_of_delimiter);
      let value            = v.substr(idx_of_delimiter + 1);

      app.mqtt_result[key] = value;
    });

    // console.info('parsing result: ', app.mqtt_result);

    app.charging = app.mqtt_result.value3 && parseInt(app.mqtt_result.value3) === 1 ? true : false;
    app.disabled_charging = false;

    main.loadChargerStatus(app);

    // app.mqtt_result = result;
  } else {
    throw "Invalid data parsing";
  }

};//parser

const draw_gauge = (value, force) => {

  value = value || 0;
  force = force || false;

  let mmp = 3;

  if(draw_gauge.gauge !== undefined && !force){
    draw_gauge.gauge.value = value * mmp;
  } else {
    draw_gauge.gauge = new RadialGauge({
      renderTo: 'gauge-canvas',
      minValue: 0,
      maxValue: 360,
      height: 350,
      majorTicks: [
          "0",
          "10",
          "20",
          "30",
          "40",
          "50",
          "60",
          "70",
          "80",
          "90",
          "100",
          "110",
          "0"
      ],
      // title: '120mins',
      minorTicks: 12,
      ticksAngle: 360,
      startAngle: 180,
      strokeTicks: false,
      highlights: false,
      colorPlate: "#7CCCCA",
      colorMajorTicks: "#FFF",
      colorMinorTicks: "#FFF",
      colorNumbers: "#FFF",
      colorNeedle: "rgba(240, 128, 128, 1)",
      colorNeedleEnd: "rgba(255, 160, 122, .9)",
      valueBox: false,
      valueTextShadow: false,
      colorCircleInner: "#000",
      colorNeedleCircleOuter: "#FFF",
      needleCircleSize: 0.0005,
      needleCircleOuter: false,
      animationRule: "linear",
      needleType: "line",
      needleStart: 75,
      needleEnd: 99,
      needleWidth: 3,
      borders: true,
      borderInnerWidth: 0,
      borderMiddleWidth: 0,
      borderOuterWidth: 10,
      colorBorderOuter: "#7CCCCA",
      colorBorderOuterEnd: "#7CCCCA",
      colorNeedleShadowDown: "#222",
      borderShadowWidth: 0,
      animationDuration: 500
    }).draw();

    // draw_gauge.gauge.value = 50 * mmp;
    draw_gauge.gauge.value = value * mmp;
  }
};

const unlock_mqtt_update = (app, value) => {
  if(app.charging){
    draw_gauge(0, true);
    app.time_passed = '00:00';
    app.watts_used  = '0';
  }

  let _c = setTimeout(() => {

    app.mqtt_updating = value;

    clearTimeout(_c);
  }, 3500);
};

const chart_config = {
  type: 'line',
  scaleStartValue: 0,
  scaleSteps: 1,
  scaleOverride : true,
  data: {
    labels: [],
    datasets: [{
      label: '充電使用量(KW)',
      backgroundColor: 'rgb(54, 162, 235)',
      borderColor: 'rgb(54, 162, 235)',
      data: [],
      fill: false,
    },{
      label: '充電時間(MIN)',
      backgroundColor: 'rgb(254, 162, 205)',
      borderColor: 'rgb(254, 162, 205)',
      data: [],
      fill: false,
    }]
  },
  options: {
    responsive: true,
    title: {
      display: false,
      text: '充電統計'
    },
    tooltips: {
      mode: 'index',
      intersect: false,
    },
    hover: {
      mode: 'nearest',
      intersect: true
    },
    scales: {
      xAxes: [{
        display: true,
        scaleLabel: {
          display: true,
          labelString: '日期'
        }
      }],
      yAxes: [{
        display: true,
        scaleLabel: {
          display: true,
          labelString: '瓦數/分鐘'
        }
      }]
    }
  }
};

const week_maps = {
  'Mon': '週一',
  'Tue': '週二',
  'Wed': '週三',
  'Thu': '週四',
  'Fri': '週五',
  'Sat': '週六',
  'Sun': '週日'
};

let main = {
  name: 'MainMenu',
  chart: null,
  props: {
    msg: String
  },//eo props

  components: {
      'dropdown': dropdown,
  },

  data() {

    var _m    = moment();
    var start = _m.startOf('month').format('DD');
    var end   = _m.endOf('month').format('DD');

    _m        = moment();
    var weeks = (end-start+1)/7;
    var _cd   = parseInt(_m.format('DD'));//current date
    weeks     = Math.ceil(weeks);

    var selected_date = _m.format('YYYY-MM-DD');

    var selected_week = '';
    var week_options  = [];

    // console.info('_m:', _m, ', _m.f()', _m.format('DD'));

    for(var idx = 0 ; idx < weeks ; idx++){
      var _mm = _m.format('MM');
      var w   = idx + 1;
      var _s  = (7 * idx) + parseInt(start);
      var _e  = _s + 6;

      _e = _e >= end ? end : _e;

      _s = _s >= 10 ? _s : '0' + _s;
      _e = _e >= 10 ? _e : '0' + _e;

      var _sl = `${_mm}/${_s}`;
      var _el = `${_mm}/${_e}`;

      week_options.push({
        label: `第${w}週(${_sl}~${_el})`,
        text: `第${w}週(${_sl}~${_el})`,
        name:  w,
        value: _sl + ';' + _el,
        start: _sl,
        end:   _el
      }); 

      // console.info('_cd:', _cd, ', parseInt(_s):', parseInt(_s), ', parseInt(_e):', parseInt(_e), ', t:', _cd >= parseInt(_s) && _cd <= parseInt(_e));

      if(_cd >= parseInt(_s) && _cd <= parseInt(_e)){
        selected_week = _sl + ';' + _el;
        // selected_week = {
        //   label: `第${w}週(${_sl}~${_el})`,
        //   text:  `第${w}週(${_sl}~${_el})`,
        //   name:  w,
        //   start: _sl,
        //   end:   _el
        // };
      }
    }

    // console.info('week_options:', week_options);

    return {
      lever:             true,
      charging:          false,
      show_error:        false,
      show_info:         false,
      show_main:         true,
      show_history:      false,
      error_msg:         '',
      info_msg:          '',
      disabled_lever:    false,
      disabled_charging: false,
      mqtt_result:       null,
      mqtt_topic:        null,
      mqtt_updating:     false,
      total_watts:       0,
      total_interval:    0,
      time_passed:       0,
      watts_used:        0,
      current_user:      'N/A',
      charging_history:  [],
      current_year: _m.format('YYYY'),
      months: [
        {name:'Jan', 'value': '1', 'text':'Jan'}, 
        {name:'Feb', 'value': '2', 'text':'Feb'}, 
        {name:'Mar', 'value': '3', 'text':'Mar'}, 
        {name:'Apr', 'value': '4', 'text':'Apr'}, 
        {name:'May', 'value': '5', 'text':'May'}, 
        {name:'Jun', 'value': '6', 'text':'Jun'}, 
        {name:'Jul', 'value': '7', 'text':'Jul'}, 
        {name:'Aug', 'value': '8', 'text':'Aug'}, 
        {name:'Sep', 'value': '9', 'text':'Sep'}, 
        {name:'Oct', 'value': '10', 'text':'Oct'}, 
        {name:'Nov', 'value': '11', 'text':'Nov'}, 
        {name:'Dec', 'value': '12', 'text':'Dec'}],
      // selected_month: {
      //   name: _m.format('MMM'),
      // },
      selected_month: _m.format('M'),
      weeks: week_options,
      selected_week: selected_week,
      selected_date: selected_date,
      filter_days: []
    }//eo data
  },

  reset() {
    this.show_error = false;
    this.show_info  = false;
    this.error_msg  = '';
    this.info_msg   = '';
  },//eo reset

  loadLockStatus(app) {

    //get lever's status
    app.$http
    .get(action_prefix + 'getLever')
    .then((result) => {
      app.disabled_lever = false;
      // app.disabled_charging = app.lever;

      if( result.status === 200 && result.body.success ){
        app.lever = parseInt(result.body.data.status) === 0 ? false : true;
        //console.info('loadLockStatus:', app.lever, ', org:',result.body.data.status);
      } else {
        app.show_error = true;
        app.error_msg  = result.body.message;
      }
    }, (error) => {
      app.disabled_lever = false;

      app.show_error     = true;
      app.error_msg      = error.body.message;
    });

  },//eo loadLockStatus

  loadChargerStatus(app) {

    if(!app.mqtt_result){
      return;
    }

    //get charging pole status
    app.$http
    .get(action_prefix + 'getCharging', {
      params: {
        user_id: user_id,
        deviceid: app.mqtt_result.deviceid
      }
    }).then((result) => {

      if( result.status === 200 && result.body.success ){

        // console.info('result.body:', result.body);

        app.total_interval = result.body.record.total_interval;
        app.total_watts    = result.body.record.total_watts;
        app.current_user   = `${result.body.record.User.firstname} ${result.body.record.User.lastname}`;

        if(!result.body.latest_record){
          return;
        }

        // console.info('result.body.latest_record.end_time:', result.body.latest_record.end_time);

        var st = moment(result.body.latest_record.start_time, 'YYYY-MM-DD HH:mm:ss');
        var et = result.body.latest_record.end_time !== '0000-00-00 00:00:00' ? moment(result.body.latest_record.end_time) : moment();
        console.info(et.format('YYYY-MM-DD HH:mm:ss'), st.format('YYYY-MM-DD HH:mm:ss'));
        var dd = moment.duration(et.diff(st));
        var mm = dd.minutes() >= 10 ? (dd.minutes() + (dd.hours() * 60)) : '0' + (dd.minutes() + (dd.hours() * 60));
        var ms = dd.seconds() >= 10 ? dd.seconds() : '0' + dd.seconds();

        draw_gauge(dd.minutes() + (dd.hours() * 60));

        // console.info('dd.hours() * 60:', dd.hours() * 60, ', mm:', mm, ', ms:',ms);

        let ew = result.body.latest_record.end_watts;
        ew = ew <= 0 ? app.mqtt_result.value2 : ew;

        app.time_passed = `${mm}:${ms}`;
        app.watts_used  = ew - result.body.latest_record.start_watts;
        app.watts_used  = app.watts_used <= 0 ? 0 : app.watts_used;

      } else {
        app.show_error = true;
        app.error_msg  = result.body.message;
      }

    }, (error) => {
      console.info('getCharging error:', error);
    });

  },//eo loadChargerStatus

  loadChargingLogs(app) {

    if(!app.mqtt_result){
      return;
    }

    if(!app.selected_week){
      return;
    }

    var _cc = setTimeout(() => {
      window.mychart = new Chart(document.getElementById('chart-canvas').getContext('2d'), chart_config);
      clearTimeout(_cc);
    }, 400);

    var dummy = app.selected_week.split(';');
    var dummy2 = {
      start: dummy[0],
      end:   dummy[1]
    };

    // console.info('app.selected_week:', app.selected_week, ',dummy2:',dummy2, ', opt:', app.current_year + '/' + dummy2.start);

    var start    = moment(app.current_year + '/' + dummy2.start, 'YYYY/MM/DD');
    var end      = moment(app.current_year + '/' + dummy2.end, 'YYYY/MM/DD');
    var duration = moment.duration(end.diff(start)).days();

    // console.info('start:', start.format('YYYY/MM/DD'));

    // console.info('app.selected_week:', app.selected_week, ', duration:', duration.days());return;
    var day = start;
    for(var i = 0 ; i <= duration ; i++){
      
      if(i > 0){
        day = day.add(1, 'days');
      }

      // console.info('add ', i, ' days: ', day.format('YYYY-MM-DD'));

      app.filter_days.push({
        week_label: week_maps[day.format('ddd')],
        date_label: day.format('DD'),
        date:       day.format('YYYY-MM-DD')
      });
    }

    // console.info();

    app.loadLogs();

    return;

    // console.info('filter_days:', filter_days);return;

    //get charging pole status
    app.$http
    .get(action_prefix + 'listChargings', {
      params: {
        user_id: user_id,
        deviceid: app.mqtt_result.deviceid
      }
    }).then((result) => {

      if( result.status === 200 && result.body.success ){

        // console.info('result.body:', result.body);

        app.charging_history = result.body.records;

      } else {
        // app.show_error = true;
        // app.error_msg  = result.body.message;
        console.info('listChargings error:', result.body.message);
      }

    }, (error) => {
      console.info('listChargings error:', error);
    });
  },//eo loadChargingLogs

  mounted: function(){
    var app = this;

    main.loadLockStatus(app);

    socket.on('mqtt_stream', (data) => {
      // console.info('mqtt_stream Yeah:', data);
      parser(app, data);
    });

    draw_gauge();

    // this.disabled_charging = this.lever;
  },//eo mounted

  updated: function(){
    // console.info('updated...');
    // this.disabled_charging = this.lever;
  },//eo updated

  methods: {
    onCalClick(event) {
      var app = this;

      main.reset.apply(app);

      app.$http
      .get(action_prefix + 'calculate')
      .then((result) => {
        if( result.status === 200 && result.body.success ){

          app.show_info = true;
          app.info_msg  = 'Okay';

        } else {
          app.show_error = true;
          app.error_msg  = result.statusText;
        }
      }, (error) => {
        app.show_error = true;
        app.error_msg  = error.statusText;
      });

      event.preventDefault();
    },//eo onCalClick

    onLeverClick(event){
      var app = this;

      if(app.charging){
        app.show_error = true;
        app.error_msg  = "Please disable charging first";
        app.lever      = false;

        event.preventDefault();
        return false;
      }

      // main.reset.apply(this);

      // console.info('app.lever:', app.lever);

      app.disabled_lever       = true;
      // app.disabled_charging = true;

      app.$http
      .post(action_prefix + 'setLever',{
        lever: app.lever ? 1 : 0
      })
      .then((result) => {
        if( result.status === 200 && result.body.success ){
          // app.show_info = true;
          // app.info_msg  = 'Lock is :' + (app.lever ? 'UP' : 'DOWN') + '. Updating status...';

          // console.info('setTimeout.....');

          setTimeout(() => {
            
            app.show_info = false;
            app.info_msg = '';
            //main.loadLockStatus(app);
            app.disabled_lever = false;

          }, 2800);

        } else {
          // app.show_error     = true;
          // app.error_msg      = result.statusText;
          app.disabled_lever = false;
        }
      }, (error) => {
        app.show_error     = true;
        app.error_msg      = error.statusText;
        app.disabled_lever = false;
      });

      return true;
    },//eo onLeverClick

    onChargingClick(event){
      var app = this;

      main.reset.apply(this);

      // console.info('app.disabled_charging:', app.disabled_charging);

      if(app.disabled_charging){
        event.preventDefault();
        return false;
      }

      // console.info('app.mqtt_result:', app.mqtt_result);

      if(app.mqtt_result === null){
        event.preventDefault();
        return false;
      }

      console.info('app.lever:', app.lever);

      if(app.lever){
        app.show_error = true;
        app.error_msg  = "Please lower the lock first";
        event.preventDefault();
        return false;
      }

      app.mqtt_updating = true;

      app.disabled_charging = true;

      app.$http
      .post(action_prefix + 'setCharging',{
        user_id:  user_id,
        charging: app.charging ? 1 : 0,
        deviceid: app.mqtt_result.deviceid,
        watts:    app.mqtt_result.value2
      }).then((result) => {
        unlock_mqtt_update(app, false);
      }, (error) => {
        app.show_error = true;
        app.error_msg  = error.statusText;
        unlock_mqtt_update(app, false);
      });

      return true;
    },//eo onChargingClick

    showHistory(event) {
      let app = this;

      app.show_main    = false;
      app.show_history = true;

      chart_config.data.labels = [];
      
      chart_config.data.datasets.forEach((dataset) => {
        dataset.data = [];
      });

      main.loadChargingLogs(app);

    },//eo showHistory

    showMain(event) {
      let app = this;

      app.show_main    = true;
      app.show_history = false;

      main.loadLockStatus(app);

      let _c = setTimeout(() => {
        draw_gauge(0, true);
        clearTimeout(_c);
      }, 100);

    },//eo showMain

    updateMonth(selected_month) {
      // console.info('selected_month:', selected_month);

      var app   = this;
      var _m    = moment(selected_month, 'MM');
      var start = _m.startOf('month').format('DD');
      var end   = _m.endOf('month').format('DD');

      _m        = moment(selected_month, 'MM');
      var weeks = (end-start+1)/7;
      var _cd   = parseInt(_m.format('DD'));//current date
      weeks     = Math.ceil(weeks);

      var selected_week = '';
      var week_options  = [];

      // console.info('_m:', _m, ', _m.f()', _m.format('DD'));

      for(var idx = 0 ; idx < weeks ; idx++){
        var _mm = _m.format('MM');
        var w   = idx + 1;
        var _s  = (7 * idx) + parseInt(start);
        var _e  = _s + 6;

        _e = _e >= end ? end : _e;

        _s = _s >= 10 ? _s : '0' + _s;
        _e = _e >= 10 ? _e : '0' + _e;

        var _sl = `${_mm}/${_s}`;
        var _el = `${_mm}/${_e}`;

        week_options.push({
          label: `第${w}週(${_sl}~${_el})`,
          text:  `第${w}週(${_sl}~${_el})`,
          value: _sl + ';' + _el,
          name:  w,
          start: _sl,
          end:   _el
        }); 

        // console.info('_cd:', _cd, ', parseInt(_s):', parseInt(_s), ', parseInt(_e):', parseInt(_e), ', t:', _cd >= parseInt(_s) && _cd <= parseInt(_e));

        if(_cd >= parseInt(_s) && _cd <= parseInt(_e)){
          selected_week = _sl + ';' + _el;
          // selected_week = {
          //   label: `第${w}週(${_sl}~${_el})`,
          //   name:  w,
          //   start: _sl,
          //   end:   _el
          // };
        }
      }

      // console.info('new week_options:', week_options);
      app.selected_date = _m.startOf('month').format('YYYY-MM-DD');
      app.weeks         = week_options;
      app.selected_week = selected_week;

      EventBus.$emit('change-option', selected_week);

      this.updateWeek(selected_week);

    },//eo updateMonth

    updateWeek(selected_week) {
      var app = this;

      var dummy = selected_week.split(';');
      var dummy2 = {
        start: dummy[0],
        end:   dummy[1]
      };

      // console.info('selected_week:', selected_week);
      var start    = moment(app.current_year + '/' + dummy2.start, 'YYYY/MM/DD');
      var end      = moment(app.current_year + '/' + dummy2.end, 'YYYY/MM/DD');
      var duration = moment.duration(end.diff(start)).days();

      if(app.selected_date !== start.format('YYYY-MM-DD')){
        app.selected_date = start.format('YYYY-MM-DD');
      }

      app.filter_days = [];

      // console.info('app.selected_week:', app.selected_week, ', duration:', duration.days());return;
      var day = start;
      for(var i = 0 ; i <= duration ; i++){
        
        if(i > 0){
          day = day.add(1, 'days');
        }

        // console.info('add ', i, ' days: ', day.format('YYYY-MM-DD'));

        app.filter_days.push({
          week_label: week_maps[day.format('ddd')],
          date_label: day.format('DD'),
          date:       day.format('YYYY-MM-DD')
        });
      }

      // console.info('updateWeek::app.filter_days:', app.filter_days);

      app.loadLogs(selected_week);
    },//eo updateWeek

    changeDate(selected_date) {
      this.selected_date = selected_date;
    },//eo changeDate

    loadLogs(selected_week) {
      var app       = this;
      selected_week = selected_week || app.selected_week;

      // console.info('loadLogs...:', selected_week);

      if(!selected_week){
        return;
      }

      var dummy = selected_week.split(';');
      var dummy2 = {
        start: dummy[0],
        end:   dummy[1]
      };

      //get charging pole status
      app.$http
      .get(action_prefix + 'listChargings', {
        params: {
          user_id: user_id,
          deviceid: app.mqtt_result.deviceid,
          start: moment(app.current_year + '/' + dummy2.start, 'YYYY/MM/DD').format('YYYY-MM-DD') + ' 00:00:00',
          end: moment(app.current_year + '/' + dummy2.end, 'YYYY/MM/DD').format('YYYY-MM-DD') + ' 23:59:59'
        }
      }).then((result) => {

        if( result.status === 200 && result.body.success ){

          // console.info('result.body:', result.body);

          // app.charging_history = result.body.records;

          if(result.body.records.length){
            // chart_config.data.labels.push(app.filter_days);
            chart_config.data.labels = [];
            // chart_config.data.datasets

            app.filter_days.forEach( (day) => {
              chart_config.data.labels.push(day.date_label);
            });

            let to_show_watts = {};
            let to_show_time  = {};

            result.body.records.forEach((record) => {
              var target_date = moment(record.start_time.substr(0,10), 'YYYY-MM-DD').format('DD');

              if(to_show_watts[target_date] !== undefined){
                to_show_watts[target_date] += record.used_watts;
                to_show_time[target_date]  += record.interval;
              } else {
                to_show_watts[target_date] = record.used_watts;
                to_show_time[target_date]  = record.interval;
              }
            });

            chart_config.data.datasets.forEach((dataset, dataset_idx) => {
              dataset.data = [];

              app.filter_days.forEach((day) => {
                if(dataset_idx === 0){
                  var v = to_show_watts[day.date_label] || 0;
                  dataset.data.push(v);
                } else {
                  var v = to_show_time[day.date_label] || 0;
                  dataset.data.push(v);
                }
              });
            });

            var _cc = setTimeout(() => {
              window.mychart.update();
              document.getElementById('chart-canvas').className = 'white-bg';
              clearTimeout(_cc);
            }, 400);
          } else {

            chart_config.data.labels = [];
            // chart_config.data.datasets

            app.filter_days.forEach( (day) => {
              chart_config.data.labels.push(day.date_label);
            });

            let to_show = {};

            chart_config.data.datasets.forEach((dataset) => {
              dataset.data = [];

              app.filter_days.forEach( (day) => {
                var v = to_show[day.date_label] || 0;
                dataset.data.push(v);
              });
            });

            var _cc = setTimeout(() => {
              window.mychart.update();

              document.getElementById('chart-canvas').className = 'white-bg';

              clearTimeout(_cc);
            }, 400);
          }

        } else {
          // app.show_error = true;
          // app.error_msg  = result.body.message;
          console.info('listChargings error:', result.body.message);
        }

      }, (error) => {
        console.info('listChargings error:', error);
      });
    }

  },//eo methods
}

export default main;
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.con-s, .con-s li {
  display:           -webkit-box;
  display:           -ms-flexbox;
  display:           flex;
  -webkit-box-align: center;
  -ms-flex-align:    center;
  align-items:       center;
  -webkit-box-pack:  center;
  -ms-flex-pack:     center;
  justify-content:   center;
}
.vs-switch:first{
  margin-top: 2rem;
}
.vs-switch{
  margin: auto;
  /*margin-top: 1rem;*/
  width: 105px !important;
  font-size: 1.4rem;
}
.vs-card{
  background-color: #7CCCCA;
  color: #F6F9F8;
  min-height: 640px;
}
.vs-list>div{
  border-radius: 0 !important;
}
.con-vs-card-body{
  padding: 0px !important;
}
.bottom-controls{
  min-height: 50px;
  background-color: #3CAAA9;
  border-bottom-right-radius: 8px!important;
  border-bottom-left-radius: 8px!important;
}
.chargin-status-div{
  max-width: 380px;
  min-width: 250px;
  border: 2px solid white;
  text-align: center;
  margin: auto;
  margin-bottom: 2rem;
  padding: 5px;
  border-top-right-radius: 8px!important;
  border-top-left-radius: 8px!important;
  border-bottom-right-radius: 8px!important;
  border-bottom-left-radius: 8px!important;
  font-weight: bold;
}
.controls-caption{
  padding-top: 0.2rem;
  background-color: #3CAAA9;
  font-size: 1.3rem;
  padding-bottom: 0.2rem;
  color: #EAEAEA;
}
.avatar-card{
  background-color: #3CAAA9;
  width: 50%;
  float: right;
  min-height: 8.8rem;
  max-height: 8.8rem;
  height: 8.8rem;
  border-bottom-right-radius: 8px!important;
}
.avatar-card ul{
  list-style: none;
}
.sub-controls{
  background-color: #3CAAA9;
  width: 50%;
  float: left;
  min-height: 8.8rem;
  max-height: 8.8rem;
  height: 8.8rem;
  border-bottom-left-radius: 8px!important;
  text-align: center;
  vertical-align: middle;
}
div.charging{
  background-color: #9ED7D6;
}
div.primary{
  background-color: #0FDFDF;
}
.con-vs-alert{
  padding: 15px;
}
.center_align{
  text-align: center;
}
.show-history-btn{
  position: relative;
  right: -1rem;
  top: 0.4rem;
  cursor: pointer;
  max-width: 30px;
}
.list-slot p{
  padding: 0.134rem;
}
b.primary{
  color: #5b3cc4;
}
b.danger{
  color: rgb(242, 19, 93);
}
button {
  margin: 5px;
}
.hidden {
  display: none !important;
}
.time_filter_container{
  min-height: 80px;
  text-align: center;
  color: white !important;
}
.time_filter_container .current_year{
  display: inline-block;
  position: relative;
  top: 5px;
}
.filter_days ul{
  list-style: none;
  /*text-align: justify;*/
  display: flex;
  justify-content: space-between;
  padding-left: 10px;
  padding-right: 10px;
}
.filter_days ul li{
  /*display: inline;*/
  float: left;
  padding-left: 5px;
  text-align: center;
  cursor: pointer;
}
.filter_days ul li .day-of-week, 
.filter_days ul li .date-of-week{
  display: block;
}
.filter_days ul li .day-of-week{
  font-weight: bold;
}
.marked-blue{
  background-color:#2EA7E0;
  border:1px solid #2EA7E0;    
  height:28px;
  border-radius:50%;
  -moz-border-radius:50%;
  -webkit-border-radius:50%;
  width:28px;
}
.white-bg{
  background-color: white !important;
}
#statitics-box{
  width: 160px;
  position: absolute;
  top: 10rem;
  left: 50%;
  text-align: center;
  margin-left: -80px;
}
#statitics-box hr{
  border: 1px solid white;
}
#chart-canvas {
  padding: 10px;
}
.time_passed{
  font-size: 3rem;
}
.controls-caption{
  margin-bottom: 0px !important;
}
.avatar-list{
  border-left: 3px solid white;
  padding-left: 10px;
}
.circle-btn{
  height: 50px;
  width: 50px;
  border-radius: 50%;
}
.half-btn{
  width: 44%;
  float: left;
  height: 80%;
  text-align: center;
  padding: .375rem 0px;
}
</style>