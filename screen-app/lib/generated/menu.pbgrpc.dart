// This is a generated file - do not edit.
//
// Generated from menu.proto.

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

import 'menu.pb.dart' as $0;

export 'menu.pb.dart';

@$pb.GrpcServiceName('menu.MenuService')
class MenuServiceClient extends $grpc.Client {
  /// The hostname for this service.
  static const $core.String defaultHost = '';

  /// OAuth scopes needed for the client.
  static const $core.List<$core.String> oauthScopes = [
    '',
  ];

  MenuServiceClient(super.channel, {super.options, super.interceptors});

  $grpc.ResponseFuture<$0.GetMenuResponse> getMenu(
    $0.GetMenuRequest request, {
    $grpc.CallOptions? options,
  }) {
    return $createUnaryCall(_$getMenu, request, options: options);
  }

  // method descriptors

  static final _$getMenu =
      $grpc.ClientMethod<$0.GetMenuRequest, $0.GetMenuResponse>(
          '/menu.MenuService/GetMenu',
          ($0.GetMenuRequest value) => value.writeToBuffer(),
          $0.GetMenuResponse.fromBuffer);
}

@$pb.GrpcServiceName('menu.MenuService')
abstract class MenuServiceBase extends $grpc.Service {
  $core.String get $name => 'menu.MenuService';

  MenuServiceBase() {
    $addMethod($grpc.ServiceMethod<$0.GetMenuRequest, $0.GetMenuResponse>(
        'GetMenu',
        getMenu_Pre,
        false,
        false,
        ($core.List<$core.int> value) => $0.GetMenuRequest.fromBuffer(value),
        ($0.GetMenuResponse value) => value.writeToBuffer()));
  }

  $async.Future<$0.GetMenuResponse> getMenu_Pre($grpc.ServiceCall $call,
      $async.Future<$0.GetMenuRequest> $request) async {
    return getMenu($call, await $request);
  }

  $async.Future<$0.GetMenuResponse> getMenu(
      $grpc.ServiceCall call, $0.GetMenuRequest request);
}
