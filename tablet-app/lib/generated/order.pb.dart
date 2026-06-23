// This is a generated file - do not edit.
//
// Generated from order.proto.

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

class OrderItem extends $pb.GeneratedMessage {
  factory OrderItem({
    $core.String? itemId,
    $core.String? name,
    $core.int? quantity,
    $fixnum.Int64? price,
  }) {
    final result = create();
    if (itemId != null) result.itemId = itemId;
    if (name != null) result.name = name;
    if (quantity != null) result.quantity = quantity;
    if (price != null) result.price = price;
    return result;
  }

  OrderItem._();

  factory OrderItem.fromBuffer($core.List<$core.int> data,
          [$pb.ExtensionRegistry registry = $pb.ExtensionRegistry.EMPTY]) =>
      create()..mergeFromBuffer(data, registry);
  factory OrderItem.fromJson($core.String json,
          [$pb.ExtensionRegistry registry = $pb.ExtensionRegistry.EMPTY]) =>
      create()..mergeFromJson(json, registry);

  static final $pb.BuilderInfo _i = $pb.BuilderInfo(
      _omitMessageNames ? '' : 'OrderItem',
      package: const $pb.PackageName(_omitMessageNames ? '' : 'order'),
      createEmptyInstance: create)
    ..aOS(1, _omitFieldNames ? '' : 'itemId', protoName: 'itemId')
    ..aOS(2, _omitFieldNames ? '' : 'name')
    ..aI(3, _omitFieldNames ? '' : 'quantity')
    ..aInt64(4, _omitFieldNames ? '' : 'price')
    ..hasRequiredFields = false;

  @$core.Deprecated('See https://github.com/google/protobuf.dart/issues/998.')
  OrderItem clone() => deepCopy();
  @$core.Deprecated('See https://github.com/google/protobuf.dart/issues/998.')
  OrderItem copyWith(void Function(OrderItem) updates) =>
      super.copyWith((message) => updates(message as OrderItem)) as OrderItem;

  @$core.override
  $pb.BuilderInfo get info_ => _i;

  @$core.pragma('dart2js:noInline')
  static OrderItem create() => OrderItem._();
  @$core.override
  OrderItem createEmptyInstance() => create();
  @$core.pragma('dart2js:noInline')
  static OrderItem getDefault() =>
      _defaultInstance ??= $pb.GeneratedMessage.$_defaultFor<OrderItem>(create);
  static OrderItem? _defaultInstance;

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
  $core.int get quantity => $_getIZ(2);
  @$pb.TagNumber(3)
  set quantity($core.int value) => $_setSignedInt32(2, value);
  @$pb.TagNumber(3)
  $core.bool hasQuantity() => $_has(2);
  @$pb.TagNumber(3)
  void clearQuantity() => $_clearField(3);

  @$pb.TagNumber(4)
  $fixnum.Int64 get price => $_getI64(3);
  @$pb.TagNumber(4)
  set price($fixnum.Int64 value) => $_setInt64(3, value);
  @$pb.TagNumber(4)
  $core.bool hasPrice() => $_has(3);
  @$pb.TagNumber(4)
  void clearPrice() => $_clearField(4);
}

class CreateOrderRequest extends $pb.GeneratedMessage {
  factory CreateOrderRequest({
    $core.String? deviceId,
    $core.String? merchantId,
    $core.String? tableNumber,
    $core.Iterable<OrderItem>? items,
    $fixnum.Int64? totalAmount,
  }) {
    final result = create();
    if (deviceId != null) result.deviceId = deviceId;
    if (merchantId != null) result.merchantId = merchantId;
    if (tableNumber != null) result.tableNumber = tableNumber;
    if (items != null) result.items.addAll(items);
    if (totalAmount != null) result.totalAmount = totalAmount;
    return result;
  }

  CreateOrderRequest._();

  factory CreateOrderRequest.fromBuffer($core.List<$core.int> data,
          [$pb.ExtensionRegistry registry = $pb.ExtensionRegistry.EMPTY]) =>
      create()..mergeFromBuffer(data, registry);
  factory CreateOrderRequest.fromJson($core.String json,
          [$pb.ExtensionRegistry registry = $pb.ExtensionRegistry.EMPTY]) =>
      create()..mergeFromJson(json, registry);

