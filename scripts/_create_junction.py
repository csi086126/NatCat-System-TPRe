# -*- coding: utf-8 -*-
"""Create a directory junction at D:\\MOData pointing to the Macau data root.
This avoids the Java GeoServer FileURL issue with non-ASCII paths.
"""
import os, sys, ctypes
from ctypes import wintypes, byref

kernel32 = ctypes.windll.kernel32
kernel32.CreateDirectoryW.restype = wintypes.BOOL
kernel32.CreateDirectoryW.argtypes = [wintypes.LPCWSTR, ctypes.c_void_p]

GENERIC_READ = 0x80000000
GENERIC_WRITE = 0x40000000
OPEN_EXISTING = 3
FSCTL_SET_REPARSE_POINT = 0x000900A4
IO_REPARSE_TAG_MOUNT_POINT = 0xA0000003

CreateFileW = kernel32.CreateFileW
CreateFileW.restype = wintypes.HANDLE
CreateFileW.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD,
                         ctypes.c_void_p, wintypes.DWORD, wintypes.DWORD, wintypes.HANDLE]

DeviceIoControl = kernel32.DeviceIoControl
DeviceIoControl.restype = wintypes.BOOL
DeviceIoControl.argtypes = [wintypes.HANDLE, wintypes.DWORD, ctypes.c_void_p, wintypes.DWORD,
                              ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(wintypes.DWORD), ctypes.c_void_p]

dst = r'D:\MOData'
src = r'D:\Nat Cat Platform\FloodData\MO_FloodData\下墊面數據For_TAIPINGRE'

# Cleanup
if os.path.exists(dst):
    try:
        os.rmdir(dst)
    except Exception as e:
        print('cleanup err:', e)

ok = kernel32.CreateDirectoryW(dst, None)
print('CreateDirectoryW:', ok, 'err:', ctypes.GetLastError() if not ok else 0)
if not ok:
    sys.exit(1)

hDir = CreateFileW(dst, GENERIC_READ | GENERIC_WRITE, 0, None, OPEN_EXISTING, 0, None)
INVALID = wintypes.HANDLE(-1).value
print('handle:', hDir, 'INVALID:', INVALID)
if not hDir or hDir == INVALID:
    print('err:', kernel32.GetLastError())
    sys.exit(1)

# Build mount-point reparse data
target = src
sub_name = '\\\\??\\' + target
sub_w = sub_name.encode('utf-16-le')
prn_w = target.encode('utf-16-le')

sub_off = 8  # 4 header fields * 2 bytes each
sub_len = len(sub_w)
prn_off = sub_off + sub_len
prn_len = len(prn_w)
data_len = 8 + sub_len + prn_len

buf = bytearray()
buf += IO_REPARSE_TAG_MOUNT_POINT.to_bytes(4, 'little')
buf += data_len.to_bytes(4, 'little')
buf += sub_off.to_bytes(2, 'little')
buf += sub_len.to_bytes(2, 'little')
buf += prn_off.to_bytes(2, 'little')
buf += prn_len.to_bytes(2, 'little')
buf += sub_w
buf += prn_w
# Trailing null
buf += b'\x00\x00'

in_buf = ctypes.create_string_buffer(bytes(buf), len(buf))
bytesReturned = wintypes.DWORD(0)
ok = DeviceIoControl(hDir, FSCTL_SET_REPARSE_POINT,
                     in_buf, len(buf),
                     None, 0, byref(bytesReturned), None)
print('DeviceIoControl:', ok, 'err:', ctypes.GetLastError() if not ok else 0)

kernel32.CloseHandle(hDir)

# Verify
print('exists:', os.path.exists(dst))
if os.path.exists(dst):
    print('contents:', sorted(os.listdir(dst))[:5])
