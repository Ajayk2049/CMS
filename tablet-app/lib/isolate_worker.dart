import 'dart:convert';
import 'package:flutter/foundation.dart';

/// Parses a JSON string in a background Isolate to offload the CPU Core.
Future<Map<String, dynamic>> parseJsonInBackground(String jsonString) async {
  return compute(_parseJson, jsonString);
}

Map<String, dynamic> _parseJson(String jsonString) {
  final decoded = jsonDecode(jsonString);
  if (decoded is Map<String, dynamic>) {
    return decoded;
  }
  return {};
}