  static final $pb.BuilderInfo _i = $pb.BuilderInfo(
      _omitMessageNames ? '' : 'CreateOrderRequest',
      package: const $pb.PackageName(_omitMessageNames ? '' : 'order'),
      createEmptyInstance: create)
    ..aOS(1, _omitFieldNames ? '' : 'deviceId', protoName: 'deviceId')
    ..aOS(2, _omitFieldNames ? '' : 'merchantId', protoName: 'merchantId')
    ..aOS(3, _omitFieldNames ? '' : 'tableNumber', protoName: 'tableNumber')
    ..pPM<OrderItem>(4, _omitFieldNames ? '' : 'items',
        subBuilder: OrderItem.create)
    ..aInt64(5, _omitFieldNames ? '' : 'totalAmount', protoName: 'totalAmount')
    ..hasRequiredFields = false;

  @$core.Deprecated('See https://github.com/google/protobuf.dart/issues/998.')
  CreateOrderRequest clone() => deepCopy();
  @$core.Deprecated('See https://github.com/google/protobuf.dart/issues/998.')
  CreateOrderRequest copyWith(void Function(CreateOrderRequest) updates) =>
      super.copyWith((message) => updates(message as CreateOrderRequest))
          as CreateOrderRequest;

  @$core.override
  $pb.BuilderInfo get info_ => _i;

  @$core.pragma('dart2js:noInline')
  static CreateOrderRequest create() => CreateOrderRequest._();
  @$core.override
  CreateOrderRequest createEmptyInstance() => create();
  @$core.pragma('dart2js:noInline')
  static CreateOrderRequest getDefault() => _defaultInstance ??=
      $pb.GeneratedMessage.$_defaultFor<CreateOrderRequest>(create);
  static CreateOrderRequest? _defaultInstance;

  @$pb.TagNumber(1)
  $core.String get deviceId => $_getSZ(0);
  @$pb.TagNumber(1)
  set deviceId($core.String value) => $_setString(0, value);
  @$pb.TagNumber(1)
  $core.bool hasDeviceId() => $_has(0);
  @$pb.TagNumber(1)
  void clearDeviceId() => $_clearField(1);

  @$pb.TagNumber(2)
  $core.String get merchantId => $_getSZ(1);
  @$pb.TagNumber(2)
  set merchantId($core.String value) => $_setString(1, value);
  @$pb.TagNumber(2)
  $core.bool hasMerchantId() => $_has(1);
  @$pb.TagNumber(2)
  void clearMerchantId() => $_clearField(2);

  @$pb.TagNumber(3)
  $core.String get tableNumber => $_getSZ(2);
  @$pb.TagNumber(3)
  set tableNumber($core.String value) => $_setString(2, value);
  @$pb.TagNumber(3)
  $core.bool hasTableNumber() => $_has(2);
  @$pb.TagNumber(3)
  void clearTableNumber() => $_clearField(3);

  @$pb.TagNumber(4)
  $pb.PbList<OrderItem> get items => $_getList(3);

  @$pb.TagNumber(5)
  $fixnum.Int64 get totalAmount => $_getI64(4);
  @$pb.TagNumber(5)
  set totalAmount($fixnum.Int64 value) => $_setInt64(4, value);
  @$pb.TagNumber(5)
  $core.bool hasTotalAmount() => $_has(4);
  @$pb.TagNumber(5)
  void clearTotalAmount() => $_clearField(5);
}

class CreateOrderResponse extends $pb.GeneratedMessage {
  factory CreateOrderResponse({
    $core.bool? success,
    $core.String? message,
    $core.String? orderId,
    $core.String? paymentUrl,
  }) {
    final result = create();
    if (success != null) result.success = success;
    if (message != null) result.message = message;
    if (orderId != null) result.orderId = orderId;
    if (paymentUrl != null) result.paymentUrl = paymentUrl;
    return result;
  }

  CreateOrderResponse._();

  factory CreateOrderResponse.fromBuffer($core.List<$core.int> data,
          [$pb.ExtensionRegistry registry = $pb.ExtensionRegistry.EMPTY]) =>
      create()..mergeFromBuffer(data, registry);
  factory CreateOrderResponse.fromJson($core.String json,
          [$pb.ExtensionRegistry registry = $pb.ExtensionRegistry.EMPTY]) =>
      create()..mergeFromJson(json, registry);

