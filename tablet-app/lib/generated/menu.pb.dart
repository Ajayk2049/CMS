// This is a generated file - do not edit.
//
// Generated from menu.proto.

// @dart = 3.3

// ignore_for_file: annotate_overrides, camel_case_types, comment_references
// ignore_for_file: constant_identifier_names
// ignore_for_file: curly_braces_in_flow_control_structures
// ignore_for_file: deprecated_member_use_from_same_package, library_prefixes
// ignore_for_file: non_constant_identifier_names, prefer_relative_imports

import 'dart:core' as $core;

import 'package:fixnum/fixnum.dart' as $fixnum;
import 'package:protobuf/protobuf.dart' as $pb;

export 'package:protobuf/protobuf.dart' show GeneratedMessageGenericExtensions;

class GetMenuRequest extends $pb.GeneratedMessage {
  factory GetMenuRequest({
    $core.String? merchantId,
    $core.String? deviceId,
  }) {
    final result = create();
    if (merchantId != null) result.merchantId = merchantId;
    if (deviceId != null) result.deviceId = deviceId;
    return result;
  }

  GetMenuRequest._();

  factory GetMenuRequest.fromBuffer($core.List<$core.int> data,
          [$pb.ExtensionRegistry registry = $pb.ExtensionRegistry.EMPTY]) =>
      create()..mergeFromBuffer(data, registry);
  factory GetMenuRequest.fromJson($core.String json,
          [$pb.ExtensionRegistry registry = $pb.ExtensionRegistry.EMPTY]) =>
      create()..mergeFromJson(json, registry);

  static final $pb.BuilderInfo _i = $pb.BuilderInfo(
      _omitMessageNames ? '' : 'GetMenuRequest',
      package: const $pb.PackageName(_omitMessageNames ? '' : 'menu'),
      createEmptyInstance: create)
    ..aOS(1, _omitFieldNames ? '' : 'merchantId', protoName: 'merchantId')
    ..aOS(2, _omitFieldNames ? '' : 'deviceId', protoName: 'deviceId')
    ..hasRequiredFields = false;

  @$core.Deprecated('See https://github.com/google/protobuf.dart/issues/998.')
  GetMenuRequest clone() => deepCopy();
  @$core.Deprecated('See https://github.com/google/protobuf.dart/issues/998.')
  GetMenuRequest copyWith(void Function(GetMenuRequest) updates) =>
      super.copyWith((message) => updates(message as GetMenuRequest))
          as GetMenuRequest;

  @$core.override
  $pb.BuilderInfo get info_ => _i;

  @$core.pragma('dart2js:noInline')
  static GetMenuRequest create() => GetMenuRequest._();
  @$core.override
  GetMenuRequest createEmptyInstance() => create();
  @$core.pragma('dart2js:noInline')
  static GetMenuRequest getDefault() => _defaultInstance ??=
      $pb.GeneratedMessage.$_defaultFor<GetMenuRequest>(create);
  static GetMenuRequest? _defaultInstance;

  @$pb.TagNumber(1)
  $core.String get merchantId => $_getSZ(0);
  @$pb.TagNumber(1)
  set merchantId($core.String value) => $_setString(0, value);
  @$pb.TagNumber(1)
  $core.bool hasMerchantId() => $_has(0);
  @$pb.TagNumber(1)
  void clearMerchantId() => $_clearField(1);

  @$pb.TagNumber(2)
  $core.String get deviceId => $_getSZ(1);
  @$pb.TagNumber(2)
  set deviceId($core.String value) => $_setString(1, value);
  @$pb.TagNumber(2)
  $core.bool hasDeviceId() => $_has(1);
  @$pb.TagNumber(2)
  void clearDeviceId() => $_clearField(2);
}

class MenuItem extends $pb.GeneratedMessage {
  factory MenuItem({
    $core.String? itemId,
    $core.String? name,
    $core.String? description,
    $fixnum.Int64? price,
    $core.String? category,
    $core.bool? isAvailable,
    $core.String? imageUrl,
  }) {
    final result = create();
    if (itemId != null) result.itemId = itemId;
    if (name != null) result.name = name;
    if (description != null) result.description = description;
    if (price != null) result.price = price;
    if (category != null) result.category = category;
    if (isAvailable != null) result.isAvailable = isAvailable;
    if (imageUrl != null) result.imageUrl = imageUrl;
    return result;
  }

