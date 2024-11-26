#!/bin/bash

# Variables
PROJECT_NAME="washing_machine_ai"
PYPI_REPO="pypi" # Use 'testpypi' for testing
AUTHOR_NAME="Ally Elvis Nzeyimana"
AUTHOR_EMAIL="allyelvis6569@gmail.com"
VERSION="0.1.0"
DESCRIPTION="An AI-powered washing machine control software with cycle recommendations and voice control."
NPM_PACKAGE_NAME="washing-machine-ai"

# Step 1: Create Project Structure
echo "Creating project structure..."
mkdir -p $PROJECT_NAME
cd $PROJECT_NAME
mkdir -p src tests

# Step 2: Generate Python Script
echo "Generating Python software..."
cat <<EOL > src/${PROJECT_NAME}.py
# Washing Machine AI Software
# Auto-generated
import time
from sklearn.neighbors import KNeighborsClassifier
import numpy as np
import speech_recognition as sr

class WashingMachineAI:
    # AI-powered washing machine class
    # [Implementation omitted for brevity, refer to Python code provided earlier]
    pass

if __name__ == "__main__":
    machine = WashingMachineAI()
    machine.run()
EOL

# Step 3: Generate Setup Files for PyPI
echo "Creating setup files for PyPI..."
cat <<EOL > setup.py
from setuptools import setup, find_packages

setup(
    name="$PROJECT_NAME",
    version="$VERSION",
    author="$AUTHOR_NAME",
    author_email="$AUTHOR_EMAIL",
    description="$DESCRIPTION",
    packages=find_packages(),
    install_requires=[
        "scikit-learn",
        "SpeechRecognition"
    ],
    entry_points={
        'console_scripts': [
            '${PROJECT_NAME}=src.${PROJECT_NAME}:main',
        ]
    },
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires='>=3.6',
)
EOL

echo "from src.${PROJECT_NAME} import *" > src/__init__.py

# Step 4: Create requirements file
echo "Creating requirements.txt..."
cat <<EOL > requirements.txt
scikit-learn
SpeechRecognition
EOL

# Step 5: Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Step 6: Build the package
echo "Building the package..."
python setup.py sdist bdist_wheel

# Step 7: Upload to PyPI
echo "Publishing to PyPI..."
pip install twine
twine upload dist/* -r $PYPI_REPO

# Step 8: Optional - Create NPM Package
echo "Creating package.json for npm..."
cat <<EOL > package.json
{
  "name": "$NPM_PACKAGE_NAME",
  "version": "$VERSION",
  "description": "$DESCRIPTION",
  "main": "index.js",
  "scripts": {
    "start": "python src/${PROJECT_NAME}.py"
  },
  "keywords": ["washing-machine", "AI", "machine-learning", "voice-control"],
  "author": "$AUTHOR_NAME <$AUTHOR_EMAIL>",
  "license": "MIT",
  "dependencies": {}
}
EOL

echo "Creating NPM wrapper script..."
cat <<EOL > index.js
const { exec } = require("child_process");
exec("python src/${PROJECT_NAME}.py", (error, stdout, stderr) => {
  if (error) {
    console.error(\`Error: \${error.message}\`);
    return;
  }
  if (stderr) {
    console.error(\`Stderr: \${stderr}\`);
    return;
  }
  console.log(stdout);
});
EOL

echo "Publishing to npm..."
npm install
npm publish

echo "All steps completed!"