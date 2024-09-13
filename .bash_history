    ./setup_game.sh
    \`\`\`
    This will create the necessary files and directories.

2. **Play the Game**:
    After the setup, navigate to the game directory and start the game:
    \`\`\`bash
    cd echoes_of_innovation_game
    ./echoes_of_innovation.py
    \`\`\`

## Features
- Explore a futuristic metropolis and search for hidden artifacts.
- Solve puzzles to unlock advanced technology.
- Fight against mercenaries trying to stop you.
- Uncover a branching storyline based on the choices you make.

## Game Mechanics
- **Exploration**: Navigate the city, interact with characters, and find clues to progress.
- **Puzzle Solving**: Use Ally’s knowledge to solve technological puzzles and access new areas.
- **Combat**: Choose whether to fight or flee when you encounter enemies.

## Future Plans
We plan to expand the game with more levels, improved graphics, and new mechanics such as:
- A more detailed combat system.
- Inventory management and item collection.
- Branching storylines with multiple endings.

## Contributions
If you'd like to contribute to this project, feel free to fork the repository and submit pull requests!

## License
This project is open-source and available under the MIT License.
EOT

echo "README file has been updated successfully!"
git add .
git commit -m "readme update"
git push origin main
gcloud config set project aenzbi-cloud-project
cd echoes_of_innovation
#!/bin/bash
# Define package directory
PACKAGE_DIR="echoes_of_innovation_package"
# Navigate to package directory
cd "$PACKAGE_DIR" || { echo "Directory $PACKAGE_DIR does not exist."; exit 1; }
ls -la
cd echoes_of_innovation
#!/bin/bash
# Define package directory
PACKAGE_DIR="echoes_of_innovation_package"
# Navigate to package directory
cd "$PACKAGE_DIR" || { echo "Directory $PACKAGE_DIR does not exist."; exit 1; }
cd echoes_of_innovation
gcloud config set project aenzbi-cloud-project
cd echoes_of_innovation
npm init -y
gjt add .
git add .
git commit -m "package"
git push origin main
gcloud config set project aenzbi-cloud-project
cd echoes_of_innovation
#!/bin/bash
# Define game directory and file names
GAME_DIR="echoes_of_innovation_game"
GAME_FILE="echoes_of_innovation.py"
README_FILE="README.md"
CONFIG_DIR="config"
LEVELS_DIR="levels"
# Create game directory and subdirectories
echo "Setting up the game directory..."
mkdir -p "$GAME_DIR/$CONFIG_DIR"
mkdir -p "$GAME_DIR/$LEVELS_DIR"
# Move into the game directory
cd "$GAME_DIR"
# Create Python game file
echo "Creating the game script..."
cat <<EOT > "$GAME_FILE"
#!/usr/bin/env python3

# Echoes of Innovation - A text-based adventure game

import os

def load_level(level_number):
    level_file = f"levels/level_{level_number}.txt"
    if os.path.exists(level_file):
        with open(level_file, 'r') as file:
            print(file.read())
    else:
        print("Level file not found.")

def start_game():
    print("Welcome to 'Echoes of Innovation: The Quest for Lost Tech'!")
    print("You are Ally Elvis Nzeyimana, a genius software engineer in a futuristic metropolis.")
    print("Your goal is to find the lost technology hidden within an ancient digital artifact.")
    main_menu()

def main_menu():
    print("\\nWhat would you like to do?")
    print("1. Search for the artifact")
    print("2. Visit Dr. Emilia Roche")
    print("3. Fight Victor Kade’s mercenaries")
    print("4. Explore City")
    print("5. Exit the game")
    
    choice = input("> ")
    
    if choice == "1":
        search_for_artifact()
    elif choice == "2":
        visit_emilia()
    elif choice == "3":
        fight_mercenaries()
    elif choice == "4":
        explore_city()
    elif choice == "5":
        print("Goodbye, Ally!")
        exit(0)
    else:
        print("Invalid choice. Please select again.")
        main_menu()

def search_for_artifact():
    print("\\nYou begin searching for the artifact in a hidden part of the city.")
    print("As you approach the ancient vault, you must solve a puzzle to enter.")
    puzzle = input("Solve this puzzle (What is 10 + 5?): ")
    
    if puzzle == "15":
        print("Correct! The vault opens, revealing the ancient artifact!")
    else:
        print("Incorrect! You failed to open the vault.")
    
    main_menu()

def visit_emilia():
    print("\\nYou visit Dr. Emilia Roche at her secret lab.")
    print("She helps you decode part of the artifact and gives you a crucial clue.")
    
    print("You now have a lead on Victor Kade’s plans.")
    
    main_menu()

def fight_mercenaries():
    print("\\nVictor Kade’s mercenaries have found you!")
    print("You must defend yourself using advanced tech gadgets.")
    
    fight = input("Do you want to fight (yes or no)?: ").lower()
    
    if fight == "yes":
        print("You defeated the mercenaries using your advanced gadgets!")
    else:
        print("You fled from the battle. Victor Kade gains more power.")
    
    main_menu()

def explore_city():
    print("\\nExploring the city...")
    print("You come across various locations: tech stores, archives, and hidden areas.")
    print("Each location offers different clues and resources.")
    
    print("Which location do you want to visit?")
    print("1. Tech Store")
    print("2. Archives")
    print("3. Hidden Area")
    
    location = input("> ")
    
    if location == "1":
        print("You visit the Tech Store and find some useful gadgets.")
    elif location == "2":
        print("You explore the Archives and discover important documents.")
    elif location == "3":
        print("You enter a Hidden Area and uncover a mysterious clue.")
    else:
        print("Invalid choice. You wander around aimlessly.")
    
    main_menu()

# Start the game
if __name__ == "__main__":
    start_game()
EOT

# Create README file
echo "Creating the README file..."
gcloud config set project aenzbi-cloud-project
cd echoes_of_innovation
git pull origin main
git add .
git commit -m "updating"
git push origin main
.ls -la
ls -la
cd echoes_of_innovation_game
ls -la
cd level
cat <<EOT > "$README_FILE"
# Echoes of Innovation: The Quest for Lost Tech

## Overview

"**Echoes of Innovation: The Quest for Lost Tech**" is a text-based adventure game where you play as Ally Elvis Nzeyimana, a brilliant software engineer in a futuristic metropolis. Your mission is to uncover and obtain a lost technology hidden within an ancient digital artifact. Navigate through various levels, solve puzzles, and interact with characters to complete your quest.

## Features

- **Multiple Levels**: Experience different levels with unique challenges and puzzles.
- **Interactive Scenes**: Explore various locations in the futuristic city.
- **Dynamic Choices**: Make decisions that influence the outcome of the game.
- **Enhanced Gameplay**: Includes levels with security systems, clues, and interactions with different characters.

## Gameplay

- **Start Game**: Launch the game to begin your adventure.
- **Main Menu**: Choose from options to search for the artifact, visit Dr. Emilia Roche, fight mercenaries, or explore the city.
- **Levels**: Progress through levels by solving puzzles and making strategic choices.
- **Explore City**: Visit locations like high-tech stores and city archives to gather resources and information.

## Setup

### Prerequisites

- Python 3.x installed on your machine.

### Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/allyelvis/echoes_of_innovation.git
   cd echoes_of_innovation

cat <<EOT > "$README_FILE"
# Echoes of Innovation: The Quest for Lost Tech

## Overview

"**Echoes of Innovation: The Quest for Lost Tech**" is a text-based adventure game where you play as Ally Elvis Nzeyimana, a brilliant software engineer in a futuristic metropolis. Your mission is to uncover and obtain a lost technology hidden within an ancient digital artifact. Navigate through various levels, solve puzzles, and interact with characters to complete your quest.

## Features

- **Multiple Levels**: Experience different levels with unique challenges and puzzles.
- **Interactive Scenes**: Explore various locations in the futuristic city.
- **Dynamic Choices**: Make decisions that influence the outcome of the game.
- **Enhanced Gameplay**: Includes levels with security systems, clues, and interactions with different characters.

## Gameplay

- **Start Game**: Launch the game to begin your adventure.
- **Main Menu**: Choose from options to search for the artifact, visit Dr. Emilia Roche, fight mercenaries, or explore the city.
- **Levels**: Progress through levels by solving puzzles and making strategic choices.
- **Explore City**: Visit locations like high-tech stores and city archives to gather resources and information.

## Setup

### Prerequisites

- Python 3.x installed on your machine.

### Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/allyelvis/echoes_of_innovation.git
   cd echoes_of_innovation

gcloud config set project aenzbi-cloud-project
cd echoes_of_innovation
#!/bin/bash
# Define directories and file names
GAME_DIR="echoes_of_innovation_game"
CONFIG_FILE="$GAME_DIR/config/settings.conf"
GAME_FILE="$GAME_DIR/echoes_of_innovation.py"
README_FILE="$GAME_DIR/README.md"
ASSETS_DIR="$GAME_DIR/assets"
# Define new configuration settings
NEW_SETTINGS="
# Echoes of Innovation Configuration
level_count=10
sound_volume=0.8
image_quality=high
video_resolution=1080p
"
# Update configuration file
echo "Updating configuration file..."
mkdir -p "$(dirname "$CONFIG_FILE")"
echo "$NEW_SETTINGS" > "$CONFIG_FILE"
# Update the game script to use new configuration settings
echo "Updating the game script..."
cat <<EOT > "$GAME_FILE"
#!/usr/bin/env python3

import os
import sys
import time
from PIL import Image
from pygame import mixer

# Load configuration settings
def load_config():
    config = {
        "level_count": 10,
        "sound_volume": 0.8,
        "image_quality": "high",
        "video_resolution": "1080p"
    }
    config_file = "config/settings.conf"
    if os.path.exists(config_file):
        with open(config_file, 'r') as file:
            lines = file.readlines()
            for line in lines:
                if '=' in line:
                    key, value = line.strip().split('=', 1)
                    config[key.strip()] = value.strip()
    return config

config = load_config()

# Initialize the mixer for sound
mixer.init()
mixer.music.set_volume(float(config['sound_volume']))

# Asset paths
IMAGES_DIR = "assets/images"
SOUNDS_DIR = "assets/sounds"
VIDEOS_DIR = "assets/videos"
UI_DIR = "assets/ui"

# Load and display an image
def show_image(image_path):
    try:
        img = Image.open(image_path)
        img.show()
    except Exception as e:
        print(f"Failed to load image: {e}")

# Play a sound
def play_sound(sound_path):
    try:
        sound = mixer.Sound(sound_path)
        sound.play()
    except Exception as e:
        print(f"Failed to play sound: {e}")

# Show a video (simple example using terminal-based approach)
def show_video(video_path):
    print(f"Video {video_path} would be played here.")

def load_level(level_number):
    level_file = f"levels/level_{level_number}.txt"
    if os.path.exists(level_file):
        with open(level_file, 'r') as file:
            print(file.read())
    else:
        print("Level file not found.")

def start_game():
    print("Welcome to 'Echoes of Innovation: The Quest for Lost Tech'!")
    show_image(f"{IMAGES_DIR}/welcome.png")
    play_sound(f"{SOUNDS_DIR}/intro.mp3")
    print("You are Ally Elvis Nzeyimana, a genius software engineer in a futuristic metropolis.")
    print("Your goal is to find the lost technology hidden within an ancient digital artifact.")
    main_menu()

def main_menu():
    print("\\nWhat would you like to do?")
    print("1. Search for the artifact")
    print("2. Visit Dr. Emilia Roche")
    print("3. Fight Victor Kade’s mercenaries")
    print("4. Explore City")
    print("5. Exit the game")
    
    choice = input("> ")
    
    if choice == "1":
        search_for_artifact()
    elif choice == "2":
        visit_emilia()
    elif choice == "3":
        fight_mercenaries()
    elif choice == "4":
        explore_city()
    elif choice == "5":
        print("Goodbye, Ally!")
        exit(0)
    else:
        print("Invalid choice. Please select again.")
        main_menu()

def search_for_artifact():
    print("\\nYou begin searching for the artifact in a hidden part of the city.")
    show_image(f"{IMAGES_DIR}/vault.png")
    play_sound(f"{SOUNDS_DIR}/search.mp3")
    print("As you approach the ancient vault, you must solve a puzzle to enter.")
    puzzle = input("Solve this puzzle (What is 10 + 5?): ")
    
    if puzzle == "15":
        print("Correct! The vault opens, revealing the ancient artifact!")
    else:
        print("Incorrect! You failed to open the vault.")
    
    main_menu()

def visit_emilia():
    print("\\nYou visit Dr. Emilia Roche at her secret lab.")
    show_image(f"{IMAGES_DIR}/emilia_lab.png")
    play_sound(f"{SOUNDS_DIR}/emilia.mp3")
    print("She helps you decode part of the artifact and gives you a crucial clue.")
    
    print("You now have a lead on Victor Kade’s plans.")
    
    main_menu()

def fight_mercenaries():
    print("\\nVictor Kade’s mercenaries have found you!")
    show_image(f"{IMAGES_DIR}/mercenaries.png")
    play_sound(f"{SOUNDS_DIR}/fight.mp3")
    print("You must defend yourself using advanced tech gadgets.")
    
    fight = input("Do you want to fight (yes or no)?: ").lower()
    
    if fight == "yes":
        print("You defeated the mercenaries using your advanced gadgets!")
    else:
        print("You fled from the battle. Victor Kade gains more power.")
    
    main_menu()

def explore_city():
    print("\\nExploring the city...")
    show_image(f"{IMAGES_DIR}/city.png")
    play_sound(f"{SOUNDS_DIR}/explore.mp3")
    print("You come across various locations: tech stores, archives, and hidden areas.")
    print("Each location offers different clues and resources.")
    
    print("Which location do you want to visit?")
    print("1. Tech Store")
    print("2. Archives")
    print("3. Hidden Area")
    
    location = input("> ")
    
    if location == "1":
        print("You visit the Tech Store and find some useful gadgets.")
    elif location == "2":
        print("You explore the Archives and discover important documents.")
    elif location == "3":
        print("You enter a Hidden Area and uncover a mysterious clue.")
    else:
        print("Invalid choice. You wander around aimlessly.")
    
    main_menu()

# Start the game
if __name__ == "__main__":
    start_game()
EOT

# Update README file with new features
echo "Updating the README file..."
cat <<EOT > "$README_FILE"
# Echoes of Innovation: The Quest for Lost Tech

## Overview

"**Echoes of Innovation: The Quest for Lost Tech**" is a text-based adventure game where you play as Ally Elvis Nzeyimana, a brilliant software engineer in a futuristic metropolis. Your mission is to uncover and obtain a lost technology hidden within an ancient digital artifact. Navigate through various levels, solve puzzles, and interact with characters to complete your quest.

## Features

- **Multiple Levels**: Experience 10 levels with unique challenges and puzzles.
- **Interactive Scenes**: Explore various locations in the futuristic city.
- **Dynamic Choices**: Make decisions that influence the outcome of the game.
- **Enhanced Gameplay**: Includes levels with security systems, clues, and interactions with different characters.
- **Asset Integration**: Includes images, sounds, and videos to enhance the gameplay experience.

## Gameplay

- **Start Game**: Launch the game to begin your adventure.
- **Main Menu**: Choose from options to search for the artifact, visit Dr. Emilia Roche, fight mercenaries, or explore the city.
- **Levels**: Progress through 10 levels by solving puzzles and making strategic choices.
- **Explore City**: Visit locations like high-tech stores and city archives to gather resources and information.

## Configuration

- **Configuration File**: Modify `config/settings.conf` for game settings such as level count, sound volume, image quality, and video resolution.

## Setup

### Prerequisites

- Python 3.x installed on your machine.
- `PIL` and `pygame` libraries for image and sound handling.

### Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/allyelvis/echoes_of_innovation.git
   cd echoes_of_innovation

cd echoes_of_innovation
