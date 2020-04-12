const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

const app = express();

const scraper = require ('./scraper.js');

app.get('/', function(req, res){
    // res.setHeader('Content-Type', 'application/json');

    scraper.get_data()
        // .then(response => response.json())
        .then(data => res.send(JSON.stringify(data)))
        .catch(error => {
            console.log("Fail to get data!");
        })
});

let port = process.env.PORT;

if (port == null || port == "") {
  port = 8000;
}

app.listen(port, () => {
    console.log(`API is running on http://localhost:${port}`);
});
