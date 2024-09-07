const sequelize = require('../database');

// Define Product model
const Product = sequelize.define('Product', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    price: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
    }
});

module.exports = Product;
EOF

    cat > database.js <<EOFconst { Sequelize } = require('sequelize');

// Database connection
const sequelize = new Sequelize('accounting_db', 'postgres', 'your_password', {
    host: 'localhost',
    dialect: 'postgres',
});

module.exports = sequelize;
EOF
     echo "Backend setup complete."; }
# Function to setup frontend (React)
setup_frontend() {     echo "Setting up frontend..."     cd ~/accounting-inventory-system/frontend;     npx create-react-app .
    npm install axios
    mkdir -p src/components
    cat > src/components/ProductList.js <<EOFimport React, { useState, useEffect } from 'react';
import axios from 'axios';

const ProductList = () => {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        axios.get('/api/products/list')
            .then(res => setProducts(res.data))
            .catch(err => console.error(err));
    }, []);

    return (
        <div>
            <h2>Product List</h2>
            <ul>
                {products.map(product => (
                    <li key={product.id}>{product.name} - ${product.price}</li>
                ))}
            </ul>
        </div>
    );
};

export default ProductList;
EOF
     echo "Frontend setup complete."; }
# Function to setup Docker for backend and PostgreSQL
setup_docker() {     echo "Setting up Docker..."     cd ~/accounting-inventory-system
    cat > backend/Dockerfile <<EOFFROM node:14
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["node", "index.js"]
EOF

    cat > docker-compose.yml <<EOFversion: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    depends_on:
      - db
  db:
    image: postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your_password
      POSTGRES_DB: accounting_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
volumes:
  postgres_data:
EOF
     echo "Docker setup complete."; }
# Function to initialize Git, commit, and push to GitHub
initialize_git() {     echo "Initializing Git repository..."     cd ~/accounting-inventory-system
    git init
    git config user.email "allyelvis6569@gmail.com";     git config user.name "allyelvis"
    git remote add origin https://github.com/allyelvis/gcloud.git
    git add .;     git commit -m "Initial commit: Setup accounting and inventory system"
    git branch -M main;     git push -u origin main     echo "Code pushed to GitHub repository."; }
# Function to run the system
run_system() {     echo "Running the system..."
    cd ~/accounting-inventory-system;     sudo docker-compose up -d     echo "System is running."; }
# Execute all functions in order
install_dependencies
create_directories
setup_backend
setup_frontend
setup_frontend
cdd
cd
#!/bin/bash
# Function to install dependencies and handle npm errors
install_dependencies() {     echo "Installing dependencies..."
    if ! [ -x "$(command -v node)" ]; then         echo "Installing Node.js...";         curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -;         sudo apt-get install -y nodejs;     else         echo "Node.js is already installed.";     fi
    if ! [ -x "$(command -v psql)" ]; then         echo "Installing PostgreSQL...";         sudo apt-get update;         sudo apt-get install -y postgresql postgresql-contrib;     else         echo "PostgreSQL is already installed.";     fi
    if ! [ -x "$(command -v docker)" ]; then         echo "Installing Docker...";         sudo apt-get install -y docker.io;         sudo systemctl start docker;         sudo systemctl enable docker;     else         echo "Docker is already installed.";     fi
    if ! [ -x "$(command -v git)" ]; then         echo "Installing Git...";         sudo apt-get install -y git;     else         echo "Git is already installed.";     fi     echo "Dependencies installed successfully."; }
# Function to setup backend (Node.js/Express) and handle npm errors
setup_backend() {     echo "Setting up backend..."     cd ~/accounting-inventory-system/backend;     npm init -y || { echo "Failed to initialize npm. Exiting."; exit 1; }
    echo "Installing npm packages...";     npm install express pg sequelize sequelize-cli cors body-parser || { echo "Failed to install npm packages. Exiting."; exit 1; }
    echo "Generating backend files..."    
    cat > index.js <<EOFconst express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Sequelize } = require('sequelize');

