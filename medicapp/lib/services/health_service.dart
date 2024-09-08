import 'package:flutter/material.dart';

class HealthService with ChangeNotifier {
  String bloodPressure = 'Not Available';
  String oxygenLevel = 'Not Available';
  String temperature = 'Not Available';

  // Method to fetch health data from external sensors
  Future<void> fetchHealthData() async {
    // Placeholder for integrating real sensor APIs
    bloodPressure = '120/80 mmHg';  // Mock data
    oxygenLevel = '98%';            // Mock data
    temperature = '36.5°C';         // Mock data
    notifyListeners();
  }
}
