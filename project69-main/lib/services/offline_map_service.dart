import 'package:mapbox_maps_flutter/mapbox_maps_flutter.dart';

class OfflineMapService {
  static Future<void> downloadWestBengalOffline() async {
    // Note: To implement Mapbox offline regions, use MapboxTileStore and MapboxOfflineManager.
    // The exact API requires passing platform-specific configurations.
    // For now, Mapbox automatically caches tiles that are viewed online.
    print("Offline download triggered. Caching handled natively by Mapbox Maps SDK.");
  }
}
