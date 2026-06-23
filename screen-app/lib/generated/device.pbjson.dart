// This is a generated file - do not edit.
//
// Generated from device.proto.

// @dart = 3.3

// ignore_for_file: annotate_overrides, camel_case_types, comment_references
// ignore_for_file: constant_identifier_names
// ignore_for_file: curly_braces_in_flow_control_structures
// ignore_for_file: deprecated_member_use_from_same_package, library_prefixes
// ignore_for_file: non_constant_identifier_names, prefer_relative_imports
// ignore_for_file: unused_import

import 'dart:convert' as $convert;
import 'dart:core' as $core;
import 'dart:typed_data' as $typed_data;

@$core.Deprecated('Use registerDeviceRequestDescriptor instead')
const RegisterDeviceRequest$json = {
  '1': 'RegisterDeviceRequest',
  '2': [
    {'1': 'deviceId', '3': 1, '4': 1, '5': 9, '10': 'deviceId'},
    {'1': 'deviceType', '3': 2, '4': 1, '5': 9, '10': 'deviceType'},
    {
      '1': 'hostApplicationId',
      '3': 3,
      '4': 1,
      '5': 9,
      '10': 'hostApplicationId'
    },
  ],
};

/// Descriptor for `RegisterDeviceRequest`. Decode as a `google.protobuf.DescriptorProto`.
final $typed_data.Uint8List registerDeviceRequestDescriptor = $convert.base64Decode(
    'ChVSZWdpc3RlckRldmljZVJlcXVlc3QSGgoIZGV2aWNlSWQYASABKAlSCGRldmljZUlkEh4KCm'
    'RldmljZVR5cGUYAiABKAlSCmRldmljZVR5cGUSLAoRaG9zdEFwcGxpY2F0aW9uSWQYAyABKAlS'
    'EWhvc3RBcHBsaWNhdGlvbklk');

@$core.Deprecated('Use registerDeviceResponseDescriptor instead')
const RegisterDeviceResponse$json = {
  '1': 'RegisterDeviceResponse',
  '2': [
    {'1': 'success', '3': 1, '4': 1, '5': 8, '10': 'success'},
    {'1': 'message', '3': 2, '4': 1, '5': 9, '10': 'message'},
    {'1': 'status', '3': 3, '4': 1, '5': 9, '10': 'status'},
  ],
};

/// Descriptor for `RegisterDeviceResponse`. Decode as a `google.protobuf.DescriptorProto`.
final $typed_data.Uint8List registerDeviceResponseDescriptor =
    $convert.base64Decode(
        'ChZSZWdpc3RlckRldmljZVJlc3BvbnNlEhgKB3N1Y2Nlc3MYASABKAhSB3N1Y2Nlc3MSGAoHbW'
        'Vzc2FnZRgCIAEoCVIHbWVzc2FnZRIWCgZzdGF0dXMYAyABKAlSBnN0YXR1cw==');

@$core.Deprecated('Use heartbeatRequestDescriptor instead')
const HeartbeatRequest$json = {
  '1': 'HeartbeatRequest',
  '2': [
    {'1': 'deviceId', '3': 1, '4': 1, '5': 9, '10': 'deviceId'},
  ],
};

/// Descriptor for `HeartbeatRequest`. Decode as a `google.protobuf.DescriptorProto`.
final $typed_data.Uint8List heartbeatRequestDescriptor = $convert.base64Decode(
    'ChBIZWFydGJlYXRSZXF1ZXN0EhoKCGRldmljZUlkGAEgASgJUghkZXZpY2VJZA==');

@$core.Deprecated('Use heartbeatResponseDescriptor instead')
const HeartbeatResponse$json = {
  '1': 'HeartbeatResponse',
  '2': [
    {'1': 'success', '3': 1, '4': 1, '5': 8, '10': 'success'},
    {'1': 'command', '3': 2, '4': 1, '5': 9, '10': 'command'},
  ],
};

/// Descriptor for `HeartbeatResponse`. Decode as a `google.protobuf.DescriptorProto`.
final $typed_data.Uint8List heartbeatResponseDescriptor = $convert.base64Decode(
    'ChFIZWFydGJlYXRSZXNwb25zZRIYCgdzdWNjZXNzGAEgASgIUgdzdWNjZXNzEhgKB2NvbW1hbm'
    'QYAiABKAlSB2NvbW1hbmQ=');

@$core.Deprecated('Use adImpressionRequestDescriptor instead')
const AdImpressionRequest$json = {
  '1': 'AdImpressionRequest',
  '2': [
    {'1': 'deviceId', '3': 1, '4': 1, '5': 9, '10': 'deviceId'},
    {'1': 'bookingId', '3': 2, '4': 1, '5': 9, '10': 'bookingId'},
    {'1': 'durationSeconds', '3': 3, '4': 1, '5': 5, '10': 'durationSeconds'},
    {
      '1': 'interactiveClicks',
      '3': 4,
      '4': 1,
      '5': 5,
      '10': 'interactiveClicks'
    },
  ],
};

/// Descriptor for `AdImpressionRequest`. Decode as a `google.protobuf.DescriptorProto`.
final $typed_data.Uint8List adImpressionRequestDescriptor = $convert.base64Decode(
    'ChNBZEltcHJlc3Npb25SZXF1ZXN0EhoKCGRldmljZUlkGAEgASgJUghkZXZpY2VJZBIcCglib2'
    '9raW5nSWQYAiABKAlSCWJvb2tpbmdJZBIoCg9kdXJhdGlvblNlY29uZHMYAyABKAVSD2R1cmF0'
    'aW9uU2Vjb25kcxIsChFpbnRlcmFjdGl2ZUNsaWNrcxgEIAEoBVIRaW50ZXJhY3RpdmVDbGlja3'
    'M=');

@$core.Deprecated('Use adImpressionResponseDescriptor instead')
const AdImpressionResponse$json = {
  '1': 'AdImpressionResponse',
  '2': [
    {'1': 'success', '3': 1, '4': 1, '5': 8, '10': 'success'},
    {'1': 'message', '3': 2, '4': 1, '5': 9, '10': 'message'},
  ],
};

/// Descriptor for `AdImpressionResponse`. Decode as a `google.protobuf.DescriptorProto`.
final $typed_data.Uint8List adImpressionResponseDescriptor = $convert.base64Decode(
    'ChRBZEltcHJlc3Npb25SZXNwb25zZRIYCgdzdWNjZXNzGAEgASgIUgdzdWNjZXNzEhgKB21lc3'
    'NhZ2UYAiABKAlSB21lc3NhZ2U=');
