import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'screens/home_screen.dart';
import 'services/health_service.dart';

void main() {
  runApp(HealthMonitorApp());
}

class HealthMonitorApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => HealthService()),
      ],
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        title: 'Health Monitor',
        theme: ThemeData(
          primarySwatch: Colors.blue,
        ),
        home: HomeScreen(),
      ),
    );
  }
}
