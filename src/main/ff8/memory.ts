import koffi, { type KoffiFunc } from 'koffi';

import type { MemoryType } from './types';

const TH32CS_SNAPPROCESS = 0x00000002;
const PROCESS_VM_READ = 0x0010;
const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
const PROCESS_ACCESS = PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_VM_READ;
const INVALID_HANDLE_VALUE = BigInt.asUintN(64, -1n);

const kernel32 = koffi.load('kernel32.dll');
const HANDLE = koffi.pointer('HANDLE', koffi.opaque());
const PROCESSENTRY32W = koffi.struct('PROCESSENTRY32W', {
  dwSize: 'uint32_t',
  cntUsage: 'uint32_t',
  th32ProcessID: 'uint32_t',
  th32DefaultHeapID: 'uintptr_t',
  th32ModuleID: 'uint32_t',
  cntThreads: 'uint32_t',
  th32ParentProcessID: 'uint32_t',
  pcPriClassBase: 'int32_t',
  dwFlags: 'uint32_t',
  szExeFile: koffi.array('char16_t', 260, 'String')
});

type NativeHandle = bigint;
interface ProcessEntry {
  dwSize: number;
  cntUsage?: number;
  th32ProcessID?: number;
  th32DefaultHeapID?: number | bigint;
  th32ModuleID?: number;
  cntThreads?: number;
  th32ParentProcessID?: number;
  pcPriClassBase?: number;
  dwFlags?: number;
  szExeFile?: string;
}

const createToolhelp32Snapshot = kernel32.func(
  '__stdcall',
  'CreateToolhelp32Snapshot',
  HANDLE,
  ['uint32_t', 'uint32_t']
) as KoffiFunc<(flags: number, processId: number) => NativeHandle>;
const process32First = kernel32.func(
  '__stdcall',
  'Process32FirstW',
  'bool',
  [HANDLE, koffi.inout(koffi.pointer(PROCESSENTRY32W))]
) as KoffiFunc<(snapshot: NativeHandle, entry: ProcessEntry) => boolean>;
const process32Next = kernel32.func(
  '__stdcall',
  'Process32NextW',
  'bool',
  [HANDLE, koffi.inout(koffi.pointer(PROCESSENTRY32W))]
) as KoffiFunc<(snapshot: NativeHandle, entry: ProcessEntry) => boolean>;
const openProcessNative = kernel32.func(
  '__stdcall',
  'OpenProcess',
  HANDLE,
  ['uint32_t', 'bool', 'uint32_t']
) as KoffiFunc<(access: number, inheritHandle: boolean, processId: number) => NativeHandle | null>;
const readProcessMemory = kernel32.func(
  'bool __stdcall ReadProcessMemory(HANDLE hProcess, uintptr_t lpBaseAddress, _Out_ void *lpBuffer, size_t nSize, _Out_ size_t *lpNumberOfBytesRead)'
) as KoffiFunc<(
  handle: NativeHandle,
  address: number,
  output: Buffer,
  size: number,
  bytesRead: number[]
) => boolean>;
const closeHandle = kernel32.func(
  '__stdcall',
  'CloseHandle',
  'bool',
  [HANDLE]
) as KoffiFunc<(handle: NativeHandle) => boolean>;
const getLastError = kernel32.func(
  '__stdcall',
  'GetLastError',
  'uint32_t',
  []
) as KoffiFunc<() => number>;

export interface ProcessHandle {
  handle: NativeHandle;
  processId: number;
  processName: string;
}

export class WindowsProcessMemory {
  findProcessId(processName: string): number | null {
    const snapshot = createToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (!snapshot || koffi.address(snapshot) === INVALID_HANDLE_VALUE) {
      throw this.win32Error('CreateToolhelp32Snapshot');
    }

    try {
      const entry: ProcessEntry = { dwSize: koffi.sizeof(PROCESSENTRY32W) };
      let hasEntry = process32First(snapshot, entry);
      while (hasEntry) {
        if (entry.szExeFile?.toLocaleLowerCase() === processName.toLocaleLowerCase()) {
          return entry.th32ProcessID ?? null;
        }
        entry.dwSize = koffi.sizeof(PROCESSENTRY32W);
        hasEntry = process32Next(snapshot, entry);
      }
      return null;
    } finally {
      closeHandle(snapshot);
    }
  }

  openProcess(processName: string): ProcessHandle | null {
    const processId = this.findProcessId(processName);
    if (processId === null) return null;

    const handle = openProcessNative(PROCESS_ACCESS, false, processId);
    if (!handle) throw this.win32Error(`OpenProcess(${processName})`);
    return { handle, processId, processName };
  }

  closeProcess(process: ProcessHandle): void {
    closeHandle(process.handle);
  }

  read(process: ProcessHandle, address: number, type: Exclude<MemoryType, 'bytes'>): number {
    const size = type === 'int' ? 4 : type === 'short' ? 2 : 1;
    const buffer = Buffer.from(this.readBytes(process, address, size));
    if (type === 'int') return buffer.readInt32LE();
    if (type === 'short') return buffer.readInt16LE();
    return buffer.readUInt8();
  }

  readBytes(process: ProcessHandle, address: number, size: number): number[] {
    const output = Buffer.allocUnsafe(size);
    const bytesRead = [0];
    const succeeded = readProcessMemory(process.handle, address, output, size, bytesRead);
    if (!succeeded || bytesRead[0] !== size) {
      throw this.win32Error(`ReadProcessMemory(0x${address.toString(16)})`);
    }
    return [...output];
  }

  private win32Error(operation: string): Error {
    return new Error(`${operation} failed with Win32 error ${getLastError()}`);
  }
}
