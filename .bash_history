NC='\033[0m' # No Color
echo -e "${GREEN}Starting setup for $PROJECT_NAME...${NC}"
# Step 1: Install Dependencies
echo -e "${GREEN}Step 1: Installing system dependencies...${NC}"
sudo apt update
#!/bin/bash
# Define variables
DIRECTORY_PATH="dcqacj/home/"  # Change this to your desired directory path
PERMISSIONS=755                      # Define the desired permissions (755 is common for web directories)
# Check if the directory already exists
if [ -d "$DIRECTORY_PATH" ]; then   echo "Directory already exists: $DIRECTORY_PATH"; else
  mkdir -p "$DIRECTORY_PATH";   if [ $? -eq 0 ]; then     echo "Directory created successfully: $DIRECTORY_PATH"    
    chmod $PERMISSIONS "$DIRECTORY_PATH";     if [ $? -eq 0 ]; then       echo "Permissions set to $PERMISSIONS for $DIRECTORY_PATH";     else       echo "Failed to set permissions on $DIRECTORY_PATH";     fi   else     echo "Failed to create directory: $DIRECTORY_PATH";     exit 1;   fi; fi
# Verify directory creation
if [ -d "$DIRECTORY_PATH" ]; then   echo "Verification successful: Directory exists."; else   echo "Verification failed: Directory does not exist.";   exit 1; fi
ls -la
cd dcqacj/home/aenzbi.bi
cd aenzbi.bi
cd home
cd
#!/bin/bash
# Define variables
DIRECTORY_PATH="/path/to/directory"  # Change this to your desired directory path
PERMISSIONS=755                      # Define the desired permissions (755 is common for web directories)
# Check if the directory already exists
if [ -d "$DIRECTORY_PATH" ]; then   echo "Directory already exists: $DIRECTORY_PATH"; else
  mkdir -p "$DIRECTORY_PATH";   if [ $? -eq 0 ]; then     echo "Directory created successfully: $DIRECTORY_PATH"    
    chmod $PERMISSIONS "$DIRECTORY_PATH";     if [ $? -eq 0 ]; then       echo "Permissions set to $PERMISSIONS for $DIRECTORY_PATH";     else       echo "Failed to set permissions on $DIRECTORY_PATH";     fi   else     echo "Failed to create directory: $DIRECTORY_PATH";     exit 1;   fi; fi
#!/bin/bash
# Define variables
DIRECTORY_PATH="/path/to/directory"  # Change this to your desired directory path
PERMISSIONS=755                      # Define the desired permissions (755 is common for web directories)
# Check if the directory already exists
if [ -d "$DIRECTORY_PATH" ]; then   echo "Directory already exists: $DIRECTORY_PATH"; else
  mkdir -p "$DIRECTORY_PATH";   if [ $? -eq 0 ]; then     echo "Directory created successfully: $DIRECTORY_PATH"    
    chmod $PERMISSIONS "$DIRECTORY_PATH";     if [ $? -eq 0 ]; then       echo "Permissions set to $PERMISSIONS for $DIRECTORY_PATH";     else       echo "Failed to set permissions on $DIRECTORY_PATH";     fi   else     echo "Failed to create directory: $DIRECTORY_PATH";     exit 1;   fi; fi
#!/bin/bash
# Check if the script is run with root privileges
if [ "$EUID" -ne 0 ]; then   echo "Please run as root or with sudo.";   exit 1; fi
#!/bin/bash
# Function to check if a package is installed and install if missing
check_and_install() {   package=$1;   if ! dpkg -s $package &> /dev/null; then     echo "$package is not installed. Installing...";     sudo apt-get update;     sudo apt-get install -y $package || handle_error "Failed to install $package";     echo "$package installed successfully.";   else     echo "$package is already installed.";   fi; }
# Function to check if sudo is installed and install it if necessary
check_sudo() {   if ! command -v sudo &> /dev/null; then     echo "sudo is not installed. Installing sudo...";     apt-get update;     apt-get install -y sudo || { echo "Failed to install sudo. Please install it manually."; exit 1; };     echo "sudo installed successfully.";   else     echo "sudo is already installed.";   fi; }
# Function to generate the Python script
generate_python_script() {   echo "Generating Python script...";   python_script="app/main.py"
  cat > $python_script <<EOL# Demo Python Script
def main():
    print("Hello, this is a demo Python script.")

if __name__ == "__main__":
    main()
EOL
   echo "Python script created at $python_script"; }
