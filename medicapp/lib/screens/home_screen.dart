import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/health_service.dart';

class HomeScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final healthService = Provider.of<HealthService>(context);

    return Scaffold(
      appBar: AppBar(
        title: Text('Health Monitor'),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Blood Pressure: ' + healthService.bloodPressure,
              style: TextStyle(fontSize: 20),
            ),
            Text(
              'Oxygen Level: ' + healthService.oxygenLevel,
              style: TextStyle(fontSize: 20),
            ),
            Text(
              'Temperature: ' + healthService.temperature,
              style: TextStyle(fontSize: 20),
            ),
            ElevatedButton(
              onPressed: healthService.fetchHealthData,
              child: Text('Check Health Data'),
            ),
          ],
        ),
      ),
    );
  }
}
