const mysql = require('mysql2')

const pool = mysql.createConnection({
  host:"localhost",
  user: "root",
  password: "Evan1206**",
  database: "person",
  connectionLimit: 10,
  waitForConnections:true
})


pool.connect((err) => {
  if (err) {
    console.log(err)
    return
  }
  console.log('Database connected')
})
module.exports = pool



// pool.connect(function(err) {
//   if (err) throw err;
//   console.log("Connected!");
//   var sql = "INSERT INTO customer (name, email) VALUES ('?,?')";
//   pool.query(sql, function (err, result) {
//     if (err) throw err;
//     console.log("1 record inserted");
//   });
// });

// module.exports = pool