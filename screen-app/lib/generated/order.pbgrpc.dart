// This is a generated file - do not edit.
//
// Generated from order.proto.

// @dart = 3.3

// ignore_for_file: annotate_overrides, camel_case_types, comment_references
// ignore_for_file: constant_identifier_names
// ignore_for_file: curly_braces_in_flow_control_structures
// ignore_for_file: deprecated_member_use_from_same_package, library_prefixes
// ignore_for_file: non_constant_identifier_names, prefer_relative_imports

import 'dart:async' as $async;
import 'dart:core' as $core;

import 'package:grpc/service_api.dart' as $grpc;
import 'package:protobuf/protobuf.dart' as $pb;

import 'order.pb.dart' as $0;

export 'order.pb.dart';

@$pb.GrpcServiceName('order.OrderService')
class OrderServiceClient extends $grpc.Client {
  /// The hostname for this service.
  static const $core.String defaultHost = '';

  /// OAuth scopes needed for the client.
  static const $core.List<$core.String> oauthScopes = [
    '',
  ];

  OrderServiceClient(super.channel, {super.options, super.interceptors});

  $grpc.ResponseFuture<$0.CreateOrderResponse> createOrder(
    $0.CreateOrderRequest request, {
    $grpc.CallOptions? options,
  }) {
    return $createUnaryCall(_$createOrder, request, options: options);
  }

  $grpc.ResponseFuture<$0.OrderStatusResponse> getOrderStatus(
    $0.GetOrderStatusRequest request, {
    $grpc.CallOptions? options,
  }) {
    return $createUnaryCall(_$getOrderStatus, request, options: options);
  }

  // method descriptors

  static final _$createOrder =
      $grpc.ClientMethod<$0.CreateOrderRequest, $0.CreateOrderResponse>(
          '/order.OrderService/CreateOrder',
          ($0.CreateOrderRequest value) => value.writeToBuffer(),
          $0.CreateOrderResponse.fromBuffer);
  static final _$getOrderStatus =
      $grpc.ClientMethod<$0.GetOrderStatusRequest, $0.OrderStatusResponse>(
          '/order.OrderService/GetOrderStatus',
          ($0.GetOrderStatusRequest value) => value.writeToBuffer(),
          $0.OrderStatusResponse.fromBuffer);
}

@$pb.GrpcServiceName('order.OrderService')
abstract class OrderServiceBase extends $grpc.Service {
  $core.String get $name => 'order.OrderService';

  OrderServiceBase() {
    $addMethod(
        $grpc.ServiceMethod<$0.CreateOrderRequest, $0.CreateOrderResponse>(
            'CreateOrder',
            createOrder_Pre,
            false,
            false,
            ($core.List<$core.int> value) =>
                $0.CreateOrderRequest.fromBuffer(value),
            ($0.CreateOrderResponse value) => value.writeToBuffer()));
    $addMethod(
        $grpc.ServiceMethod<$0.GetOrderStatusRequest, $0.OrderStatusResponse>(
            'GetOrderStatus',
            getOrderStatus_Pre,
            false,
            false,
            ($core.List<$core.int> value) =>
                $0.GetOrderStatusRequest.fromBuffer(value),
            ($0.OrderStatusResponse value) => value.writeToBuffer()));
  }

  $async.Future<$0.CreateOrderResponse> createOrder_Pre($grpc.ServiceCall $call,
      $async.Future<$0.CreateOrderRequest> $request) async {
    return createOrder($call, await $request);
  }

  $async.Future<$0.CreateOrderResponse> createOrder(
      $grpc.ServiceCall call, $0.CreateOrderRequest request);

  $async.Future<$0.OrderStatusResponse> getOrderStatus_Pre(
      $grpc.ServiceCall $call,
      $async.Future<$0.GetOrderStatusRequest> $request) async {
    return getOrderStatus($call, await $request);
  }

  $async.Future<$0.OrderStatusResponse> getOrderStatus(
      $grpc.ServiceCall call, $0.GetOrderStatusRequest request);
}
