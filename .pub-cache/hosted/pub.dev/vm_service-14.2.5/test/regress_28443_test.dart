// Copyright (c) 2023, the Dart project authors.  Please see the AUTHORS file
// for details. All rights reserved. Use of this source code is governed by a
// BSD-style license that can be found in the LICENSE file.

import 'dart:async';

import 'common/service_test_common.dart';
import 'common/test_helper.dart';

// AUTOGENERATED START
//
// Update these constants by running:
//
// dart pkg/vm_service/test/update_line_numbers.dart <test.dart>
//
const LINE_A = 36;
const LINE_B = 41;
const LINE_C = 45;
// AUTOGENERATED END

class VMServiceClient {
  VMServiceClient(this.x);
  Future<void> close() => Future.microtask(() => print('close'));
  final String x;
}

Future<void> collect() async {
  final uri = 'abc';
  late VMServiceClient vmService;
  await Future.microtask(() async {
    try {
      vmService = VMServiceClient(uri);
      await Future.microtask(() => throw TimeoutException('here'));
    } on Object {
      await vmService.close();
      rethrow; // LINE_A
    }
  });
}

Future<void> testCode() async /* LINE_B */ {
  try {
    await collect();
  } on TimeoutException {
    print('ok'); // LINE_C
  }
}

final tests = <IsolateTest>[
  hasPausedAtStart,
  markDartColonLibrariesDebuggable,
  setBreakpointAtLine(LINE_B),
  resumeIsolate,
  hasStoppedAtBreakpoint,
  stoppedAtLine(LINE_B),
  setBreakpointAtLine(LINE_A),
  resumeIsolate,
  hasStoppedAtBreakpoint,
  stoppedAtLine(LINE_A),
  setBreakpointAtLine(LINE_C),
  stepOut,
  resumeIsolate,
  hasStoppedAtBreakpoint,
  stoppedAtLine(LINE_C),
];

void main([args = const <String>[]]) => runIsolateTests(
      args,
      tests,
      'regress_28443_test.dart',
      testeeConcurrent: testCode,
      pauseOnStart: true,
      pauseOnExit: false,
    );