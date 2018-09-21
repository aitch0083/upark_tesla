module.exports = {
  
  apps : [

      { //Applicarion #1
        name: "YouPark",
        script: "./bin/www",
        env: {
          COMMON_VARIABLE: "true"
        },
        env_production: {
          NODE_ENV: "production"
        },
        watch: ["configs", "models", "routes", "views", "bin"],
        ignore_watch: ["node_modules", "dist", "src"],
        watch_options: {
          followSymlinks: false
        }
      }, //eo Applicarion #1

      // { //Applicarion #2
      //   name: "Simulator",
      //   script: "./bin/simulator",
      //   env: {
      //     COMMON_VARIABLE: "true"
      //   },
      //   env_production: {
      //     NODE_ENV: "production"
      //   },
      //   watch: ["bin"],
      //   ignore_watch: ["node_modules", "dist", "src"],
      //   watch_options: {
      //     followSymlinks: false
      //   }
      // }, //eo Applicarion #2

      { //Applicarion #3
        name: "Monitor",
        script: "./bin/monitor",
        env: {
          COMMON_VARIABLE: "true"
        },
        env_production: {
          NODE_ENV: "production"
        },
        watch: ["bin"],
        ignore_watch: ["node_modules", "dist", "src"],
        watch_options: {
          followSymlinks: false
        }
      }, //eo Applicarion #2
  ]
  
}//eo exports
