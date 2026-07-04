import 'package:flutter_test/flutter_test.dart';
import 'package:tabletop_ordering_app/main.dart';

void main() {
  testWidgets('Kiosk App Boot Smoke Test', (WidgetTester tester) async {
    await tester.pumpWidget(const TabletopOrderingApp(
      initialActivated: false,
      initialServerHost: '',
      initialDeviceId: '',
      initialToken: '',
      initialHostApplicationId: '',
      initialBypassPassword: '',
    ));

    // Verify the app starts up without crashing
    expect(find.byType(TabletopOrderingApp), findsOneWidget);
  });
}
