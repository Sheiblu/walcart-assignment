
const express = require("express");
const isEmpty = require("is-empty");
const router = express.Router();

var { Category } = require('../models/category');
const { client } = require('../db-connection/redis');
const { ObjectID } = require('mongodb');


router.get('/list', async (req, res) => {
    try {
        let categoryList = await Category.find({ status: 1, parentsCategoryID: null });
        categoryList = await getChildCategory(categoryList); // get child category

        return res.status(200).send({
            "success": true,
            "status": 200,
            "message": "category list.",
            "data": categoryList
        });

    } catch (error) {
        return res.status(500).send({
            "success": false,
            "status": 500,
            "message": "Internal server error.",
        });
    }
});

router.post('/add', async (req, res) => {
    var category = new Category({
        title: req.body.title,
        parentsCategoryID: req.body.parents_cat_id,
        createdAt: new Date()
    });

    try {
        let result = await category.save();

        return res.status(201).send({
            "success": true,
            "status": 201,
            "message": "category added.",
            "data": result
        });

    } catch (error) {
        // if get error from mongoose, return error message
        const errorLength = Object.keys(error.errors).length;
        const errorKeys = Object.keys(error.errors);
        var errorMessage = "";

        for (let index = 0; index < errorLength; index++) {
            errorMessage += error.errors[errorKeys[index]].message + " ";
        }

        return res.status(400).send({
            "success": false,
            "status": 400,
            "message": errorMessage
        });
    }

});

router.get('/search/:value', async (req, res) => {
    var value = req.params.value;
    let data = await getCashCategoryDetailByTitle(value);

    try {
        if (isEmpty(data)) {  // if cache data is empty, then search from mongoDb
            data = await Category.findOne({ title: value, status: { $eq: 1 } });

            if (isEmpty(data)) {
                return res.status(404).send({
                    "success": true,
                    "status": 404,
                    "message": "category not found."
                });
            } else if (data.parentsCategoryID != null) {
                data.parentsCategoryDetails = await Category.findOne({ _id: data.parentsCategoryID });
            }

            data = {
                ...data._doc, "parentsCategoryDetails": data.parentsCategoryDetails === undefined ? null : data.parentsCategoryDetails
            }
            
            setCashCategoryDetail(data.title, data);
        }

        return res.status(200).send({
            "success": true,
            "status": 200,
            "message": "category found.",
            "data": data
        });

    } catch (error) {
        return res.status(500).send({
            "success": true,
            "status": 500,
            "message": "Internal server error" + error
        });
    }

});

router.put('/update', async (req, res) => {
    var id = req.body.id;

    let body = {
        title: req.body.title,
        parentsCategoryID: req.body.parents_cat_id
    }

    if (!ObjectID.isValid(id)) {
        return res.status(400).send({
            "success": true,
            "status": 400,
            "message": "Unknown category id."
        });
    } else if (body.parentsCategoryID == id) {
        return res.status(400).send({
            "success": true,
            "status": 400,
            "message": "Category id and parents_cat_id can not be same."
        });
    }


    try {
        let data = await Category.find({ _id: id });

        if (isEmpty(data)) {
            return res.status(404).send({
                "success": true,
                "status": 404,
                "message": "category not found."
            });
        } else {
            if (data[0].title == body.title || body.title === undefined) {
                delete body.title;
            }

            if ( body.parentsCategoryID === undefined) {
                delete body.parentsCategoryID;
            }

            if (Object.keys(body).length < 1) {
                return res.status(400).send({
                    "success": true,
                    "status": 400,
                    "message": "Nothing to update."
                });
            }
        }


        body.updatedAt = new Date();
        let result = await Category.findOneAndUpdate({ _id: id }, { $set: body }, { new: true, runValidators: true });

        deleteCashCategoryDetails(data[0].title); // remove old cache data

        return res.status(200).send({
            "success": true,
            "status": 200,
            "message": "category title updated.",
            "data": result
        });

    } catch (error) {

        const errorLength = Object.keys(error.errors).length;
        const errorKeys = Object.keys(error.errors);
        var errorMessage = "";

        for (let index = 0; index < errorLength; index++) {
            errorMessage += error.errors[errorKeys[index]].message + " ";
        }

        return res.status(402).send({
            "success": false,
            "status": 402,
            "message": errorMessage
        });
    }

});

