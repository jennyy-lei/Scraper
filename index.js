const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

const app = express();
const port = 3000;

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

app.listen(port, () => {
    console.log(`API is running on http://localhost:${port}`);
});