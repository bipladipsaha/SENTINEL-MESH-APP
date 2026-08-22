import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';

/// BLE service for discovering and connecting to TravelRakshak ESP32 devices.
///
/// ESP32 devices advertise with a name like "SM-XXXXX" and expose a
/// BLE characteristic containing their device ID string.
class BleService {
  static final BleService _instance = BleService._internal();
  factory BleService() => _instance;
  BleService._internal();

  // BLE UUIDs matching the ESP32 firmware (ble_manager.cpp)
  static const String serviceUuid = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
  static const String characteristicUuid =
      'beb5483e-36e1-4688-b7f5-ea07361b26a8';

  BluetoothDevice? _connectedDevice;
  StreamSubscription<BluetoothConnectionState>? _connectionSub;
  StreamSubscription<List<ScanResult>>? _scanSub;

  final StreamController<BleConnectionState> _stateController =
      StreamController<BleConnectionState>.broadcast();

  /// Stream of BLE connection state changes.
  Stream<BleConnectionState> get connectionStateStream =>
      _stateController.stream;

  /// Currently connected device (null if disconnected).
  BluetoothDevice? get connectedDevice => _connectedDevice;

  BleConnectionState _currentState = BleConnectionState.disconnected;
  BleConnectionState get currentState => _currentState;

  void _updateState(BleConnectionState state) {
    _currentState = state;
    if (!_stateController.isClosed) {
      _stateController.add(state);
    }
  }

  // ------------------------------------------------------------------
  //  Scanning
  // ------------------------------------------------------------------

  /// Scan for nearby TravelRakshak devices (name starts with "SM-").
  /// Returns discovered devices via the [onDeviceFound] callback.
  /// Scan runs for [timeout] duration.
  Future<List<ScanResult>> scanForDevices({
    Duration timeout = const Duration(seconds: 10),
  }) async {
    _updateState(BleConnectionState.scanning);

    final List<ScanResult> found = [];

    try {
      // Stop any existing scan
      await FlutterBluePlus.stopScan();



      _scanSub?.cancel();
      _scanSub = FlutterBluePlus.scanResults.listen((results) {
        for (final r in results) {
          final name = r.device.platformName;
          if (name.startsWith('SM-') &&
              !found.any((f) => f.device.remoteId == r.device.remoteId)) {
            found.add(r);
            debugPrint('[BLE] Found device: $name (${r.device.remoteId})');
          }
        }
      });

      await FlutterBluePlus.startScan(
        timeout: timeout,
        withServices: [Guid(serviceUuid)],
      );

      // If no results with service filter, try scanning by name
      if (found.isEmpty) {
        await FlutterBluePlus.startScan(timeout: timeout);
        // Give it a moment to collect results
        await Future.delayed(timeout);
      }

      _scanSub?.cancel();

      if (_connectedDevice == null) {
        _updateState(BleConnectionState.disconnected);
      }

      return found;
    } catch (e) {
      debugPrint('[BLE] Scan error: $e');
      _updateState(BleConnectionState.disconnected);
      return found;
    }
  }

  // ------------------------------------------------------------------
  //  Connection
  // ------------------------------------------------------------------

  /// Connect to a specific device by its advertised name (device ID).
  /// Scans, finds the matching device, and connects.
  /// Returns true if connected successfully.
  Future<bool> connectByDeviceId(String deviceId) async {
    _updateState(BleConnectionState.scanning);
    debugPrint('[BLE] Searching for device: $deviceId');

    try {
      await FlutterBluePlus.stopScan();

      BluetoothDevice? targetDevice;

      // First, check already-bonded/known devices
      final bonded = await FlutterBluePlus.bondedDevices;
      for (final d in bonded) {
        if (d.platformName == deviceId) {
          targetDevice = d;
          debugPrint('[BLE] Found bonded device: $deviceId');
          break;
        }
      }

      // If not bonded, scan for it
      if (targetDevice == null) {
        final completer = Completer<BluetoothDevice?>();

        _scanSub?.cancel();
        _scanSub = FlutterBluePlus.scanResults.listen((results) {
          for (final r in results) {
            if (r.device.platformName == deviceId) {
              if (!completer.isCompleted) {
                completer.complete(r.device);
              }
            }
          }
        });

        await FlutterBluePlus.startScan(
          timeout: const Duration(seconds: 15),
        );

        targetDevice = await completer.future
            .timeout(const Duration(seconds: 15), onTimeout: () => null);

        await FlutterBluePlus.stopScan();
        _scanSub?.cancel();
      }

      if (targetDevice == null) {
        debugPrint('[BLE] Device $deviceId not found');
        _updateState(BleConnectionState.disconnected);
        return false;
      }

      return await _connectToDevice(targetDevice);
    } catch (e) {
      debugPrint('[BLE] Connect error: $e');
      _updateState(BleConnectionState.disconnected);
      return false;
    }
  }

  /// Connect to a specific [BluetoothDevice] directly.
  Future<bool> connectToDevice(BluetoothDevice device) async {
    return await _connectToDevice(device);
  }

  Future<bool> _connectToDevice(BluetoothDevice device) async {
    _updateState(BleConnectionState.connecting);
    debugPrint('[BLE] Connecting to ${device.platformName}...');

    try {
      await device.connect(
        autoConnect: false,
        timeout: const Duration(seconds: 10),
      );

      _connectedDevice = device;
      _updateState(BleConnectionState.connected);
      debugPrint('[BLE] Connected to ${device.platformName}');

      // Listen for disconnection
      _connectionSub?.cancel();
      _connectionSub = device.connectionState.listen((state) {
        if (state == BluetoothConnectionState.disconnected) {
          debugPrint('[BLE] Device disconnected');
          _connectedDevice = null;
          _updateState(BleConnectionState.disconnected);
        }
      });

      return true;
    } catch (e) {
      debugPrint('[BLE] Connection failed: $e');
      _connectedDevice = null;
      _updateState(BleConnectionState.disconnected);
      return false;
    }
  }

  /// Read the device ID characteristic from the connected device.
  Future<String?> readDeviceId() async {
    if (_connectedDevice == null) return null;

    try {
      final services = await _connectedDevice!.discoverServices();
      for (final service in services) {
        if (service.uuid.toString().toLowerCase() ==
            serviceUuid.toLowerCase()) {
          for (final char in service.characteristics) {
            if (char.uuid.toString().toLowerCase() ==
                characteristicUuid.toLowerCase()) {
              final value = await char.read();
              final id = String.fromCharCodes(value);
              debugPrint('[BLE] Read device ID: $id');
              return id;
            }
          }
        }
      }
    } catch (e) {
      debugPrint('[BLE] Read characteristic error: $e');
    }
    return null;
  }

  /// Disconnect from the currently connected device.
  Future<void> disconnect() async {
    _connectionSub?.cancel();
    try {
      await _connectedDevice?.disconnect();
    } catch (_) {}
    _connectedDevice = null;
    _updateState(BleConnectionState.disconnected);
    debugPrint('[BLE] Disconnected');
  }

  /// Clean up resources.
  void dispose() {
    _connectionSub?.cancel();
    _scanSub?.cancel();
    _stateController.close();
  }
}

enum BleConnectionState {
  disconnected,
  scanning,
  connecting,
  connected,
}