// Set up Express app
const app = express();
app.use(bodyParser.json());
app.use(cors());

// Set up PostgreSQL connection
const sequelize = new Sequelize('accounting_db', 'postgres', 'your_password', {
    host: 'localhost',
    dialect: 'postgres',
});

sequelize.authenticate()
    .then(() => console.log('Database connected'))
    .catch(err => console.log('Error: ' + err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('Server is running on port', PORT);
});
EOF
     echo "Backend setup complete."; }
# Function to setup frontend (React) and handle npm errors
setup_frontend() {     echo "Setting up frontend..."     cd ~/accounting-inventory-system/frontend;     npx create-react-app . || { echo "Failed to create React app. Exiting."; exit 1; }
    npm install axios || { echo "Failed to install Axios. Exiting."; exit 1; }     echo "Frontend setup complete."; }
# Function to initialize Git and push to GitHub
initialize_git() {     echo "Initializing Git repository..."     cd ~/accounting-inventory-system;     git init     git config user.email "allyelvis6569@gmail.com";     git config user.name "allyelvis"     git remote add origin https://github.com/allyelvis/gcloud.git     git add .;     git commit -m "Initial commit: Setup accounting and inventory system";     git branch -M main;     git push -u origin main || { echo "Failed to push to GitHub. Exiting."; exit 1; }     echo "Code pushed to GitHub."; }
# Execute the functions
install_dependencies
setup_backend
setup_frontend
gcloud config set project aenz-417404
#!/bin/bash
# Function to install dependencies and handle npm errors
install_dependencies() {     echo "Installing dependencies..."
    if ! [ -x "$(command -v node)" ]; then         echo "Installing Node.js...";         curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -;         sudo apt-get install -y nodejs;     else         echo "Node.js is already installed.";     fi
    if ! [ -x "$(command -v psql)" ]; then         echo "Installing PostgreSQL...";         sudo apt-get update;         sudo apt-get install -y postgresql postgresql-contrib;     else         echo "PostgreSQL is already installed.";     fi
    if ! [ -x "$(command -v docker)" ]; then         echo "Installing Docker...";         sudo apt-get install -y docker.io;         sudo systemctl start docker;         sudo systemctl enable docker;     else         echo "Docker is already installed.";     fi
    if ! [ -x "$(command -v git)" ]; then         echo "Installing Git...";         sudo apt-get install -y git;     else         echo "Git is already installed.";     fi     echo "Dependencies installed successfully."; }
# Function to setup backend (Node.js/Express) and handle npm errors
setup_backend() {     echo "Setting up backend..."     cd ~/accounting-inventory-system/backend;     npm init -y || { echo "Failed to initialize npm. Exiting."; exit 1; }
    echo "Installing npm packages...";     npm install express pg sequelize sequelize-cli cors body-parser || { echo "Failed to install npm packages. Exiting."; exit 1; }
    echo "Generating backend files..."    
    cat > index.js <<EOFconst express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Sequelize } = require('sequelize');

// Set up Express app
const app = express();
app.use(bodyParser.json());
app.use(cors());

// Set up PostgreSQL connection
const sequelize = new Sequelize('accounting_db', 'postgres', 'your_password', {
    host: 'localhost',
    dialect: 'postgres',
});

sequelize.authenticate()
    .then(() => console.log('Database connected'))
    .catch(err => console.log('Error: ' + err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('Server is running on port', PORT);
});
EOF
     echo "Backend setup complete."; }
# Function to setup frontend (React) and handle npm errors
setup_frontend() {     echo "Setting up frontend..."     cd ~/accounting-inventory-system/frontend;     npx create-react-app . || { echo "Failed to create React app. Exiting."; exit 1; }
    npm install axios || { echo "Failed to install Axios. Exiting."; exit 1; }     echo "Frontend setup complete."; }
