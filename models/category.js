const { mongoose } = require('../db-connection/mongodb');
let ObjectID = new mongoose.Types.ObjectId();

var Category = mongoose.model('Category', {
    title: {
        type: String,
        required: true,
        minlength: 1,
        trim: true,
        validate: async (value) => {
            return new Promise(async (resolve, reject) => {
                try {
                    const result = await Category.findOne({ title: value, status: {$ne : 0} })
                    if (result && result.status != 0) reject(new Error('Category name already exists.'));
                    else resolve(true)
                } catch (error) {
                    reject(Error(error));
                }
            });
        }
    },
    parentsCategoryID: {
        type: "ObjectID",
        default: null,
        validate: async (value = undefined) => {
            return new Promise(async (resolve, reject) => {
                if(value == undefined) resolve(true);
                try {
                    const result = await Category.findOne({ _id: value })
                    if (!result) reject(new Error('Unknown parents category.'));
                    else resolve(true)
                } catch (error) {
                    reject(Error(error));
                }
            });
        }
    }, status: {
        type: Number,  
        default: 1 // 1 = active, 2 = inactive, 3 = deleted
    }, createdAt: {
        type: Date,
        default: Date.now
    }, updatedAt: {
        type: Date,
        default: Date.now
    }
});


module.exports = { Category };


