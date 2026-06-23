// This is a generated file - do not edit.
//
// Generated from menu.proto.

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

@$core.Deprecated('Use getMenuRequestDescriptor instead')
const GetMenuRequest$json = {
  '1': 'GetMenuRequest',
  '2': [
    {'1': 'merchantId', '3': 1, '4': 1, '5': 9, '10': 'merchantId'},
    {'1': 'deviceId', '3': 2, '4': 1, '5': 9, '10': 'deviceId'},
  ],
};

/// Descriptor for `GetMenuRequest`. Decode as a `google.protobuf.DescriptorProto`.
final $typed_data.Uint8List getMenuRequestDescriptor = $convert.base64Decode(
    'Cg5HZXRNZW51UmVxdWVzdBIeCgptZXJjaGFudElkGAEgASgJUgptZXJjaGFudElkEhoKCGRldm'
    'ljZUlkGAIgASgJUghkZXZpY2VJZA==');

@$core.Deprecated('Use menuItemDescriptor instead')
const MenuItem$json = {
  '1': 'MenuItem',
  '2': [
    {'1': 'itemId', '3': 1, '4': 1, '5': 9, '10': 'itemId'},
    {'1': 'name', '3': 2, '4': 1, '5': 9, '10': 'name'},
    {'1': 'description', '3': 3, '4': 1, '5': 9, '10': 'description'},
    {'1': 'price', '3': 4, '4': 1, '5': 3, '10': 'price'},
    {'1': 'category', '3': 5, '4': 1, '5': 9, '10': 'category'},
    {'1': 'isAvailable', '3': 6, '4': 1, '5': 8, '10': 'isAvailable'},
    {'1': 'imageUrl', '3': 7, '4': 1, '5': 9, '10': 'imageUrl'},
  ],
};

/// Descriptor for `MenuItem`. Decode as a `google.protobuf.DescriptorProto`.
final $typed_data.Uint8List menuItemDescriptor = $convert.base64Decode(
    'CghNZW51SXRlbRIWCgZpdGVtSWQYASABKAlSBml0ZW1JZBISCgRuYW1lGAIgASgJUgRuYW1lEi'
    'AKC2Rlc2NyaXB0aW9uGAMgASgJUgtkZXNjcmlwdGlvbhIUCgVwcmljZRgEIAEoA1IFcHJpY2US'
    'GgoIY2F0ZWdvcnkYBSABKAlSCGNhdGVnb3J5EiAKC2lzQXZhaWxhYmxlGAYgASgIUgtpc0F2YW'
    'lsYWJsZRIaCghpbWFnZVVybBgHIAEoCVIIaW1hZ2VVcmw=');

@$core.Deprecated('Use getMenuResponseDescriptor instead')
const GetMenuResponse$json = {
  '1': 'GetMenuResponse',
  '2': [
    {'1': 'success', '3': 1, '4': 1, '5': 8, '10': 'success'},
    {'1': 'message', '3': 2, '4': 1, '5': 9, '10': 'message'},
    {
      '1': 'items',
      '3': 3,
      '4': 3,
      '5': 11,
      '6': '.menu.MenuItem',
      '10': 'items'
    },
  ],
};

/// Descriptor for `GetMenuResponse`. Decode as a `google.protobuf.DescriptorProto`.
final $typed_data.Uint8List getMenuResponseDescriptor = $convert.base64Decode(
    'Cg9HZXRNZW51UmVzcG9uc2USGAoHc3VjY2VzcxgBIAEoCFIHc3VjY2VzcxIYCgdtZXNzYWdlGA'
    'IgASgJUgdtZXNzYWdlEiQKBWl0ZW1zGAMgAygLMg4ubWVudS5NZW51SXRlbVIFaXRlbXM=');