# Function to generate HTML file
generate_html() {   echo "Generating HTML file...";   html_file="app/index.html"
  cat > $html_file <<EOL<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="styles.css">
    <title>Demo Page</title>
</head>
<body>
    <h1>Hello from the Demo Page!</h1>
    <p>This is a simple HTML file.</p>
    <script src="script.js"></script>
</body>
</html>
EOL
   echo "HTML file created at $html_file"; }
# Function to generate CSS file
generate_css() {   echo "Generating CSS file...";   css_file="app/styles.css"
  cat > $css_file <<EOL/* Demo CSS File */
body {
    font-family: Arial, sans-serif;
    background-color: #f0f0f0;
    color: #333;
}

h1 {
    color: #2c3e50;
}
EOL
   echo "CSS file created at $css_file"; }
# Function to generate JavaScript file
generate_js() {   echo "Generating JavaScript file...";   js_file="app/script.js"
  cat > $js_file <<EOL// Demo JavaScript File
document.addEventListener("DOMContentLoaded", () => {
    console.log("JavaScript loaded and running.");
});
EOL
   echo "JavaScript file created at $js_file"; }
# Function to generate a README file
generate_readme() {   echo "Generating README file...";   readme_file="app/README.md"
  cat > $readme_file <<EOL# Demo Project

This is a demo project with the following components:
- **Python Script:** \`main.py\`
- **HTML File:** \`index.html\`
- **CSS File:** \`styles.css\`
- **JavaScript File:** \`script.js\`

## How to Run
1. Run the Python script:
    \`\`\`bash
    python3 main.py
    \`\`\`

2. Open the \`index.html\` file in your web browser.

EOL
   echo "README file created at $readme_file"; }
# Function to handle errors
handle_error() {   echo "An error occurred: $1";   exit 1; }
# Function to create app directory structure
create_app_structure() {   echo "Creating app directory structure...";   mkdir -p app/lib/modules;   echo "App structure created."; }
# Function to install necessary dependencies
install_dependencies() {
  check_sudo   echo "Checking and installing necessary dependencies...";   check_and_install python3;   check_and_install python3-pip;   check_and_install ffmpeg; }
# Main function
main() {
  create_app_structure || handle_error "Failed to create app structure"
  install_dependencies || handle_error "Failed to install dependencies"
  generate_python_script || handle_error "Failed to generate Python script";   generate_html || handle_error "Failed to generate HTML file";   generate_css || handle_error "Failed to generate CSS file";   generate_js || handle_error "Failed to generate JavaScript file";   generate_readme || handle_error "Failed to generate README file"   echo "All files generated successfully!"; }
# Call the main function
main
ls -la
#!/bin/bash
# Exit script on any error
set -e
# Create necessary directories and files for the Aenzbi App
echo "Generating application files..."
# Create application directory
APP_DIR="aenzbi_app"
mkdir -p $APP_DIR
# Move into the application directory
cd $APP_DIR
# Create app.py
cat <<EOL > app.py
from flask import Flask, request, jsonify
import moviepy.editor as mp
import tensorflow as tf
import os

app = Flask(__name__)

@app.route('/generate', methods=['POST'])
def generate_content():
    data = request.json
    script = data.get('script')
    
    # Example logic for video generation
    video_clip_path = generate_video_from_script(script)
    song_path = generate_music_from_script(script)
    
    return jsonify({
        'video_clip': video_clip_path,
        'song': song_path
    })

def generate_video_from_script(script):
    # Placeholder function to simulate video generation
    # Use moviepy or other libraries to generate the video
    video_path = 'output_video.mp4'
    # Example: create a video clip with moviepy
    clip = mp.TextClip(script, fontsize=70, color='white')
    clip = clip.set_duration(10)
    clip.write_videofile(video_path, fps=24)
    return video_path

def generate_music_from_script(script):
    # Placeholder function to simulate music generation
    # Use TensorFlow or other libraries to generate music
    song_path = 'output_song.mp3'
    # Example: create a dummy music file
    with open(song_path, 'w') as f:
        f.write("Generated music based on script")
    return song_path

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
EOL

# Create requirements.txt
cat <<EOL > requirements.txt
flask
moviepy
tensorflow
EOL

# Create Dockerfile
cat <<EOL > Dockerfile
# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Define environment variable
ENV NAME AenzbiApp

# Run app.py when the container launches
CMD ["python", "app.py"]
EOL

# (Optional) Create docker-compose.yml
cat <<EOL > docker-compose.yml
version: '3'
services:
  aenzbiapp:
    build: .
    ports:
      - "8000:8000"
    environment:
      - NAME=AenzbiApp
EOL

# Go back to the parent directory
cd ..
# Define image and container names
IMAGE_NAME="aenzbiapp"
CONTAINER_NAME="aenzbiapp_container"
# Build Docker image
echo "Building Docker image..."
docker build -t $IMAGE_NAME ./$APP_DIR
# Stop and remove any existing container
if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then     echo "Stopping running container...";     docker stop $CONTAINER_NAME; fi
if [ "$(docker ps -a -q -f name=$CONTAINER_NAME)" ]; then     echo "Removing existing container...";     docker rm $CONTAINER_NAME; fi
# Run Docker container
echo "Running Docker container..."
docker run -d -p 8000:8000 --name $CONTAINER_NAME $IMAGE_NAME
# Confirm container is running
echo "Container is running. Access the app at http://localhost:8000"
docker --debug
#!/bin/bash
# Project and domain information
PROJECT_ID="aenzbi-idle"
DOMAIN="aenzbi.io"
APP_NAME="aenzbi-app"
SERVICE_NAME="backend-service"
REGION="us-central1"
DNS_ZONE_NAME="aenzbi-zone"
# Check for required tools
command -v gcloud >/dev/null 2>&1 || { echo >&2 "Google Cloud SDK required but not installed. Aborting."; exit 1; }
# Enable necessary Google Cloud services
echo "Enabling required Google Cloud services..."
gcloud services enable compute.googleapis.com     appengine.googleapis.com     run.googleapis.com     dns.googleapis.com     cloudbuild.googleapis.com     containerregistry.googleapis.com
#!/bin/bash
# Project and domain information
PROJECT_ID="aenzbi-idle"
DOMAIN="aenzbi.io"
APP_NAME="aenzbi-app"
SERVICE_NAME="backend-service"
REGION="us-central1"
ZONE="us-central1-a"
DNS_ZONE_NAME="aenzbi-zone"
# Check for required tools
command -v gcloud >/dev/null 2>&1 || { echo >&2 "Google Cloud SDK required but not installed. Aborting."; exit 1; }
# Enable necessary Google Cloud services
echo "Enabling required Google Cloud services..."
gcloud services enable compute.googleapis.com     appengine.googleapis.com     run.googleapis.com     dns.googleapis.com     cloudbuild.googleapis.com     containerregistry.googleapis.com
# Set project and region
gcloud config set project $PROJECT_ID
gcloud config set compute/region $REGION
# Create App Engine
echo "Creating App Engine..."
gcloud app create --region=$REGION
# Create Cloud DNS zone for your domain
if gcloud dns managed-zones describe $DNS_ZONE_NAME >/dev/null 2>&1; then     echo "DNS zone $DNS_ZONE_NAME already exists, skipping creation."; else     echo "Creating Cloud DNS zone...";     gcloud dns managed-zones create $DNS_ZONE_NAME         --description="DNS zone for $DOMAIN"         --dns-name="$DOMAIN"; fi
# Fetch nameservers and instruct user to update domain registrar
echo "Fetching Cloud DNS nameservers..."
gcloud dns managed-zones describe $DNS_ZONE_NAME --format="get(nameServers)"
echo "Please update your domain registrar with the above nameservers to point to Google Cloud DNS."
# Set up an App Engine app (Next.js or static app)
echo "Deploying the App Engine app..."
cat > app.yaml <<EOL
runtime: nodejs16
instance_class: F2
automatic_scaling:
  target_cpu_utilization: 0.65
  min_instances: 1
  max_instances: 5

handlers:
- url: /.*
  secure: always
  script: auto
EOL

# Deploy the app to App Engine
gcloud app deploy app.yaml --quiet
# Cloud Run Backend Service Deployment
echo "Deploying backend service to Cloud Run..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME
gcloud run deploy $SERVICE_NAME     --image gcr.io/$PROJECT_ID/$SERVICE_NAME     --platform managed     --region $REGION     --allow-unauthenticated
# Map the App Engine service to the domain
echo "Mapping App Engine service to $DOMAIN..."
gcloud app domain-mappings create $DOMAIN
# Get SSL certificates
echo "Setting up managed SSL for $DOMAIN..."
gcloud app ssl-certificates create --display-name="aenzbi-ssl" --domains=$DOMAIN
# Get the CNAME record for App Engine
APP_CNAME=$(gcloud app describe --format="get(defaultHostname)")
# Add a CNAME record to the DNS
gcloud dns record-sets transaction start --zone=$DNS_ZONE_NAME
gcloud dns record-sets transaction add $APP_CNAME     --name=$DOMAIN.     --ttl=300     --type=CNAME     --zone=$DNS_ZONE_NAME
gcloud dns record-sets transaction execute --zone=$DNS_ZONE_NAME
# Compute Engine Setup
echo "Setting up Compute Engine for flexibility..."
gcloud compute instances create "aenzbi-vm"     --zone "$ZONE"     --machine-type "e2-medium"     --image-family "debian-10"     --image-project "debian-cloud"     --tags http-server,https-server     --boot-disk-size "10GB"     --boot-disk-type "pd-balanced"
echo "Compute Engine VM created."
# Allow HTTP and HTTPS traffic
gcloud compute firewall-rules create default-allow-http --allow tcp:80 --quiet
gcloud compute firewall-rules create default-allow-https --allow tcp:443 --quiet
# Instructions for user
echo "Deployment complete."
echo "Please make sure your domain is updated with the Cloud DNS nameservers."
echo "App Engine and Cloud Run services are up and running."
echo "Compute Engine VM created for flexibility."
ls -la
sudo apt-get install ffmpeg
pip install gtts
ls -la
#!/bin/bash
# Define variables
PROJECT_NAME="Echoes_of_Innovation"
SCRIPT_FILE="${PROJECT_NAME}_cinema_script.txt"
AUDIO_FILE="voiceover.mp3"
VIDEO_FILE="promo_video.mp4"
TEXT_FILE="${PROJECT_NAME}_promo_script.txt"
IMAGE_FILE="background_image.jpg"
MUSIC_FILE="background_music.mp3"
TEXT_OVERLAY_FILE="text_overlay.mp4"
FINAL_VIDEO_FILE="final_${VIDEO_FILE}"
# Check if necessary files exist
if [ ! -f "$SCRIPT_FILE" ] || [ ! -f "$IMAGE_FILE" ] || [ ! -f "$MUSIC_FILE" ] || [ ! -f "$TEXT_FILE" ]; then     echo "Required files are missing!";     exit 1; fi
sudo apt-get install ffmpeg
pip install gtts
#!/bin/bash
# Define variables
PROJECT_NAME="Echoes_of_Innovation"
SCRIPT_FILE="${PROJECT_NAME}_cinema_script.txt"
AUDIO_FILE="voiceover.mp3"
VIDEO_FILE="promo_video.mp4"
TEXT_FILE="${PROJECT_NAME}_promo_script.txt"
IMAGE_FILE="background_image.jpg"
MUSIC_FILE="background_music.mp3"
TEXT_OVERLAY_FILE="text_overlay.mp4"
FINAL_VIDEO_FILE="final_${VIDEO_FILE}"
# Check if necessary files exist
if [ ! -f "$SCRIPT_FILE" ] || [ ! -f "$IMAGE_FILE" ] || [ ! -f "$MUSIC_FILE" ] || [ ! -f "$TEXT_FILE" ]; then     echo "Required files are missing!";     exit 1; fi
#!/bin/bash
# Define variables
IMAGES=("futuristic_metropolis.jpg" "ancient_vault.jpg" "ally_character.jpg" "emilia_character.jpg" "victor_character.jpg")
VOICEOVER="voiceover.mp3"
FINAL_VIDEO="final_video.mp4"
TEMP_VIDEO="temp_video.mp4"
# Create a temporary video with images
echo "Creating temporary video from images..."
ffmpeg -loop 1 -i "${IMAGES[0]}" -loop 1 -i "${IMAGES[1]}" -loop 1 -i "${IMAGES[2]}" -loop 1 -i "${IMAGES[3]}" -loop 1 -i "${IMAGES[4]}" -filter_complex "[0:v]trim=duration=10[v0];[1:v]trim=duration=10[v1];[2:v]trim=duration=10[v2];[3:v]trim=duration=10[v3];[4:v]trim=duration=10[v4];[v0][v1][v2][v3][v4]concat=n=5:v=1:a=0" -c:v libx264 -pix_fmt yuv420p "$TEMP_VIDEO"
# Combine the temporary video with voiceover
echo "Combining video with voiceover..."
ffmpeg -i "$TEMP_VIDEO" -i "$VOICEOVER" -c:v copy -c:a aac -b:a 192k "$FINAL_VIDEO"
# Clean up
rm "$TEMP_VIDEO"
echo "Video created successfully: $FINAL_VIDEO"
chmod +x create_video_with_dalle_images.sh
./create_video_with_dalle_images.sh
#!/bin/bash
# Define variables
IMAGES=("futuristic_metropolis.jpg" "ancient_vault.jpg" "ally_character.jpg" "emilia_character.jpg" "victor_character.jpg")
VOICEOVER="voiceover.mp3"
FINAL_VIDEO="final_video.mp4"
TEMP_VIDEO="temp_video.mp4"
TEXT_OVERLAY="text_overlay.mp4"
SCRIPT_FILE="video_script.txt"
MUSIC_FILE="background_music.mp3"
# Create a text overlay video from the script
echo "Generating text overlay video..."
ffmpeg -f lavfi -i color=c=black:s=1280x720:d=30 -vf "drawtext=textfile=$SCRIPT_FILE:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:fontcolor=white:fontsize=36:x=(w-text_w)/2:y=(h-text_h)/2" -t 30 "$TEXT_OVERLAY"
# Create a temporary video with images
echo "Creating temporary video from images..."
ffmpeg -loop 1 -i "${IMAGES[0]}" -loop 1 -i "${IMAGES[1]}" -loop 1 -i "${IMAGES[2]}" -loop 1 -i "${IMAGES[3]}" -loop 1 -i "${IMAGES[4]}" -filter_complex "[0:v]trim=duration=10[v0];[1:v]trim=duration=10[v1];[2:v]trim=duration=10[v2];[3:v]trim=duration=10[v3];[4:v]trim=duration=10[v4];[v0][v1][v2][v3][v4]concat=n=5:v=1:a=0" -c:v libx264 -pix_fmt yuv420p "$TEMP_VIDEO"
# Combine the temporary video with voiceover and text overlay
echo "Combining video with voiceover and text overlay..."
ffmpeg -i "$TEMP_VIDEO" -i "$VOICEOVER" -i "$TEXT_OVERLAY" -filter_complex "[0:v][2:v]overlay=0:0" -c:v libx264 -c:a aac -b:a 192k -shortest "$FINAL_VIDEO"
# Add background music to the final video
echo "Adding background music..."
ffmpeg -i "$FINAL_VIDEO" -i "$MUSIC_FILE" -filter_complex "[0:a][1:a]amix=inputs=2:duration=longest" -c:v copy -c:a aac -b:a 192k "$FINAL_VIDEO"
# Clean up
rm "$TEMP_VIDEO"
rm "$TEXT_OVERLAY"
echo "Video created successfully: $FINAL_VIDEO"
ls -la
#!/bin/bash
# Define variables
IMAGES=("futuristic_metropolis.jpg" "ancient_vault.jpg" "ally_character.jpg" "emilia_character.jpg" "victor_character.jpg")
VOICEOVER="voiceover.mp3"
FINAL_VIDEO="final_video.mp4"
TEMP_VIDEO="temp_video.mp4"
TEXT_OVERLAY="text_overlay.mp4"
SCRIPT_FILE="video_script.txt"
MUSIC_FILE="background_music.mp3"
# Create a text overlay video from the script
echo "Generating text overlay video..."
ffmpeg -f lavfi -i color=c=black:s=1280x720:d=30 -vf "drawtext=textfile=$SCRIPT_FILE:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:fontcolor=white:fontsize=36:x=(w-text_w)/2:y=(h-text_h)/2" -t 30 "$TEXT_OVERLAY"
# Create a temporary video with images
echo "Creating temporary video from images..."
ffmpeg -loop 1 -i "${IMAGES[0]}" -loop 1 -i "${IMAGES[1]}" -loop 1 -i "${IMAGES[2]}" -loop 1 -i "${IMAGES[3]}" -loop 1 -i "${IMAGES[4]}" -filter_complex "[0:v]trim=duration=10[v0];[1:v]trim=duration=10[v1];[2:v]trim=duration=10[v2];[3:v]trim=duration=10[v3];[4:v]trim=duration=10[v4];[v0][v1][v2][v3][v4]concat=n=5:v=1:a=0" -c:v libx264 -pix_fmt yuv420p "$TEMP_VIDEO"
# Combine the temporary video with voiceover and text overlay
echo "Combining video with voiceover and text overlay..."
ffmpeg -i "$TEMP_VIDEO" -i "$VOICEOVER" -i "$TEXT_OVERLAY" -filter_complex "[0:v][2:v]overlay=0:0" -c:v libx264 -c:a aac -b:a 192k -shortest "$FINAL_VIDEO"
# Add background music to the final video
echo "Adding background music..."
ffmpeg -i "$FINAL_VIDEO" -i "$MUSIC_FILE" -filter_complex "[0:a][1:a]amix=inputs=2:duration=longest" -c:v copy -c:a aac -b:a 192k "$FINAL_VIDEO"
# Clean up
rm "$TEMP_VIDEO"
rm "$TEXT_OVERLAY"
echo "Video created successfully: $FINAL_VIDEO"
#!/bin/bash
# Define project directory and file names
PROJECT_DIR="video_project"
IMAGES_DIR="$PROJECT_DIR/images"
SCRIPT_FILE="$PROJECT_DIR/video_script.txt"
VOICEOVER_FILE="$PROJECT_DIR/voiceover.mp3"
BACKGROUND_MUSIC_FILE="$PROJECT_DIR/background_music.mp3"
TEMP_VIDEO_FILE="$PROJECT_DIR/temp_video.mp4"
FINAL_VIDEO_FILE="$PROJECT_DIR/final_video.mp4"
TEXT_OVERLAY_FILE="$PROJECT_DIR/text_overlay.mp4"
# Create project directory
echo "Creating project directory..."
mkdir -p "$IMAGES_DIR"
# Create placeholder files
echo "Creating placeholder files..."
touch "$SCRIPT_FILE"
touch "$VOICEOVER_FILE"
touch "$BACKGROUND_MUSIC_FILE"
# Example content for video_script.txt
echo "Creating script content..."
cat <<EOT > "$SCRIPT_FILE"
Welcome to the Echoes of Innovation!
In this video, we will explore the future world and characters of our game.
Stay tuned for an exciting journey!
EOT

# Install ffmpeg
echo "Installing ffmpeg..."
if ! command -v ffmpeg &> /dev/null; then     echo "ffmpeg could not be found, installing...";     sudo apt-get update;     sudo apt-get install -y ffmpeg; else     echo "ffmpeg is already installed."; fi
# Optional: Install other dependencies (e.g., text-to-speech tools) if needed
# Inform the user
echo "Setup complete! Your project directory is ready."
echo "Place your images in the $IMAGES_DIR directory."
echo "Add your voiceover and background music to the project directory."
# End of script
pip install openai requests
#!/bin/bash
# Define the final video file
FINAL_VIDEO_FILE="video_project/final_video.mp4"
# Check if VLC is installed
if ! command -v vlc &> /dev/null; then     echo "VLC is not installed. Please install VLC to continue.";     exit 1; fi
reboot
ls -la
cd video_project
ls -la
cd images
ls -la
cd
#!/bin/bash
# Define variables
IMAGES=("futuristic_metropolis.jpg" "ancient_vault.jpg" "ally_character.jpg" "emilia_character.jpg" "victor_character.jpg")
VOICEOVER="voiceover.mp3"
FINAL_VIDEO="final_video.mp4"
TEMP_VIDEO="temp_video.mp4"
# Create a temporary video with images
echo "Creating temporary video from images..."
ffmpeg -loop 1 -i "${IMAGES[0]}" -loop 1 -i "${IMAGES[1]}" -loop 1 -i "${IMAGES[2]}" -loop 1 -i "${IMAGES[3]}" -loop 1 -i "${IMAGES[4]}" -filter_complex "[0:v]trim=duration=10[v0];[1:v]trim=duration=10[v1];[2:v]trim=duration=10[v2];[3:v]trim=duration=10[v3];[4:v]trim=duration=10[v4];[v0][v1][v2][v3][v4]concat=n=5:v=1:a=0" -c:v libx264 -pix_fmt yuv420p "$TEMP_VIDEO"
# Combine the temporary video with voiceover
echo "Combining video with voiceover..."
ffmpeg -i "$TEMP_VIDEO" -i "$VOICEOVER" -c:v copy -c:a aac -b:a 192k "$FINAL_VIDEO"
# Clean up
rm "$TEMP_VIDEO"
echo "Video created successfully: $FINAL_VIDEO"
ls -la
cd video_project
ls -la
cd image
cd images
ls -la
cd
cd /
cd storage
storage/emulated
cd /storage/
local
cd local
ls -la
cd media
ls -la
cd tmp
cd home
cd bin
cd mnt
cd /
cd home
ls -la
cd ally
ls -la
cd business-category-app
ls -la
git pull origin main
git config pull.rebase false 
git pull origin main
git config pull.rebase true
git pull origin main
git push origin main