  static final $pb.BuilderInfo _i = $pb.BuilderInfo(
      _omitMessageNames ? '' : 'CreateOrderResponse',
      package: const $pb.PackageName(_omitMessageNames ? '' : 'order'),
      createEmptyInstance: create)
    ..aOB(1, _omitFieldNames ? '' : 'success')
    ..aOS(2, _omitFieldNames ? '' : 'message')
    ..aOS(3, _omitFieldNames ? '' : 'orderId', protoName: 'orderId')
    ..aOS(4, _omitFieldNames ? '' : 'paymentUrl', protoName: 'paymentUrl')
    ..hasRequiredFields = false;

  @$core.Deprecated('See https://github.com/google/protobuf.dart/issues/998.')
  CreateOrderResponse clone() => deepCopy();
  @$core.Deprecated('See https://github.com/google/protobuf.dart/issues/998.')
  CreateOrderResponse copyWith(void Function(CreateOrderResponse) updates) =>
      super.copyWith((message) => updates(message as CreateOrderResponse))
          as CreateOrderResponse;

  @$core.override
  $pb.BuilderInfo get info_ => _i;

  @$core.pragma('dart2js:noInline')
  static CreateOrderResponse create() => CreateOrderResponse._();
  @$core.override
  CreateOrderResponse createEmptyInstance() => create();
  @$core.pragma('dart2js:noInline')
  static CreateOrderResponse getDefault() => _defaultInstance ??=
      $pb.GeneratedMessage.$_defaultFor<CreateOrderResponse>(create);
  static CreateOrderResponse? _defaultInstance;

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
  $core.String get orderId => $_getSZ(2);
  @$pb.TagNumber(3)
  set orderId($core.String value) => $_setString(2, value);
  @$pb.TagNumber(3)
  $core.bool hasOrderId() => $_has(2);
  @$pb.TagNumber(3)
  void clearOrderId() => $_clearField(3);

  @$pb.TagNumber(4)
  $core.String get paymentUrl => $_getSZ(3);
  @$pb.TagNumber(4)
  set paymentUrl($core.String value) => $_setString(3, value);
  @$pb.TagNumber(4)
  $core.bool hasPaymentUrl() => $_has(3);
  @$pb.TagNumber(4)
  void clearPaymentUrl() => $_clearField(4);
}

class GetOrderStatusRequest extends $pb.GeneratedMessage {
  factory GetOrderStatusRequest({
    $core.String? orderId,
  }) {
    final result = create();
    if (orderId != null) result.orderId = orderId;
    return result;
  }

  GetOrderStatusRequest._();

  factory GetOrderStatusRequest.fromBuffer($core.List<$core.int> data,
          [$pb.ExtensionRegistry registry = $pb.ExtensionRegistry.EMPTY]) =>
      create()..mergeFromBuffer(data, registry);
  factory GetOrderStatusRequest.fromJson($core.String json,
          [$pb.ExtensionRegistry registry = $pb.ExtensionRegistry.EMPTY]) =>
      create()..mergeFromJson(json, registry);

  static final $pb.BuilderInfo _i = $pb.BuilderInfo(
      _omitMessageNames ? '' : 'GetOrderStatusRequest',
      package: const $pb.PackageName(_omitMessageNames ? '' : 'order'),
      createEmptyInstance: create)
    ..aOS(1, _omitFieldNames ? '' : 'orderId', protoName: 'orderId')
    ..hasRequiredFields = false;

  @$core.Deprecated('See https://github.com/google/protobuf.dart/issues/998.')
  GetOrderStatusRequest clone() => deepCopy();
  @$core.Deprecated('See https://github.com/google/protobuf.dart/issues/998.')
  GetOrderStatusRequest copyWith(
          void Function(GetOrderStatusRequest) updates) =>
      super.copyWith((message) => updates(message as GetOrderStatusRequest))
          as GetOrderStatusRequest;

  @$core.override
  $pb.BuilderInfo get info_ => _i;

  @$core.pragma('dart2js:noInline')
  static GetOrderStatusRequest create() => GetOrderStatusRequest._();
  @$core.override
  GetOrderStatusRequest createEmptyInstance() => create();
  @$core.pragma('dart2js:noInline')
  static GetOrderStatusRequest getDefault() => _defaultInstance ??=
      $pb.GeneratedMessage.$_defaultFor<GetOrderStatusRequest>(create);
  static GetOrderStatusRequest? _defaultInstance;

