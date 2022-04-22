const express = require("express");
const cors = require('cors');
const app = express();

const categoryRoute = require("./routes/category")
const port = process.env.PORT || 3001;
const apiVersion = 1.0;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// only in json format
app.use((err, req, res, next) => {

    if (err) {
        return res.status(400).send(
            {
                "status": 400,
                'message': "error parsing data, Request is not in a JSON Format",
                "success": true,
            })
    } else {
        next();
    }
});


app.use('/api/category', categoryRoute);


app.get('/*', (req, res) => {
    return res.status(404).send({
        "status": 404,
        'message': "unknown route",
        "success": true,
        "api v": apiVersion
    })
});

app.post('/*', (req, res) => {
    return res.status(404).send({
        "status": 404,
        'message': "unknown route",
        "success": true,
        "api v": apiVersion
    })
});

app.put('/*', (req, res) => {
    return res.status(404).send({
        "status": 404,
        'message': "unknown route",
        "success": true,
        "api v": apiVersion
    })
});

app.patch('/*', (req, res) => {
    return res.status(404).send({
        "status": 404,
        'message': "unknown route",
        "success": true,
        "api v": apiVersion
    })
});

app.delete('/*', (req, res) => {
    return res.status(404).send({
        "status": 404,
        'message': "unknown route",
        "success": true,
        "api v": apiVersion
    })
});


app.listen(port, () => {
    console.log(`App running port ${port}`);
});