  MenuItem._();

  factory MenuItem.fromBuffer($core.List<$core.int> data,
          [$pb.ExtensionRegistry registry = $pb.ExtensionRegistry.EMPTY]) =>
      create()..mergeFromBuffer(data, registry);
  factory MenuItem.fromJson($core.String json,
          [$pb.ExtensionRegistry registry = $pb.ExtensionRegistry.EMPTY]) =>
      create()..mergeFromJson(json, registry);

  static final $pb.BuilderInfo _i = $pb.BuilderInfo(
      _omitMessageNames ? '' : 'MenuItem',
      package: const $pb.PackageName(_omitMessageNames ? '' : 'menu'),
      createEmptyInstance: create)
    ..aOS(1, _omitFieldNames ? '' : 'itemId', protoName: 'itemId')
    ..aOS(2, _omitFieldNames ? '' : 'name')
    ..aOS(3, _omitFieldNames ? '' : 'description')
    ..aInt64(4, _omitFieldNames ? '' : 'price')
    ..aOS(5, _omitFieldNames ? '' : 'category')
    ..aOB(6, _omitFieldNames ? '' : 'isAvailable', protoName: 'isAvailable')
    ..aOS(7, _omitFieldNames ? '' : 'imageUrl', protoName: 'imageUrl')
    ..hasRequiredFields = false;

  @$core.Deprecated('See https://github.com/google/protobuf.dart/issues/998.')
  MenuItem clone() => deepCopy();
  @$core.Deprecated('See https://github.com/google/protobuf.dart/issues/998.')
  MenuItem copyWith(void Function(MenuItem) updates) =>
      super.copyWith((message) => updates(message as MenuItem)) as MenuItem;

  @$core.override
  $pb.BuilderInfo get info_ => _i;

  @$core.pragma('dart2js:noInline')
  static MenuItem create() => MenuItem._();
  @$core.override
  MenuItem createEmptyInstance() => create();
  @$core.pragma('dart2js:noInline')
  static MenuItem getDefault() =>
      _defaultInstance ??= $pb.GeneratedMessage.$_defaultFor<MenuItem>(create);
  static MenuItem? _defaultInstance;

  @$pb.TagNumber(1)
  $core.String get itemId => $_getSZ(0);
  @$pb.TagNumber(1)
  set itemId($core.String value) => $_setString(0, value);
  @$pb.TagNumber(1)
  $core.bool hasItemId() => $_has(0);
  @$pb.TagNumber(1)
  void clearItemId() => $_clearField(1);

  @$pb.TagNumber(2)
  $core.String get name => $_getSZ(1);
  @$pb.TagNumber(2)
  set name($core.String value) => $_setString(1, value);
  @$pb.TagNumber(2)
  $core.bool hasName() => $_has(1);
  @$pb.TagNumber(2)
  void clearName() => $_clearField(2);

  @$pb.TagNumber(3)
  $core.String get description => $_getSZ(2);
  @$pb.TagNumber(3)
  set description($core.String value) => $_setString(2, value);
  @$pb.TagNumber(3)
  $core.bool hasDescription() => $_has(2);
  @$pb.TagNumber(3)
  void clearDescription() => $_clearField(3);

  @$pb.TagNumber(4)
  $fixnum.Int64 get price => $_getI64(3);
  @$pb.TagNumber(4)
  set price($fixnum.Int64 value) => $_setInt64(3, value);
  @$pb.TagNumber(4)
  $core.bool hasPrice() => $_has(3);
  @$pb.TagNumber(4)
  void clearPrice() => $_clearField(4);

  @$pb.TagNumber(5)
  $core.String get category => $_getSZ(4);
  @$pb.TagNumber(5)
  set category($core.String value) => $_setString(4, value);
  @$pb.TagNumber(5)
  $core.bool hasCategory() => $_has(4);
  @$pb.TagNumber(5)
  void clearCategory() => $_clearField(5);

