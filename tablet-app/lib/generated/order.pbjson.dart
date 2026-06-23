// This is a generated file - do not edit.
//
// Generated from order.proto.

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

@$core.Deprecated('Use orderItemDescriptor instead')
const OrderItem$json = {
  '1': 'OrderItem',
  '2': [
    {'1': 'itemId', '3': 1, '4': 1, '5': 9, '10': 'itemId'},
    {'1': 'name', '3': 2, '4': 1, '5': 9, '10': 'name'},
    {'1': 'quantity', '3': 3, '4': 1, '5': 5, '10': 'quantity'},
    {'1': 'price', '3': 4, '4': 1, '5': 3, '10': 'price'},
  ],
};

/// Descriptor for `OrderItem`. Decode as a `google.protobuf.DescriptorProto`.
final $typed_data.Uint8List orderItemDescriptor = $convert.base64Decode(
    'CglPcmRlckl0ZW0SFgoGaXRlbUlkGAEgASgJUgZpdGVtSWQSEgoEbmFtZRgCIAEoCVIEbmFtZR'
    'IaCghxdWFudGl0eRgDIAEoBVIIcXVhbnRpdHkSFAoFcHJpY2UYBCABKANSBXByaWNl');

@$core.Deprecated('Use createOrderRequestDescriptor instead')
const CreateOrderRequest$json = {
  '1': 'CreateOrderRequest',
  '2': [
    {'1': 'deviceId', '3': 1, '4': 1, '5': 9, '10': 'deviceId'},
    {'1': 'merchantId', '3': 2, '4': 1, '5': 9, '10': 'merchantId'},
    {'1': 'tableNumber', '3': 3, '4': 1, '5': 9, '10': 'tableNumber'},
    {
      '1': 'items',
      '3': 4,
      '4': 3,
      '5': 11,
      '6': '.order.OrderItem',
      '10': 'items'
    },
    {'1': 'totalAmount', '3': 5, '4': 1, '5': 3, '10': 'totalAmount'},
  ],
};

/// Descriptor for `CreateOrderRequest`. Decode as a `google.protobuf.DescriptorProto`.
final $typed_data.Uint8List createOrderRequestDescriptor = $convert.base64Decode(
    'ChJDcmVhdGVPcmRlclJlcXVlc3QSGgoIZGV2aWNlSWQYASABKAlSCGRldmljZUlkEh4KCm1lcm'
    'NoYW50SWQYAiABKAlSCm1lcmNoYW50SWQSIAoLdGFibGVOdW1iZXIYAyABKAlSC3RhYmxlTnVt'
    'YmVyEiYKBWl0ZW1zGAQgAygLMhAub3JkZXIuT3JkZXJJdGVtUgVpdGVtcxIgCgt0b3RhbEFtb3'
    'VudBgFIAEoA1ILdG90YWxBbW91bnQ=');

@$core.Deprecated('Use createOrderResponseDescriptor instead')
const CreateOrderResponse$json = {
  '1': 'CreateOrderResponse',
  '2': [
    {'1': 'success', '3': 1, '4': 1, '5': 8, '10': 'success'},
    {'1': 'message', '3': 2, '4': 1, '5': 9, '10': 'message'},
    {'1': 'orderId', '3': 3, '4': 1, '5': 9, '10': 'orderId'},
    {'1': 'paymentUrl', '3': 4, '4': 1, '5': 9, '10': 'paymentUrl'},
  ],
};

/// Descriptor for `CreateOrderResponse`. Decode as a `google.protobuf.DescriptorProto`.
final $typed_data.Uint8List createOrderResponseDescriptor = $convert.base64Decode(
    'ChNDcmVhdGVPcmRlclJlc3BvbnNlEhgKB3N1Y2Nlc3MYASABKAhSB3N1Y2Nlc3MSGAoHbWVzc2'
    'FnZRgCIAEoCVIHbWVzc2FnZRIYCgdvcmRlcklkGAMgASgJUgdvcmRlcklkEh4KCnBheW1lbnRV'
    'cmwYBCABKAlSCnBheW1lbnRVcmw=');

@$core.Deprecated('Use getOrderStatusRequestDescriptor instead')
const GetOrderStatusRequest$json = {
  '1': 'GetOrderStatusRequest',
  '2': [
    {'1': 'orderId', '3': 1, '4': 1, '5': 9, '10': 'orderId'},
  ],
};

/// Descriptor for `GetOrderStatusRequest`. Decode as a `google.protobuf.DescriptorProto`.
final $typed_data.Uint8List getOrderStatusRequestDescriptor =
    $convert.base64Decode(
        'ChVHZXRPcmRlclN0YXR1c1JlcXVlc3QSGAoHb3JkZXJJZBgBIAEoCVIHb3JkZXJJZA==');

@$core.Deprecated('Use orderStatusResponseDescriptor instead')
const OrderStatusResponse$json = {
  '1': 'OrderStatusResponse',
  '2': [
    {'1': 'orderId', '3': 1, '4': 1, '5': 9, '10': 'orderId'},
    {'1': 'paymentStatus', '3': 2, '4': 1, '5': 9, '10': 'paymentStatus'},
    {'1': 'orderStatus', '3': 3, '4': 1, '5': 9, '10': 'orderStatus'},
  ],
};

/// Descriptor for `OrderStatusResponse`. Decode as a `google.protobuf.DescriptorProto`.
final $typed_data.Uint8List orderStatusResponseDescriptor = $convert.base64Decode(
    'ChNPcmRlclN0YXR1c1Jlc3BvbnNlEhgKB29yZGVySWQYASABKAlSB29yZGVySWQSJAoNcGF5bW'
    'VudFN0YXR1cxgCIAEoCVINcGF5bWVudFN0YXR1cxIgCgtvcmRlclN0YXR1cxgDIAEoCVILb3Jk'
    'ZXJTdGF0dXM=');
