const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Connect to MongoDB database ---
// ⚠️ IMPORTANT: Replace this URI with your own MongoDB Atlas connection string.
const MONGODB_URI = 'mongodb+srv://elielishammah81_db_user:712781Elijah@cluster0.wauu1po.mongodb.net/?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB database!'))
    .catch(err => console.error('Could not connect to database:', err));

// Define the schema (the blueprint for a product)
const ProductSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    images: { type: [String], required: true }
});

const Product = mongoose.model('Product', ProductSchema);

// Create 'uploads' directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Set up storage for uploaded files using Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Serve static files from the project root and the 'uploads' folder
app.use(express.static(path.join(__dirname, '/')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API endpoint to get all products from the database
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find({});
        res.json(products);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch products.' });
    }
});

// API endpoint to add a new product to the database
app.post('/api/products', upload.array('images', 5), async (req, res) => {
    try {
        const newProduct = new Product({
            id: req.body.id,
            name: req.body.name,
            price: parseFloat(req.body.price),
            category: req.body.category,
            description: req.body.description,
            images: req.files.map(file => `/uploads/${file.filename}`)
        });
        await newProduct.save();
        res.status(201).json({ success: true, message: 'Product added successfully!' });
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ success: false, message: 'Failed to add product: ' + error.message });
    }
});

// API endpoint to delete a product from the database
app.delete('/api/products/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        const deletedProduct = await Product.findOneAndDelete({ id: productId });

        if (!deletedProduct) {
            return res.status(404).json({ success: false, message: 'Product not found.' });
        }
        
        // Delete the associated image files
        deletedProduct.images.forEach(imagePath => {
            const filePath = path.join(__dirname, imagePath);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });

        res.json({ success: true, message: 'Product deleted successfully.' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ success: false, message: 'Failed to delete product.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