  @$pb.TagNumber(1)
  $core.String get orderId => $_getSZ(0);
  @$pb.TagNumber(1)
  set orderId($core.String value) => $_setString(0, value);
  @$pb.TagNumber(1)
  $core.bool hasOrderId() => $_has(0);
  @$pb.TagNumber(1)
  void clearOrderId() => $_clearField(1);
}

class OrderStatusResponse extends $pb.GeneratedMessage {
  factory OrderStatusResponse({
    $core.String? orderId,
    $core.String? paymentStatus,
    $core.String? orderStatus,
  }) {
    final result = create();
    if (orderId != null) result.orderId = orderId;
    if (paymentStatus != null) result.paymentStatus = paymentStatus;
    if (orderStatus != null) result.orderStatus = orderStatus;
    return result;
  }

  OrderStatusResponse._();

  factory OrderStatusResponse.fromBuffer($core.List<$core.int> data,
          [$pb.ExtensionRegistry registry = $pb.ExtensionRegistry.EMPTY]) =>
      create()..mergeFromBuffer(data, registry);
  factory OrderStatusResponse.fromJson($core.String json,
          [$pb.ExtensionRegistry registry = $pb.ExtensionRegistry.EMPTY]) =>
      create()..mergeFromJson(json, registry);

  static final $pb.BuilderInfo _i = $pb.BuilderInfo(
      _omitMessageNames ? '' : 'OrderStatusResponse',
      package: const $pb.PackageName(_omitMessageNames ? '' : 'order'),
      createEmptyInstance: create)
    ..aOS(1, _omitFieldNames ? '' : 'orderId', protoName: 'orderId')
    ..aOS(2, _omitFieldNames ? '' : 'paymentStatus', protoName: 'paymentStatus')
    ..aOS(3, _omitFieldNames ? '' : 'orderStatus', protoName: 'orderStatus')
    ..hasRequiredFields = false;

  @$core.Deprecated('See https://github.com/google/protobuf.dart/issues/998.')
  OrderStatusResponse clone() => deepCopy();
  @$core.Deprecated('See https://github.com/google/protobuf.dart/issues/998.')
  OrderStatusResponse copyWith(void Function(OrderStatusResponse) updates) =>
      super.copyWith((message) => updates(message as OrderStatusResponse))
          as OrderStatusResponse;

  @$core.override
  $pb.BuilderInfo get info_ => _i;

  @$core.pragma('dart2js:noInline')
  static OrderStatusResponse create() => OrderStatusResponse._();
  @$core.override
  OrderStatusResponse createEmptyInstance() => create();
  @$core.pragma('dart2js:noInline')
  static OrderStatusResponse getDefault() => _defaultInstance ??=
      $pb.GeneratedMessage.$_defaultFor<OrderStatusResponse>(create);
  static OrderStatusResponse? _defaultInstance;

  @$pb.TagNumber(1)
  $core.String get orderId => $_getSZ(0);
  @$pb.TagNumber(1)
  set orderId($core.String value) => $_setString(0, value);
  @$pb.TagNumber(1)
  $core.bool hasOrderId() => $_has(0);
  @$pb.TagNumber(1)
  void clearOrderId() => $_clearField(1);

  @$pb.TagNumber(2)
  $core.String get paymentStatus => $_getSZ(1);
  @$pb.TagNumber(2)
  set paymentStatus($core.String value) => $_setString(1, value);
  @$pb.TagNumber(2)
  $core.bool hasPaymentStatus() => $_has(1);
  @$pb.TagNumber(2)
  void clearPaymentStatus() => $_clearField(2);

  @$pb.TagNumber(3)
  $core.String get orderStatus => $_getSZ(2);
  @$pb.TagNumber(3)
  set orderStatus($core.String value) => $_setString(2, value);
  @$pb.TagNumber(3)
  $core.bool hasOrderStatus() => $_has(2);
  @$pb.TagNumber(3)
  void clearOrderStatus() => $_clearField(3);
}

const $core.bool _omitFieldNames =
    $core.bool.fromEnvironment('protobuf.omit_field_names');
const $core.bool _omitMessageNames =
    $core.bool.fromEnvironment('protobuf.omit_message_names');
