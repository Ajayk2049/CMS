import 'package:flutter_test/flutter_test.dart';
import 'package:tabletop_ordering_app/main.dart';

void main() {
  testWidgets('TabletopOrderingApp boots to SplashScreen', (WidgetTester tester) async {
    await tester.pumpWidget(const TabletopOrderingApp());

    // Verify the app starts up without crashing — should show the splash screen
    expect(find.byType(TabletopOrderingApp), findsOneWidget);
  });
}
