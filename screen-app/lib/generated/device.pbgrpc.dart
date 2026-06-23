// This is a generated file - do not edit.
//
// Generated from device.proto.

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

import 'device.pb.dart' as $0;

export 'device.pb.dart';

@$pb.GrpcServiceName('device.DeviceService')
class DeviceServiceClient extends $grpc.Client {
  /// The hostname for this service.
  static const $core.String defaultHost = '';

  /// OAuth scopes needed for the client.
  static const $core.List<$core.String> oauthScopes = [
    '',
  ];

  DeviceServiceClient(super.channel, {super.options, super.interceptors});

  $grpc.ResponseFuture<$0.RegisterDeviceResponse> registerDevice(
    $0.RegisterDeviceRequest request, {
    $grpc.CallOptions? options,
  }) {
    return $createUnaryCall(_$registerDevice, request, options: options);
  }

  $grpc.ResponseFuture<$0.HeartbeatResponse> sendHeartbeat(
    $0.HeartbeatRequest request, {
    $grpc.CallOptions? options,
  }) {
    return $createUnaryCall(_$sendHeartbeat, request, options: options);
  }

  $grpc.ResponseFuture<$0.AdImpressionResponse> trackAdImpression(
    $0.AdImpressionRequest request, {
    $grpc.CallOptions? options,
  }) {
    return $createUnaryCall(_$trackAdImpression, request, options: options);
  }

  // method descriptors

  static final _$registerDevice =
      $grpc.ClientMethod<$0.RegisterDeviceRequest, $0.RegisterDeviceResponse>(
          '/device.DeviceService/RegisterDevice',
          ($0.RegisterDeviceRequest value) => value.writeToBuffer(),
          $0.RegisterDeviceResponse.fromBuffer);
  static final _$sendHeartbeat =
      $grpc.ClientMethod<$0.HeartbeatRequest, $0.HeartbeatResponse>(
          '/device.DeviceService/SendHeartbeat',
          ($0.HeartbeatRequest value) => value.writeToBuffer(),
          $0.HeartbeatResponse.fromBuffer);
  static final _$trackAdImpression =
      $grpc.ClientMethod<$0.AdImpressionRequest, $0.AdImpressionResponse>(
          '/device.DeviceService/TrackAdImpression',
          ($0.AdImpressionRequest value) => value.writeToBuffer(),
          $0.AdImpressionResponse.fromBuffer);
}

@$pb.GrpcServiceName('device.DeviceService')
abstract class DeviceServiceBase extends $grpc.Service {
  $core.String get $name => 'device.DeviceService';

  DeviceServiceBase() {
    $addMethod($grpc.ServiceMethod<$0.RegisterDeviceRequest,
            $0.RegisterDeviceResponse>(
        'RegisterDevice',
        registerDevice_Pre,
        false,
        false,
        ($core.List<$core.int> value) =>
            $0.RegisterDeviceRequest.fromBuffer(value),
        ($0.RegisterDeviceResponse value) => value.writeToBuffer()));
    $addMethod($grpc.ServiceMethod<$0.HeartbeatRequest, $0.HeartbeatResponse>(
        'SendHeartbeat',
        sendHeartbeat_Pre,
        false,
        false,
        ($core.List<$core.int> value) => $0.HeartbeatRequest.fromBuffer(value),
        ($0.HeartbeatResponse value) => value.writeToBuffer()));
    $addMethod(
        $grpc.ServiceMethod<$0.AdImpressionRequest, $0.AdImpressionResponse>(
            'TrackAdImpression',
            trackAdImpression_Pre,
            false,
            false,
            ($core.List<$core.int> value) =>
                $0.AdImpressionRequest.fromBuffer(value),
            ($0.AdImpressionResponse value) => value.writeToBuffer()));
  }

  $async.Future<$0.RegisterDeviceResponse> registerDevice_Pre(
      $grpc.ServiceCall $call,
      $async.Future<$0.RegisterDeviceRequest> $request) async {
    return registerDevice($call, await $request);
  }

  $async.Future<$0.RegisterDeviceResponse> registerDevice(
      $grpc.ServiceCall call, $0.RegisterDeviceRequest request);

  $async.Future<$0.HeartbeatResponse> sendHeartbeat_Pre($grpc.ServiceCall $call,
      $async.Future<$0.HeartbeatRequest> $request) async {
    return sendHeartbeat($call, await $request);
  }

  $async.Future<$0.HeartbeatResponse> sendHeartbeat(
      $grpc.ServiceCall call, $0.HeartbeatRequest request);

  $async.Future<$0.AdImpressionResponse> trackAdImpression_Pre(
      $grpc.ServiceCall $call,
      $async.Future<$0.AdImpressionRequest> $request) async {
    return trackAdImpression($call, await $request);
  }

  $async.Future<$0.AdImpressionResponse> trackAdImpression(
      $grpc.ServiceCall call, $0.AdImpressionRequest request);
}
