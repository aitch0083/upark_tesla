<template>
  <div id="app">
    <MainMenu msg="Vue.js App"/>
  </div>
</template>

<script>
import MainMenu from './components/MainMenu.vue'

export default {
  name: 'app',
  components: {
    MainMenu
  }//eo components
}
</script>

<style>
@import url(//fonts.googleapis.com/earlyaccess/notosanstc.css);
body{
  font-family: 'Noto Sans TC', sans-serif;
  color: #5b5777;
}
</style>