# Function to initialize Git and push to GitHub
initialize_git() {     echo "Initializing Git repository..."     cd ~/accounting-inventory-system;     git init     git config user.email "allyelvis6569@gmail.com";     git config user.name "allyelvis"     git remote add origin https://github.com/allyelvis/gcloud.git     git add .;     git commit -m "Initial commit: Setup accounting and inventory system";     git branch -M main;     git push -u origin main || { echo "Failed to push to GitHub. Exiting."; exit 1; }     echo "Code pushed to GitHub."; }
# Execute the functions
install_dependencies
setup_backend
setup_frontend
gcloud config set project aenz-417404
git clone https://github.com/allyelvis/gcloud.git
cd gcloud
#!/bin/bash
# Function to check and install necessary dependencies
install_dependencies() {     echo "Installing dependencies..."
    if ! [ -x "$(command -v node)" ]; then         echo "Installing Node.js...";         curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -;         sudo apt-get install -y nodejs;     else         echo "Node.js is already installed.";     fi
    if ! [ -x "$(command -v psql)" ]; then         echo "Installing PostgreSQL...";         sudo apt-get update;         sudo apt-get install -y postgresql postgresql-contrib;     else         echo "PostgreSQL is already installed.";     fi
    if ! [ -x "$(command -v docker)" ]; then         echo "Installing Docker...";         sudo apt-get install -y docker.io;         sudo systemctl start docker;         sudo systemctl enable docker;     else         echo "Docker is already installed.";     fi
    if ! [ -x "$(command -v git)" ]; then         echo "Installing Git...";         sudo apt-get install -y git;     else         echo "Git is already installed.";     fi     echo "Dependencies installed successfully."; }
# Function to create project directories
create_directories() {     echo "Creating project directories..."
    mkdir -p ~/accounting-inventory-system
    mkdir -p ~/accounting-inventory-system/backend;     mkdir -p ~/accounting-inventory-system/frontend     echo "Directories created."; }
# Function to setup backend (Node.js/Express)
setup_backend() {     echo "Setting up backend..."     cd ~/accounting-inventory-system/backend;     npm init -y
    npm install express pg sequelize sequelize-cli cors body-parser
    echo "Generating backend files..."
    cat > index.js <<EOFconst express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Sequelize } = require('sequelize');

// Set up Express app
const app = express();
app.use(bodyParser.json());
app.use(cors());

// Set up PostgreSQL connection
const sequelize = new Sequelize('accounting_db', 'postgres', 'your_password', {
    host: 'localhost',
    dialect: 'postgres',
});

sequelize.authenticate()
    .then(() => console.log('Database connected'))
    .catch(err => console.log('Error: ' + err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('Server is running on port', PORT);
});
EOF

    mkdir -p routes
    cat > routes/products.js <<EOFconst express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Add product
router.post('/add', async (req, res) => {
    const { name, price, stock } = req.body;
    try {
        const newProduct = await Product.create({ name, price, stock });
        res.json(newProduct);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all products
router.get('/list', async (req, res) => {
    try {
        const products = await Product.findAll();
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
EOF

    mkdir -p models
    cat > models/Product.js <<EOFconst { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../database');

// Define Product model
const Product = sequelize.define('Product', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    price: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
    }
});

module.exports = Product;
EOF

    cat > database.js <<EOFconst { Sequelize } = require('sequelize');

// Database connection
const sequelize = new Sequelize('accounting_db', 'postgres', 'your_password', {
    host: 'localhost',
    dialect: 'postgres',
});

module.exports = sequelize;
EOF
     echo "Backend setup complete."; }
# Function to setup frontend (React)
setup_frontend() {     echo "Setting up frontend..."     cd ~/accounting-inventory-system/frontend;     npx create-react-app .
    npm install axios
    mkdir -p src/components
    cat > src/components/ProductList.js <<EOFimport React, { useState, useEffect } from 'react';
import axios from 'axios';

const ProductList = () => {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        axios.get('/api/products/list')
            .then(res => setProducts(res.data))
            .catch(err => console.error(err));
    }, []);

    return (
        <div>
            <h2>Product List</h2>
            <ul>
                {products.map(product => (
                    <li key={product.id}>{product.name} - ${product.price}</li>
                ))}
            </ul>
        </div>
    );
};

export default ProductList;
EOF
     echo "Frontend setup complete."; }
# Function to setup Docker for backend and PostgreSQL
setup_docker() {     echo "Setting up Docker..."     cd ~/accounting-inventory-system
    cat > backend/Dockerfile <<EOFFROM node:14
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["node", "index.js"]
EOF

    cat > docker-compose.yml <<EOFversion: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    depends_on:
      - db
  db:
    image: postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your_password
      POSTGRES_DB: accounting_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
volumes:
  postgres_data:
EOF
     echo "Docker setup complete."; }
# Function to initialize Git, commit, and push to GitHub
initialize_git() {     echo "Initializing Git repository..."     cd ~/accounting-inventory-system
    git init
    git config user.email "allyelvis6569@gmail.com";     git config user.name "allyelvis"
    git remote add origin https://github.com/allyelvis/gcloud.git
    git add .;     git commit -m "Initial commit: Setup accounting and inventory system"
    git branch -M main;     git push -u origin main     echo "Code pushed to GitHub repository."; }
# Function to run the system
run_system() {     echo "Running the system..."
    cd ~/accounting-inventory-system;     sudo docker-compose up -d     echo "System is running."; }
# Execute all functions in order
install_dependencies
create_directories
setup_backend
setup_frontend
setup_frontend
setup_docker
initialize_git
ls -la
cd
cd gcloud
git push origin main
gcloud config set project aenz-417404
cd gcloud
ls -la
#!/bin/bash
# Function to check and install necessary dependencies
install_dependencies() {     echo "Installing dependencies..."
    if ! [ -x "$(command -v node)" ]; then         echo "Installing Node.js...";         curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -;         sudo apt-get install -y nodejs;     else         echo "Node.js is already installed.";     fi
    if ! [ -x "$(command -v psql)" ]; then         echo "Installing PostgreSQL...";         sudo apt-get update;         sudo apt-get install -y postgresql postgresql-contrib;     else         echo "PostgreSQL is already installed.";     fi
    if ! [ -x "$(command -v docker)" ]; then         echo "Installing Docker...";         sudo apt-get install -y docker.io;         sudo systemctl start docker;         sudo systemctl enable docker;     else         echo "Docker is already installed.";     fi
    if ! [ -x "$(command -v git)" ]; then         echo "Installing Git...";         sudo apt-get install -y git;     else         echo "Git is already installed.";     fi     echo "Dependencies installed successfully."; }
# Function to create project directories
create_directories() {     echo "Creating project directories..."
    mkdir -p ~/accounting-inventory-system
    mkdir -p ~/accounting-inventory-system/backend;     mkdir -p ~/accounting-inventory-system/frontend     echo "Directories created."; }
# Function to setup backend (Node.js/Express)
setup_backend() {     echo "Setting up backend..."     cd ~/accounting-inventory-system/backend;     npm init -y
    npm install express pg sequelize sequelize-cli cors body-parser
    echo "Generating backend files..."
    cat > index.js <<EOFconst express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Sequelize } = require('sequelize');

// Set up Express app
const app = express();
app.use(bodyParser.json());
app.use(cors());

// Set up PostgreSQL connection
const sequelize = new Sequelize('accounting_db', 'postgres', 'your_password', {
    host: 'localhost',
    dialect: 'postgres',
});

sequelize.authenticate()
    .then(() => console.log('Database connected'))
    .catch(err => console.log('Error: ' + err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('Server is running on port', PORT);
});
EOF

    mkdir -p routes
    cat > routes/products.js <<EOFconst express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Add product
router.post('/add', async (req, res) => {
    const { name, price, stock } = req.body;
    try {
        const newProduct = await Product.create({ name, price, stock });
        res.json(newProduct);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all products
router.get('/list', async (req, res) => {
    try {
        const products = await Product.findAll();
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
EOF

    mkdir -p models
    cat > models/Product.js <<EOFconst { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../database');

// Define Product model
const Product = sequelize.define('Product', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    price: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
    }
});

module.exports = Product;
EOF

    cat > database.js <<EOFconst { Sequelize } = require('sequelize');

// Database connection
const sequelize = new Sequelize('accounting_db', 'postgres', 'your_password', {
    host: 'localhost',
    dialect: 'postgres',
});

module.exports = sequelize;
EOF
     echo "Backend setup complete."; }
# Function to setup frontend (React)
setup_frontend() {     echo "Setting up frontend..."     cd ~/accounting-inventory-system/frontend;     npx create-react-app .
    npm install axios
    mkdir -p src/components
    cat > src/components/ProductList.js <<EOFimport React, { useState, useEffect } from 'react';
import axios from 'axios';

const ProductList = () => {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        axios.get('/api/products/list')
            .then(res => setProducts(res.data))
            .catch(err => console.error(err));
    }, []);

    return (
        <div>
            <h2>Product List</h2>
            <ul>
                {products.map(product => (
                    <li key={product.id}>{product.name} - ${product.price}</li>
                ))}
            </ul>
        </div>
    );
};

export default ProductList;
EOF
     echo "Frontend setup complete."; }
# Function to setup Docker for backend and PostgreSQL
setup_docker() {     echo "Setting up Docker..."     cd ~/accounting-inventory-system
    cat > backend/Dockerfile <<EOFFROM node:14
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["node", "index.js"]
EOF

    cat > docker-compose.yml <<EOFversion: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    depends_on:
      - db
  db:
    image: postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your_password
      POSTGRES_DB: accounting_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
volumes:
  postgres_data:
EOF
     echo "Docker setup complete."; }
# Function to initialize Git, commit, and push to GitHub
initialize_git() {     echo "Initializing Git repository..."     cd ~/accounting-inventory-system
    git init
    git config user.email "allyelvis6569@gmail.com";     git config user.name "allyelvis"
    git remote add origin https://github.com/allyelvis/gcloud.git
    git add .;     git commit -m "Initial commit: Setup accounting and inventory system"
    git branch -M main;     git push -u origin main     echo "Code pushed to GitHub repository."; }
# Function to run the system
run_system() {     echo "Running the system..."
    cd ~/accounting-inventory-system;     sudo docker-compose up -d     echo "System is running."; }
# Execute all functions in order
install_dependencies
create_directories
setup_backend
setup_frontend
setup_frontend
setup_docker
initialize_git
cd
cd cloud
ls -la
git push origin main
git add .
gh auth login
cd cloud
cd gcloud
git add .
git commit "gcloud"
git push origin main
#!/bin/bash
# Function to install dependencies and handle npm errors
install_dependencies() {     echo "Installing dependencies..."
    if ! [ -x "$(command -v node)" ]; then         echo "Installing Node.js...";         curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -;         sudo apt-get install -y nodejs;     else         echo "Node.js is already installed.";     fi
    if ! [ -x "$(command -v psql)" ]; then         echo "Installing PostgreSQL...";         sudo apt-get update;         sudo apt-get install -y postgresql postgresql-contrib;     else         echo "PostgreSQL is already installed.";     fi
    if ! [ -x "$(command -v docker)" ]; then         echo "Installing Docker...";         sudo apt-get install -y docker.io;         sudo systemctl start docker;         sudo systemctl enable docker;     else         echo "Docker is already installed.";     fi
    if ! [ -x "$(command -v git)" ]; then         echo "Installing Git...";         sudo apt-get install -y git;     else         echo "Git is already installed.";     fi     echo "Dependencies installed successfully."; }
# Function to setup backend (Node.js/Express) and handle npm errors
setup_backend() {     echo "Setting up backend..."     cd ~/accounting-inventory-system/backend;     npm init -y || { echo "Failed to initialize npm. Exiting."; exit 1; }
    echo "Installing npm packages...";     npm install express pg sequelize sequelize-cli cors body-parser || { echo "Failed to install npm packages. Exiting."; exit 1; }
    echo "Generating backend files..."    
    cat > index.js <<EOFconst express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Sequelize } = require('sequelize');

// Set up Express app
const app = express();
app.use(bodyParser.json());
app.use(cors());

// Set up PostgreSQL connection
const sequelize = new Sequelize('accounting_db', 'postgres', 'your_password', {
    host: 'localhost',
    dialect: 'postgres',
});

sequelize.authenticate()
    .then(() => console.log('Database connected'))
    .catch(err => console.log('Error: ' + err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('Server is running on port', PORT);
});
EOF
     echo "Backend setup complete."; }
# Function to setup frontend (React) and handle npm errors
setup_frontend() {     echo "Setting up frontend..."     cd ~/accounting-inventory-system/frontend;     npx create-react-app . || { echo "Failed to create React app. Exiting."; exit 1; }
    npm install axios || { echo "Failed to install Axios. Exiting."; exit 1; }     echo "Frontend setup complete."; }
# Function to initialize Git and push to GitHub
initialize_git() {     echo "Initializing Git repository..."     cd ~/accounting-inventory-system;     git init     git config user.email "allyelvis6569@gmail.com";     git config user.name "allyelvis"     git remote add origin https://github.com/allyelvis/gcloud.git     git add .;     git commit -m "Initial commit: Setup accounting and inventory system";     git branch -M main;     git push -u origin main || { echo "Failed to push to GitHub. Exiting."; exit 1; }     echo "Code pushed to GitHub."; }
# Execute the functions
install_dependencies
setup_backend
setup_frontend
gcloud config set project aenz-417404
cd gcloud
ls -la
#!/bin/bash
# Function to check and install necessary dependencies
install_dependencies() {     echo "Installing dependencies..."
    if ! [ -x "$(command -v node)" ]; then         echo "Installing Node.js...";         curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -;         sudo apt-get install -y nodejs;     else         echo "Node.js is already installed.";     fi
    if ! [ -x "$(command -v psql)" ]; then         echo "Installing PostgreSQL...";         sudo apt-get update;         sudo apt-get install -y postgresql postgresql-contrib;     else         echo "PostgreSQL is already installed.";     fi
    if ! [ -x "$(command -v docker)" ]; then         echo "Installing Docker...";         sudo apt-get install -y docker.io;         sudo systemctl start docker;         sudo systemctl enable docker;     else         echo "Docker is already installed.";     fi
    if ! [ -x "$(command -v git)" ]; then         echo "Installing Git...";         sudo apt-get install -y git;     else         echo "Git is already installed.";     fi     echo "Dependencies installed successfully."; }
# Function to create project directories
create_directories() {     echo "Creating project directories..."
    mkdir -p ~/accounting-inventory-system
    mkdir -p ~/accounting-inventory-system/backend;     mkdir -p ~/accounting-inventory-system/frontend     echo "Directories created."; }
# Function to setup backend (Node.js/Express)
setup_backend() {     echo "Setting up backend..."     cd ~/accounting-inventory-system/backend;     npm init -y
    npm install express pg sequelize sequelize-cli cors body-parser
    echo "Generating backend files..."
    cat > index.js <<EOFconst express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Sequelize } = require('sequelize');

// Set up Express app
const app = express();
app.use(bodyParser.json());
app.use(cors());

// Set up PostgreSQL connection
const sequelize = new Sequelize('accounting_db', 'postgres', 'your_password', {
    host: 'localhost',
    dialect: 'postgres',
});

sequelize.authenticate()
    .then(() => console.log('Database connected'))
    .catch(err => console.log('Error: ' + err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('Server is running on port', PORT);
});
EOF

    mkdir -p routes
    cat > routes/products.js <<EOFconst express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Add product
router.post('/add', async (req, res) => {
    const { name, price, stock } = req.body;
    try {
        const newProduct = await Product.create({ name, price, stock });
        res.json(newProduct);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all products
router.get('/list', async (req, res) => {
    try {
        const products = await Product.findAll();
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
EOF

    mkdir -p models
    cat > models/Product.js <<EOFconst { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../database');

// Define Product model
const Product = sequelize.define('Product', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    price: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
    }
});

module.exports = Product;
EOF

    cat > database.js <<EOFconst { Sequelize } = require('sequelize');

// Database connection
const sequelize = new Sequelize('accounting_db', 'postgres', 'your_password', {
    host: 'localhost',
    dialect: 'postgres',
});

module.exports = sequelize;
EOF
     echo "Backend setup complete."; }
# Function to setup frontend (React)
setup_frontend() {     echo "Setting up frontend..."     cd ~/accounting-inventory-system/frontend;     npx create-react-app .
    npm install axios     echo "Frontend setup complete."; }
# Function to setup Docker for backend and PostgreSQL
setup_docker() {     echo "Setting up Docker..."     cd ~/accounting-inventory-system
    cat > backend/Dockerfile <<EOFFROM node:14
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["node", "index.js"]
EOF

    cat > docker-compose.yml <<EOFversion: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    depends_on:
      - db
  db:
    image: postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your_password
      POSTGRES_DB: accounting_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
volumes:
  postgres_data:
EOF
     echo "Docker setup complete."; }
# Function to initialize Git, commit, and push to GitHub
initialize_git() {     echo "Initializing Git repository..."     cd ~/accounting-inventory-system
    git init
    git config user.email "allyelvis6569@gmail.com";     git config user.name "allyelvis"
    git remote add origin https://github.com/allyelvis/gcloud.git
    git add .;     git commit -m "Initial commit: Setup accounting and inventory system"
    git branch -M main;     git push -u origin main     echo "Code pushed to GitHub repository."; }
# Function to run the system
run_system() {     echo "Running the system..."
    cd ~/accounting-inventory-system;     sudo docker-compose up -d     echo "System is running."; }
# Execute all functions in order
install_dependencies
create_directories
setup_backend
setup_frontend
setup_docker
initialize_git
run_system
gcloud config set project aenz-417404
cd gcloud
ls -la
#!/bin/bash
# Function to check and install necessary dependencies
install_dependencies() {     echo "Installing dependencies..."
    if ! [ -x "$(command -v node)" ]; then         echo "Installing Node.js...";         curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -;         sudo apt-get install -y nodejs;     else         echo "Node.js is already installed.";     fi
    if ! [ -x "$(command -v psql)" ]; then         echo "Installing PostgreSQL...";         sudo apt-get update;         sudo apt-get install -y postgresql postgresql-contrib;     else         echo "PostgreSQL is already installed.";     fi
    if ! [ -x "$(command -v docker)" ]; then         echo "Installing Docker...";         sudo apt-get install -y docker.io;         sudo systemctl start docker;         sudo systemctl enable docker;     else         echo "Docker is already installed.";     fi
    if ! [ -x "$(command -v git)" ]; then         echo "Installing Git...";         sudo apt-get install -y git;     else         echo "Git is already installed.";     fi     echo "Dependencies installed successfully."; }
# Function to create project directories
create_directories() {     echo "Creating project directories..."
    mkdir -p ~/accounting-inventory-system
    mkdir -p ~/accounting-inventory-system/backend;     mkdir -p ~/accounting-inventory-system/frontend     echo "Directories created."; }
# Function to setup backend (Node.js/Express)
setup_backend() {     echo "Setting up backend..."     cd ~/accounting-inventory-system/backend;     npm init -y
    npm install express pg sequelize sequelize-cli cors body-parser
    echo "Generating backend files..."
    cat > index.js <<EOFconst express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Sequelize } = require('sequelize');

// Set up Express app
const app = express();
app.use(bodyParser.json());
app.use(cors());

// Set up PostgreSQL connection
const sequelize = new Sequelize('accounting_db', 'postgres', 'your_password', {
    host: 'localhost',
    dialect: 'postgres',
});

sequelize.authenticate()
    .then(() => console.log('Database connected'))
    .catch(err => console.log('Error: ' + err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('Server is running on port', PORT);
});
EOF

    mkdir -p routes
    cat > routes/products.js <<EOFconst express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Add product
router.post('/add', async (req, res) => {
    const { name, price, stock } = req.body;
    try {
        const newProduct = await Product.create({ name, price, stock });
        res.json(newProduct);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all products
router.get('/list', async (req, res) => {
    try {
        const products = await Product.findAll();
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
EOF

    mkdir -p models
    cat > models/Product.js <<EOFconst { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../database');

// Define Product model
const Product = sequelize.define('Product', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    price: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
    }
});

module.exports = Product;
EOF

    cat > database.js <<EOFconst { Sequelize } = require('sequelize');

// Database connection
const sequelize = new Sequelize('accounting_db', 'postgres', 'your_password', {
    host: 'localhost',
    dialect: 'postgres',
});

module.exports = sequelize;
EOF
     echo "Backend setup complete."; }
# Function to setup frontend (React)
setup_frontend() {     echo "Setting up frontend..."     cd ~/accounting-inventory-system/frontend;     npx create-react-app .
    npm install axios
    mkdir -p src/components
    cat > src/components/ProductList.js <<EOFimport React, { useState, useEffect } from 'react';
import axios from 'axios';

const ProductList = () => {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        axios.get('/api/products/list')
            .then(res => setProducts(res.data))
            .catch(err => console.error(err));
    }, []);

    return (
        <div>
            <h2>Product List</h2>
            <ul>
                {products.map(product => (
                    <li key={product.id}>{product.name} - ${product.price}</li>
                ))}
            </ul>
        </div>
    );
};

export default ProductList;
EOF
     echo "Frontend setup complete."; }
# Function to setup Docker for backend and PostgreSQL
setup_docker() {     echo "Setting up Docker..."     cd ~/accounting-inventory-system
    cat > backend/Dockerfile <<EOFFROM node:14
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["node", "index.js"]
EOF

    cat > docker-compose.yml <<EOFversion: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    depends_on:
      - db
  db:
    image: postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your_password
      POSTGRES_DB: accounting_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
volumes:
  postgres_data:
EOF
     echo "Docker setup complete."; }
# Function to initialize Git, commit, and push to GitHub
initialize_git() {     echo "Initializing Git repository..."     cd ~/accounting-inventory-system
    git init
    git config user.email "allyelvis6569@gmail.com";     git config user.name "allyelvis"
    git remote add origin https://github.com/allyelvis/gcloud.git
    git add .;     git commit -m "Initial commit: Setup accounting and inventory system"
    git branch -M main;     git push -u origin main     echo "Code pushed to GitHub repository."; }
# Function to run the system
run_system() {     echo "Running the system..."
    cd ~/accounting-inventory-system;     sudo docker-compose up -d     echo "System is running."; }
# Execute all functions in order
install_dependencies
create_directories
setup_backend
setup_frontend
setup_frontend
setup_docker
initialize_git
run_system
cd
cd gcloud
ls -la
git init
git add .
git commit -m "init"
git config --global user.name "allyelvis"
git config --global user.email "allyelvis6569@gmail.com"
git push origin main
ls -la
cd
git config --global user.name "allyelvis"
git config --global user.email "allyelvis6569@gmail.com"
git push origin main
git add .
git commit -m "init"
git push origin main
git init
