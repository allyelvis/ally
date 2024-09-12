#!/bin/bash

# Script to establish a satellite connection using socat

# Replace with your satellite modem IP address and port
SATELLITE_IP="192.168.100.1"
SATELLITE_PORT="5000"

# Setup socat to forward data to satellite
echo "Setting up satellite connection to $SATELLITE_IP:$SATELLITE_PORT..."
socat TCP4-LISTEN:8080,reuseaddr,fork TCP4:$SATELLITE_IP:$SATELLITE_PORT &
echo "Satellite connection established."

# Note: Adjust the IP and port to match your satellite configuration.