  @$pb.TagNumber(6)
  $core.bool get isAvailable => $_getBF(5);
  @$pb.TagNumber(6)
  set isAvailable($core.bool value) => $_setBool(5, value);
  @$pb.TagNumber(6)
  $core.bool hasIsAvailable() => $_has(5);
  @$pb.TagNumber(6)
  void clearIsAvailable() => $_clearField(6);

  @$pb.TagNumber(7)
  $core.String get imageUrl => $_getSZ(6);
  @$pb.TagNumber(7)
  set imageUrl($core.String value) => $_setString(6, value);
  @$pb.TagNumber(7)
  $core.bool hasImageUrl() => $_has(6);
  @$pb.TagNumber(7)
  void clearImageUrl() => $_clearField(7);
}

class GetMenuResponse extends $pb.GeneratedMessage {
  factory GetMenuResponse({
    $core.bool? success,
    $core.String? message,
    $core.Iterable<MenuItem>? items,
  }) {
    final result = create();
    if (success != null) result.success = success;
    if (message != null) result.message = message;
    if (items != null) result.items.addAll(items);
    return result;
  }

  GetMenuResponse._();

  factory GetMenuResponse.fromBuffer($core.List<$core.int> data,
          [$pb.ExtensionRegistry registry = $pb.ExtensionRegistry.EMPTY]) =>
      create()..mergeFromBuffer(data, registry);
  factory GetMenuResponse.fromJson($core.String json,
          [$pb.ExtensionRegistry registry = $pb.ExtensionRegistry.EMPTY]) =>
      create()..mergeFromJson(json, registry);

  static final $pb.BuilderInfo _i = $pb.BuilderInfo(
      _omitMessageNames ? '' : 'GetMenuResponse',
      package: const $pb.PackageName(_omitMessageNames ? '' : 'menu'),
      createEmptyInstance: create)
    ..aOB(1, _omitFieldNames ? '' : 'success')
    ..aOS(2, _omitFieldNames ? '' : 'message')
    ..pPM<MenuItem>(3, _omitFieldNames ? '' : 'items',
        subBuilder: MenuItem.create)
    ..hasRequiredFields = false;

  @$core.Deprecated('See https://github.com/google/protobuf.dart/issues/998.')
  GetMenuResponse clone() => deepCopy();
  @$core.Deprecated('See https://github.com/google/protobuf.dart/issues/998.')
  GetMenuResponse copyWith(void Function(GetMenuResponse) updates) =>
      super.copyWith((message) => updates(message as GetMenuResponse))
          as GetMenuResponse;

  @$core.override
  $pb.BuilderInfo get info_ => _i;

  @$core.pragma('dart2js:noInline')
  static GetMenuResponse create() => GetMenuResponse._();
  @$core.override
  GetMenuResponse createEmptyInstance() => create();
  @$core.pragma('dart2js:noInline')
  static GetMenuResponse getDefault() => _defaultInstance ??=
      $pb.GeneratedMessage.$_defaultFor<GetMenuResponse>(create);
  static GetMenuResponse? _defaultInstance;

  @$pb.TagNumber(1)
  $core.bool get success => $_getBF(0);
  @$pb.TagNumber(1)
  set success($core.bool value) => $_setBool(0, value);
  @$pb.TagNumber(1)
  $core.bool hasSuccess() => $_has(0);
  @$pb.TagNumber(1)
  void clearSuccess() => $_clearField(1);

  @$pb.TagNumber(2)
  $core.String get message => $_getSZ(1);
  @$pb.TagNumber(2)
  set message($core.String value) => $_setString(1, value);
  @$pb.TagNumber(2)
  $core.bool hasMessage() => $_has(1);
  @$pb.TagNumber(2)
  void clearMessage() => $_clearField(2);

  @$pb.TagNumber(3)
  $pb.PbList<MenuItem> get items => $_getList(2);
}

const $core.bool _omitFieldNames =
    $core.bool.fromEnvironment('protobuf.omit_field_names');
const $core.bool _omitMessageNames =
    $core.bool.fromEnvironment('protobuf.omit_message_names');
