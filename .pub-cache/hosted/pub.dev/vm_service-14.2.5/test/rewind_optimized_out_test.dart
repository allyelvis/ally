// Copyright (c) 2023, the Dart project authors.  Please see the AUTHORS file
// for details. All rights reserved. Use of this source code is governed by a
// BSD-style license that can be found in the LICENSE file.

import 'dart:developer';

import 'package:test/test.dart';
import 'package:vm_service/vm_service.dart';

import 'common/service_test_common.dart';
import 'common/test_helper.dart';

// AUTOGENERATED START
//
// Update these constants by running:
//
// dart pkg/vm_service/test/update_line_numbers.dart <test.dart>
//
const LINE_0 = 39;
const LINE_A = 41;
const LINE_B = 46;
const LINE_C = 49;
const LINE_D = 53;
// AUTOGENERATED END

int global = 0;

@pragma('vm:never-inline')
int b3(int x) {
  int sum = 0;
  try {
    for (int i = 0; i < x; i++) {
      sum += x;
    }
  } catch (e) {
    print('caught $e');
  }
  if (global >= 100) {
    debugger(); // LINE_0.
  }
  global = global + 1; // LINE_A.
  return sum;
}

@pragma('vm:prefer-inline')
int b2(x) => b3(x); // LINE_B.

@pragma('vm:prefer-inline')
int b1(x) => b2(x); // LINE_C.

void test() {
  while (true) {
    b1(10000); // LINE_D.
  }
}

final tests = <IsolateTest>[
  hasStoppedAtBreakpoint,
  stoppedAtLine(LINE_0),
  stepOver,
  hasStoppedAtBreakpoint,
  stoppedAtLine(LINE_A),
  (VmService service, IsolateRef isolateRef) async {
    final isolateId = isolateRef.id!;
    final isolate = await service.getIsolate(isolateId);

    // We are at our breakpoint with global=100.
    final result = await service.evaluate(
      isolateId,
      isolate.rootLib!.id!,
      'global',
    ) as InstanceRef;
    expect(result.valueAsString, '100');

    // Rewind the top stack frame.
    bool caughtException = false;
    try {
      await service.resume(isolateId, step: StepOption.kRewind);
      fail('Unreachable');
    } on RPCError catch (e) {
      caughtException = true;
      expect(e.code, RPCErrorKind.kIsolateCannotBeResumed.code);
      expect(
        e.details,
        startsWith('Cannot rewind to frame 1 due to conflicting compiler '
            'optimizations. Run the vm with --no-prune-dead-locals '
            'to disallow these optimizations. Next valid rewind '
            'frame is '),
      );
    }
    expect(caughtException, true);
  },
];

void main([args = const <String>[]]) => runIsolateTests(
      args,
      tests,
      'rewind_optimized_out_test.dart',
      testeeConcurrent: test,
      extraArgs: [
        '--trace-rewind',
        '--prune-dead-locals',
        '--no-background-compilation',
        '--optimization-counter-threshold=10',
      ],
    );