router.put('/change-status', async (req, res) => {
    var id = req.body.id;

    if (!ObjectID.isValid(id)) {
        return res.status(404).send({
            "success": true,
            "status": 400,
            "message": "Unknown category id."
        });
    }


    try {
        let data = await Category.find({ _id: id, status: { $ne: 0 } });

        if (isEmpty(data)) {
            return res.status(404).send({
                "success": true,
                "status": 404,
                "message": "category not found."
            });
        }


        let newStatus = data[0].status == 1 ? 2 : 1;
        let result = await Category.findOneAndUpdate({ _id: id }, { $set: { status: newStatus, updatedAt: new Date() } }, { new: true, runValidators: true });
        
        deleteCashCategoryDetails(result.title); // remove old cache data
        changeChildCategoryStatus(id, newStatus);

        return res.status(200).send({
            "success": true,
            "status": 200,
            "message": "category title updated.",
            "data": result
        });

    } catch (error) {

        const errorLength = Object.keys(error.errors).length;
        const errorKeys = Object.keys(error.errors);
        var errorMessage = "";

        for (let index = 0; index < errorLength; index++) {
            errorMessage += error.errors[errorKeys[index]].message + " ";
        }

        return res.status(400).send({
            "success": false,
            "status": 400,
            "message": errorMessage
        });
    }

});

router.put('/delete', async (req, res) => {
    var id = req.body.id;

    if (!ObjectID.isValid(id)) {
        return res.status(400).send({
            "success": true,
            "status": 400,
            "message": "Unknown category id."
        });
    }

    
    try {

        let data = await Category.find({ _id: id, status: { $ne: 0 } });

        if (isEmpty(data)) {
            return res.status(404).send({
                "success": true,
                "status": 404,
                "message": "category not found."
            });
        }

        let result = await Category.findOneAndUpdate({ _id: id }, { $set: { status: 0, updatedAt: new Date() } }, { new: true, runValidators: true });
        
        deleteCashCategoryDetails(data[0].title); // remove old cache data
        changeChildCategoryStatus(id, 0);

        return res.status(200).send({
            "success": true,
            "status": 200,
            "message": "category title updated.",
            "data": result
        });

    } catch (error) {

        const errorLength = Object.keys(error.errors).length;
        const errorKeys = Object.keys(error.errors);
        var errorMessage = "";

        for (let index = 0; index < errorLength; index++) {
            errorMessage += error.errors[errorKeys[index]].message + " ";
        }

        return res.status(400).send({
            "success": false,
            "status": 400,
            "message": errorMessage
        });
    }

});

async function getChildCategory(categoryList) {
    return new Promise(async (resolve, reject) => {
        try {
            let index = 0;
            while (categoryList.length > index) {
                const category = categoryList[index];
                let childrenCategory = await Category.find({ status: 1, parentsCategoryID: category._id });
                categoryList[index]._doc.childrenCategory = childrenCategory;
                index++;

                await getChildCategory(childrenCategory);
            }
            resolve(categoryList);
        } catch (error) {
            resolve([]);
        }
    });
}

async function changeChildCategoryStatus(parentCatId, newStatus = 1) {
    return new Promise(async (resolve, reject) => {
        try {
            let categoryList = await Category.find({ parentsCategoryID: parentCatId, status: { $ne: 0 } });
            let index = 0;

            while (categoryList.length > index) {

                deleteCashCategoryDetails(categoryList[index].title); // remove old cache data
                
                await Category.updateMany({ parentsCategoryID: parentCatId, status: { $ne: 0 } }, { status: newStatus, updatedAt: new Date() });
                await changeChildCategoryStatus(categoryList[index]._id, newStatus);
                index++;
            }

            resolve([]);

        } catch (error) {
            resolve([]);
        }
    });
}

async function getCashCategoryDetailByTitle(title = "") {
    return new Promise(async (resolve, reject) => {
        try {
            client.get("category-" + title, (err, data) => {
                if (err) {
                    console.log(err)
                }

                if (data !== null) {
                    console.log("cash category detail found");
                    resolve(JSON.parse(data));
                } else {
                    resolve([]);
                }
            });
        } catch (error) {
            resolve([]);
        }
    });
}

function setCashCategoryDetail(title = "", data = {}) {
    client.set("category-" + title, JSON.stringify(data));
};

function deleteCashCategoryDetails(title = "") {
    client.del("category-" + title);
};




module.exports = router;