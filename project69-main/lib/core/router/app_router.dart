import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../widgets/bottom_nav_shell.dart';
import '../../features/home/home_screen.dart';
import '../../features/emergencies/emergencies_screen.dart';
import '../../features/emergencies/emergency_history_screen.dart';
import '../../features/device/device_screen.dart';
import '../../features/device/device_pairing_screen.dart';
import '../../features/device/device_connected_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/notifications/notifications_screen.dart';
import '../../features/mesh/mesh_screen.dart';
import '../../features/sender/sender_mode_screen.dart';
import '../../features/sender/sos_countdown_screen.dart';
import '../../features/responder/responder_radar_screen.dart';
import '../../features/responder/active_response_screen.dart';
import '../../features/police/police_support_screen.dart';
import '../../features/medical/medical_support_screen.dart';
import '../../features/chatbot/safety_ai_screen.dart';
import '../../features/settings/settings_screen.dart';
import '../../features/tracker/live_tracker_detail_screen.dart';

class AppRouter {
  static final router = GoRouter(
    initialLocation: '/home',
    routes: [
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return BottomNavShell(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/home',
                builder: (context, state) => const HomeScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/emergencies',
                builder: (context, state) => const EmergenciesScreen(),
                routes: [
                  GoRoute(
                    path: 'history',
                    builder: (context, state) => const EmergencyHistoryScreen(),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/device',
                builder: (context, state) => const DeviceScreen(),
                routes: [
                  GoRoute(
                    path: 'pairing',
                    builder: (context, state) => const DevicePairingScreen(),
                  ),
                  GoRoute(
                    path: 'connected',
                    builder: (context, state) => const DeviceConnectedScreen(),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/profile',
                builder: (context, state) => const ProfileScreen(),
                routes: [
                  GoRoute(
                    path: 'settings',
                    builder: (context, state) => const SettingsScreen(),
                  ),
                ],
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/notifications',
                builder: (context, state) => const NotificationsScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/mesh',
                builder: (context, state) => const MeshScreen(),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: '/sender',
        pageBuilder: (context, state) {
          final autoStart = state.uri.queryParameters['auto_start'] == 'true';
          return CustomTransitionPage(
            child: SenderModeScreen(autoStartRecording: autoStart),
            transitionsBuilder: (context, animation, secondaryAnimation, child) {
              return SlideTransition(
                position: animation.drive(
                  Tween(begin: const Offset(0, 1), end: Offset.zero).chain(CurveTween(curve: Curves.easeOutCubic)),
                ),
                child: FadeTransition(opacity: animation, child: child),
              );
            },
          );
        },
        routes: [
          GoRoute(
            path: 'countdown',
            builder: (context, state) => const SosCountdownScreen(),
          ),
        ],
      ),
      GoRoute(
        path: '/radar',
        pageBuilder: (context, state) => CustomTransitionPage(
          child: const ResponderRadarScreen(),
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return SlideTransition(
              position: animation.drive(
                Tween(begin: const Offset(0, 1), end: Offset.zero).chain(CurveTween(curve: Curves.easeOutCubic)),
              ),
              child: FadeTransition(opacity: animation, child: child),
            );
          },
        ),
        routes: [
          GoRoute(
            path: 'active',
            builder: (context, state) => const ActiveResponseScreen(),
          ),
        ],
      ),
      GoRoute(
        path: '/tracker',
        builder: (context, state) => const LiveTrackerDetailScreen(),
      ),
      GoRoute(
        path: '/police',
        builder: (context, state) => const PoliceSupportScreen(),
      ),
      GoRoute(
        path: '/medical',
        builder: (context, state) => const MedicalSupportScreen(),
      ),
      GoRoute(
        path: '/chatbot',
        builder: (context, state) => const SafetyAIScreen(),
      ),
    ],
  );
}
