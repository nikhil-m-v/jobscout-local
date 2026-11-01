"""Process identity regressions for synthetic crash checks; no process is killed."""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import Mock

spec = importlib.util.spec_from_file_location('owned', Path(__file__).parents[1] / 'windows_owned_process.py')
owned = importlib.util.module_from_spec(spec)
spec.loader.exec_module(owned)


class OwnedProcessTests(unittest.TestCase):
    def test_only_exact_parent_and_executable_are_selected(self):
        rows = [(12, 5, 'jobscout-engine.exe'), (13, 7, 'jobscout-engine.exe'),
                (14, 5, 'other.exe'), (15, 12, 'jobscout-engine.exe')]
        self.assertEqual(owned.matching_children(rows, 5, 'JOBSCOUT-ENGINE.EXE'), [12])

    def test_same_filename_in_other_directory_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError, 'identity mismatch'):
            owned.validate_identity(Path('other') / 'engine.exe', Path('owned') / 'engine.exe', 2, 1)

    def test_stale_parent_pid_is_rejected_by_creation_order(self):
        with self.assertRaisesRegex(RuntimeError, 'predates'):
            owned.validate_identity(Path('engine.exe'), Path('engine.exe'), 1, 2)

    def test_termination_uses_retained_handle_and_skips_exited_process(self):
        kernel = Mock()
        kernel.WaitForSingleObject.return_value = 0x102
        kernel.TerminateProcess.return_value = True
        process = owned.OwnedProcess(kernel, 123, 456, 10)
        process.terminate()
        kernel.TerminateProcess.assert_called_once_with(123, 1)
        kernel.WaitForSingleObject.return_value = 0
        process.terminate()
        kernel.TerminateProcess.assert_called_once()

    def test_wait_failure_cannot_claim_process_exit_or_terminate(self):
        kernel = Mock()
        kernel.WaitForSingleObject.return_value = 0xffffffff
        with self.assertRaisesRegex(RuntimeError, 'wait failed'):
            owned.OwnedProcess(kernel, 123, 456, 10).terminate()
        kernel.TerminateProcess.assert_not_called()

    def test_partial_child_capture_failure_closes_already_retained_handles(self):
        processes = object.__new__(owned.WindowsProcesses)
        processes.rows = Mock(return_value=[(2, 1, 'engine.exe'), (3, 1, 'engine.exe')])
        first = Mock()
        processes.capture = Mock(side_effect=[first, RuntimeError('changed')])
        with self.assertRaisesRegex(RuntimeError, 'changed'):
            processes.children(Mock(pid=1), Path('engine.exe'))
        first.close.assert_called_once_with()
        first.terminate.assert_not_called()


if __name__ == '__main__':
    unittest.main()
