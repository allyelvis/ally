#include <Relay.h>
#include <WiFiNINA.h>
#include <HTTPClient.h>

// Define pins
const int relayPin = 2;

// Create relay object
Relay relay(relayPin);

void setup() {
  // Initialize relay
  relay.begin();

  // Connect to Wi-Fi (if applicable)
  WiFi.begin("your_ssid", "your_password");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("Connected to Wi-Fi");
}

void loop() {
  // Check for control commands (e.g., from a web server or mobile app)

  // Activate or deactivate relay based on control commands
  if (controlCommand == "on") {
    relay.on();
  } else if (controlCommand == "off") {
    relay.off();
  }
}
